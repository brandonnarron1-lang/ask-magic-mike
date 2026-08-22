#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildLedgerInsert,
  connect,
  createBackup,
  parseMode,
  parseProductionDatabaseUrl,
  readSnapshot,
  redactError,
  safeBackup,
} from "./phase9-outcome-production-cutover.mjs";

export const APPROVAL_PHRASE =
  "APPROVE PHASE 9 OWNED-DEMAND WORDPRESS PROOF MIGRATION, PR 185 MERGE, AND PRODUCTION DEPLOYMENT";
export const MIGRATION_VERSION = "20260822195000";
export const MIGRATION_NAME = "owned_demand_wordpress_proof_scope";
export const MIGRATION_FILE = `${MIGRATION_VERSION}_${MIGRATION_NAME}.sql`;
export const MIGRATION_SHA256 =
  "9f99315408b5d9b9b4dfbace3c915cdda33247fe66a3348b26486bd896c202ba";
export const APPLICATION_NAME = "amm_phase9_wordpress_proof_scope_cutover";

const PREDECESSOR_MIGRATION_VERSION = "20260821170000";
const MODULE_URL = new URL(import.meta.url);
const ROOT = MODULE_URL.protocol === "file:"
  ? resolve(dirname(fileURLToPath(MODULE_URL)), "..")
  : resolve(process.cwd());
