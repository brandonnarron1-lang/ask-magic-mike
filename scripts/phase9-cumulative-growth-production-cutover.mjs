#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  EXPECTED_DATABASE,
  EXPECTED_ENDPOINT_ID,
  EXPECTED_HOSTNAME,
  EXPECTED_OWNER,
  buildLedgerInsert,
  connect,
  createBackup,
  parseProductionDatabaseUrl,
  readSnapshot,
  redactError,
  safeBackup,
} from "./phase9-outcome-production-cutover.mjs";

export const APPROVAL_PHRASE =
  "APPROVE PHASE 9 CUMULATIVE GROWTH MIGRATIONS, PR 238 MERGE, AND PRODUCTION DEPLOYMENT";

export const MIGRATIONS = Object.freeze([
  Object.freeze({
    version: "20260824193000",
    name: "marketing_spend_ingress",
    file: "20260824193000_marketing_spend_ingress.sql",
    sha256: "9640e5807622d88c0ca3b1074ea3a0f4d304ca493dbe9ab1d573243e858ee6a1",
    transactionWrapped: false,
  }),
  Object.freeze({
    version: "20260824220000",
    name: "organic_search_ingress",
    file: "20260824220000_organic_search_ingress.sql",
    sha256: "4d1ec2947134145a75a8b82e2edef71fcd7d8b0974ebfb909d838d1378e81626",
    transactionWrapped: false,
  }),
  Object.freeze({
    version: "20260825033000",
    name: "local_profile_performance_ingress",
    file: "20260825033000_local_profile_performance_ingress.sql",
    sha256: "68f292f8e1773c9d2b999c61311362576848020176c5dbdeaf0550ba4795047c",
    transactionWrapped: false,
  }),
  Object.freeze({
    version: "20260825060000",
    name: "local_demand_metric_truth_guard",
    file: "20260825060000_local_demand_metric_truth_guard.sql",
    sha256: "705fa33d1516451e721cd30d9991084ff3dae987849a2f47981eaeff762a561a",
    transactionWrapped: true,
  }),
  Object.freeze({
    version: "20260830190000",
    name: "admin_lead_api_persistence",
    file: "20260830190000_admin_lead_api_persistence.sql",
    sha256: "f50ffe91740fdd0690a87d673daf9e5753f122e19279ef84d729d9435d7adc35",
    transactionWrapped: false,
  }),
]);

const MODULE_URL = new URL(import.meta.url);
const ROOT = MODULE_URL.protocol === "file:"
  ? resolve(dirname(fileURLToPath(MODULE_URL)), "..")
  : resolve(process.cwd());
const MIGRATION_ROOT = join(ROOT, "supabase", "migrations");

const REQUIRED_TABLES = Object.freeze([
  "audit_logs",
  "marketing_channels",
  "marketing_campaigns",
  "marketing_spend_daily",
  "market_signals",
  "market_opportunities",
  "leads",
  "agents",
  "messages",
  "tasks",
  "lead_routing",
  "agent_assignments",
]);

const REQUIRED_FUNCTIONS = Object.freeze([
  Object.freeze({
    name: "mutate_admin_assignment_v1",
    signature: "public.mutate_admin_assignment_v1(uuid,uuid,uuid,text,text,text,timestamptz)",
  }),
]);

const REQUIRED_COLUMNS = Object.freeze([
  ...[
    "id", "status", "lead_type", "lead_grade", "next_follow_up_at",
    "last_contacted_at", "closed_lost_reason", "updated_at",
  ].map((column) => Object.freeze({ table: "leads", column })),
  ...["id"].map((column) => Object.freeze({ table: "agents", column })),
  ...["id", "created_at", "lead_id", "role", "content", "content_type", "agent_id"]
    .map((column) => Object.freeze({ table: "messages", column })),
  ...[
    "id", "created_at", "updated_at", "lead_id", "agent_id", "created_by",
    "title", "body", "due_at", "priority", "category",
  ].map((column) => Object.freeze({ table: "tasks", column })),
  ...["lead_id", "assignment_reason"]
    .map((column) => Object.freeze({ table: "lead_routing", column })),
  ...["idempotency_key", "assignment_reason"]
    .map((column) => Object.freeze({ table: "agent_assignments", column })),
  ...[
    "id", "created_at", "actor", "action", "resource_type", "resource_id",
    "before_state", "after_state", "metadata",
  ].map((column) => Object.freeze({ table: "audit_logs", column })),
]);

