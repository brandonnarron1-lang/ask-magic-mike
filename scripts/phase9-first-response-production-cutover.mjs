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
  "APPROVE PHASE 9 FIRST RESPONSE PRODUCTION MIGRATION, PR 181 MERGE, AND PRODUCTION DEPLOYMENT";
export const MIGRATION_VERSION = "20260820013000";
export const MIGRATION_NAME = "first_response_intelligence";
export const MIGRATION_FILE = `${MIGRATION_VERSION}_${MIGRATION_NAME}.sql`;
export const MIGRATION_SHA256 =
  "c364c8cc33428a187bcbcf2bdfcc142f3bc0422410911076abf04307bf28459e";
export const APPLICATION_NAME = "amm_phase9_first_response_cutover";

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
  if (value !== APPROVAL_PHRASE) fail("exact_first_response_production_approval_missing");
  return true;
}

export async function migrationSource() {
  const sql = await readFile(MIGRATION_PATH, "utf8");
  const sha256 = createHash("sha256").update(sql).digest("hex");
  if (sha256 !== MIGRATION_SHA256) fail("reviewed_first_response_migration_hash_mismatch");
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
    lead_outcomes_table: snapshot.lead_outcomes_table === true,
    lead_center_users_table: snapshot.lead_center_users_table === true,
    agents_table: snapshot.agents_table === true,
    migration_ledger: snapshot.migration_ledger === true,
    service_role: snapshot.service_role === true,
    service_role_bypassrls: snapshot.service_role_bypassrls === true,
    service_role_schema_usage: snapshot.service_role_schema_usage === true,
    service_role_leads_select: snapshot.service_role_leads_select === true,
    service_role_leads_update: snapshot.service_role_leads_update === true,
    service_role_audit_select: snapshot.service_role_audit_select === true,
    service_role_audit_insert: snapshot.service_role_audit_insert === true,
    service_role_users_select: snapshot.service_role_users_select === true,
    service_role_agents_select: snapshot.service_role_agents_select === true,
    v2_present: snapshot.v2_present === true,
    v2_owner_expected: snapshot.v2_owner === "neondb_owner",
    v2_security_invoker: snapshot.v2_security_definer === false,
    v2_search_path_locked: snapshot.v2_search_path_locked === true,
    service_role_v2_execute: snapshot.service_role_v2_execute === true,
    response_table_absent: snapshot.response_table_present === false,
    response_unique_index_absent: snapshot.response_unique_index_present === false,
    recorder_absent: snapshot.recorder_present === false,
    v3_absent: snapshot.v3_present === false,
    target_migration_absent: Number(snapshot.target_migration_count) === 0,
  };
  const failures = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  if (failures.length) fail("first_response_production_preflight_failed", failures.join(","));

  const missingRequiredColumns = snapshot.missing_required_columns ?? [];
  if (!Array.isArray(missingRequiredColumns) || missingRequiredColumns.length) {
    fail(
      "first_response_production_schema_required_columns_missing",
      Array.isArray(missingRequiredColumns)
        ? missingRequiredColumns.join(",")
        : "invalid_required_column_snapshot",
    );
  }

  const requiredColumns = new Set(snapshot.ledger_required_columns ?? []);
  for (const supported of ["version", "statements", "name"]) requiredColumns.delete(supported);
  if (requiredColumns.size) {
    fail(
      "first_response_migration_ledger_unsupported_required_columns",
      [...requiredColumns].join(","),
    );
  }
  buildLedgerInsert(snapshot.ledger_columns ?? [], MIGRATION_VERSION, MIGRATION_NAME);
  return checks;
}

