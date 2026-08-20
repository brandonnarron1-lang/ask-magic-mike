#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "pg";

const { Client } = pg;

export const APPROVAL_PHRASE =
  "APPROVE OUTCOME LEDGER PRODUCTION MIGRATION, PR 180 MERGE, AND PRODUCTION DEPLOYMENT";
export const MIGRATION_VERSION = "20260819223000";
export const MIGRATION_NAME = "admin_outcome_ledger";
export const MIGRATION_FILE = `${MIGRATION_VERSION}_${MIGRATION_NAME}.sql`;
export const MIGRATION_SHA256 =
  "faff279ee3a5e1ec24d7a6ad160b41d84e0c33a2d43120a0be13fcd35422b035";
export const EXPECTED_DATABASE = "neondb";
export const EXPECTED_OWNER = "neondb_owner";
export const EXPECTED_ENDPOINT_ID = "ep-proud-bonus-autwv60g";
export const EXPECTED_HOSTNAME =
  "ep-proud-bonus-autwv60g.c-10.us-east-1.aws.neon.tech";

const MODULE_URL = new URL(import.meta.url);
const ROOT = MODULE_URL.protocol === "file:"
  ? resolve(dirname(fileURLToPath(MODULE_URL)), "..")
  : resolve(process.cwd());