const MIGRATION_PATH = join(ROOT, "supabase", "migrations", MIGRATION_FILE);
const V2_CONSTRAINT_NAMES = [
  "owned_demand_publication_channel_scope_v2",
  "owned_demand_publication_placement_scope_v2",
  "owned_demand_publication_evidence_host_v2",
  "owned_demand_publication_attribution_v2",
  "owned_demand_publication_content_v2",
  "owned_demand_publication_state_scope_v2",
];

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}: ${detail}` : code);
  error.code = code;
  throw error;
}

export function assertExecutionApproval(value) {
  if (value !== APPROVAL_PHRASE) {
    fail("exact_wordpress_proof_scope_production_approval_missing");
  }
  return true;
}

export async function migrationSource() {
  const sql = await readFile(MIGRATION_PATH, "utf8");
  const sha256 = createHash("sha256").update(sql).digest("hex");
  if (sha256 !== MIGRATION_SHA256) {
    fail("reviewed_wordpress_proof_scope_migration_hash_mismatch");
  }
  return { sql, sha256 };
}

export function hasWordpressScopeConstraintMarkers(definitions) {
  if (typeof definitions !== "string") return false;
  return [
    "ourtown_wordpress",
    "ourtownproperties",
    "owned_media",
    "wordpress_ask_magic_mike_seller_review",
    "wordpress_ask_magic_mike_buyer_match",
    "wordpress_ask_magic_mike_renter_plan",
    "wordpress_homepage_ask_mike",
    "wordpress_home_value_page",
    "wordpress_we_buy_homes",
    "wordpress_mike_agent_page",
    "wordpress_listing_buyer",
    "wordpress_rental_to_homeownership",
    "wordpress_ask_magic_mike_embed",
    "channel_key <> 'ourtown_wordpress'",
    "configured",
    "removed",
    "access[_-]?token",
    "api[_-]?key",
    "authorization",
    "password",
    "secret",
  ].every((marker) => definitions.includes(marker));
}

export function validatePreflight(snapshot) {
  const checks = {
    database: snapshot.database === "neondb",
    owner: snapshot.owner === "neondb_owner",
    postgres_major: String(snapshot.server_version ?? "").startsWith("18."),
    can_alter_publication_table: snapshot.can_alter_publication_table === true,
    leads_table: snapshot.leads_table === true,
    audit_logs_table: snapshot.audit_logs_table === true,
    publication_table: snapshot.publication_table_present === true,
    publication_table_owner: snapshot.publication_table_owner === "neondb_owner",
    publication_table_rls: snapshot.publication_table_rls === true,
    publication_function: snapshot.publication_function_present === true,
    publication_function_invoker: snapshot.publication_function_security_definer === false,
    publication_function_search_path: snapshot.publication_function_search_path_locked === true,
    immutable_trigger: snapshot.immutable_trigger === true,
    migration_ledger: snapshot.migration_ledger === true,
    service_role: snapshot.service_role === true,
    service_role_bypassrls: snapshot.service_role_bypassrls === true,
    service_role_select: snapshot.service_role_table_select === true,
    service_role_insert: snapshot.service_role_table_insert === true,
    service_role_update_denied: snapshot.service_role_table_update === false,
    service_role_delete_denied: snapshot.service_role_table_delete === false,
    public_table_access_denied: snapshot.public_table_access === false,
    browser_table_access_denied: Number(snapshot.browser_role_table_access_count) === 0,
    predecessor_migration_once: Number(snapshot.predecessor_migration_count) === 1,
    target_migration_absent: Number(snapshot.target_migration_count) === 0,
    v2_constraints_absent: Number(snapshot.v2_constraint_count) === 0,
    wordpress_scope_absent: Number(snapshot.wordpress_constraint_count) === 0,
    legacy_channel_constraint: Number(snapshot.legacy_channel_constraint_count) === 1,
    legacy_placement_constraint: Number(snapshot.legacy_placement_constraint_count) === 1,
    legacy_evidence_constraint: Number(snapshot.legacy_evidence_constraint_count) === 1,
    legacy_attribution_constraint: Number(snapshot.legacy_attribution_constraint_count) === 1,
    legacy_content_constraint: Number(snapshot.legacy_content_constraint_count) === 1,
    legacy_state_constraint: Number(snapshot.legacy_state_constraint_count) === 1,
  };
  const failures = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  if (failures.length) {
    fail("wordpress_proof_scope_production_preflight_failed", failures.join(","));
  }

  const requiredColumns = new Set(snapshot.ledger_required_columns ?? []);
  for (const supported of ["version", "statements", "name"]) {
    requiredColumns.delete(supported);
  }
  if (requiredColumns.size) {
    fail(
      "wordpress_proof_scope_migration_ledger_unsupported_required_columns",
      [...requiredColumns].join(","),
    );
  }
  buildLedgerInsert(
    snapshot.ledger_columns ?? [],
    MIGRATION_VERSION,
    MIGRATION_NAME,
  );
  return checks;
}

export function validatePostflight(before, after) {
  const checks = {
    database: after.database === "neondb",
    owner: after.owner === "neondb_owner",
    publication_table: after.publication_table_present === true,
    publication_table_owner: after.publication_table_owner === "neondb_owner",
    publication_table_rls: after.publication_table_rls === true,
    immutable_trigger: after.immutable_trigger === true,
    publication_function: after.publication_function_present === true,
    publication_function_invoker: after.publication_function_security_definer === false,
    publication_function_search_path: after.publication_function_search_path_locked === true,
    six_v2_constraints: Number(after.v2_constraint_count) === V2_CONSTRAINT_NAMES.length,
    six_v2_constraints_validated:
      Number(after.v2_validated_constraint_count) === V2_CONSTRAINT_NAMES.length,
    wordpress_scope_contract: hasWordpressScopeConstraintMarkers(
      after.scope_constraint_definitions,
    ),
    predecessor_migration_once: Number(after.predecessor_migration_count) === 1,
    target_migration_once: Number(after.target_migration_count) === 1,
    service_role_select: after.service_role_table_select === true,
    service_role_insert: after.service_role_table_insert === true,
    service_role_update_denied: after.service_role_table_update === false,
    service_role_delete_denied: after.service_role_table_delete === false,
    public_table_access_denied: after.public_table_access === false,
    browser_table_access_denied:
      Number(after.browser_role_table_access_count) === 0,
  };
  if (before) {
    Object.assign(checks, {
      publication_function_unchanged:
        after.publication_function_digest === before.publication_function_digest,
      lead_count_unchanged: Number(after.lead_count) === Number(before.lead_count),
      lead_state_unchanged: after.lead_state_digest === before.lead_state_digest,
      audit_count_unchanged: Number(after.audit_count) === Number(before.audit_count),
      audit_state_unchanged: after.audit_state_digest === before.audit_state_digest,
      proof_count_unchanged: Number(after.proof_count) === Number(before.proof_count),
      proof_state_unchanged: after.proof_state_digest === before.proof_state_digest,
    });
  }
  const failures = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  if (failures.length) {
    fail("wordpress_proof_scope_production_postflight_failed", failures.join(","));
  }
  return checks;
}

export const BASELINE_SQL = `
WITH publication_table AS (
  SELECT c.oid, c.relowner, c.relacl, c.relrowsecurity,
         pg_get_userbyid(c.relowner) AS table_owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'owned_demand_publication_proofs'
     AND c.relkind = 'r'
), publication_function AS (
  SELECT p.oid, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
   WHERE p.oid = to_regprocedure(
     'public.record_owned_demand_publication_proof_v1(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,text,boolean)'
   )
), constraints AS (
  SELECT c.conname, lower(pg_get_constraintdef(c.oid)) AS definition
    FROM pg_constraint c
   WHERE c.conrelid = to_regclass('public.owned_demand_publication_proofs')
     AND c.contype = 'c'
), immutable_trigger AS (
  SELECT 1
    FROM pg_trigger t
   WHERE t.tgrelid = to_regclass('public.owned_demand_publication_proofs')
     AND t.tgname = 'owned_demand_publication_proofs_reject_change'
     AND t.tgenabled <> 'D'
     AND NOT t.tgisinternal
     AND (t.tgtype & 2) = 2
     AND (t.tgtype & 8) = 8
     AND (t.tgtype & 16) = 16
)
SELECT jsonb_build_object(
  'database', current_database(),
  'owner', current_user,
  'server_version', current_setting('server_version'),
  'can_alter_publication_table', COALESCE((
    SELECT table_owner = current_user FROM publication_table
  ), false),
  'leads_table', to_regclass('public.leads') IS NOT NULL,
  'audit_logs_table', to_regclass('public.audit_logs') IS NOT NULL,
  'publication_table_present', EXISTS (SELECT 1 FROM publication_table),
  'publication_table_owner', (SELECT table_owner FROM publication_table),
  'publication_table_rls', COALESCE((SELECT relrowsecurity FROM publication_table), false),
  'publication_function_present', EXISTS (SELECT 1 FROM publication_function),
  'publication_function_security_definer', COALESCE((SELECT prosecdef FROM publication_function), true),
  'publication_function_search_path_locked', COALESCE((
    SELECT proconfig @> ARRAY['search_path=public, pg_temp']::text[] FROM publication_function
  ), false),
  'publication_function_digest', (SELECT md5(definition) FROM publication_function),
  'immutable_trigger', EXISTS (SELECT 1 FROM immutable_trigger),
  'migration_ledger', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
  'service_role', EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role'),
  'service_role_bypassrls', COALESCE((SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role'), false),
  'service_role_table_select', COALESCE(has_table_privilege('service_role', to_regclass('public.owned_demand_publication_proofs'), 'SELECT'), false),
  'service_role_table_insert', COALESCE(has_table_privilege('service_role', to_regclass('public.owned_demand_publication_proofs'), 'INSERT'), false),
  'service_role_table_update', COALESCE(has_table_privilege('service_role', to_regclass('public.owned_demand_publication_proofs'), 'UPDATE'), false),
  'service_role_table_delete', COALESCE(has_table_privilege('service_role', to_regclass('public.owned_demand_publication_proofs'), 'DELETE'), false),
  'public_table_access', EXISTS (
    SELECT 1 FROM publication_table t
    CROSS JOIN LATERAL aclexplode(COALESCE(t.relacl, acldefault('r', t.relowner))) acl
    WHERE acl.grantee = 0
      AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ),
  'browser_role_table_access_count', (
    SELECT count(*) FROM pg_roles r
     WHERE r.rolname IN ('anon', 'authenticated')
       AND (has_table_privilege(r.rolname, to_regclass('public.owned_demand_publication_proofs'), 'SELECT')
         OR has_table_privilege(r.rolname, to_regclass('public.owned_demand_publication_proofs'), 'INSERT')
         OR has_table_privilege(r.rolname, to_regclass('public.owned_demand_publication_proofs'), 'UPDATE')
         OR has_table_privilege(r.rolname, to_regclass('public.owned_demand_publication_proofs'), 'DELETE'))
  ),
  'predecessor_migration_count', (
    SELECT count(*) FROM supabase_migrations.schema_migrations
     WHERE version = '${PREDECESSOR_MIGRATION_VERSION}'
  ),
  'target_migration_count', (
    SELECT count(*) FROM supabase_migrations.schema_migrations
     WHERE version = '${MIGRATION_VERSION}'
  ),
  'v2_constraint_count', (
    SELECT count(*) FROM constraints
     WHERE conname = ANY (ARRAY[${V2_CONSTRAINT_NAMES.map((name) => `'${name}'`).join(", ")}])
  ),
  'wordpress_constraint_count', (
    SELECT count(*) FROM constraints WHERE definition LIKE '%ourtown_wordpress%'
  ),
  'legacy_channel_constraint_count', (
    SELECT count(*) FROM constraints
     WHERE definition LIKE '%channel_key%'
       AND definition LIKE '%google_business_profile%'
       AND definition LIKE '%qr_print%'
       AND definition NOT LIKE '%utm_source%'
       AND definition NOT LIKE '%utm_content%'
       AND definition NOT LIKE '%platform_state%'
       AND definition NOT LIKE '%evidence_url%'
  ),
  'legacy_placement_constraint_count', (
    SELECT count(*) FROM constraints
     WHERE definition LIKE '%placement_key%'
       AND definition LIKE '%general_question%'
       AND definition LIKE '%renter_plan%'
       AND definition NOT LIKE '%channel_key%'
       AND definition NOT LIKE '%utm_content%'
  ),
  'legacy_evidence_constraint_count', (
    SELECT count(*) FROM constraints
     WHERE definition LIKE '%evidence_url%'
       AND definition LIKE '%goo%'
       AND definition LIKE '%facebook%'
       AND definition LIKE '%instagram%'
       AND definition LIKE '%linkedin%'
  ),
  'legacy_attribution_constraint_count', (
    SELECT count(*) FROM constraints
     WHERE definition LIKE '%utm_source%'
       AND definition LIKE '%utm_medium%'
       AND definition LIKE '%google_business_profile%'
       AND definition LIKE '%qr_print%'
  ),
  'legacy_content_constraint_count', (
    SELECT count(*) FROM constraints
     WHERE definition LIKE '%utm_content%'
       AND definition LIKE '%gbp_update%'
       AND definition LIKE '%qr_local_question%'
  ),
  'legacy_state_constraint_count', (
    SELECT count(*) FROM constraints
     WHERE definition LIKE '%platform_state%'
       AND definition LIKE '%channel_key%'
       AND definition LIKE '%google_business_profile%'
       AND definition LIKE '%qr_print%'
       AND definition NOT LIKE '%proof_type%'
  ),
  'lead_count', (SELECT count(*) FROM public.leads),
  'lead_state_digest', (
    SELECT md5(COALESCE(string_agg(concat_ws('|', id::text, COALESCE(status, ''), COALESCE(updated_at::text, '')), ',' ORDER BY id), ''))
      FROM public.leads
  ),
  'audit_count', (SELECT count(*) FROM public.audit_logs),
  'audit_state_digest', (
    SELECT md5(COALESCE(string_agg(concat_ws('|', id::text, action, resource_type, resource_id::text, created_at::text), ',' ORDER BY id), ''))
      FROM public.audit_logs
  ),
  'proof_count', (SELECT count(*) FROM public.owned_demand_publication_proofs),
  'proof_state_digest', (
    SELECT md5(COALESCE(string_agg(concat_ws('|', id::text, idempotency_key, channel_key, placement_key, platform_state, proof_type, campaign_key, utm_source, utm_medium, utm_content, tracked_url, COALESCE(evidence_url, ''), COALESCE(evidence_reference, ''), final_copy_sha256, COALESCE(creative_asset_key, ''), approval_reference, observed_at::text, recorded_by, is_test::text, metadata::text, created_at::text), ',' ORDER BY id), ''))
      FROM public.owned_demand_publication_proofs
  ),
  'ledger_columns', COALESCE((
    SELECT jsonb_agg(column_name ORDER BY ordinal_position)
      FROM information_schema.columns
     WHERE table_schema = 'supabase_migrations'
       AND table_name = 'schema_migrations'
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

export const POSTFLIGHT_SQL = `
WITH publication_table AS (
  SELECT c.relacl, c.relowner, c.relrowsecurity,
         pg_get_userbyid(c.relowner) AS table_owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'owned_demand_publication_proofs'
     AND c.relkind = 'r'
), publication_function AS (
  SELECT p.prosecdef, p.proconfig, pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
   WHERE p.oid = to_regprocedure(
     'public.record_owned_demand_publication_proof_v1(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,text,boolean)'
   )
), v2_constraints AS (
  SELECT c.conname, c.convalidated, lower(pg_get_constraintdef(c.oid)) AS definition
    FROM pg_constraint c
   WHERE c.conrelid = to_regclass('public.owned_demand_publication_proofs')
     AND c.conname = ANY (ARRAY[${V2_CONSTRAINT_NAMES.map((name) => `'${name}'`).join(", ")}])
), immutable_trigger AS (
  SELECT 1 FROM pg_trigger t
   WHERE t.tgrelid = to_regclass('public.owned_demand_publication_proofs')
     AND t.tgname = 'owned_demand_publication_proofs_reject_change'
     AND t.tgenabled <> 'D'
     AND NOT t.tgisinternal
     AND (t.tgtype & 2) = 2
     AND (t.tgtype & 8) = 8
     AND (t.tgtype & 16) = 16
)
SELECT jsonb_build_object(
  'database', current_database(),
  'owner', current_user,
  'publication_table_present', EXISTS (SELECT 1 FROM publication_table),
  'publication_table_owner', (SELECT table_owner FROM publication_table),
  'publication_table_rls', COALESCE((SELECT relrowsecurity FROM publication_table), false),
  'publication_function_present', EXISTS (SELECT 1 FROM publication_function),
  'publication_function_security_definer', COALESCE((SELECT prosecdef FROM publication_function), true),
  'publication_function_search_path_locked', COALESCE((
    SELECT proconfig @> ARRAY['search_path=public, pg_temp']::text[] FROM publication_function
  ), false),
  'publication_function_digest', (SELECT md5(definition) FROM publication_function),
  'immutable_trigger', EXISTS (SELECT 1 FROM immutable_trigger),
  'v2_constraint_count', (SELECT count(*) FROM v2_constraints),
  'v2_validated_constraint_count', (
    SELECT count(*) FROM v2_constraints WHERE convalidated
  ),
  'scope_constraint_definitions', (
    SELECT string_agg(definition, E'\n' ORDER BY conname) FROM v2_constraints
  ),
  'predecessor_migration_count', (
    SELECT count(*) FROM supabase_migrations.schema_migrations
     WHERE version = '${PREDECESSOR_MIGRATION_VERSION}'
  ),
  'target_migration_count', (
    SELECT count(*) FROM supabase_migrations.schema_migrations
     WHERE version = '${MIGRATION_VERSION}'
  ),
  'service_role_table_select', COALESCE(has_table_privilege('service_role', to_regclass('public.owned_demand_publication_proofs'), 'SELECT'), false),
  'service_role_table_insert', COALESCE(has_table_privilege('service_role', to_regclass('public.owned_demand_publication_proofs'), 'INSERT'), false),
  'service_role_table_update', COALESCE(has_table_privilege('service_role', to_regclass('public.owned_demand_publication_proofs'), 'UPDATE'), false),
  'service_role_table_delete', COALESCE(has_table_privilege('service_role', to_regclass('public.owned_demand_publication_proofs'), 'DELETE'), false),
  'public_table_access', EXISTS (
    SELECT 1 FROM publication_table t
    CROSS JOIN LATERAL aclexplode(COALESCE(t.relacl, acldefault('r', t.relowner))) acl
    WHERE acl.grantee = 0
      AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ),
  'browser_role_table_access_count', (
    SELECT count(*) FROM pg_roles r
     WHERE r.rolname IN ('anon', 'authenticated')
       AND (has_table_privilege(r.rolname, to_regclass('public.owned_demand_publication_proofs'), 'SELECT')
         OR has_table_privilege(r.rolname, to_regclass('public.owned_demand_publication_proofs'), 'INSERT')
         OR has_table_privilege(r.rolname, to_regclass('public.owned_demand_publication_proofs'), 'UPDATE')
         OR has_table_privilege(r.rolname, to_regclass('public.owned_demand_publication_proofs'), 'DELETE'))
  ),
  'lead_count', (SELECT count(*) FROM public.leads),
  'lead_state_digest', (
    SELECT md5(COALESCE(string_agg(concat_ws('|', id::text, COALESCE(status, ''), COALESCE(updated_at::text, '')), ',' ORDER BY id), '')) FROM public.leads
  ),
  'audit_count', (SELECT count(*) FROM public.audit_logs),
  'audit_state_digest', (
    SELECT md5(COALESCE(string_agg(concat_ws('|', id::text, action, resource_type, resource_id::text, created_at::text), ',' ORDER BY id), '')) FROM public.audit_logs
  ),
  'proof_count', (SELECT count(*) FROM public.owned_demand_publication_proofs),
  'proof_state_digest', (
    SELECT md5(COALESCE(string_agg(concat_ws('|', id::text, idempotency_key, channel_key, placement_key, platform_state, proof_type, campaign_key, utm_source, utm_medium, utm_content, tracked_url, COALESCE(evidence_url, ''), COALESCE(evidence_reference, ''), final_copy_sha256, COALESCE(creative_asset_key, ''), approval_reference, observed_at::text, recorded_by, is_test::text, metadata::text, created_at::text), ',' ORDER BY id), ''))
      FROM public.owned_demand_publication_proofs
  )
) AS snapshot`;

export async function preflight(target) {
  const client = await connect(target, APPLICATION_NAME);
  try {
    const snapshot = await readSnapshot(client, BASELINE_SQL);
    return { snapshot, checks: validatePreflight(snapshot) };
  } finally {
    await client.end();
  }
}

export async function verify(target) {
  const client = await connect(target, APPLICATION_NAME);
  try {
    const snapshot = await readSnapshot(client, POSTFLIGHT_SQL);
    return { snapshot, checks: validatePostflight(null, snapshot) };
  } finally {
    await client.end();
  }
}

export async function execute(target, source, baseline) {
  const client = await connect(target, APPLICATION_NAME);
  let backup;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '120s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '180s'");
    const advisoryLock = await client.query(
      "SELECT pg_try_advisory_xact_lock(hashtext($1), hashtext($2)) AS acquired",
      [APPLICATION_NAME, MIGRATION_VERSION],
    );
    if (advisoryLock.rows[0]?.acquired !== true) {
      fail("wordpress_proof_scope_production_cutover_already_running");
    }
    await client.query(
      "LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE",
    );
    await client.query(
      "LOCK TABLE public.leads, public.audit_logs, public.owned_demand_publication_proofs IN SHARE MODE",
    );

    const lockedBaseline = await readSnapshot(client, BASELINE_SQL);
    validatePreflight(lockedBaseline);
    for (const field of [
      "lead_count",
      "lead_state_digest",
      "audit_count",
      "audit_state_digest",
      "proof_count",
      "proof_state_digest",
      "publication_function_digest",
    ]) {
      if (String(lockedBaseline[field]) !== String(baseline[field])) {
        fail("wordpress_proof_scope_production_changed_since_preflight", field);
      }
    }

    backup = await createBackup(target, {
      applicationName: APPLICATION_NAME,
      filenamePrefix: "ask-magic-mike-pre-wordpress-proof-scope",
    });
    await client.query(source.sql);
    const ledgerInsert = buildLedgerInsert(
      lockedBaseline.ledger_columns ?? [],
      MIGRATION_VERSION,
      MIGRATION_NAME,
    );
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
    lead_state_digest: snapshot.lead_state_digest,
    audit_count: Number(snapshot.audit_count),
    audit_state_digest: snapshot.audit_state_digest,
    proof_count: Number(snapshot.proof_count),
    proof_state_digest: snapshot.proof_state_digest,
    target_migration_count: Number(snapshot.target_migration_count),
    v2_constraint_count: Number(snapshot.v2_constraint_count),
    v2_validated_constraint_count: Number(
      snapshot.v2_validated_constraint_count ?? 0,
    ),
    publication_table_present: snapshot.publication_table_present,
    publication_table_rls: snapshot.publication_table_rls,
    immutable_trigger: snapshot.immutable_trigger,
  };
}

export function plan() {
  return {
    operation: "phase9_owned_demand_wordpress_proof_scope_production_cutover",
    mutates_production: false,
    target: {
      provider: "neon_postgres",
      project: "bitter-star-20214385",
      branch: "production / br-round-base-auh6h2wd",
      endpoint_id: "ep-proud-bonus-autwv60g",
      database: "neondb",
      owner: "neondb_owner",
      connection: "unpooled TLS only",
    },
    migration: {
      file: MIGRATION_FILE,
      version: MIGRATION_VERSION,
      sha256: MIGRATION_SHA256,
      predecessor: PREDECESSOR_MIGRATION_VERSION,
    },
    modes: {
      plan: "offline and read-only",
      preflight: "database read-only",
      verify: "fail-closed database read-only postcondition verification",
      execute: "exact approval plus validated backup and one guarded transaction",
    },
    required_environment: [
      "AMM_PRODUCTION_DATABASE_URL (secure environment only)",
      "AMM_PRODUCTION_APPROVAL (exact phrase; execute only)",
    ],
  };
}

function help() {
  return `${JSON.stringify(plan(), null, 2)}\n\nUsage:\n  pnpm run phase9:wordpress-proof-scope:cutover -- --plan\n  pnpm run phase9:wordpress-proof-scope:cutover -- --preflight\n  pnpm run phase9:wordpress-proof-scope:cutover -- --verify\n  pnpm run phase9:wordpress-proof-scope:cutover -- --execute\n\nNever paste the database URL into chat or a command argument. Enter it only through a secure environment interface.`;
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode === "help") {
    console.log(help());
    return;
  }
  const source = await migrationSource();
  if (mode === "plan") {
    console.log(JSON.stringify({
      ...plan(),
      migration_verified: source.sha256 === MIGRATION_SHA256,
    }, null, 2));
    return;
  }
  if (mode === "execute") {
    assertExecutionApproval(process.env.AMM_PRODUCTION_APPROVAL);
  }
  const target = parseProductionDatabaseUrl(
    process.env.AMM_PRODUCTION_DATABASE_URL,
  );
  if (mode === "preflight") {
    const result = await preflight(target);
    console.log(JSON.stringify({
      ok: true,
      mode,
      target: target.safeIdentity,
      snapshot: safeSnapshot(result.snapshot),
      checks: result.checks,
    }, null, 2));
    return;
  }
  if (mode === "verify") {
    const result = await verify(target);
    console.log(JSON.stringify({
      ok: true,
      mode,
      target: target.safeIdentity,
      snapshot: safeSnapshot(result.snapshot),
      checks: result.checks,
    }, null, 2));
    return;
  }
  const initial = await preflight(target);
  const result = await execute(target, source, initial.snapshot);
  console.log(JSON.stringify({
    ok: true,
    mode,
    target: target.safeIdentity,
    migration: { version: MIGRATION_VERSION, sha256: source.sha256 },
    before: safeSnapshot(result.before),
    after: safeSnapshot(result.after),
    checks: result.checks,
    backup: safeBackup(result.backup),
    next: "Merge PR 185 at its exact reviewed head, deploy that commit, and verify the authenticated WordPress publication-proof lifecycle before recording live proof.",
  }, null, 2));
}

const isDirect = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  main().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error?.code ?? "wordpress_proof_scope_cutover_failed",
      detail: redactError(error?.message),
      ...(error?.backup ? { backup: safeBackup(error.backup) } : {}),
    }));
    process.exit(1);
  });
}