export function validatePostflight(
  before,
  after,
  { allowRuntimeMilestones = false } = {},
) {
  const checks = {
    database: after.database === "neondb",
    owner: after.owner === "neondb_owner",
    v2_present: after.v2_present === true,
    v2_owner_expected: after.v2_owner === "neondb_owner",
    v2_security_invoker: after.v2_security_definer === false,
    v2_search_path_locked: after.v2_search_path_locked === true,
    response_table_present: after.response_table_present === true,
    response_table_owner_expected: after.response_table_owner === "neondb_owner",
    response_table_rls: after.response_table_rls === true,
    response_unique_index: after.response_unique_index_present === true,
    response_update_trigger: after.response_update_trigger === true,
    response_update_trigger_enabled: after.response_update_trigger_enabled === true,
    recorder_present: after.recorder_present === true,
    recorder_owner_expected: after.recorder_owner === "neondb_owner",
    recorder_security_invoker: after.recorder_security_definer === false,
    recorder_search_path_locked: after.recorder_search_path_locked === true,
    v3_present: after.v3_present === true,
    v3_owner_expected: after.v3_owner === "neondb_owner",
    v3_security_invoker: after.v3_security_definer === false,
    v3_search_path_locked: after.v3_search_path_locked === true,
    service_role_v2_execute: after.service_role_v2_execute === true,
    service_role_recorder_execute: after.service_role_recorder_execute === true,
    service_role_v3_execute: after.service_role_v3_execute === true,
    service_role_response_select: after.service_role_response_select === true,
    service_role_response_insert: after.service_role_response_insert === true,
    public_function_execute_denied: after.public_function_execute === false,
    browser_role_function_execute_denied:
      Number(after.browser_role_function_execute_count) === 0,
    public_table_access_denied: after.public_table_access === false,
    browser_role_table_access_denied: Number(after.browser_role_table_access_count) === 0,
    target_migration_once: Number(after.target_migration_count) === 1,
    lead_count_unchanged: Number(after.lead_count) === Number(before.lead_count),
    lead_state_unchanged: after.lead_state_digest === before.lead_state_digest,
    audit_count_unchanged: Number(after.audit_count) === Number(before.audit_count),
    audit_contact_evidence_unchanged:
      after.audit_contact_digest === before.audit_contact_digest,
    backfill_cardinality:
      Number(after.target_backfill_count) === Number(before.backfill_eligible_count),
    backfill_unique_leads:
      Number(after.target_backfill_distinct_leads) ===
      Number(after.target_backfill_count),
    backfill_source_exact: Number(after.target_backfill_source_mismatch_count) === 0,
    backfill_time_exact: Number(after.target_backfill_time_mismatch_count) === 0,
    backfill_evidence_exact: Number(after.target_backfill_evidence_mismatch_count) === 0,
    backfill_identity_exact: Number(after.target_backfill_identity_mismatch_count) === 0,
    backfill_flags_exact: Number(after.target_backfill_flag_mismatch_count) === 0,
    backfill_metadata_exact: Number(after.target_backfill_metadata_mismatch_count) === 0,
    runtime_milestones_expected:
      allowRuntimeMilestones || Number(after.runtime_milestone_count) === 0,
  };
  const failures = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  if (failures.length) fail("first_response_production_postflight_failed", failures.join(","));
  return checks;
}