const TARGET_TABLES = Object.freeze([
  "marketing_spend_import_batches",
  "organic_search_import_batches",
  "local_profile_performance_import_batches",
]);

const TARGET_FUNCTIONS = Object.freeze([
  Object.freeze({
    name: "import_marketing_spend_batch_v1",
    signature: "public.import_marketing_spend_batch_v1(text,jsonb,text,text,text)",
    expectedSearchPath: "search_path=public, pg_temp",
  }),
  Object.freeze({
    name: "import_organic_search_batch_v1",
    signature: "public.import_organic_search_batch_v1(text,jsonb,text,text,text)",
    expectedSearchPath: "search_path=public, pg_temp",
  }),
  Object.freeze({
    name: "import_local_profile_performance_batch_v1",
    signature: "public.import_local_profile_performance_batch_v1(text,jsonb,jsonb,text,text,text)",
    expectedSearchPath: "search_path=public, pg_temp",
  }),
  Object.freeze({
    name: "amm_reject_retired_local_profile_metric",
    signature: "public.amm_reject_retired_local_profile_metric()",
    expectedSearchPath: null,
  }),
  Object.freeze({
    name: "patch_admin_lead_v1",
    signature: "public.patch_admin_lead_v1(uuid,jsonb,text,timestamptz)",
    expectedSearchPath: "search_path=public, pg_temp",
    serviceRoleExecute: true,
  }),
  Object.freeze({
    name: "add_admin_lead_note_v1",
    signature: "public.add_admin_lead_note_v1(uuid,text,uuid,text,timestamptz)",
    expectedSearchPath: "search_path=public, pg_temp",
    serviceRoleExecute: true,
  }),
  Object.freeze({
    name: "create_admin_lead_task_v1",
    signature: "public.create_admin_lead_task_v1(uuid,text,text,timestamptz,text,text,uuid,text,timestamptz)",
    expectedSearchPath: "search_path=public, pg_temp",
    serviceRoleExecute: true,
  }),
  Object.freeze({
    name: "mutate_admin_assignment_v2",
    signature: "public.mutate_admin_assignment_v2(uuid,uuid,uuid,text,text,text,text,timestamptz)",
    expectedSearchPath: "search_path=public, pg_temp",
    serviceRoleExecute: true,
  }),
]);

