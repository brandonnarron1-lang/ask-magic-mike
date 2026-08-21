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
  "APPROVE PHASE 9 KPI TARGET REGISTER PRODUCTION MIGRATION, MERGE, AND PRODUCTION DEPLOYMENT";
export const MIGRATION_VERSION = "20260821213000";
export const MIGRATION_NAME = "growth_kpi_target_register";
export const MIGRATION_FILE = `${MIGRATION_VERSION}_${MIGRATION_NAME}.sql`;
export const MIGRATION_SHA256 =
  "1feead13bdb8db3f7108deac42d03b124a795b289320235d6b2866b5fd3591f4";
export const APPLICATION_NAME = "amm_phase9_kpi_target_cutover";

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

export function assertExecutionApproval(value) {
  if (value !== APPROVAL_PHRASE) fail("exact_kpi_target_production_approval_missing");
  return true;
}

export async function migrationSource() {
  const sql = await readFile(MIGRATION_PATH, "utf8");
  const sha256 = createHash("sha256").update(sql).digest("hex");
  if (sha256 !== MIGRATION_SHA256) fail("reviewed_kpi_target_migration_hash_mismatch");
  return { sql, sha256 };
}

export function validatePreflight(snapshot) {
  const checks = {
    database: snapshot.database === "neondb",
    owner: snapshot.owner === "neondb_owner",
    postgres_major: String(snapshot.server_version ?? "").startsWith("18."),
    can_create_public: snapshot.can_create_public === true,
    leads_table: snapshot.leads_table === true,
    audit_logs_table: snapshot.audit_logs_table === true,
    immutable_function: snapshot.immutable_function === true,
    first_response_table: snapshot.first_response_table === true,
    publication_proof_table: snapshot.publication_proof_table === true,
    publication_proof_migration_once: Number(snapshot.publication_proof_migration_count) === 1,
    migration_ledger: snapshot.migration_ledger === true,
    service_role: snapshot.service_role === true,
    service_role_bypassrls: snapshot.service_role_bypassrls === true,
    service_role_schema_usage: snapshot.service_role_schema_usage === true,
    service_role_audit_select: snapshot.service_role_audit_select === true,
    service_role_audit_insert: snapshot.service_role_audit_insert === true,
    target_table_absent: snapshot.target_table_present === false,
    target_function_absent: snapshot.target_function_present === false,
    target_migration_absent: Number(snapshot.target_migration_count) === 0,
  };
  const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (failures.length) fail("kpi_target_production_preflight_failed", failures.join(","));

  const missingRequiredColumns = snapshot.missing_required_columns ?? [];
  if (!Array.isArray(missingRequiredColumns) || missingRequiredColumns.length) {
    fail(
      "kpi_target_production_schema_required_columns_missing",
      Array.isArray(missingRequiredColumns)
        ? missingRequiredColumns.join(",")
        : "invalid_required_column_snapshot",
    );
  }
  const requiredColumns = new Set(snapshot.ledger_required_columns ?? []);
  for (const supported of ["version", "statements", "name"]) requiredColumns.delete(supported);
  if (requiredColumns.size) {
    fail("kpi_target_migration_ledger_unsupported_required_columns", [...requiredColumns].join(","));
  }
  buildLedgerInsert(snapshot.ledger_columns ?? [], MIGRATION_VERSION, MIGRATION_NAME);
  return checks;
}