const PREFLIGHT_SQL = `
WITH first_contact_audit AS (
  SELECT DISTINCT ON (a.resource_id)
         a.resource_id::uuid AS lead_id,
         a.id AS audit_id,
         a.actor,
         a.created_at AS occurred_at
    FROM public.audit_logs a
   WHERE a.resource_type = 'lead'
     AND a.action = 'lead.lifecycle_changed'
     AND a.after_state->>'status' = 'contacted'
     AND a.resource_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   ORDER BY a.resource_id, a.created_at ASC, a.id ASC
),
eligible_backfill AS (
  SELECT a.*
    FROM first_contact_audit a
    JOIN public.leads l ON l.id = a.lead_id
   WHERE a.occurred_at >= l.created_at
),
v2 AS (
  SELECT p.oid, p.proowner, p.prosecdef, p.proconfig,
         pg_get_userbyid(p.proowner) AS function_owner
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.oid = to_regprocedure(
       'public.mutate_admin_lead_status_v2(uuid,text,text,jsonb,text,numeric,text,timestamptz)'
     )
)
SELECT jsonb_build_object(
  'database', current_database(),
  'owner', current_user,
  'server_version', current_setting('server_version'),
  'can_create_public', has_schema_privilege(current_user, 'public', 'CREATE'),
  'leads_table', to_regclass('public.leads') IS NOT NULL,
  'audit_logs_table', to_regclass('public.audit_logs') IS NOT NULL,
  'lead_outcomes_table', to_regclass('public.lead_outcomes') IS NOT NULL,
  'lead_center_users_table', to_regclass('public.lead_center_users') IS NOT NULL,
  'agents_table', to_regclass('public.agents') IS NOT NULL,
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
  'service_role_leads_select', COALESCE(
    has_table_privilege('service_role', to_regclass('public.leads'), 'SELECT'), false
  ),
  'service_role_leads_update', COALESCE(
    has_table_privilege('service_role', to_regclass('public.leads'), 'UPDATE'), false
  ),
  'service_role_audit_select', COALESCE(
    has_table_privilege('service_role', to_regclass('public.audit_logs'), 'SELECT'), false
  ),
  'service_role_audit_insert', COALESCE(
    has_table_privilege('service_role', to_regclass('public.audit_logs'), 'INSERT'), false
  ),
  'service_role_users_select', COALESCE(
    has_table_privilege('service_role', to_regclass('public.lead_center_users'), 'SELECT'), false
  ),
  'service_role_agents_select', COALESCE(
    has_table_privilege('service_role', to_regclass('public.agents'), 'SELECT'), false
  ),
  'v2_present', EXISTS (SELECT 1 FROM v2),
  'v2_owner', (SELECT function_owner FROM v2),
  'v2_security_definer', COALESCE((SELECT prosecdef FROM v2), true),
  'v2_search_path_locked', COALESCE((
    SELECT proconfig @> ARRAY['search_path=public, pg_temp']::text[] FROM v2
  ), false),
  'service_role_v2_execute', COALESCE((
    SELECT has_function_privilege('service_role', oid, 'EXECUTE') FROM v2
  ), false),
  'response_table_present', to_regclass('public.lead_response_milestones') IS NOT NULL,
  'response_unique_index_present',
    to_regclass('public.lead_response_milestones_lead_id_key') IS NOT NULL,
  'recorder_present', to_regprocedure(
    'public.record_admin_first_response_v1(uuid,text,timestamptz,text)'
  ) IS NOT NULL,
  'v3_present', to_regprocedure(
    'public.mutate_admin_lead_status_v3(uuid,text,text,jsonb,text,numeric,text,timestamptz)'
  ) IS NOT NULL,
  'target_migration_count', (
    SELECT count(*) FROM supabase_migrations.schema_migrations
     WHERE version = '${MIGRATION_VERSION}'
  ),
  'lead_count', (SELECT count(*) FROM public.leads),
  'lead_state_digest', (
    SELECT md5(COALESCE(string_agg(
      concat_ws(
        '|',
        id::text,
        COALESCE(status, ''),
        COALESCE(last_contacted_at::text, ''),
        COALESCE(conversion_stage, ''),
        COALESCE(updated_at::text, '')
      ),
      ',' ORDER BY id
    ), ''))
      FROM public.leads
  ),
  'audit_count', (SELECT count(*) FROM public.audit_logs),
  'audit_contact_digest', (
    SELECT md5(COALESCE(string_agg(
      concat_ws(
        '|',
        id::text,
        resource_id::text,
        COALESCE(actor, ''),
        created_at::text
      ),
      ',' ORDER BY id
    ), ''))
      FROM public.audit_logs
     WHERE resource_type = 'lead'
       AND action = 'lead.lifecycle_changed'
       AND after_state->>'status' = 'contacted'
  ),
  'backfill_eligible_count', (SELECT count(*) FROM eligible_backfill),
  'missing_required_columns', COALESCE((
    SELECT jsonb_agg(
      required.table_schema || '.' || required.table_name || '.' || required.column_name
      ORDER BY required.table_schema, required.table_name, required.column_name
    )
      FROM (VALUES
        ('public', 'leads', 'id'),
        ('public', 'leads', 'status'),
        ('public', 'leads', 'created_at'),
        ('public', 'leads', 'last_contacted_at'),
        ('public', 'leads', 'conversion_stage'),
        ('public', 'leads', 'updated_at'),
        ('public', 'leads', 'is_test'),
        ('public', 'leads', 'communication_suppressed'),
        ('public', 'leads', 'assigned_agent_id'),
        ('public', 'audit_logs', 'id'),
        ('public', 'audit_logs', 'actor'),
        ('public', 'audit_logs', 'action'),
        ('public', 'audit_logs', 'resource_type'),
        ('public', 'audit_logs', 'resource_id'),
        ('public', 'audit_logs', 'before_state'),
        ('public', 'audit_logs', 'after_state'),
        ('public', 'audit_logs', 'metadata'),
        ('public', 'audit_logs', 'created_at'),
        ('public', 'lead_center_users', 'id'),
        ('public', 'lead_center_users', 'agentId'),
        ('public', 'agents', 'id')
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

const POSTFLIGHT_SQL = `
WITH first_contact_audit AS (
  SELECT DISTINCT ON (a.resource_id)
         a.resource_id::uuid AS lead_id,
         a.id AS audit_id,
         a.actor,
         u.id AS responder_user_id,
         ra.id AS responder_agent_id,
         a.created_at AS occurred_at
    FROM public.audit_logs a
    LEFT JOIN public.lead_center_users u
      ON a.actor = 'lead_center:' || u.id
    LEFT JOIN public.agents ra
      ON ra.id::text = u."agentId"
   WHERE a.resource_type = 'lead'
     AND a.action = 'lead.lifecycle_changed'
     AND a.after_state->>'status' = 'contacted'
     AND a.resource_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   ORDER BY a.resource_id, a.created_at ASC, a.id ASC
),
eligible_backfill AS (
  SELECT a.*
    FROM first_contact_audit a
    JOIN public.leads l ON l.id = a.lead_id
   WHERE a.occurred_at >= l.created_at
),
v2 AS (
  SELECT p.oid, p.proowner, p.prosecdef, p.proconfig,
         pg_get_userbyid(p.proowner) AS function_owner
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.oid = to_regprocedure(
       'public.mutate_admin_lead_status_v2(uuid,text,text,jsonb,text,numeric,text,timestamptz)'
     )
),
recorder AS (
  SELECT p.oid, p.proowner, p.proacl, p.prosecdef, p.proconfig,
         pg_get_userbyid(p.proowner) AS function_owner
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.oid = to_regprocedure(
       'public.record_admin_first_response_v1(uuid,text,timestamptz,text)'
     )
),
v3 AS (
  SELECT p.oid, p.proowner, p.proacl, p.prosecdef, p.proconfig,
         pg_get_userbyid(p.proowner) AS function_owner
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.oid = to_regprocedure(
       'public.mutate_admin_lead_status_v3(uuid,text,text,jsonb,text,numeric,text,timestamptz)'
     )
),
response_table AS (
  SELECT c.oid, c.relowner, c.relacl, c.relrowsecurity, c.relforcerowsecurity,
         pg_get_userbyid(c.relowner) AS table_owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'lead_response_milestones'
     AND c.relkind = 'r'
)
SELECT jsonb_build_object(
  'database', current_database(),
  'owner', current_user,
  'v2_present', EXISTS (SELECT 1 FROM v2),
  'v2_owner', (SELECT function_owner FROM v2),
  'v2_security_definer', COALESCE((SELECT prosecdef FROM v2), true),
  'v2_search_path_locked', COALESCE((
    SELECT proconfig @> ARRAY['search_path=public, pg_temp']::text[] FROM v2
  ), false),
  'response_table_present', EXISTS (SELECT 1 FROM response_table),
  'response_table_owner', (SELECT table_owner FROM response_table),
  'response_table_rls', COALESCE((SELECT relrowsecurity FROM response_table), false),
  'response_table_force_rls', COALESCE((SELECT relforcerowsecurity FROM response_table), false),
  'response_unique_index_present',
    to_regclass('public.lead_response_milestones_lead_id_key') IS NOT NULL,
  'response_update_trigger', EXISTS (
    SELECT 1
      FROM pg_trigger
     WHERE tgrelid = to_regclass('public.lead_response_milestones')
       AND tgname = 'lead_response_milestones_reject_change'
       AND NOT tgisinternal
  ),
  'response_update_trigger_enabled', EXISTS (
    SELECT 1
      FROM pg_trigger
     WHERE tgrelid = to_regclass('public.lead_response_milestones')
       AND tgname = 'lead_response_milestones_reject_change'
       AND tgenabled <> 'D'
       AND NOT tgisinternal
  ),
  'recorder_present', EXISTS (SELECT 1 FROM recorder),
  'recorder_owner', (SELECT function_owner FROM recorder),
  'recorder_security_definer', COALESCE((SELECT prosecdef FROM recorder), true),
  'recorder_search_path_locked', COALESCE((
    SELECT proconfig @> ARRAY['search_path=public, pg_temp']::text[] FROM recorder
  ), false),
  'v3_present', EXISTS (SELECT 1 FROM v3),
  'v3_owner', (SELECT function_owner FROM v3),
  'v3_security_definer', COALESCE((SELECT prosecdef FROM v3), true),
  'v3_search_path_locked', COALESCE((
    SELECT proconfig @> ARRAY['search_path=public, pg_temp']::text[] FROM v3
  ), false),
  'service_role_v2_execute', COALESCE((
    SELECT has_function_privilege('service_role', oid, 'EXECUTE') FROM v2
  ), false),
  'service_role_recorder_execute', COALESCE((
    SELECT has_function_privilege('service_role', oid, 'EXECUTE') FROM recorder
  ), false),
  'service_role_v3_execute', COALESCE((
    SELECT has_function_privilege('service_role', oid, 'EXECUTE') FROM v3
  ), false),
  'service_role_response_select', COALESCE(
    has_table_privilege(
      'service_role',
      to_regclass('public.lead_response_milestones'),
      'SELECT'
    ),
    false
  ),
  'service_role_response_insert', COALESCE(
    has_table_privilege(
      'service_role',
      to_regclass('public.lead_response_milestones'),
      'INSERT'
    ),
    false
  ),
  'public_function_execute', EXISTS (
    SELECT 1
      FROM (SELECT * FROM recorder UNION ALL SELECT * FROM v3) f
      CROSS JOIN LATERAL aclexplode(COALESCE(f.proacl, acldefault('f', f.proowner))) acl
     WHERE acl.grantee = 0
       AND acl.privilege_type = 'EXECUTE'
  ),
  'browser_role_function_execute_count', (
    SELECT count(*)
      FROM pg_roles browser_role
      CROSS JOIN (SELECT oid FROM recorder UNION ALL SELECT oid FROM v3) f
     WHERE browser_role.rolname IN ('anon', 'authenticated')
       AND has_function_privilege(browser_role.rolname, f.oid, 'EXECUTE')
  ),
  'public_table_access', EXISTS (
    SELECT 1
      FROM response_table t
      CROSS JOIN LATERAL aclexplode(COALESCE(t.relacl, acldefault('r', t.relowner))) acl
     WHERE acl.grantee = 0
       AND acl.privilege_type IN (
         'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
       )
  ),
  'browser_role_table_access_count', (
    SELECT count(*)
      FROM pg_roles browser_role
     WHERE browser_role.rolname IN ('anon', 'authenticated')
       AND (
         has_table_privilege(
           browser_role.rolname,
           to_regclass('public.lead_response_milestones'),
           'SELECT'
         )
         OR has_table_privilege(
           browser_role.rolname,
           to_regclass('public.lead_response_milestones'),
           'INSERT'
         )
         OR has_table_privilege(
           browser_role.rolname,
           to_regclass('public.lead_response_milestones'),
           'UPDATE'
         )
         OR has_table_privilege(
           browser_role.rolname,
           to_regclass('public.lead_response_milestones'),
           'DELETE'
         )
       )
  ),
  'target_migration_count', (
    SELECT count(*) FROM supabase_migrations.schema_migrations
     WHERE version = '${MIGRATION_VERSION}'
  ),
  'lead_count', (SELECT count(*) FROM public.leads),
  'lead_state_digest', (
    SELECT md5(COALESCE(string_agg(
      concat_ws(
        '|',
        id::text,
        COALESCE(status, ''),
        COALESCE(last_contacted_at::text, ''),
        COALESCE(conversion_stage, ''),
        COALESCE(updated_at::text, '')
      ),
      ',' ORDER BY id
    ), ''))
      FROM public.leads
  ),
  'audit_count', (SELECT count(*) FROM public.audit_logs),
  'audit_contact_digest', (
    SELECT md5(COALESCE(string_agg(
      concat_ws(
        '|',
        id::text,
        resource_id::text,
        COALESCE(actor, ''),
        created_at::text
      ),
      ',' ORDER BY id
    ), ''))
      FROM public.audit_logs
     WHERE resource_type = 'lead'
       AND action = 'lead.lifecycle_changed'
       AND after_state->>'status' = 'contacted'
  ),
  'backfill_eligible_count', (SELECT count(*) FROM eligible_backfill),
  'target_backfill_count', (
    SELECT count(*)
      FROM public.lead_response_milestones
     WHERE metadata->>'migration' = '${MIGRATION_VERSION}_${MIGRATION_NAME}'
       AND metadata->>'backfilled' = 'true'
  ),
  'target_backfill_distinct_leads', (
    SELECT count(DISTINCT lead_id)
      FROM public.lead_response_milestones
     WHERE metadata->>'migration' = '${MIGRATION_VERSION}_${MIGRATION_NAME}'
       AND metadata->>'backfilled' = 'true'
  ),
  'runtime_milestone_count', (
    SELECT count(*)
      FROM public.lead_response_milestones
     WHERE metadata->>'migration' IS DISTINCT FROM
       '${MIGRATION_VERSION}_${MIGRATION_NAME}'
       OR metadata->>'backfilled' IS DISTINCT FROM 'true'
  ),
  'target_backfill_source_mismatch_count', (
    SELECT count(*)
      FROM public.lead_response_milestones
     WHERE metadata->>'migration' = '${MIGRATION_VERSION}_${MIGRATION_NAME}'
       AND (
         metadata->>'backfilled' IS DISTINCT FROM 'true'
         OR source_system IS DISTINCT FROM 'admin_lead_lifecycle'
       )
  ),
  'target_backfill_time_mismatch_count', (
    SELECT count(*)
      FROM public.lead_response_milestones m
      JOIN eligible_backfill e ON e.lead_id = m.lead_id
     WHERE m.metadata->>'migration' = '${MIGRATION_VERSION}_${MIGRATION_NAME}'
       AND m.first_human_response_at IS DISTINCT FROM e.occurred_at
  ),
  'target_backfill_evidence_mismatch_count', (
    SELECT count(*)
      FROM public.lead_response_milestones m
      JOIN eligible_backfill e ON e.lead_id = m.lead_id
     WHERE m.metadata->>'migration' = '${MIGRATION_VERSION}_${MIGRATION_NAME}'
       AND (
         m.evidence_audit_id IS DISTINCT FROM e.audit_id
         OR m.actor IS DISTINCT FROM e.actor
       )
  ),
  'target_backfill_identity_mismatch_count', (
    SELECT count(*)
      FROM public.lead_response_milestones m
      JOIN eligible_backfill e ON e.lead_id = m.lead_id
     WHERE m.metadata->>'migration' = '${MIGRATION_VERSION}_${MIGRATION_NAME}'
       AND (
         m.responder_user_id IS DISTINCT FROM e.responder_user_id
         OR m.responder_agent_id IS DISTINCT FROM e.responder_agent_id
         OR m.assigned_agent_id_at_response IS NOT NULL
       )
  ),
  'target_backfill_flag_mismatch_count', (
    SELECT count(*)
      FROM public.lead_response_milestones m
      JOIN public.leads l ON l.id = m.lead_id
     WHERE m.metadata->>'migration' = '${MIGRATION_VERSION}_${MIGRATION_NAME}'
       AND (
         m.is_test IS DISTINCT FROM l.is_test
         OR m.communication_suppressed IS DISTINCT FROM l.communication_suppressed
       )
  ),
  'target_backfill_metadata_mismatch_count', (
    SELECT count(*)
      FROM public.lead_response_milestones
     WHERE metadata->>'migration' = '${MIGRATION_VERSION}_${MIGRATION_NAME}'
       AND (
         metadata->>'backfilled' IS DISTINCT FROM 'true'
         OR metadata->>'recording_version' IS DISTINCT FROM 'v1'
         OR metadata->>'assigned_owner_snapshot_available' IS DISTINCT FROM 'false'
       )
  )
) AS snapshot`;

export async function preflight(target) {
  const client = await connect(target, APPLICATION_NAME);
  try {
    const snapshot = await readSnapshot(client, PREFLIGHT_SQL);
    const checks = validatePreflight(snapshot);
    return { snapshot, checks };
  } finally {
    await client.end();
  }
}

export async function verify(target) {
  const client = await connect(target, APPLICATION_NAME);
  try {
    const snapshot = await readSnapshot(client, POSTFLIGHT_SQL);
    const checks = validatePostflight(snapshot, snapshot, {
      allowRuntimeMilestones: true,
    });
    return { snapshot, checks };
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
      fail("first_response_production_cutover_already_running");
    }
    await client.query(
      "LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE",
    );
    await client.query(
      "LOCK TABLE public.leads, public.audit_logs, public.lead_center_users, public.agents IN SHARE MODE",
    );

    const lockedBaseline = await readSnapshot(client, PREFLIGHT_SQL);
    validatePreflight(lockedBaseline);
    if (
      lockedBaseline.lead_state_digest !== baseline.lead_state_digest ||
      Number(lockedBaseline.lead_count) !== Number(baseline.lead_count) ||
      lockedBaseline.audit_contact_digest !== baseline.audit_contact_digest ||
      Number(lockedBaseline.audit_count) !== Number(baseline.audit_count)
    ) {
      fail("first_response_production_changed_since_preflight");
    }

    backup = await createBackup(target, {
      applicationName: APPLICATION_NAME,
      filenamePrefix: "ask-magic-mike-pre-first-response",
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
    audit_contact_digest: snapshot.audit_contact_digest,
    backfill_eligible_count: Number(snapshot.backfill_eligible_count ?? 0),
    target_backfill_count: Number(snapshot.target_backfill_count ?? 0),
    runtime_milestone_count: Number(snapshot.runtime_milestone_count ?? 0),
    target_migration_count: Number(snapshot.target_migration_count ?? 0),
    response_table_present: snapshot.response_table_present,
    response_table_rls: snapshot.response_table_rls,
    recorder_present: snapshot.recorder_present,
    v3_present: snapshot.v3_present,
    service_role_recorder_execute: snapshot.service_role_recorder_execute,
    service_role_v3_execute: snapshot.service_role_v3_execute,
    public_function_execute: snapshot.public_function_execute,
    public_table_access: snapshot.public_table_access,
    browser_role_function_execute_count:
      Number(snapshot.browser_role_function_execute_count ?? 0),
    browser_role_table_access_count:
      Number(snapshot.browser_role_table_access_count ?? 0),
  };
}

export function plan() {
  return {
    operation: "phase9_first_response_production_cutover",
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
  return `${JSON.stringify(plan(), null, 2)}

Usage:
  pnpm run phase9:first-response:cutover -- --plan
  pnpm run phase9:first-response:cutover -- --preflight
  pnpm run phase9:first-response:cutover -- --verify
  pnpm run phase9:first-response:cutover -- --execute

Never paste the database URL into chat or a command argument. Enter it only through a secure environment interface.`;
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode === "help") {
    console.log(help());
    return;
  }

  const source = await migrationSource();
  if (mode === "plan") {
    console.log(
      JSON.stringify(
        {
          ...plan(),
          migration_verified: source.sha256 === MIGRATION_SHA256,
        },
        null,
        2,
      ),
    );
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
        backup: safeBackup(result.backup),
        next:
          "Merge PR #181, deploy its exact head, verify authenticated Growth and lead-detail behavior, and retain the mode-600 backup until application verification passes.",
      },
      null,
      2,
    ),
  );
}

const isDirect =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  main().catch((error) => {
    console.error(
      JSON.stringify({
        ok: false,
        error: error?.code ?? "first_response_cutover_failed",
        detail: redactError(error?.message),
        ...(error?.backup ? { backup: safeBackup(error.backup) } : {}),
      }),
    );
    process.exit(1);
  });
}
