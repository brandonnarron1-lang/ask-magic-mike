#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RUN_DIR = path.join(ROOT, ".amm-run", "local-staging");
const SUMMARY_PATH = path.join(RUN_DIR, "verify-summary.json");
const ROUTING_SQL_PATH = path.join(
  ROOT,
  "supabase",
  "tests",
  "routing_sla_deadlines_pg17.sql"
);
const PUBLICATION_PROOF_SQL_PATH = path.join(
  ROOT,
  "supabase",
  "tests",
  "owned_demand_publication_proofs_pg17.sql"
);
const SPEND_INGRESS_SQL_PATH = path.join(
  ROOT,
  "supabase",
  "tests",
  "marketing_spend_ingress_pg17.sql"
);
const ORGANIC_SEARCH_INGRESS_SQL_PATH = path.join(
  ROOT,
  "supabase",
  "tests",
  "organic_search_ingress_pg17.sql"
);
const LOCAL_PROFILE_PERFORMANCE_INGRESS_SQL_PATH = path.join(
  ROOT,
  "supabase",
  "tests",
  "local_profile_performance_ingress_pg17.sql"
);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    ...options,
  });
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function migrationFiles() {
  return fs
    .readdirSync(path.join(ROOT, "supabase", "migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => name.replace(/\.sql$/, ""));
}

function readProjectId() {
  const configPath = path.join(ROOT, "supabase", "config.toml");
  const config = fs.readFileSync(configPath, "utf8");
  const match = config.match(/^\s*project_id\s*=\s*"([^"]+)"\s*$/m);
  if (!match?.[1]) {
    fail("Could not read supabase project_id from supabase/config.toml.");
  }
  return match[1];
}

function findDbContainer(projectId) {
  const exact = `supabase_db_${projectId}`;
  const exactResult = run("docker", [
    "ps",
    "--filter",
    `name=^/${exact}$`,
    "--format",
    "{{.Names}}",
  ]);
  if (exactResult.status !== 0) {
    fail("Could not inspect local Docker containers for Supabase verification.");
  }

  const exactName = exactResult.stdout.trim();
  if (exactResult.status === 0 && exactName) return exactName.split("\n")[0];

  fail(`Local Supabase database container not found for project_id ${projectId}. Run pnpm run staging:local:up first.`);
}

function psql(container, sql) {
  return run(
    "docker",
    ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    { input: sql }
  );
}

const remoteLink = path.join(ROOT, "supabase", ".temp", "project-ref");
if (fs.existsSync(remoteLink)) {
  fail("Refusing local staging verification: supabase/.temp/project-ref exists.");
}

const projectId = readProjectId();
const container = findDbContainer(projectId);

const expectedMigrations = migrationFiles();
const routingSql = fs.readFileSync(ROUTING_SQL_PATH, "utf8");
const routing = psql(container, routingSql);
const publicationProofSql = fs.readFileSync(PUBLICATION_PROOF_SQL_PATH, "utf8");
const publicationProof = psql(container, publicationProofSql);
const spendIngressSql = fs.readFileSync(SPEND_INGRESS_SQL_PATH, "utf8");
const spendIngress = psql(container, spendIngressSql);
const organicSearchIngressSql = fs.readFileSync(ORGANIC_SEARCH_INGRESS_SQL_PATH, "utf8");
const organicSearchIngress = psql(container, organicSearchIngressSql);
const localProfilePerformanceIngressSql = fs.readFileSync(
  LOCAL_PROFILE_PERFORMANCE_INGRESS_SQL_PATH,
  "utf8"
);
const localProfilePerformanceIngress = psql(container, localProfilePerformanceIngressSql);

const schemaSql = `
\\pset tuples_only on
\\pset format unaligned
with migrations as (
  select count(*)::int as applied_count, max(version)::text as latest_version
  from supabase_migrations.schema_migrations
),
objects as (
  select
    to_regclass('public.sessions') is not null as sessions_exists,
    to_regclass('public.leads') is not null as leads_exists,
    to_regclass('public.agents') is not null as agents_exists,
    to_regclass('public.audit_logs') is not null as audit_logs_exists,
    to_regclass('public.lead_routing') is not null as lead_routing_exists,
    to_regclass('public.lead_notifications') is not null as lead_notifications_exists,
    to_regclass('public.source_attribution') is not null as source_attribution_exists,
    to_regclass('public.owned_demand_publication_proofs') is not null as publication_proofs_exists,
    to_regclass('public.marketing_spend_import_batches') is not null as spend_import_batches_exists,
    to_regclass('public.organic_search_import_batches') is not null as organic_search_import_batches_exists,
    to_regclass('public.local_profile_performance_import_batches') is not null as local_profile_performance_import_batches_exists,
    to_regprocedure(
      'public.record_owned_demand_publication_proof_v1(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,text,boolean)'
    ) is not null as publication_proof_function_exists,
    to_regprocedure(
      'public.import_marketing_spend_batch_v1(text,jsonb,text,text,text)'
    ) is not null as spend_import_function_exists,
    to_regprocedure(
      'public.import_organic_search_batch_v1(text,jsonb,text,text,text)'
    ) is not null as organic_search_import_function_exists,
    to_regprocedure(
      'public.import_local_profile_performance_batch_v1(text,jsonb,jsonb,text,text,text)'
    ) is not null as local_profile_performance_import_function_exists
),
notification_checks as (
  select
    (select relrowsecurity from pg_class where oid = 'public.lead_notifications'::regclass) as notification_rls_enabled,
    exists(select 1 from pg_indexes where schemaname='public' and tablename='lead_notifications' and indexname='lead_notifications_idempotency_key_idx') as notification_idempotency_index_exists,
    exists(select 1 from pg_indexes where schemaname='public' and tablename='lead_notifications' and indexname='lead_notifications_status_next_attempt_idx') as notification_processing_index_exists,
    exists(select 1 from pg_trigger where tgname='lead_notifications_updated_at' and not tgisinternal) as notification_updated_at_trigger_exists
),
publication_checks as (
  select
    (select relrowsecurity from pg_class where oid = 'public.owned_demand_publication_proofs'::regclass) as publication_rls_enabled,
    exists(
      select 1 from pg_trigger
      where tgrelid = 'public.owned_demand_publication_proofs'::regclass
        and tgname = 'owned_demand_publication_proofs_reject_change'
        and tgenabled <> 'D'
        and not tgisinternal
    ) as publication_immutable_trigger_exists,
    has_table_privilege('service_role', 'public.owned_demand_publication_proofs', 'SELECT') as publication_service_select,
    has_table_privilege('service_role', 'public.owned_demand_publication_proofs', 'INSERT') as publication_service_insert,
    not has_table_privilege('service_role', 'public.owned_demand_publication_proofs', 'UPDATE') as publication_service_update_denied,
    not has_table_privilege('service_role', 'public.owned_demand_publication_proofs', 'DELETE') as publication_service_delete_denied,
    not has_table_privilege('service_role', 'public.owned_demand_publication_proofs', 'TRUNCATE') as publication_service_truncate_denied,
    not has_table_privilege('service_role', 'public.owned_demand_publication_proofs', 'REFERENCES') as publication_service_references_denied,
    not has_table_privilege('service_role', 'public.owned_demand_publication_proofs', 'TRIGGER') as publication_service_trigger_denied,
    not has_table_privilege('anon', 'public.owned_demand_publication_proofs', 'SELECT') as publication_anon_select_denied,
    not has_table_privilege('authenticated', 'public.owned_demand_publication_proofs', 'SELECT') as publication_authenticated_select_denied
),
spend_checks as (
  select
    (select relrowsecurity from pg_class where oid = 'public.marketing_spend_import_batches'::regclass) as spend_receipt_rls_enabled,
    exists(
      select 1 from pg_trigger
      where tgrelid = 'public.marketing_spend_import_batches'::regclass
        and tgname = 'marketing_spend_import_batches_reject_change'
        and tgenabled <> 'D'
        and not tgisinternal
    ) as spend_receipt_immutable_trigger_exists,
    not has_table_privilege('service_role', 'public.marketing_spend_import_batches', 'SELECT') as spend_service_select_denied,
    not has_table_privilege('service_role', 'public.marketing_spend_import_batches', 'INSERT') as spend_service_insert_denied,
    not has_table_privilege('anon', 'public.marketing_spend_import_batches', 'SELECT') as spend_anon_select_denied,
    not has_table_privilege('authenticated', 'public.marketing_spend_import_batches', 'SELECT') as spend_authenticated_select_denied,
    not has_function_privilege(
      'service_role',
      'public.import_marketing_spend_batch_v1(text,jsonb,text,text,text)',
      'EXECUTE'
    ) as spend_service_execute_denied,
    not has_function_privilege(
      'anon',
      'public.import_marketing_spend_batch_v1(text,jsonb,text,text,text)',
      'EXECUTE'
    ) as spend_anon_execute_denied,
    not has_function_privilege(
      'authenticated',
      'public.import_marketing_spend_batch_v1(text,jsonb,text,text,text)',
      'EXECUTE'
    ) as spend_authenticated_execute_denied
),
organic_search_checks as (
  select
    (select relrowsecurity from pg_class where oid = 'public.organic_search_import_batches'::regclass) as organic_search_receipt_rls_enabled,
    exists(
      select 1 from pg_trigger
      where tgrelid = 'public.organic_search_import_batches'::regclass
        and tgname = 'organic_search_import_batches_reject_change'
        and tgenabled <> 'D'
        and not tgisinternal
    ) as organic_search_receipt_immutable_trigger_exists,
    not has_table_privilege('service_role', 'public.organic_search_import_batches', 'SELECT') as organic_search_service_select_denied,
    not has_table_privilege('service_role', 'public.organic_search_import_batches', 'INSERT') as organic_search_service_insert_denied,
    not has_table_privilege('anon', 'public.organic_search_import_batches', 'SELECT') as organic_search_anon_select_denied,
    not has_table_privilege('authenticated', 'public.organic_search_import_batches', 'SELECT') as organic_search_authenticated_select_denied,
    not has_function_privilege(
      'service_role',
      'public.import_organic_search_batch_v1(text,jsonb,text,text,text)',
      'EXECUTE'
    ) as organic_search_service_execute_denied,
    not has_function_privilege(
      'anon',
      'public.import_organic_search_batch_v1(text,jsonb,text,text,text)',
      'EXECUTE'
    ) as organic_search_anon_execute_denied,
    not has_function_privilege(
      'authenticated',
      'public.import_organic_search_batch_v1(text,jsonb,text,text,text)',
      'EXECUTE'
    ) as organic_search_authenticated_execute_denied
),
local_profile_performance_checks as (
  select
    (select relrowsecurity from pg_class where oid = 'public.local_profile_performance_import_batches'::regclass) as local_profile_receipt_rls_enabled,
    exists(
      select 1 from pg_trigger
      where tgrelid = 'public.local_profile_performance_import_batches'::regclass
        and tgname = 'local_profile_performance_import_batches_reject_change'
        and tgenabled <> 'D'
        and not tgisinternal
    ) as local_profile_receipt_immutable_trigger_exists,
    not has_table_privilege('service_role', 'public.local_profile_performance_import_batches', 'SELECT') as local_profile_service_select_denied,
    not has_table_privilege('service_role', 'public.local_profile_performance_import_batches', 'INSERT') as local_profile_service_insert_denied,
    not has_table_privilege('anon', 'public.local_profile_performance_import_batches', 'SELECT') as local_profile_anon_select_denied,
    not has_table_privilege('authenticated', 'public.local_profile_performance_import_batches', 'SELECT') as local_profile_authenticated_select_denied,
    not has_function_privilege(
      'service_role',
      'public.import_local_profile_performance_batch_v1(text,jsonb,jsonb,text,text,text)',
      'EXECUTE'
    ) as local_profile_service_execute_denied,
    not has_function_privilege(
      'anon',
      'public.import_local_profile_performance_batch_v1(text,jsonb,jsonb,text,text,text)',
      'EXECUTE'
    ) as local_profile_anon_execute_denied,
    not has_function_privilege(
      'authenticated',
      'public.import_local_profile_performance_batch_v1(text,jsonb,jsonb,text,text,text)',
      'EXECUTE'
    ) as local_profile_authenticated_execute_denied
),
data_counts as (
  select
    (select count(*) from public.leads)::int as leads_count,
    (select count(*) from public.agents)::int as agents_count,
    (select count(*) from public.lead_notifications)::int as lead_notifications_count,
    (select count(*) from public.audit_logs)::int as audit_logs_count,
    (select count(*) from public.source_attribution)::int as source_attribution_count
)
select jsonb_build_object(
  'postgres_version', current_setting('server_version'),
  'migrations', (select row_to_json(migrations) from migrations),
  'objects', (select row_to_json(objects) from objects),
  'notification_checks', (select row_to_json(notification_checks) from notification_checks),
  'publication_checks', (select row_to_json(publication_checks) from publication_checks),
  'spend_checks', (select row_to_json(spend_checks) from spend_checks),
  'organic_search_checks', (select row_to_json(organic_search_checks) from organic_search_checks),
  'local_profile_performance_checks', (select row_to_json(local_profile_performance_checks) from local_profile_performance_checks),
  'data_counts', (select row_to_json(data_counts) from data_counts)
)::text;
`;

const schema = psql(container, schemaSql);
let parsed = null;
if (schema.status === 0) {
  const jsonLine = schema.stdout
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("{"));
  if (jsonLine) parsed = JSON.parse(jsonLine);
}