export function validatePostflight(before, after, { allowRuntimeVersions = false } = {}) {
  const checks = {
    database: after.database === "neondb",
    owner: after.owner === "neondb_owner",
    target_table_present: after.target_table_present === true,
    target_table_owner: after.target_table_owner === "neondb_owner",
    target_table_rls: after.target_table_rls === true,
    immutable_trigger: after.immutable_trigger === true,
    immutable_trigger_enabled: after.immutable_trigger_enabled === true,
    immutable_trigger_update_delete: after.immutable_trigger_update_delete === true,
    metric_index: after.metric_index === true,
    approved_index: after.approved_index === true,
    metric_contract_constraints: after.metric_contract_constraints === true,
    evidence_state_constraints: after.evidence_state_constraints === true,
    target_range_constraints: after.target_range_constraints === true,
    approval_constraints: after.approval_constraints === true,
    target_function_present: after.target_function_present === true,
    target_function_owner: after.target_function_owner === "neondb_owner",
    target_function_invoker: after.target_function_security_definer === false,
    target_function_search_path: after.target_function_search_path_locked === true,
    target_function_idempotent: after.target_function_idempotent === true,
    target_function_audited: after.target_function_audited === true,
    target_function_server_baseline_contract: after.target_function_server_baseline_contract === true,
    service_role_table_select: after.service_role_table_select === true,
    service_role_table_insert: after.service_role_table_insert === true,
    service_role_table_update_denied: after.service_role_table_update === false,
    service_role_table_delete_denied: after.service_role_table_delete === false,
    service_role_table_truncate_denied: after.service_role_table_truncate === false,
    service_role_table_admin_denied: after.service_role_table_admin === false,
    service_role_function_execute: after.service_role_function_execute === true,
    public_table_access_denied: after.public_table_access === false,
    browser_role_table_access_denied: Number(after.browser_role_table_access_count) === 0,
    public_function_execute_denied: after.public_function_execute === false,
    browser_role_function_execute_denied: Number(after.browser_role_function_execute_count) === 0,
    target_migration_once: Number(after.target_migration_count) === 1,
    lead_count_unchanged: Number(after.lead_count) === Number(before.lead_count),
    lead_state_unchanged: after.lead_state_digest === before.lead_state_digest,
    audit_count_unchanged: Number(after.audit_count) === Number(before.audit_count),
    audit_state_unchanged: after.audit_state_digest === before.audit_state_digest,
    no_migration_seed_versions: allowRuntimeVersions || Number(after.target_version_count) === 0,
  };
  const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (failures.length) fail("kpi_target_production_postflight_failed", failures.join(","));
  return checks;
}

const FUNCTION_SIGNATURE =
  "public.record_growth_kpi_target_version_v1(text,text,text,text,numeric,text,text,numeric,text,integer,integer,text,text,timestamptz,text,boolean)";

const BASELINE_SQL = `
SELECT jsonb_build_object(
  'database', current_database(),
  'owner', current_user,
  'server_version', current_setting('server_version'),
  'can_create_public', has_schema_privilege(current_user, 'public', 'CREATE'),
  'leads_table', to_regclass('public.leads') IS NOT NULL,
  'audit_logs_table', to_regclass('public.audit_logs') IS NOT NULL,
  'immutable_function', to_regprocedure('public.amm_reject_immutable_change()') IS NOT NULL,
  'first_response_table', to_regclass('public.lead_response_milestones') IS NOT NULL,
  'publication_proof_table', to_regclass('public.owned_demand_publication_proofs') IS NOT NULL,
  'publication_proof_migration_count', (
    SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '20260821170000'
  ),
  'migration_ledger', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
  'service_role', EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role'),
  'service_role_bypassrls', COALESCE((SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role'), false),
  'service_role_schema_usage', CASE
    WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
      THEN has_schema_privilege('service_role', 'public', 'USAGE')
    ELSE false
  END,
  'service_role_audit_select', COALESCE(has_table_privilege('service_role', to_regclass('public.audit_logs'), 'SELECT'), false),
  'service_role_audit_insert', COALESCE(has_table_privilege('service_role', to_regclass('public.audit_logs'), 'INSERT'), false),
  'target_table_present', to_regclass('public.growth_kpi_target_versions') IS NOT NULL,
  'target_function_present', to_regprocedure('${FUNCTION_SIGNATURE}') IS NOT NULL,
  'target_migration_count', (
    SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '${MIGRATION_VERSION}'
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
  'missing_required_columns', COALESCE((
    SELECT jsonb_agg(required.table_schema || '.' || required.table_name || '.' || required.column_name ORDER BY required.table_schema, required.table_name, required.column_name)
      FROM (VALUES
        ('public', 'leads', 'id'),
        ('public', 'leads', 'status'),
        ('public', 'leads', 'updated_at'),
        ('public', 'audit_logs', 'id'),
        ('public', 'audit_logs', 'actor'),
        ('public', 'audit_logs', 'action'),
        ('public', 'audit_logs', 'resource_type'),
        ('public', 'audit_logs', 'resource_id'),
        ('public', 'audit_logs', 'before_state'),
        ('public', 'audit_logs', 'after_state'),
        ('public', 'audit_logs', 'metadata'),
        ('public', 'audit_logs', 'created_at')
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
     WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'
       AND is_nullable = 'NO' AND column_default IS NULL AND is_identity = 'NO'
  ), '[]'::jsonb)
) AS snapshot`;