const TARGET_TRIGGERS = Object.freeze([
  Object.freeze({
    name: "marketing_spend_import_batches_reject_change",
    table: "marketing_spend_import_batches",
    function: "amm_reject_immutable_change",
  }),
  Object.freeze({
    name: "organic_search_import_batches_reject_change",
    table: "organic_search_import_batches",
    function: "amm_reject_immutable_change",
  }),
  Object.freeze({
    name: "local_profile_performance_import_batches_reject_change",
    table: "local_profile_performance_import_batches",
    function: "amm_reject_immutable_change",
  }),
  Object.freeze({
    name: "market_signals_reject_retired_local_profile_metric",
    table: "market_signals",
    function: "amm_reject_retired_local_profile_metric",
  }),
]);

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}: ${detail}` : code);
  error.code = code;
  throw error;
}

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function valuesSql(rows) {
  return rows.map((row) => `(${row.map(sqlText).join(", ")})`).join(",\n    ");
}

const VERSION_VALUES_SQL = valuesSql(MIGRATIONS.map((migration) => [migration.version]));
const REQUIRED_TABLE_VALUES_SQL = valuesSql(REQUIRED_TABLES.map((name) => [name]));
const REQUIRED_FUNCTION_VALUES_SQL = valuesSql(
  REQUIRED_FUNCTIONS.map((entry) => [entry.name, entry.signature]),
);
const REQUIRED_COLUMN_VALUES_SQL = valuesSql(
  REQUIRED_COLUMNS.map((entry) => [entry.table, entry.column]),
);
const TARGET_TABLE_VALUES_SQL = valuesSql(TARGET_TABLES.map((name) => [name]));
const TARGET_FUNCTION_VALUES_SQL = valuesSql(
  TARGET_FUNCTIONS.map((entry) => [entry.name, entry.signature, entry.expectedSearchPath ?? ""]),
);
const TARGET_TRIGGER_VALUES_SQL = valuesSql(
  TARGET_TRIGGERS.map((entry) => [entry.name, entry.table, entry.function]),
);

export function parseMode(argv) {
  const selected = ["--plan", "--preflight", "--verify", "--execute"].filter((flag) =>
    argv.includes(flag),
  );
  if (selected.length > 1) fail("cutover_mode_conflict");
  if (argv.includes("--help")) return "help";
  return selected[0]?.slice(2) ?? "plan";
}

export function assertExecutionApproval(value) {
  if (value !== APPROVAL_PHRASE) fail("exact_cumulative_production_approval_missing");
  return true;
}

/** @param {Record<string, string | undefined>} env */
export function assertGrowthImportGatesDisabled(env = process.env) {
  const enabled = [
    "GROWTH_SPEND_IMPORT_ENABLED",
    "GROWTH_SEARCH_IMPORT_ENABLED",
    "GROWTH_LOCAL_PROFILE_IMPORT_ENABLED",
  ].filter((name) => String(env[name] ?? "false").toLowerCase() === "true");
  if (enabled.length) fail("growth_import_gate_must_remain_disabled", enabled.join(","));
  return true;
}

export function normalizeMigrationSql(migration, sql) {
  const transactionCommand = /^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/gim;
  const commandMatches = [...sql.matchAll(transactionCommand)];
  const commands = commandMatches.map((match) => match[1].toUpperCase());

  if (!migration.transactionWrapped) {
    if (commands.length) fail("unexpected_migration_transaction_control", migration.file);
    return sql;
  }

  if (commands.length !== 2 || commands[0] !== "BEGIN" || commands[1] !== "COMMIT") {
    fail("reviewed_transaction_envelope_mismatch", migration.file);
  }
  const [beginMatch, commitMatch] = commandMatches;
  const preamble = sql.slice(0, beginMatch.index);
  const trailing = sql.slice((commitMatch.index ?? 0) + commitMatch[0].length);
  if (
    preamble.replace(/^\s*--[^\n]*(?:\n|$)/gm, "").trim() ||
    trailing.trim()
  ) {
    fail("reviewed_transaction_envelope_mismatch", migration.file);
  }
  const body = sql.slice(
    (beginMatch.index ?? 0) + beginMatch[0].length,
    commitMatch.index,
  );
  if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/im.test(body)) {
    fail("nested_migration_transaction_control", migration.file);
  }
  return `${preamble}${body}`;
}

export async function migrationSources() {
  const sources = [];
  for (const migration of MIGRATIONS) {
    const sql = await readFile(join(MIGRATION_ROOT, migration.file), "utf8");
    const sha256 = createHash("sha256").update(sql).digest("hex");
    if (sha256 !== migration.sha256) fail("reviewed_migration_hash_mismatch", migration.file);
    sources.push({
      ...migration,
      sha256,
      sql: normalizeMigrationSql(migration, sql),
    });
  }
  return sources;
}

const PRESTATE_SQL = `
WITH
required_tables(name) AS (
  VALUES ${REQUIRED_TABLE_VALUES_SQL}
),
required_functions(name, signature) AS (
  VALUES ${REQUIRED_FUNCTION_VALUES_SQL}
),
required_columns(table_name, column_name) AS (
  VALUES ${REQUIRED_COLUMN_VALUES_SQL}
),
target_tables(name) AS (
  VALUES ${TARGET_TABLE_VALUES_SQL}
),
target_functions(name, signature, expected_search_path) AS (
  VALUES ${TARGET_FUNCTION_VALUES_SQL}
),
target_triggers(name, table_name, function_name) AS (
  VALUES ${TARGET_TRIGGER_VALUES_SQL}
),
target_versions(version) AS (
  VALUES ${VERSION_VALUES_SQL}
)
SELECT jsonb_build_object(
  'database', current_database(),
  'owner', current_user,
  'server_version', current_setting('server_version'),
  'can_create_public', has_schema_privilege(current_user, 'public', 'CREATE'),
  'migration_ledger', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
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
  ), '[]'::jsonb),
  'roles', jsonb_build_object(
    'anon', EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon'),
    'authenticated', EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated'),
    'service_role', EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
  ),
  'required_tables', (
    SELECT jsonb_object_agg(name, to_regclass('public.' || name) IS NOT NULL)
    FROM required_tables
  ),
  'required_functions', (
    SELECT jsonb_object_agg(name, to_regprocedure(signature) IS NOT NULL)
    FROM required_functions
  ),
  'required_columns', (
    SELECT jsonb_object_agg(
      expected.table_name || '.' || expected.column_name,
      columns.column_name IS NOT NULL
    )
    FROM required_columns expected
    LEFT JOIN information_schema.columns columns
      ON columns.table_schema = 'public'
      AND columns.table_name = expected.table_name
      AND columns.column_name = expected.column_name
  ),
  'immutable_guard_present',
    to_regprocedure('public.amm_reject_immutable_change()') IS NOT NULL,
  'target_tables', (
    SELECT jsonb_object_agg(name, to_regclass('public.' || name) IS NOT NULL)
    FROM target_tables
  ),
  'target_functions', (
    SELECT jsonb_object_agg(name, to_regprocedure(signature) IS NOT NULL)
    FROM target_functions
  ),
  'target_triggers', (
    SELECT jsonb_object_agg(expected.name, EXISTS (
      SELECT 1
      FROM pg_trigger trigger
      JOIN pg_class relation ON relation.oid = trigger.tgrelid
      JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname = expected.table_name
        AND trigger.tgname = expected.name
        AND NOT trigger.tgisinternal
    ))
    FROM target_triggers expected
  ),
  'ledger_counts', (
    SELECT jsonb_object_agg(expected.version, COALESCE(actual.count, 0))
    FROM target_versions expected
    LEFT JOIN (
      SELECT version, count(*)::integer AS count
      FROM supabase_migrations.schema_migrations
      GROUP BY version
    ) actual ON actual.version = expected.version
  ),
  'baseline_counts', jsonb_build_object(
    'audit_logs', (SELECT count(*) FROM public.audit_logs),
    'marketing_channels', (SELECT count(*) FROM public.marketing_channels),
    'marketing_campaigns', (SELECT count(*) FROM public.marketing_campaigns),
    'marketing_spend_daily', (SELECT count(*) FROM public.marketing_spend_daily),
    'market_signals', (SELECT count(*) FROM public.market_signals),
    'market_opportunities', (SELECT count(*) FROM public.market_opportunities)
  )
) AS snapshot`;

const POSTSTATE_SQL = `
WITH
target_tables(name) AS (
  VALUES ${TARGET_TABLE_VALUES_SQL}
),
target_functions(name, signature, expected_search_path) AS (
  VALUES ${TARGET_FUNCTION_VALUES_SQL}
),
target_triggers(name, table_name, function_name) AS (
  VALUES ${TARGET_TRIGGER_VALUES_SQL}
),
target_versions(version) AS (
  VALUES ${VERSION_VALUES_SQL}
),
table_state AS (
  SELECT
    expected.name,
    jsonb_build_object(
      'present', relation.oid IS NOT NULL,
      'owner', pg_get_userbyid(relation.relowner),
      'rls', COALESCE(relation.relrowsecurity, false),
      'public_privilege', CASE WHEN relation.oid IS NULL THEN true ELSE EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(relation.relacl, acldefault('r', relation.relowner))) acl
        WHERE acl.grantee = 0
      ) END,
      'blocked_role_privilege_count', CASE WHEN relation.oid IS NULL THEN 3 ELSE (
        SELECT count(*)
        FROM pg_roles blocked
        WHERE blocked.rolname IN ('anon', 'authenticated', 'service_role')
          AND (
            has_table_privilege(blocked.rolname, relation.oid, 'SELECT') OR
            has_table_privilege(blocked.rolname, relation.oid, 'INSERT') OR
            has_table_privilege(blocked.rolname, relation.oid, 'UPDATE') OR
            has_table_privilege(blocked.rolname, relation.oid, 'DELETE') OR
            has_table_privilege(blocked.rolname, relation.oid, 'TRUNCATE') OR
            has_table_privilege(blocked.rolname, relation.oid, 'REFERENCES') OR
            has_table_privilege(blocked.rolname, relation.oid, 'TRIGGER')
          )
      ) END
    ) AS state
  FROM target_tables expected
  LEFT JOIN pg_namespace namespace ON namespace.nspname = 'public'
  LEFT JOIN pg_class relation
    ON relation.relnamespace = namespace.oid AND relation.relname = expected.name
),
function_state AS (
  SELECT
    expected.name,
    jsonb_build_object(
      'present', procedure.oid IS NOT NULL,
      'owner', pg_get_userbyid(procedure.proowner),
      'security_definer', COALESCE(procedure.prosecdef, true),
      'search_path', COALESCE(to_jsonb(procedure.proconfig), '[]'::jsonb),
      'public_execute', CASE WHEN procedure.oid IS NULL THEN true ELSE EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(procedure.proacl, acldefault('f', procedure.proowner))) acl
        WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
      ) END,
      'anon_execute', COALESCE(
        has_function_privilege('anon', procedure.oid, 'EXECUTE'),
        true
      ),
      'authenticated_execute', COALESCE(
        has_function_privilege('authenticated', procedure.oid, 'EXECUTE'),
        true
      ),
      'service_role_execute', COALESCE(
        has_function_privilege('service_role', procedure.oid, 'EXECUTE'),
        false
      )
    ) AS state
  FROM target_functions expected
  LEFT JOIN pg_proc procedure ON procedure.oid = to_regprocedure(expected.signature)
),
trigger_state AS (
  SELECT
    expected.name,
    jsonb_build_object(
      'present', trigger.oid IS NOT NULL,
      'enabled', COALESCE(trigger.tgenabled = 'O', false),
      'definition', COALESCE(pg_get_triggerdef(trigger.oid, true), '')
    ) AS state
  FROM target_triggers expected
  LEFT JOIN pg_namespace namespace ON namespace.nspname = 'public'
  LEFT JOIN pg_class relation
    ON relation.relnamespace = namespace.oid AND relation.relname = expected.table_name
  LEFT JOIN pg_trigger trigger
    ON trigger.tgrelid = relation.oid
    AND trigger.tgname = expected.name
    AND NOT trigger.tgisinternal
)
SELECT jsonb_build_object(
  'database', current_database(),
  'owner', current_user,
  'target_tables', (SELECT jsonb_object_agg(name, state) FROM table_state),
  'target_functions', (SELECT jsonb_object_agg(name, state) FROM function_state),
  'target_triggers', (SELECT jsonb_object_agg(name, state) FROM trigger_state),
  'ledger_counts', (
    SELECT jsonb_object_agg(expected.version, COALESCE(actual.count, 0))
    FROM target_versions expected
    LEFT JOIN (
      SELECT version, count(*)::integer AS count
      FROM supabase_migrations.schema_migrations
      GROUP BY version
    ) actual ON actual.version = expected.version
  ),
  'baseline_counts', jsonb_build_object(
    'audit_logs', (SELECT count(*) FROM public.audit_logs),
    'marketing_channels', (SELECT count(*) FROM public.marketing_channels),
    'marketing_campaigns', (SELECT count(*) FROM public.marketing_campaigns),
    'marketing_spend_daily', (SELECT count(*) FROM public.marketing_spend_daily),
    'market_signals', (SELECT count(*) FROM public.market_signals),
    'market_opportunities', (SELECT count(*) FROM public.market_opportunities)
  ),
  'receipt_counts', jsonb_build_object(
    'marketing_spend_import_batches', (SELECT count(*) FROM public.marketing_spend_import_batches),
    'organic_search_import_batches', (SELECT count(*) FROM public.organic_search_import_batches),
    'local_profile_performance_import_batches', (SELECT count(*) FROM public.local_profile_performance_import_batches)
  )
) AS snapshot`;

function allValues(record, predicate) {
  return record && typeof record === "object" && Object.values(record).every(predicate);
}

function validateLedgerShape(snapshot) {
  const requiredColumns = new Set(snapshot.ledger_required_columns ?? []);
  for (const supported of ["version", "statements", "name"]) requiredColumns.delete(supported);
  if (requiredColumns.size) {
    fail("migration_ledger_unsupported_required_columns", [...requiredColumns].join(","));
  }
  buildLedgerInsert(snapshot.ledger_columns ?? [], MIGRATIONS[0].version, MIGRATIONS[0].name);
}

export function validatePreflight(snapshot) {
  const prerequisiteTablesPresent = allValues(snapshot.required_tables, (value) => value === true);
  const prerequisiteFunctionsPresent = allValues(
    snapshot.required_functions,
    (value) => value === true,
  );
  const prerequisiteColumnsPresent = allValues(
    snapshot.required_columns,
    (value) => value === true,
  );
  const checks = {
    database: snapshot.database === EXPECTED_DATABASE,
    owner: snapshot.owner === EXPECTED_OWNER,
    postgres_major_supported: /^(17|18)\./.test(String(snapshot.server_version ?? "")),
    can_create_public: snapshot.can_create_public === true,
    migration_ledger: snapshot.migration_ledger === true,
    roles_present: allValues(snapshot.roles, (value) => value === true),
    prerequisites_present:
      prerequisiteTablesPresent && prerequisiteFunctionsPresent && prerequisiteColumnsPresent,
    prerequisite_tables_present: prerequisiteTablesPresent,
    prerequisite_functions_present: prerequisiteFunctionsPresent,
    prerequisite_columns_present: prerequisiteColumnsPresent,
    immutable_guard_present: snapshot.immutable_guard_present === true,
    target_tables_absent: allValues(snapshot.target_tables, (value) => value === false),
    target_functions_absent: allValues(snapshot.target_functions, (value) => value === false),
    target_triggers_absent: allValues(snapshot.target_triggers, (value) => value === false),
    target_migrations_absent: allValues(snapshot.ledger_counts, (value) => Number(value) === 0),
  };
  const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (failures.length) fail("cumulative_growth_preflight_failed", failures.join(","));
  validateLedgerShape(snapshot);
  return checks;
}

function includesSearchPath(config, expected) {
  if (!expected) return Array.isArray(config) && config.some((value) => String(value).startsWith("search_path="));
  return Array.isArray(config) && config.includes(expected);
}

export function validatePostflight(before, after, { requireEmptyReceipts = false } = {}) {
  const checks = {
    database: after.database === EXPECTED_DATABASE,
    owner: after.owner === EXPECTED_OWNER,
    baseline_counts_unchanged:
      JSON.stringify(after.baseline_counts ?? {}) === JSON.stringify(before.baseline_counts ?? {}),
    target_migrations_once: allValues(after.ledger_counts, (value) => Number(value) === 1),
    target_tables_hardened: TARGET_TABLES.every((name) => {
      const state = after.target_tables?.[name];
      return state?.present === true &&
        state.owner === EXPECTED_OWNER &&
        state.rls === true &&
        state.public_privilege === false &&
        Number(state.blocked_role_privilege_count) === 0;
    }),
    target_functions_hardened: TARGET_FUNCTIONS.every((entry) => {
      const state = after.target_functions?.[entry.name];
      return state?.present === true &&
        state.owner === EXPECTED_OWNER &&
        state.security_definer === false &&
        state.public_execute === false &&
        state.anon_execute === false &&
        state.authenticated_execute === false &&
        state.service_role_execute === (entry.serviceRoleExecute === true) &&
        includesSearchPath(state.search_path, entry.expectedSearchPath);
    }),
    target_triggers_enabled: TARGET_TRIGGERS.every((entry) => {
      const state = after.target_triggers?.[entry.name];
      return state?.present === true &&
        state.enabled === true &&
        String(state.definition ?? "").includes(entry.function);
    }),
    receipts_empty: !requireEmptyReceipts ||
      allValues(after.receipt_counts, (value) => Number(value) === 0),
  };
  const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (failures.length) fail("cumulative_growth_postflight_failed", failures.join(","));
  return checks;
}

function safeSnapshot(snapshot) {
  return {
    database: snapshot.database,
    owner: snapshot.owner,
    server_version: snapshot.server_version,
    roles: snapshot.roles,
    required_tables: snapshot.required_tables,
    required_functions: snapshot.required_functions,
    required_columns: snapshot.required_columns,
    immutable_guard_present: snapshot.immutable_guard_present,
    target_tables: snapshot.target_tables,
    target_functions: snapshot.target_functions,
    target_triggers: snapshot.target_triggers,
    ledger_counts: snapshot.ledger_counts,
    baseline_counts: snapshot.baseline_counts,
    receipt_counts: snapshot.receipt_counts,
  };
}

export async function preflight(target) {
  const client = await connect(target, "amm_phase9_cumulative_growth_preflight");
  try {
    const snapshot = await readSnapshot(client, PRESTATE_SQL);
    return { snapshot, checks: validatePreflight(snapshot) };
  } finally {
    await client.end();
  }
}

export async function verify(target) {
  const client = await connect(target, "amm_phase9_cumulative_growth_verify");
  try {
    const snapshot = await readSnapshot(client, POSTSTATE_SQL);
    return {
      snapshot,
      checks: validatePostflight(snapshot, snapshot, { requireEmptyReceipts: false }),
    };
  } finally {
    await client.end();
  }
}

export async function execute(target, sources) {
  const client = await connect(target, "amm_phase9_cumulative_growth_cutover");
  let backup;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '120s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '180s'");
    const lock = await client.query(
      "SELECT pg_try_advisory_xact_lock(hashtext($1), hashtext($2)) AS acquired",
      ["amm_phase9_cumulative_growth_cutover", "20260829"],
    );
    if (lock.rows[0]?.acquired !== true) fail("cumulative_growth_cutover_already_running");

    await client.query(
      "LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE",
    );
    await client.query(
      "LOCK TABLE public.audit_logs, public.marketing_channels, public.marketing_campaigns, " +
      "public.marketing_spend_daily, public.market_signals, public.market_opportunities IN SHARE MODE",
    );

    const before = await readSnapshot(client, PRESTATE_SQL);
    validatePreflight(before);
    backup = await createBackup(target, {
      applicationName: "amm_phase9_cumulative_growth_cutover",
      filenamePrefix: "ask-magic-mike-pre-cumulative-growth",
    });

    for (const source of sources) {
      await client.query(source.sql);
      const ledgerInsert = buildLedgerInsert(
        before.ledger_columns ?? [],
        source.version,
        source.name,
      );
      await client.query(ledgerInsert.text, ledgerInsert.params);
    }

    const after = await readSnapshot(client, POSTSTATE_SQL);
    const checks = validatePostflight(before, after, { requireEmptyReceipts: true });
    await client.query("COMMIT");
    return { before, after, checks, backup };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (backup && error && typeof error === "object") error.backup = backup;
    throw error;
  } finally {
    await client.end();
  }
}

export function plan() {
  return {
    operation: "phase9_cumulative_growth_production_cutover",
    mutates_production: false,
    target: {
      provider: "neon_postgres",
      project: "bitter-star-20214385",
      branch: "production / br-round-base-auh6h2wd",
      endpoint_id: EXPECTED_ENDPOINT_ID,
      hostname: EXPECTED_HOSTNAME,
      database: EXPECTED_DATABASE,
      owner: EXPECTED_OWNER,
      connection: "unpooled TLS with channel binding",
    },
    migrations: MIGRATIONS.map(({ version, file, sha256 }) => ({ version, file, sha256 })),
    safety: {
      exact_approval_required: true,
      validated_backup_required: true,
      single_transaction: true,
      advisory_lock: true,
      migration_ledger_atomic: true,
      existing_rows_must_remain_unchanged: true,
      growth_import_gates_must_remain_disabled: true,
      admin_lead_persistence_included: true,
    },
    modes: {
      plan: "offline and read-only",
      preflight: "Production database read-only",
      verify: "Production database read-only postcondition verification",
      execute: "exact approval, backup, locks, one transaction, and fail-closed postflight",
    },
    required_environment: [
      "AMM_PRODUCTION_DATABASE_URL (secure environment only)",
      "AMM_PRODUCTION_APPROVAL (exact phrase; execute only)",
    ],
  };
}

function help() {
  return `${JSON.stringify(plan(), null, 2)}\n\nUsage:\n  pnpm run phase9:cumulative-growth:cutover -- --plan\n  pnpm run phase9:cumulative-growth:cutover -- --preflight\n  pnpm run phase9:cumulative-growth:cutover -- --verify\n  pnpm run phase9:cumulative-growth:cutover -- --execute\n\nNever paste the database URL into chat or a command argument. Enter it only through a secure environment interface.`;
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode === "help") {
    console.log(help());
    return;
  }

  const sources = await migrationSources();
  if (mode === "plan") {
    console.log(JSON.stringify({ ...plan(), migration_hashes_verified: true }, null, 2));
    return;
  }

  const target = parseProductionDatabaseUrl(process.env.AMM_PRODUCTION_DATABASE_URL);
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

  assertExecutionApproval(process.env.AMM_PRODUCTION_APPROVAL);
  assertGrowthImportGatesDisabled();
  const result = await execute(target, sources);
  console.log(JSON.stringify({
    ok: true,
    mode,
    target: target.safeIdentity,
    migrations: sources.map(({ version, file, sha256 }) => ({ version, file, sha256 })),
    before: safeSnapshot(result.before),
    after: safeSnapshot(result.after),
    checks: result.checks,
    backup: safeBackup(result.backup),
    next: "Keep all growth import gates false, merge only the refreshed exact PR #238 payload head containing all five migrations, deploy that exact commit, and run Production health plus read-only verify before any import authority is considered.",
  }, null, 2));
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  main().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error?.code ?? "cumulative_growth_cutover_failed",
      detail: redactError(error?.message),
      ...(error?.backup ? { backup: safeBackup(error.backup) } : {}),
    }));
    process.exit(1);
  });
}