const latestExpected = expectedMigrations.at(-1);
const latestExpectedVersion = latestExpected?.split("_")[0] ?? null;
const migrationOk =
  parsed?.migrations?.applied_count === expectedMigrations.length &&
  parsed?.migrations?.latest_version === latestExpectedVersion;
const objectsOk =
  parsed &&
  Object.values(parsed.objects ?? {}).every((value) => value === true) &&
  Object.values(parsed.notification_checks ?? {}).every((value) => value === true) &&
  Object.values(parsed.publication_checks ?? {}).every((value) => value === true) &&
  Object.values(parsed.spend_checks ?? {}).every((value) => value === true) &&
  Object.values(parsed.organic_search_checks ?? {}).every((value) => value === true) &&
  Object.values(parsed.local_profile_performance_checks ?? {}).every((value) => value === true);

const summary = {
  generated_at_utc: new Date().toISOString(),
  target_environment: "local",
  remote_project_linked: false,
  local_project_id_configured: true,
  docker_container_verified: true,
  expected_migration_count: expectedMigrations.length,
  expected_final_migration: latestExpected,
  expected_final_migration_version: latestExpectedVersion,
  routing_sla_sql_passed: routing.status === 0,
  publication_proof_sql_passed: publicationProof.status === 0,
  marketing_spend_ingress_sql_passed: spendIngress.status === 0,
  organic_search_ingress_sql_passed: organicSearchIngress.status === 0,
  local_profile_performance_ingress_sql_passed: localProfilePerformanceIngress.status === 0,
  schema_sql_passed: schema.status === 0,
  migration_status_passed: migrationOk,
  object_status_passed: !!objectsOk,
  postgres_version: parsed?.postgres_version ?? null,
  applied_migration_count: parsed?.migrations?.applied_count ?? null,
  latest_applied_migration: parsed?.migrations?.latest_version ?? null,
  data_counts: parsed?.data_counts ?? null,
  provider_calls: 0,
  emails_sent: 0,
  sms_sent: 0,
};

writeJson(SUMMARY_PATH, summary);

if (
  routing.status !== 0 ||
  publicationProof.status !== 0 ||
  spendIngress.status !== 0 ||
  organicSearchIngress.status !== 0 ||
  localProfilePerformanceIngress.status !== 0 ||
  schema.status !== 0 ||
  !migrationOk ||
  !objectsOk
) {
  fail(`Local staging verification failed. Sanitized summary: ${SUMMARY_PATH}`);
}

console.log(`Local staging verification passed. Sanitized summary: ${SUMMARY_PATH}`);