const POSTFLIGHT_SQL = `
WITH target_table AS (
  SELECT c.oid, c.relowner, c.relacl, c.relrowsecurity,
         pg_get_userbyid(c.relowner) AS table_owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'growth_kpi_target_versions'
     AND c.relkind = 'r'
), target_function AS (
  SELECT p.oid, p.proowner, p.proacl, p.prosecdef, p.proconfig,
         pg_get_userbyid(p.proowner) AS function_owner,
         pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.oid = to_regprocedure('${FUNCTION_SIGNATURE}')
), table_constraints AS (
  SELECT string_agg(pg_get_constraintdef(c.oid), E'\n') AS definitions
    FROM pg_constraint c
   WHERE c.conrelid = to_regclass('public.growth_kpi_target_versions')
), immutable_trigger AS (
  SELECT t.tgenabled, t.tgtype
    FROM pg_trigger t
   WHERE t.tgrelid = to_regclass('public.growth_kpi_target_versions')
     AND t.tgname = 'growth_kpi_target_versions_reject_change'
     AND NOT t.tgisinternal
)
SELECT jsonb_build_object(
  'database', current_database(),
  'owner', current_user,
  'target_table_present', EXISTS (SELECT 1 FROM target_table),
  'target_table_owner', (SELECT table_owner FROM target_table),
  'target_table_rls', COALESCE((SELECT relrowsecurity FROM target_table), false),
  'immutable_trigger', EXISTS (SELECT 1 FROM immutable_trigger),
  'immutable_trigger_enabled', COALESCE((SELECT tgenabled <> 'D' FROM immutable_trigger), false),
  'immutable_trigger_update_delete', COALESCE((
    SELECT (tgtype & 2) = 2 AND (tgtype & 8) = 8 AND (tgtype & 16) = 16
      FROM immutable_trigger
  ), false),
  'metric_index', to_regclass('public.growth_kpi_target_versions_metric_idx') IS NOT NULL,
  'approved_index', to_regclass('public.growth_kpi_target_versions_approved_idx') IS NOT NULL,
  'metric_contract_constraints', COALESCE((
    SELECT definitions LIKE '%useful_source_attribution_rate%'
       AND definitions LIKE '%complaint_rate%'
       AND definitions LIKE '%higher_is_better%'
       AND definitions LIKE '%lower_is_better%'
       AND definitions LIKE '%percentage%'
       AND definitions LIKE '%ratio%'
      FROM table_constraints
  ), false),
  'evidence_state_constraints', COALESCE((
    SELECT definitions LIKE '%baseline_evidence_sha256%'
       AND definitions LIKE '%measured%'
       AND definitions LIKE '%directional%'
       AND definitions LIKE '%insufficient_sample%'
       AND definitions LIKE '%not_instrumented%'
       AND definitions LIKE '%unavailable%'
      FROM table_constraints
  ), false),
  'target_range_constraints', COALESCE((
    SELECT definitions LIKE '%10080%'
       AND definitions LIKE '%1000000000000%'
       AND definitions LIKE '%target_value%'
       AND definitions LIKE '%baseline_value%'
      FROM table_constraints
  ), false),
  'approval_constraints', COALESCE((
    SELECT definitions LIKE '%status = ''approved''%'
       AND definitions LIKE '%baseline_state = ''measured''%'
       AND definitions LIKE '%approval_reference IS NOT NULL%'
       AND definitions LIKE '%status = ''retired''%'
      FROM table_constraints
  ), false),
  'target_function_present', EXISTS (SELECT 1 FROM target_function),
  'target_function_owner', (SELECT function_owner FROM target_function),
  'target_function_security_definer', COALESCE((SELECT prosecdef FROM target_function), true),
  'target_function_search_path_locked', COALESCE((SELECT proconfig @> ARRAY['search_path=public, pg_temp']::text[] FROM target_function), false),
  'target_function_idempotent', COALESCE((SELECT definition LIKE '%ON CONFLICT (idempotency_key) DO NOTHING%' FROM target_function), false),
  'target_function_audited', COALESCE((SELECT definition LIKE '%growth.kpi_target_version_recorded%' FROM target_function), false),
  'target_function_server_baseline_contract', COALESCE((
    SELECT definition LIKE '%browser_baseline_accepted%'
       AND definition LIKE '%external_mutation_performed%'
       AND definition LIKE '%measured_kpi_baseline_and_approval_required%'
      FROM target_function
  ), false),
  'service_role_table_select', COALESCE(has_table_privilege('service_role', to_regclass('public.growth_kpi_target_versions'), 'SELECT'), false),
  'service_role_table_insert', COALESCE(has_table_privilege('service_role', to_regclass('public.growth_kpi_target_versions'), 'INSERT'), false),
  'service_role_table_update', COALESCE(has_table_privilege('service_role', to_regclass('public.growth_kpi_target_versions'), 'UPDATE'), false),
  'service_role_table_delete', COALESCE(has_table_privilege('service_role', to_regclass('public.growth_kpi_target_versions'), 'DELETE'), false),
  'service_role_table_truncate', COALESCE(has_table_privilege('service_role', to_regclass('public.growth_kpi_target_versions'), 'TRUNCATE'), false),
  'service_role_table_admin', COALESCE(
    has_table_privilege('service_role', to_regclass('public.growth_kpi_target_versions'), 'REFERENCES')
    OR has_table_privilege('service_role', to_regclass('public.growth_kpi_target_versions'), 'TRIGGER'),
    false
  ),
  'service_role_function_execute', COALESCE((SELECT has_function_privilege('service_role', oid, 'EXECUTE') FROM target_function), false),
  'public_table_access', EXISTS (
    SELECT 1 FROM target_table t
    CROSS JOIN LATERAL aclexplode(COALESCE(t.relacl, acldefault('r', t.relowner))) acl
    WHERE acl.grantee = 0 AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ),
  'browser_role_table_access_count', (
    SELECT count(*) FROM pg_roles browser_role
     WHERE browser_role.rolname IN ('anon', 'authenticated')
       AND (has_table_privilege(browser_role.rolname, to_regclass('public.growth_kpi_target_versions'), 'SELECT')
         OR has_table_privilege(browser_role.rolname, to_regclass('public.growth_kpi_target_versions'), 'INSERT')
         OR has_table_privilege(browser_role.rolname, to_regclass('public.growth_kpi_target_versions'), 'UPDATE')
         OR has_table_privilege(browser_role.rolname, to_regclass('public.growth_kpi_target_versions'), 'DELETE'))
  ),
  'public_function_execute', EXISTS (
    SELECT 1 FROM target_function f
    CROSS JOIN LATERAL aclexplode(COALESCE(f.proacl, acldefault('f', f.proowner))) acl
    WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
  ),
  'browser_role_function_execute_count', (
    SELECT count(*) FROM pg_roles browser_role CROSS JOIN target_function f
     WHERE browser_role.rolname IN ('anon', 'authenticated')
       AND has_function_privilege(browser_role.rolname, f.oid, 'EXECUTE')
  ),
  'target_migration_count', (
    SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '${MIGRATION_VERSION}'
  ),
  'target_version_count', (SELECT count(*) FROM public.growth_kpi_target_versions),
  'lead_count', (SELECT count(*) FROM public.leads),
  'lead_state_digest', (
    SELECT md5(COALESCE(string_agg(concat_ws('|', id::text, COALESCE(status, ''), COALESCE(updated_at::text, '')), ',' ORDER BY id), '')) FROM public.leads
  ),
  'audit_count', (SELECT count(*) FROM public.audit_logs),
  'audit_state_digest', (
    SELECT md5(COALESCE(string_agg(concat_ws('|', id::text, action, resource_type, resource_id::text, created_at::text), ',' ORDER BY id), '')) FROM public.audit_logs
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
    return {
      snapshot,
      checks: validatePostflight(snapshot, snapshot, { allowRuntimeVersions: true }),
    };
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
    if (advisoryLock.rows[0]?.acquired !== true) fail("kpi_target_production_cutover_already_running");
    await client.query("LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE");
    await client.query("LOCK TABLE public.leads, public.audit_logs IN SHARE MODE");

    const lockedBaseline = await readSnapshot(client, BASELINE_SQL);
    validatePreflight(lockedBaseline);
    if (
      Number(lockedBaseline.lead_count) !== Number(baseline.lead_count) ||
      lockedBaseline.lead_state_digest !== baseline.lead_state_digest ||
      Number(lockedBaseline.audit_count) !== Number(baseline.audit_count) ||
      lockedBaseline.audit_state_digest !== baseline.audit_state_digest
    ) fail("kpi_target_production_changed_since_preflight");

    backup = await createBackup(target, {
      applicationName: APPLICATION_NAME,
      filenamePrefix: "ask-magic-mike-pre-kpi-target-register",
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
    target_version_count: Number(snapshot.target_version_count ?? 0),
    target_migration_count: Number(snapshot.target_migration_count ?? 0),
    target_table_present: snapshot.target_table_present,
    target_table_rls: snapshot.target_table_rls,
    immutable_trigger: snapshot.immutable_trigger,
    target_function_present: snapshot.target_function_present,
    public_table_access: snapshot.public_table_access,
    public_function_execute: snapshot.public_function_execute,
  };
}

export function plan() {
  return {
    operation: "phase9_kpi_target_register_production_cutover",
    mutates_production: false,
    target: {
      provider: "neon_postgres",
      project: "bitter-star-20214385",
      branch: "production / br-round-base-auh6h2wd",
      endpoint_id: "ep-proud-bonus-autwv60g",
      database: "neondb",
      owner: "neondb_owner",
      connection: "unpooled TLS plus channel binding",
    },
    migration: { file: MIGRATION_FILE, version: MIGRATION_VERSION, sha256: MIGRATION_SHA256 },
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
  return `${JSON.stringify(plan(), null, 2)}\n\nUsage:\n  pnpm run phase9:kpi-targets:cutover -- --plan\n  pnpm run phase9:kpi-targets:cutover -- --preflight\n  pnpm run phase9:kpi-targets:cutover -- --verify\n  pnpm run phase9:kpi-targets:cutover -- --execute\n\nNever paste the database URL into chat or a command argument. Enter it only through a secure environment interface.`;
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode === "help") { console.log(help()); return; }
  const source = await migrationSource();
  if (mode === "plan") {
    console.log(JSON.stringify({ ...plan(), migration_verified: source.sha256 === MIGRATION_SHA256 }, null, 2));
    return;
  }
  if (mode === "execute") assertExecutionApproval(process.env.AMM_PRODUCTION_APPROVAL);
  const target = parseProductionDatabaseUrl(process.env.AMM_PRODUCTION_DATABASE_URL);
  if (mode === "preflight") {
    const result = await preflight(target);
    console.log(JSON.stringify({ ok: true, mode, target: target.safeIdentity, snapshot: safeSnapshot(result.snapshot), checks: result.checks }, null, 2));
    return;
  }
  if (mode === "verify") {
    const result = await verify(target);
    console.log(JSON.stringify({ ok: true, mode, target: target.safeIdentity, snapshot: safeSnapshot(result.snapshot), checks: result.checks }, null, 2));
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
    next: "Merge the reviewed stacked release PR, deploy its exact head, and verify the authenticated KPI target register before recording any target version.",
  }, null, 2));
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  main().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error?.code ?? "kpi_target_cutover_failed",
      detail: redactError(error?.message),
      ...(error?.backup ? { backup: safeBackup(error.backup) } : {}),
    }));
    process.exit(1);
  });
}
