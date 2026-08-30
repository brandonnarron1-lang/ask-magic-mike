#!/usr/bin/env node

import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import {
  buildLegacyWordpressReconciliation,
  parseLegacyWordpressCsv,
} from "./lib/wordpress-legacy-reconciliation.mjs";

const { Client } = pg;
const MAX_CANONICAL_CANDIDATES = 5000;

export function parseArgs(argv) {
  const args = { legacyCsv: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--") continue;
    if (token === "--help" || token === "-h") args.help = true;
    else if (token === "--legacy-csv") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("missing_legacy_csv_path");
      args.legacyCsv = value;
      index += 1;
    } else {
      throw new Error(`unknown_argument_${token}`);
    }
  }
  return args;
}

export function attestDatabaseIdentity(databaseUrl, env, requireProduction) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("invalid_database_url");
  }
  if (!/^postgres(?:ql)?:$/.test(parsed.protocol)) throw new Error("invalid_database_protocol");
  const endpointId = parsed.hostname.split(".")[0].replace(/-pooler$/, "");
  const expectedEndpointId = String(env.PRODUCTION_NEON_ENDPOINT_ID ?? "").trim().replace(/-pooler$/, "");
  const databaseEnv = String(env.DATABASE_ENV ?? "").trim().toLowerCase();
  if (requireProduction) {
    if (databaseEnv !== "production") throw new Error("database_env_not_production");
    if (!expectedEndpointId) throw new Error("production_neon_endpoint_id_missing");
    if (endpointId !== expectedEndpointId) throw new Error("production_neon_endpoint_mismatch");
  }
  return {
    database_env: databaseEnv || null,
    endpoint_id: endpointId || null,
    endpoint_attested: Boolean(expectedEndpointId) && endpointId === expectedEndpointId,
  };
}

export function readLegacyCsv(filePath) {
  if (!path.isAbsolute(filePath)) throw new Error("legacy_csv_path_must_be_absolute");
  let stat;
  try {
    stat = lstatSync(filePath);
  } catch {
    throw new Error("legacy_csv_unavailable");
  }
  if (stat.isSymbolicLink()) throw new Error("legacy_csv_symlink_refused");
  if (!stat.isFile()) throw new Error("legacy_csv_not_regular_file");
  if ((stat.mode & 0o077) !== 0) throw new Error("legacy_csv_permissions_must_be_0600");
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    throw new Error("legacy_csv_unreadable");
  }
}

function safeErrorMessage(error) {
  return String(error instanceof Error ? error.message : error)
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgresql://[redacted]@")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]")
    .slice(0, 500);
}

function allowedFormIds(env) {
  const allowed = String(env.WORDPRESS_CANONICAL_FORM_IDS || "3")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^[1-9]\d*$/.test(value));
  if (allowed.length === 0) throw new Error("wordpress_canonical_form_ids_empty");
  return [...new Set(allowed)].sort((left, right) => Number(left) - Number(right));
}

async function withReadOnlyDatabase(databaseUrl, operation) {
  const client = new Client({
    connectionString: databaseUrl,
    application_name: "amm-wordpress-reconciliation-readonly",
    connectionTimeoutMillis: 10_000,
    query_timeout: 30_000,
  });
  await client.connect();
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original, credential-redacted failure.
    }
    throw error;
  } finally {
    await client.end();
  }
}