const MIGRATION_PATH = join(ROOT, "supabase", "migrations", MIGRATION_FILE);

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}: ${detail}` : code);
  error.code = code;
  throw error;
}

function decodeUrlPart(value, code) {
  try {
    return decodeURIComponent(value);
  } catch {
    fail(code);
  }
}

export function parseProductionDatabaseUrl(raw) {
  if (!raw) fail("production_database_url_missing");

  let url;
  try {
    url = new URL(raw);
  } catch {
    fail("production_database_url_invalid");
  }

  if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)) {
    fail("production_database_protocol_invalid");
  }

  const username = decodeUrlPart(url.username, "production_database_username_invalid");
  const password = decodeUrlPart(url.password, "production_database_password_invalid");
  const database = decodeUrlPart(
    url.pathname.replace(/^\//, ""),
    "production_database_name_invalid",
  );
  const hostname = url.hostname.toLowerCase();
  const endpointId = hostname.split(".")[0]?.replace(/-pooler$/, "") ?? "";

  if (!username || !password) fail("production_database_credentials_incomplete");
  if (username !== EXPECTED_OWNER) fail("production_database_owner_mismatch");
  if (database !== EXPECTED_DATABASE) fail("production_database_name_mismatch");
  if (!hostname.endsWith(".neon.tech")) fail("production_database_host_not_neon");
  if (hostname.includes("-pooler.")) fail("production_database_must_be_unpooled");
  if (endpointId !== EXPECTED_ENDPOINT_ID) fail("production_database_endpoint_mismatch");
  if (hostname !== EXPECTED_HOSTNAME) fail("production_database_hostname_mismatch");
  if (url.port && url.port !== "5432") fail("production_database_port_mismatch");
  if (url.hash) fail("production_database_url_fragment_forbidden");

  const allowedParameters = new Set(["sslmode", "channel_binding"]);
  const unexpectedParameters = [...new Set(url.searchParams.keys())].filter(
    (name) => !allowedParameters.has(name),
  );
  if (unexpectedParameters.length) {
    fail("production_database_url_parameter_forbidden", unexpectedParameters.join(","));
  }
  for (const requiredParameter of allowedParameters) {
    if (url.searchParams.getAll(requiredParameter).length !== 1) {
      fail("production_database_url_parameter_ambiguous", requiredParameter);
    }
  }

  const sslmode = url.searchParams.get("sslmode");
  if (!new Set(["require", "verify-ca", "verify-full"]).has(sslmode ?? "")) {
    fail("production_database_tls_required");
  }
  const channelBinding = url.searchParams.get("channel_binding");
  if (channelBinding !== "require") fail("production_database_channel_binding_required");

  return {
    raw,
    username,
    password,
    database,
    hostname,
    port: url.port || "5432",
    sslmode,
    channelBinding,
    endpointId,
    minimumRestoreEntries: 100,
    safeIdentity: {
      provider: "neon_postgres",
      project: "bitter-star-20214385",
      branch: "br-round-base-auh6h2wd",
      endpoint_id: endpointId,
      database,
      owner: username,
      pooled: false,
      tls: true,
    },
  };
}

export function assertExecutionApproval(value) {
  if (value !== APPROVAL_PHRASE) fail("exact_production_approval_missing");
  return true;
}

export function parseMode(argv) {
  const selected = ["--plan", "--preflight", "--verify", "--execute"].filter((flag) =>
    argv.includes(flag),
  );
  if (selected.length > 1) fail("cutover_mode_conflict");
  if (argv.includes("--help")) return "help";
  return selected[0]?.slice(2) ?? "plan";
}

export function buildLedgerInsert(columns) {
  const set = new Set(columns);
  if (!set.has("version")) fail("migration_ledger_version_column_missing");

  const names = ["version"];
  const values = ["$1"];
  const params = [MIGRATION_VERSION];

  if (set.has("statements")) {
    names.push("statements");
    values.push(`$${params.length + 1}::text[]`);
    params.push([]);
  }
  if (set.has("name")) {
    names.push("name");
    values.push(`$${params.length + 1}`);
    params.push(MIGRATION_NAME);
  }

  return {
    text: `INSERT INTO supabase_migrations.schema_migrations (${names.join(", ")})\nVALUES (${values.join(", ")})\nON CONFLICT (version) DO NOTHING`,
    params,
  };
}

export function validatePreflight(snapshot) {
  const checks = {
    database: snapshot.database === EXPECTED_DATABASE,
    owner: snapshot.owner === EXPECTED_OWNER,
    postgres_major: String(snapshot.server_version ?? "").startsWith("18."),
    can_create_public: snapshot.can_create_public === true,
    leads_table: snapshot.leads_table === true,
    audit_logs_table: snapshot.audit_logs_table === true,
    lead_outcomes_table: snapshot.lead_outcomes_table === true,
    outcome_unique_index: snapshot.outcome_unique_index === true,
    outcome_unique_index_valid: snapshot.outcome_unique_index_valid === true,
    migration_ledger: snapshot.migration_ledger === true,
    service_role: snapshot.service_role === true,
    service_role_bypassrls: snapshot.service_role_bypassrls === true,
    service_role_schema_usage: snapshot.service_role_schema_usage === true,
    service_role_v1_execute: snapshot.service_role_v1_execute === true,
    service_role_leads_select: snapshot.service_role_leads_select === true,
    service_role_leads_update: snapshot.service_role_leads_update === true,
    service_role_audit_select: snapshot.service_role_audit_select === true,
    service_role_audit_insert: snapshot.service_role_audit_insert === true,
    service_role_outcomes_select: snapshot.service_role_outcomes_select === true,
    service_role_outcomes_insert: snapshot.service_role_outcomes_insert === true,
    service_role_outcomes_update: snapshot.service_role_outcomes_update === true,
    v1_present: snapshot.v1_present === true,
    v2_absent: snapshot.v2_present === false,
    target_migration_absent: Number(snapshot.target_migration_count) === 0,
    target_outcomes_absent: Number(snapshot.target_outcome_count) === 0,
  };
  const failures = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  if (failures.length) fail("production_preflight_failed", failures.join(","));

  const missingRequiredColumns = snapshot.missing_required_columns ?? [];
  if (!Array.isArray(missingRequiredColumns) || missingRequiredColumns.length) {
    fail(
      "production_schema_required_columns_missing",
      Array.isArray(missingRequiredColumns)
        ? missingRequiredColumns.join(",")
        : "invalid_required_column_snapshot",
    );
  }

  const requiredColumns = new Set(snapshot.ledger_required_columns ?? []);
  for (const supported of ["version", "statements", "name"]) requiredColumns.delete(supported);
  if (requiredColumns.size) {
    fail("migration_ledger_unsupported_required_columns", [...requiredColumns].join(","));
  }
  buildLedgerInsert(snapshot.ledger_columns ?? []);
  return checks;
}

export function validatePostflight(before, after) {
  const checks = {
    database: after.database === EXPECTED_DATABASE,
    owner: after.owner === EXPECTED_OWNER,
    v1_present: after.v1_present === true,
    v2_present: after.v2_present === true,
    v2_owner_expected: after.v2_owner === EXPECTED_OWNER,
    v2_security_invoker: after.v2_security_definer === false,
    v2_search_path_locked: after.v2_search_path_locked === true,
    service_role_v1_execute: after.service_role_v1_execute === true,
    service_role_execute: after.service_role_execute === true,
    public_execute_denied: after.public_execute === false,
    browser_role_execute_denied: Number(after.browser_role_execute_count) === 0,
    target_migration_once: Number(after.target_migration_count) === 1,
    lead_count_unchanged: Number(after.lead_count) === Number(before.lead_count),
    lead_status_unchanged: after.lead_status_digest === before.lead_status_digest,
    backfill_complete:
      Number(after.target_outcome_count) === Number(before.backfill_eligible_count),
    backfill_flag_parity: Number(after.target_flag_mismatch_count) === 0,
    backfill_metadata_complete: Number(after.target_metadata_mismatch_count) === 0,
    backfill_revenue_not_invented: Number(after.target_amount_count) === 0,
  };
  const failures = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  if (failures.length) fail("production_postflight_failed", failures.join(","));
  return checks;
}

export function redactError(value) {
  return String(value ?? "")
    .replace(/postgres(?:ql)?:\/\/[^\s'\"]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/(password\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .slice(0, 1_500);
}

/**
 * @param {ReturnType<typeof parseProductionDatabaseUrl>} target
 * @param {Record<string, string | undefined>} parentEnv
 */
export function postgresUtilityEnv(target, parentEnv = process.env) {
  const childEnv = {};
  for (const key of ["PATH", "LANG", "LC_ALL", "LC_CTYPE", "TMPDIR", "TZ"]) {
    if (parentEnv[key]) childEnv[key] = parentEnv[key];
  }
  childEnv.PGHOST = target.hostname;
  childEnv.PGPORT = target.port;
  childEnv.PGDATABASE = target.database;
  childEnv.PGUSER = target.username;
  childEnv.PGPASSWORD = target.password;
  childEnv.PGSSLMODE = target.sslmode || "require";
  childEnv.PGCHANNELBINDING = target.channelBinding || "require";
  childEnv.PGAPPNAME = "amm_phase9_outcome_cutover";
  return childEnv;
}

function runProgram(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: options.timeout ?? 120_000,
    env: options.env,
  });
  if (result.error || result.status !== 0) {
    fail(
      options.code ?? `${basename(command)}_failed`,
      redactError(result.error?.message || result.stderr || result.stdout),
    );
  }
  return result.stdout ?? "";
}

export async function migrationSource() {
  const sql = await readFile(MIGRATION_PATH, "utf8");
  const sha256 = createHash("sha256").update(sql).digest("hex");
  if (sha256 !== MIGRATION_SHA256) fail("reviewed_migration_hash_mismatch");
  return { sql, sha256 };
}

async function sha256File(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function createBackup(target) {
  process.umask(0o077);
  const configured = process.env.AMM_PHASE9_BACKUP_DIR?.trim();
  const directory = configured
    ? resolve(configured)
    : await mkdtemp(join(tmpdir(), "amm-phase9-outcome-cutover-"));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(directory, `ask-magic-mike-pre-outcome-${timestamp}.dump`);
  const env = postgresUtilityEnv(target);
  try {
    runProgram(
      "pg_dump",
      ["--format=custom", "--no-owner", "--no-privileges", "--file", file],
      { env, code: "production_backup_failed", timeout: 90_000 },
    );
    await chmod(file, 0o600);

    const metadata = await stat(file);
    if (!metadata.isFile() || metadata.size < 1_024) fail("production_backup_too_small");
    const restoreList = runProgram("pg_restore", ["--list", file], {
      env,
      code: "production_backup_validation_failed",
      timeout: 30_000,
    });
    const restoreEntries = restoreList
      .split("\n")
      .filter((line) => /^\d+;/.test(line.trim())).length;
    const minimumRestoreEntries = target.minimumRestoreEntries ?? 100;
    if (restoreEntries < minimumRestoreEntries) fail("production_backup_restore_list_incomplete");

    const sha256 = await sha256File(file);
    return { file, bytes: metadata.size, sha256, restore_entries: restoreEntries };
  } catch (error) {
    await rm(file, { force: true }).catch(() => undefined);
    throw error;
  }
}

const PREFLIGHT_SQL = `
SELECT jsonb_build_object(
  'database', current_database(),
  'owner', current_user,
  'server_version', current_setting('server_version'),
  'can_create_public', has_schema_privilege(current_user, 'public', 'CREATE'),
  'leads_table', to_regclass('public.leads') IS NOT NULL,
  'audit_logs_table', to_regclass('public.audit_logs') IS NOT NULL,
  'lead_outcomes_table', to_regclass('public.lead_outcomes') IS NOT NULL,
  'outcome_unique_index', to_regclass('public.lead_outcomes_external_idx') IS NOT NULL,
  'outcome_unique_index_valid', EXISTS (
    SELECT 1
    FROM pg_index i
    WHERE i.indexrelid = to_regclass('public.lead_outcomes_external_idx')
      AND i.indrelid = to_regclass('public.lead_outcomes')
      AND i.indisunique
      AND i.indisvalid
      AND i.indisready
      AND i.indislive
      AND i.indpred IS NOT NULL
  ),
  'migration_ledger', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
  'service_role', EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role'),
  'service_role_bypassrls', COALESCE((
    SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role'
  ), false),
  'service_role_schema_usage', CASE
    WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
      THEN has_schema_privilege('service_role', 'public', 'USAGE')
    ELSE false
  END,
  'service_role_v1_execute', CASE
    WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
      THEN COALESCE(has_function_privilege(
        'service_role',
        to_regprocedure('public.mutate_admin_lead_status_v1(uuid,text,text,jsonb,text,text,timestamptz)'),
        'EXECUTE'
      ), false)
    ELSE false
  END,
  'service_role_leads_select', CASE
    WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
      THEN COALESCE(has_table_privilege('service_role', to_regclass('public.leads'), 'SELECT'), false)
    ELSE false
  END,
  'service_role_leads_update', CASE
    WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
      THEN COALESCE(has_table_privilege('service_role', to_regclass('public.leads'), 'UPDATE'), false)
    ELSE false
  END,
  'service_role_audit_select', CASE
    WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
      THEN COALESCE(has_table_privilege('service_role', to_regclass('public.audit_logs'), 'SELECT'), false)
    ELSE false
  END,
  'service_role_audit_insert', CASE
    WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
      THEN COALESCE(has_table_privilege('service_role', to_regclass('public.audit_logs'), 'INSERT'), false)
    ELSE false
  END,
  'service_role_outcomes_select', CASE
    WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
      THEN COALESCE(has_table_privilege('service_role', to_regclass('public.lead_outcomes'), 'SELECT'), false)
    ELSE false
  END,
  'service_role_outcomes_insert', CASE
    WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
      THEN COALESCE(has_table_privilege('service_role', to_regclass('public.lead_outcomes'), 'INSERT'), false)
    ELSE false
  END,
  'service_role_outcomes_update', CASE
    WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
      THEN COALESCE(has_table_privilege('service_role', to_regclass('public.lead_outcomes'), 'UPDATE'), false)
    ELSE false
  END,
  'v1_present', to_regprocedure('public.mutate_admin_lead_status_v1(uuid,text,text,jsonb,text,text,timestamptz)') IS NOT NULL,
  'v2_present', to_regprocedure('public.mutate_admin_lead_status_v2(uuid,text,text,jsonb,text,numeric,text,timestamptz)') IS NOT NULL,
  'target_migration_count', (
    SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '${MIGRATION_VERSION}'
  ),
  'lead_count', (SELECT count(*) FROM public.leads),
  'lead_status_digest', (
    SELECT md5(COALESCE(string_agg(id::text || ':' || COALESCE(status, ''), ',' ORDER BY id), ''))
    FROM public.leads
  ),
  'backfill_eligible_count', (
    SELECT count(*) FROM public.leads
    WHERE status IN ('qualified', 'appointment_set', 'converted', 'dead', 'spam')
  ),
  'target_outcome_count', (
    SELECT count(*) FROM public.lead_outcomes
    WHERE source_system = 'admin_lead_lifecycle'
      AND external_id LIKE 'admin_lifecycle:%'
  ),
  'missing_required_columns', COALESCE((
    SELECT jsonb_agg(
      required.table_schema || '.' || required.table_name || '.' || required.column_name
      ORDER BY required.table_schema, required.table_name, required.column_name
    )
    FROM (VALUES
      ('public', 'leads', 'id'),
      ('public', 'leads', 'status'),
      ('public', 'leads', 'is_test'),
      ('public', 'leads', 'communication_suppressed'),
      ('public', 'leads', 'appointment_requested'),
      ('public', 'leads', 'last_contacted_at'),
      ('public', 'leads', 'conversion_stage'),
      ('public', 'leads', 'converted_at'),
      ('public', 'leads', 'closed_won_at'),
      ('public', 'leads', 'closed_lost_at'),
      ('public', 'leads', 'closed_lost_reason'),
      ('public', 'leads', 'updated_at'),
      ('public', 'leads', 'created_at'),
      ('public', 'audit_logs', 'id'),
      ('public', 'audit_logs', 'actor'),
      ('public', 'audit_logs', 'action'),
      ('public', 'audit_logs', 'resource_type'),
      ('public', 'audit_logs', 'resource_id'),
      ('public', 'audit_logs', 'before_state'),
      ('public', 'audit_logs', 'after_state'),
      ('public', 'audit_logs', 'metadata'),
      ('public', 'lead_outcomes', 'id'),
      ('public', 'lead_outcomes', 'lead_id'),
      ('public', 'lead_outcomes', 'outcome_type'),
      ('public', 'lead_outcomes', 'amount_usd'),
      ('public', 'lead_outcomes', 'occurred_at'),
      ('public', 'lead_outcomes', 'source_system'),
      ('public', 'lead_outcomes', 'external_id'),
      ('public', 'lead_outcomes', 'is_test'),
      ('public', 'lead_outcomes', 'communication_suppressed'),
      ('public', 'lead_outcomes', 'metadata'),
      ('public', 'lead_outcomes', 'updated_at')
    ) AS required(table_schema, table_name, column_name)
    LEFT JOIN information_schema.columns actual
      ON actual.table_schema = required.table_schema
     AND actual.table_name = required.table_name
     AND actual.column_name = required.column_name
    WHERE actual.column_name IS NULL
  ), '[]'::jsonb),
  'ledger_columns', COALESCE((
    SELECT jsonb_agg(column_name ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'
  ), '[]'::jsonb),
  'ledger_required_columns', COALESCE((
    SELECT jsonb_agg(column_name ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'supabase_migrations'
      AND table_name = 'schema_migrations'
      AND is_nullable = 'NO'
      AND column_default IS NULL
      AND is_identity = 'NO'
  ), '[]'::jsonb)
) AS snapshot`;

const POSTFLIGHT_SQL = `
WITH target_function AS (
  SELECT
    p.oid,
    p.proacl,
    p.proowner,
    p.prosecdef,
    p.proconfig,
    pg_get_userbyid(p.proowner) AS function_owner
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.oid = to_regprocedure('public.mutate_admin_lead_status_v2(uuid,text,text,jsonb,text,numeric,text,timestamptz)')
)
SELECT jsonb_build_object(
  'database', current_database(),
  'owner', current_user,
  'v1_present', to_regprocedure('public.mutate_admin_lead_status_v1(uuid,text,text,jsonb,text,text,timestamptz)') IS NOT NULL,
  'v2_present', EXISTS (SELECT 1 FROM target_function),
  'v2_owner', (SELECT function_owner FROM target_function),
  'v2_security_definer', COALESCE((SELECT prosecdef FROM target_function), true),
  'v2_search_path_locked', COALESCE((
    SELECT proconfig @> ARRAY['search_path=public, pg_temp']::text[] FROM target_function
  ), false),
  'service_role_v1_execute', COALESCE(has_function_privilege(
    'service_role',
    to_regprocedure('public.mutate_admin_lead_status_v1(uuid,text,text,jsonb,text,text,timestamptz)'),
    'EXECUTE'
  ), false),
  'service_role_execute', COALESCE((
    SELECT has_function_privilege('service_role', oid, 'EXECUTE') FROM target_function
  ), false),
  'public_execute', EXISTS (
    SELECT 1
    FROM target_function f
    CROSS JOIN LATERAL aclexplode(COALESCE(f.proacl, acldefault('f', f.proowner))) acl
    WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
  ),
  'browser_role_execute_count', (
    SELECT count(*)
    FROM pg_roles browser_role
    CROSS JOIN target_function f
    WHERE browser_role.rolname IN ('anon', 'authenticated')
      AND has_function_privilege(browser_role.rolname, f.oid, 'EXECUTE')
  ),
  'target_migration_count', (
    SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '${MIGRATION_VERSION}'
  ),
  'lead_count', (SELECT count(*) FROM public.leads),
  'lead_status_digest', (
    SELECT md5(COALESCE(string_agg(id::text || ':' || COALESCE(status, ''), ',' ORDER BY id), ''))
    FROM public.leads
  ),
  'backfill_eligible_count', (
    SELECT count(*) FROM public.leads
    WHERE status IN ('qualified', 'appointment_set', 'converted', 'dead', 'spam')
  ),
  'target_outcome_count', (
    SELECT count(*) FROM public.lead_outcomes
    WHERE source_system = 'admin_lead_lifecycle'
      AND external_id LIKE 'admin_lifecycle:%'
  ),
  'target_flag_mismatch_count', (
    SELECT count(*)
    FROM public.lead_outcomes o
    JOIN public.leads l ON l.id = o.lead_id
    WHERE o.source_system = 'admin_lead_lifecycle'
      AND o.external_id LIKE 'admin_lifecycle:%'
      AND (o.is_test IS DISTINCT FROM l.is_test
        OR o.communication_suppressed IS DISTINCT FROM l.communication_suppressed)
  ),
  'target_metadata_mismatch_count', (
    SELECT count(*) FROM public.lead_outcomes
    WHERE source_system = 'admin_lead_lifecycle'
      AND external_id LIKE 'admin_lifecycle:%'
      AND (
        metadata->>'backfilled' IS DISTINCT FROM 'true'
        OR metadata->>'migration' IS DISTINCT FROM '20260819223000_admin_outcome_ledger'
      )
  ),
  'target_amount_count', (
    SELECT count(*) FROM public.lead_outcomes
    WHERE source_system = 'admin_lead_lifecycle'
      AND external_id LIKE 'admin_lifecycle:%'
      AND amount_usd IS NOT NULL
  )
) AS snapshot`;

async function readSnapshot(client, sql) {
  const result = await client.query(sql);
  const snapshot = result.rows[0]?.snapshot;
  if (!snapshot || typeof snapshot !== "object") fail("production_snapshot_invalid");
  return snapshot;
}

async function connect(target) {
  const client = new Client({
    connectionString: target.raw,
    enableChannelBinding: true,
    application_name: "amm_phase9_outcome_cutover",
    connectionTimeoutMillis: 15_000,
    query_timeout: 130_000,
  });
  await client.connect();
  return client;
}

export async function preflight(target) {
  const client = await connect(target);
  try {
    const snapshot = await readSnapshot(client, PREFLIGHT_SQL);
    const checks = validatePreflight(snapshot);
    return { snapshot, checks };
  } finally {
    await client.end();
  }
}

export async function verify(target) {
  const client = await connect(target);
  try {
    const snapshot = await readSnapshot(client, POSTFLIGHT_SQL);
    const checks = validatePostflight(snapshot, snapshot);
    return { snapshot, checks };
  } finally {
    await client.end();
  }
}

export async function execute(target, source, baseline) {
  const client = await connect(target);
  let backup;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '120s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '180s'");
    const advisoryLock = await client.query(
      "SELECT pg_try_advisory_xact_lock(hashtext($1), hashtext($2)) AS acquired",
      ["amm_phase9_outcome_cutover", MIGRATION_VERSION],
    );
    if (advisoryLock.rows[0]?.acquired !== true) fail("production_cutover_already_running");
    await client.query(
      "LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE",
    );
    await client.query("LOCK TABLE public.leads, public.lead_outcomes IN SHARE MODE");

    const lockedBaseline = await readSnapshot(client, PREFLIGHT_SQL);
    validatePreflight(lockedBaseline);
    if (
      lockedBaseline.lead_status_digest !== baseline.lead_status_digest ||
      Number(lockedBaseline.lead_count) !== Number(baseline.lead_count)
    ) {
      fail("production_changed_since_preflight");
    }

    backup = await createBackup(target);
    await client.query(source.sql);

    const ledgerInsert = buildLedgerInsert(lockedBaseline.ledger_columns ?? []);
    await client.query(ledgerInsert.text, ledgerInsert.params);

    const after = await readSnapshot(client, POSTFLIGHT_SQL);
    const checks = validatePostflight(lockedBaseline, after);
    await client.query("COMMIT");
    return { before: lockedBaseline, after, checks, backup };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (backup && error && typeof error === "object") error.backup = backup;
    throw error;
  } finally {
    await client.end();
  }
}

function safeSnapshot(snapshot) {
  return {
    database: snapshot.database,
    owner: snapshot.owner,
    server_version: snapshot.server_version,
    lead_count: Number(snapshot.lead_count),
    lead_status_digest: snapshot.lead_status_digest,
    backfill_eligible_count: Number(snapshot.backfill_eligible_count ?? 0),
    target_outcome_count: Number(snapshot.target_outcome_count ?? 0),
    target_migration_count: Number(snapshot.target_migration_count ?? 0),
    v1_present: snapshot.v1_present,
    v2_present: snapshot.v2_present,
    v2_owner: snapshot.v2_owner,
    v2_security_definer: snapshot.v2_security_definer,
    v2_search_path_locked: snapshot.v2_search_path_locked,
    service_role_v1_execute: snapshot.service_role_v1_execute,
    service_role_execute: snapshot.service_role_execute,
    public_execute: snapshot.public_execute,
    browser_role_execute_count: Number(snapshot.browser_role_execute_count ?? 0),
    target_flag_mismatch_count: Number(snapshot.target_flag_mismatch_count ?? 0),
    target_metadata_mismatch_count: Number(snapshot.target_metadata_mismatch_count ?? 0),
    target_amount_count: Number(snapshot.target_amount_count ?? 0),
  };
}

function safeBackup(backup) {
  if (!backup || typeof backup !== "object") return undefined;
  return {
    file: backup.file,
    bytes: Number(backup.bytes),
    sha256: backup.sha256,
    restore_entries: Number(backup.restore_entries),
  };
}

export function plan() {
  return {
    operation: "phase9_outcome_ledger_production_cutover",
    mutates_production: false,
    target: {
      provider: "neon_postgres",
      project: "bitter-star-20214385",
      branch: "production / br-round-base-auh6h2wd",
      endpoint_id: EXPECTED_ENDPOINT_ID,
      hostname: EXPECTED_HOSTNAME,
      database: EXPECTED_DATABASE,
      owner: EXPECTED_OWNER,
      connection: "unpooled TLS only",
    },
    migration: {
      file: MIGRATION_FILE,
      version: MIGRATION_VERSION,
      sha256: MIGRATION_SHA256,
    },
    modes: {
      plan: "offline and read-only",
      preflight: "database read-only",
      verify: "fail-closed database read-only postcondition verification",
      execute: "exact approval plus backup and one guarded transaction",
    },
    required_environment: [
      "AMM_PRODUCTION_DATABASE_URL (secure environment only)",
      "AMM_PRODUCTION_APPROVAL (exact phrase; execute only)",
    ],
  };
}

function help() {
  return `${JSON.stringify(plan(), null, 2)}\n\nUsage:\n  pnpm run phase9:outcome:cutover -- --plan\n  pnpm run phase9:outcome:cutover -- --preflight\n  pnpm run phase9:outcome:cutover -- --verify\n  pnpm run phase9:outcome:cutover -- --execute\n\nNever paste the database URL into chat or a command argument. Enter it only through a secure environment interface.`;
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode === "help") {
    console.log(help());
    return;
  }

  const source = await migrationSource();
  if (mode === "plan") {
    console.log(JSON.stringify({ ...plan(), migration_verified: source.sha256 === MIGRATION_SHA256 }, null, 2));
    return;
  }

  if (mode === "execute") {
    assertExecutionApproval(process.env.AMM_PRODUCTION_APPROVAL);
  }
  const target = parseProductionDatabaseUrl(process.env.AMM_PRODUCTION_DATABASE_URL);
  if (mode === "preflight") {
    const result = await preflight(target);
    console.log(
      JSON.stringify(
        { ok: true, mode, target: target.safeIdentity, snapshot: safeSnapshot(result.snapshot), checks: result.checks },
        null,
        2,
      ),
    );
    return;
  }
  if (mode === "verify") {
    const result = await verify(target);
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode,
          target: target.safeIdentity,
          snapshot: safeSnapshot(result.snapshot),
          checks: result.checks,
        },
        null,
        2,
      ),
    );
    return;
  }

  const initial = await preflight(target);
  const result = await execute(target, source, initial.snapshot);
  console.log(
    JSON.stringify(
      {
        ok: true,
        mode,
        target: target.safeIdentity,
        migration: { version: MIGRATION_VERSION, sha256: source.sha256 },
        before: safeSnapshot(result.before),
        after: safeSnapshot(result.after),
        checks: result.checks,
        backup: result.backup,
        next: "Merge PR #180 and verify the canonical Vercel Production deployment. Retain the mode-600 backup until application verification passes.",
      },
      null,
      2,
    ),
  );
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  main().catch((error) => {
    console.error(
      JSON.stringify({
        ok: false,
        error: error?.code ?? "cutover_failed",
        detail: redactError(error?.message),
        ...(error?.backup ? { backup: safeBackup(error.backup) } : {}),
      }),
    );
    process.exit(1);
  });
}