async function canonicalBridgeSummary(client, allowed) {
  const result = await client.query(
    `WITH wordpress_bridge_leads AS (
       SELECT l.id, l.is_test, l.consent_source, l.request_idempotency_key,
              substring(l.consent_source FROM '^gravity_forms_([0-9]+)$') AS consent_form_id,
              substring(l.request_idempotency_key FROM '^gf:([0-9]+):[0-9]+$') AS idempotency_form_id
         FROM public.leads l
        WHERE l.consent_source ~ '^gravity_forms_'
           OR l.request_idempotency_key LIKE 'gf:%'
     )
     SELECT
       COUNT(*)::int AS canonical_wordpress_leads,
       COUNT(*) FILTER (WHERE consent_form_id IS NULL AND idempotency_form_id IS NULL)::int AS missing_form_identity,
       COUNT(*) FILTER (
         WHERE consent_form_id IS NOT NULL
           AND idempotency_form_id IS NOT NULL
           AND consent_form_id <> idempotency_form_id
       )::int AS inconsistent_form_identity,
       COUNT(*) FILTER (
         WHERE COALESCE(consent_form_id, idempotency_form_id) IS NOT NULL
           AND NOT (COALESCE(consent_form_id, idempotency_form_id) = ANY($1::text[]))
       )::int AS unauthorized_form_forwards,
       COUNT(*) FILTER (WHERE request_idempotency_key IS NULL)::int AS missing_idempotency_keys,
       COUNT(*) FILTER (WHERE is_test = TRUE)::int AS test_records
     FROM wordpress_bridge_leads`,
    [allowed],
  );
  const queueResult = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('queued', 'retrying'))::int AS pending,
       COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
     FROM public.lead_notifications`,
  );
  return { summary: result.rows[0], queue: queueResult.rows[0] };
}

async function canonicalIdentityCandidates(client, localRows) {
  const emails = [...new Set(localRows.map((row) => row.normalizedEmail).filter(Boolean))];
  const phones = [...new Set(localRows.map((row) => row.normalizedPhone).filter(Boolean))];
  if (emails.length === 0 && phones.length === 0) return [];
  const result = await client.query(
    `SELECT l.id::text AS lead_id,
            public.amm_normalize_email(COALESCE(NULLIF(l.normalized_email, ''), l.email)) AS normalized_email,
            public.amm_normalize_phone(COALESCE(NULLIF(l.normalized_phone, ''), NULLIF(l.phone_normalized, ''), l.phone)) AS normalized_phone,
            public.amm_normalize_property_identity(
              COALESCE(NULLIF(l.normalized_property_address, ''), NULLIF(l.address_raw, ''), NULLIF(l.address_line1, ''))
            ) AS normalized_address,
            COALESCE(l.is_duplicate, false) AS is_duplicate,
            l.duplicate_of_lead_id::text AS duplicate_of_lead_id
       FROM public.leads l
      WHERE public.amm_normalize_email(COALESCE(NULLIF(l.normalized_email, ''), l.email)) = ANY($1::text[])
         OR public.amm_normalize_phone(COALESCE(NULLIF(l.normalized_phone, ''), NULLIF(l.phone_normalized, ''), l.phone)) = ANY($2::text[])
      ORDER BY l.created_at, l.id
      LIMIT ${MAX_CANONICAL_CANDIDATES + 1}`,
    [emails, phones],
  );
  if (result.rows.length > MAX_CANONICAL_CANDIDATES) throw new Error("canonical_candidate_limit_exceeded");
  return result.rows;
}

export async function run(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log("Usage: pnpm reconcile-wordpress-leads [--legacy-csv /absolute/private/path.csv]");
    console.log("Default mode checks canonical bridge identity and notification queue state.");
    console.log("Legacy CSV mode is a Production-attested, read-only, PII-minimized dry-run; it never imports or updates leads.");
    return 0;
  }
  const databaseUrl = String(env.DATABASE_URL ?? "").trim();
  if (!databaseUrl) throw new Error("database_url_required");
  const identity = attestDatabaseIdentity(databaseUrl, env, Boolean(args.legacyCsv));
  const allowed = allowedFormIds(env);
  const legacyRows = args.legacyCsv
    ? parseLegacyWordpressCsv(readLegacyCsv(args.legacyCsv)).rows
    : null;

  const report = await withReadOnlyDatabase(databaseUrl, async (client) => {
    const dbIdentity = await client.query(
      "SELECT current_database() AS database_name, current_user AS database_role, current_setting('transaction_read_only') AS transaction_read_only",
    );
    if (dbIdentity.rows[0]?.transaction_read_only !== "on") {
      throw new Error("database_transaction_not_read_only");
    }
    if (args.legacyCsv) {
      const expectedDatabase = String(env.PRODUCTION_DATABASE_NAME ?? "neondb").trim();
      const expectedRole = String(env.PRODUCTION_DATABASE_ROLE ?? "neondb_owner").trim();
      if (dbIdentity.rows[0]?.database_name !== expectedDatabase) throw new Error("production_database_name_mismatch");
      if (dbIdentity.rows[0]?.database_role !== expectedRole) throw new Error("production_database_role_mismatch");
    }
    const bridge = await canonicalBridgeSummary(client, allowed);
    if (!args.legacyCsv) {
      const failures = Number(bridge.summary.unauthorized_form_forwards)
        + Number(bridge.summary.missing_form_identity)
        + Number(bridge.summary.inconsistent_form_identity)
        + Number(bridge.queue.failed);
      return {
        checked_at: new Date().toISOString(),
        reconciliation_scope: "canonical_database_side",
        mode: "read_only",
        database_identity: { ...identity, ...dbIdentity.rows[0] },
        allowed_form_ids: allowed,
        summary: bridge.summary,
        notification_queue: bridge.queue,
        alert: failures > 0,
        note: "Gravity entry-count comparison requires the authenticated WordPress bridge health panel.",
      };
    }

    const canonicalRows = await canonicalIdentityCandidates(client, legacyRows);
    const reconciliation = buildLegacyWordpressReconciliation(legacyRows, canonicalRows);
    return {
      checked_at: new Date().toISOString(),
      reconciliation_scope: "wordpress_legacy_store_to_canonical_database",
      database_identity: { ...identity, ...dbIdentity.rows[0] },
      allowed_form_ids: allowed,
      canonical_bridge: bridge,
      ...reconciliation,
      note: "No row was imported, merged, suppressed, deleted, assigned, or messaged. Address is corroboration only and never establishes person identity.",
    };
  });

  console.log(JSON.stringify(report, null, 2));
  return report.alert ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`WordPress reconciliation refused: ${safeErrorMessage(error)}`);
      process.exitCode = 2;
    });
}
