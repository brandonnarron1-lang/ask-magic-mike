#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const EVIDENCE = join(ROOT, ".amm-run/infra-02");
const REMOTE_LINK = join(ROOT, "supabase/.temp/project-ref");
const TEST_AGENT_ID = "00000000-0000-4000-8000-000000000001";
const MODE = process.argv.includes("--postgres-contract")
  ? "postgres-contract"
  : process.argv.includes("--supabase-lifecycle")
    ? "supabase-lifecycle"
    : null;

if (!MODE) {
  console.error("Use --postgres-contract or --supabase-lifecycle.");
  process.exit(2);
}
if (existsSync(REMOTE_LINK)) {
  console.error("Refusing INFRA-02 local verification: supabase/.temp/project-ref exists.");
  process.exit(1);
}

function projectId() {
  const config = spawnSync("sed", ["-n", "s/^project_id = \"\\(.*\\)\"/\\1/p", "supabase/config.toml"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const id = config.stdout.trim();
  if (!id) throw new Error("local_project_id_missing");
  return id;
}

function containerName() {
  return `supabase_db_${projectId()}`;
}

const CONTAINER = containerName();

function psql(sql, { expectFailure = false } = {}) {
  const result = spawnSync(
    "docker",
    [
      "exec", "-i", CONTAINER, "psql", "-X", "-U", "postgres", "-d", "postgres",
      "-v", "ON_ERROR_STOP=1", "-A", "-t", "-q",
    ],
    { cwd: ROOT, input: sql, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  if (expectFailure) {
    if (result.status === 0) throw new Error("expected_postgres_failure_did_not_occur");
    return "";
  }
  if (result.status !== 0) {
    throw new Error(`postgres_command_failed:${result.stderr.trim().split("\n").at(-1) || "unknown"}`);
  }
  return result.stdout.trim();
}

function psqlAsync(sql) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      "docker",
      [
        "exec", "-i", CONTAINER, "psql", "-X", "-U", "postgres", "-d", "postgres",
        "-v", "ON_ERROR_STOP=1", "-A", "-t", "-q",
      ],
      { cwd: ROOT, stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`concurrent_postgres_command_failed:${stderr.trim().split("\n").at(-1) || code}`));
      } else {
        resolvePromise(stdout.trim());
      }
    });
    child.stdin.end(sql);
  });
}

function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function uuid(group, number) {
  const prefix = String(group).replaceAll("-", "").padEnd(8, "0").slice(0, 8);
  return `${prefix}-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

function captureSql({
  sessionId,
  email = null,
  phone = null,
  address = "1 Synthetic Contract Street",
  leadType = "home_value",
  primaryIntent = "sell",
  status = "qualified",
  grade = "A",
  attributionReferrerType = "direct",
}) {
  const session = {
    id: sessionId,
    utm_source: "infra02",
    utm_medium: "synthetic",
    referrer_type: "direct",
    landing_page: "/infra-02",
    device_type: "desktop",
    initial_question: leadType === "general_question" ? "Synthetic question" : null,
    initial_address: address,
    status: "completed",
    step_reached: 5,
  };
  const normalizedPhone = phone ? phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "") : null;
  const lead = {
    first_name: "Synthetic",
    last_name: "Contract",
    email,
    phone,
    phone_normalized: normalizedPhone,
    normalized_email: email?.trim().toLowerCase() ?? null,
    normalized_phone: normalizedPhone,
    normalized_property_address: address.toLowerCase(),
    spam_score: 0,
    spam_reasons: [],
    state: "NC",
    address_raw: address,
    primary_intent: primaryIntent,
    question_raw: "INFRA-02 synthetic lifecycle verification",
    timeline_months: 0,
    consent_sms: false,
    consent_call: false,
    consent_email: false,
    consent_timestamp: "2026-07-16T00:00:00.000Z",
    consent_language_version: "canonical_v1",
    status,
    lead_type: leadType,
    lead_grade: grade,
    conversion_stage: status === "qualified" ? "qualified" : null,
    source: "infra02",
    source_detail: "synthetic-local-only",
    page_url: "/infra-02",
    widget_session_id: sessionId,
  };
  const attribution = {
    utm_source: "infra02",
    utm_medium: "synthetic",
    referrer_type: attributionReferrerType,
    landing_page: "/infra-02",
    is_paid: false,
  };
  return `select public.capture_public_lead_v1(
    $session$${JSON.stringify(session)}$session$::jsonb,
    $lead$${JSON.stringify(lead)}$lead$::jsonb,
    $attribution$${JSON.stringify(attribution)}$attribution$::jsonb,
    'disabled'
  )::text;`;
}

function parseJson(output) {
  const line = output.split("\n").map((value) => value.trim()).find((value) => value.startsWith("{"));
  if (!line) throw new Error("postgres_json_result_missing");
  return JSON.parse(line);
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

async function writeEvidence(name, value) {
  await mkdir(EVIDENCE, { recursive: true });
  await writeFile(
    join(EVIDENCE, name),
    `${JSON.stringify({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      target: "local-supabase-postgresql",
      remoteProjectLinked: false,
      ...value,
      externalProviderCalls: 0,
      emailsSent: 0,
      smsSent: 0,
      productionChanges: 0,
      remoteDatabaseChanges: 0,
    }, null, 2)}\n`,
  );
}

function snapshotAgents() {
  return psql("select id::text || '|' || is_active::text from public.agents order by id;")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, active] = line.split("|");
      return { id, active: active === "true" };
    });
}

function prepareAgent() {
  psql(`
    update public.agents set is_active = false;
    insert into public.agents(
      id, name, email, phone, role, is_active, max_daily_leads,
      current_load, priority_score, availability, timezone,
      notification_email, notification_sms
    ) values (
      '${TEST_AGENT_ID}', 'INFRA-02 Synthetic Agent', 'agent@infra02.test',
      '+12525550001', 'primary', true, 1, 0, 100,
      '{"mon":[0,24],"tue":[0,24],"wed":[0,24],"thu":[0,24],"fri":[0,24],"sat":[0,24],"sun":[0,24]}'::jsonb,
      'America/New_York', true, false
    ) on conflict (id) do update set
      is_active = true, max_daily_leads = 1, current_load = 0,
      priority_score = 100, notification_email = true, notification_sms = false;
  `);
}

function cleanupSynthetic() {
  psql(`
    delete from public.leads where source = 'infra02' or email like '%@infra02.test';
    delete from public.sessions s
      where (s.landing_page = '/infra-02' or s.utm_source = 'infra02')
        and not exists (select 1 from public.leads l where l.session_id = s.id);
    delete from public.contacts where email like '%@infra02.test';
    delete from public.agents where id = '${TEST_AGENT_ID}';
  `);
}

function restoreAgents(snapshot) {
  if (!snapshot.length) return;
  const values = snapshot
    .filter((row) => row.id !== TEST_AGENT_ID)
    .map((row) => `(${literal(row.id)}::uuid, ${row.active ? "true" : "false"})`)
    .join(",");
  if (values) {
    psql(`update public.agents a set is_active = state.is_active
      from (values ${values}) as state(id, is_active) where a.id = state.id;`);
  }
}

async function postgresContract() {
  console.log("INFRA-02 postgres-contract: schema");
  const schema = parseJson(psql(`
    with protected(name) as (
      values ('sessions'),('leads'),('agents'),('lead_routing'),('contacts'),
             ('contact_identities'),('source_attribution'),('agent_assignments'),
             ('audit_logs'),('lead_notifications'),('lead_appointments'),('tasks')
    ), schema_state as (
      select
        bool_and(c.relrowsecurity) as all_rls_enabled,
        count(*)::int as protected_table_count
      from protected p
      join pg_class c on c.oid = to_regclass('public.' || p.name)
    ), functions as (
      select
        bool_and(not p.prosecdef) as all_security_invoker,
        bool_and(pg_get_functiondef(p.oid) not ilike '%auth.uid%') as portable_definition
      from pg_proc p
      where p.oid in (
        'public.capture_public_lead_v1(jsonb,jsonb,jsonb,text)'::regprocedure,
        'public.request_public_appointment_v1(uuid,uuid,text,timestamptz)'::regprocedure,
        'public.mutate_admin_lead_status_v1(uuid,text,text,jsonb,text,text,timestamptz)'::regprocedure,
        'public.mutate_admin_assignment_v1(uuid,uuid,uuid,text,text,text,timestamptz)'::regprocedure,
        'public.mutate_admin_agent_operations_v1(uuid,jsonb,text)'::regprocedure,
        'public.record_sla_breach_v1(uuid,text,text,text)'::regprocedure
      )
    )
    select jsonb_build_object(
      'postgres_major', current_setting('server_version_num')::int / 10000,
      'postgres_version', current_setting('server_version'),
      'migration_count', (select count(*) from supabase_migrations.schema_migrations),
      'final_migration', (select max(version) from supabase_migrations.schema_migrations),
      'all_rls_enabled', (select all_rls_enabled from schema_state),
      'protected_table_count', (select protected_table_count from schema_state),
      'deny_policy_count', (select count(*) from pg_policies where schemaname='public' and policyname like '%deny_public'),
      'all_lifecycle_functions_security_invoker', (select all_security_invoker from functions),
      'portable_function_definition', (select portable_definition from functions),
      'anon_capture_execute', has_function_privilege('anon', 'public.capture_public_lead_v1(jsonb,jsonb,jsonb,text)', 'execute'),
      'authenticated_capture_execute', has_function_privilege('authenticated', 'public.capture_public_lead_v1(jsonb,jsonb,jsonb,text)', 'execute'),
      'service_role_capture_execute', has_function_privilege('service_role', 'public.capture_public_lead_v1(jsonb,jsonb,jsonb,text)', 'execute'),
      'anon_appointment_execute', has_function_privilege('anon', 'public.request_public_appointment_v1(uuid,uuid,text,timestamptz)', 'execute'),
      'authenticated_appointment_execute', has_function_privilege('authenticated', 'public.request_public_appointment_v1(uuid,uuid,text,timestamptz)', 'execute'),
      'service_role_appointment_execute', has_function_privilege('service_role', 'public.request_public_appointment_v1(uuid,uuid,text,timestamptz)', 'execute'),
      'anon_admin_status_execute', has_function_privilege('anon', 'public.mutate_admin_lead_status_v1(uuid,text,text,jsonb,text,text,timestamptz)', 'execute'),
      'authenticated_admin_status_execute', has_function_privilege('authenticated', 'public.mutate_admin_lead_status_v1(uuid,text,text,jsonb,text,text,timestamptz)', 'execute'),
      'anon_admin_assignment_execute', has_function_privilege('anon', 'public.mutate_admin_assignment_v1(uuid,uuid,uuid,text,text,text,timestamptz)', 'execute'),
      'authenticated_admin_assignment_execute', has_function_privilege('authenticated', 'public.mutate_admin_assignment_v1(uuid,uuid,uuid,text,text,text,timestamptz)', 'execute'),
      'anon_admin_agent_execute', has_function_privilege('anon', 'public.mutate_admin_agent_operations_v1(uuid,jsonb,text)', 'execute'),
      'authenticated_admin_agent_execute', has_function_privilege('authenticated', 'public.mutate_admin_agent_operations_v1(uuid,jsonb,text)', 'execute'),
      'service_role_admin_status_execute', has_function_privilege('service_role', 'public.mutate_admin_lead_status_v1(uuid,text,text,jsonb,text,text,timestamptz)', 'execute'),
      'service_role_admin_assignment_execute', has_function_privilege('service_role', 'public.mutate_admin_assignment_v1(uuid,uuid,uuid,text,text,text,timestamptz)', 'execute'),
      'service_role_admin_agent_execute', has_function_privilege('service_role', 'public.mutate_admin_agent_operations_v1(uuid,jsonb,text)', 'execute'),
      'anon_sla_breach_execute', has_function_privilege('anon', 'public.record_sla_breach_v1(uuid,text,text,text)', 'execute'),
      'authenticated_sla_breach_execute', has_function_privilege('authenticated', 'public.record_sla_breach_v1(uuid,text,text,text)', 'execute'),
      'service_role_sla_breach_execute', has_function_privilege('service_role', 'public.record_sla_breach_v1(uuid,text,text,text)', 'execute'),
      'audit_immutable_trigger', exists(select 1 from pg_trigger where tgname='audit_logs_reject_change' and not tgisinternal),
      'consent_immutable_trigger', exists(select 1 from pg_trigger where tgname='consents_reject_change' and not tgisinternal),
      'contact_identity_unique', exists(select 1 from pg_indexes where indexname='contact_identities_pkey'),
      'request_fingerprint_index', exists(select 1 from pg_indexes where indexname='idx_leads_request_fingerprint'),
      'assignment_history_idempotency', exists(select 1 from pg_indexes where indexname='agent_assignments_idempotency_key_idx'),
      'notification_outbox_idempotency', exists(select 1 from pg_indexes where indexname='lead_notifications_idempotency_key_idx'),
      'appointment_idempotency', exists(select 1 from pg_indexes where indexname='idx_lead_appointments_one_active_per_lead'),
      'followup_idempotency', exists(select 1 from pg_indexes where indexname='idx_tasks_one_open_appointment_confirmation_per_lead')
    )::text;
  `));

  assert(schema.postgres_major === 17, "unexpected_postgres_major");
  assert(Number(schema.migration_count) === 19, "migration_count_mismatch");
  assert(schema.final_migration === "20260716043829", "final_migration_mismatch");
  assert(schema.all_rls_enabled === true && schema.protected_table_count === 12, "rls_verification_failed");
  assert(schema.all_lifecycle_functions_security_invoker === true, "security_invoker_verification_failed");
  assert(schema.portable_function_definition === true, "function_portability_verification_failed");
  assert(schema.anon_capture_execute === false && schema.authenticated_capture_execute === false, "public_rpc_privilege_leak");
  assert(schema.anon_appointment_execute === false && schema.authenticated_appointment_execute === false, "public_appointment_rpc_privilege_leak");
  assert(schema.service_role_capture_execute === true, "service_role_rpc_privilege_missing");
  assert(schema.service_role_appointment_execute === true, "service_role_appointment_rpc_privilege_missing");
  assert(
      schema.anon_admin_status_execute === false &&
      schema.authenticated_admin_status_execute === false &&
      schema.anon_admin_assignment_execute === false &&
      schema.authenticated_admin_assignment_execute === false &&
      schema.anon_admin_agent_execute === false &&
      schema.authenticated_admin_agent_execute === false &&
      schema.anon_sla_breach_execute === false &&
      schema.authenticated_sla_breach_execute === false,
    "public_admin_rpc_privilege_leak",
  );
  assert(
      schema.service_role_admin_status_execute === true &&
      schema.service_role_admin_assignment_execute === true &&
      schema.service_role_admin_agent_execute === true &&
      schema.service_role_sla_breach_execute === true,
    "service_role_admin_rpc_privilege_missing",
  );

  const agents = snapshotAgents();
  console.log("INFRA-02 postgres-contract: synthetic setup");
  cleanupSynthetic();
  try {
    prepareAgent();
    psql(`update public.agents set is_active = false where id = '${TEST_AGENT_ID}';`);

    const emailPrimary = parseJson(psql(captureSql({
      sessionId: uuid("20000000-", 1),
      email: "email-primary@infra02.test",
      phone: "2525550101",
      address: "10 Synthetic Email Street",
    })));
    const emailDuplicate = parseJson(psql(captureSql({
      sessionId: uuid("20000000-", 2),
      email: "EMAIL-PRIMARY@infra02.test",
      phone: "2525550199",
      address: "11 Different Address Street",
    })));
    assert(emailDuplicate.duplicate_of_lead_id === emailPrimary.lead_id, "email_duplicate_not_normalized");
    console.log("INFRA-02 postgres-contract: email duplicate");

    const phonePrimary = parseJson(psql(captureSql({
      sessionId: uuid("20000000-", 3),
      email: "phone-primary@infra02.test",
      phone: "+1 (252) 555-0102",
      address: "20 Synthetic Phone Street",
      leadType: "seller",
    })));
    const phoneDuplicate = parseJson(psql(captureSql({
      sessionId: uuid("20000000-", 4),
      email: "phone-other@infra02.test",
      phone: "252.555.0102",
      address: "21 Different Phone Address",
      leadType: "seller",
    })));
    assert(phoneDuplicate.duplicate_of_lead_id === phonePrimary.lead_id, "phone_duplicate_not_normalized");
    console.log("INFRA-02 postgres-contract: phone duplicate");

    const identityConflictSession = uuid("20000000-", 30);
    const identityConflict = parseJson(psql(captureSql({
      sessionId: identityConflictSession,
      email: "email-primary@infra02.test",
      phone: "2525550102",
      address: "99 Identity Conflict Street",
    })));
    assert(identityConflict.ok === false, "identity_conflict_not_rejected");
    assert(identityConflict.error === "identity_conflict", "identity_conflict_code_mismatch");
    assert(!identityConflict.lead_id, "identity_conflict_leaked_lead_id");
    const identityConflictCounts = psql(`select
      (select count(*) from public.sessions where id='${identityConflictSession}')::text || '|' ||
      (select count(*) from public.leads where session_id='${identityConflictSession}')::text || '|' ||
      (select count(*) from public.source_attribution where session_id='${identityConflictSession}')::text;`);
    assert(identityConflictCounts === "0|0|0", "identity_conflict_left_partial_rows");
    console.log("INFRA-02 postgres-contract: identity conflict");

    const replaySession = uuid("20000000-", 31);
    const replayFirst = parseJson(psql(captureSql({
      sessionId: replaySession,
      email: "idempotent@infra02.test",
      phone: "2525550131",
      address: "31 Idempotent Synthetic Street",
    })));
    const replaySecond = parseJson(psql(captureSql({
      sessionId: replaySession,
      email: " idempotent@infra02.test ",
      phone: "+1 (252) 555-0131",
      address: "31 Idempotent Synthetic Street",
    })));
    assert(replaySecond.idempotent_replay === true, "matching_replay_not_marked_idempotent");
    assert(replaySecond.lead_id === replayFirst.lead_id, "matching_replay_did_not_return_same_lead");
    const replayConflict = parseJson(psql(captureSql({
      sessionId: replaySession,
      email: "idempotent-changed@infra02.test",
      phone: "2525550131",
      address: "31 Idempotent Synthetic Street",
    })));
    assert(replayConflict.ok === false, "idempotency_conflict_not_rejected");
    assert(replayConflict.error === "idempotency_conflict", "idempotency_conflict_code_mismatch");
    assert(!replayConflict.lead_id, "idempotency_conflict_leaked_prior_lead_id");
    const replayCounts = parseJson(psql(`select jsonb_build_object(
      'sessions', (select count(*) from public.sessions where id='${replaySession}'),
      'leads', (select count(*) from public.leads where session_id='${replaySession}'),
      'attribution', (select count(*) from public.source_attribution where session_id='${replaySession}'),
      'created_audits', (select count(*) from public.audit_logs where resource_id='${replayFirst.lead_id}' and action='lead.created')
    )::text;`));
    for (const field of ["sessions", "leads", "attribution", "created_audits"]) {
      assert(Number(replayCounts[field]) === 1, `idempotent_replay_${field}_count_mismatch`);
    }
    console.log("INFRA-02 postgres-contract: idempotency conflict");

    const sharedAddressOne = parseJson(psql(captureSql({
      sessionId: uuid("20000000-", 5),
      email: "shared-one@infra02.test",
      phone: "2525550103",
      address: "30 Shared Synthetic Address",
    })));
    const sharedAddressTwo = parseJson(psql(captureSql({
      sessionId: uuid("20000000-", 6),
      email: "shared-two@infra02.test",
      phone: "2525550104",
      address: "30 Shared Synthetic Address",
    })));
    assert(sharedAddressOne.duplicate_of_lead_id === null, "shared_address_first_marked_duplicate");
    assert(sharedAddressTwo.duplicate_of_lead_id === null, "shared_address_people_merged");
    console.log("INFRA-02 postgres-contract: shared address");

    const chat = parseJson(psql(captureSql({
      sessionId: uuid("20000000-", 7),
      email: null,
      phone: null,
      address: "",
      leadType: "general_question",
      primaryIntent: "unknown",
      status: "new",
      grade: "D",
    })));
    assert(typeof chat.lead_id === "string", "chat_lead_not_persisted");
    console.log("INFRA-02 postgres-contract: chat");

    const statusMutation = parseJson(psql(`select public.mutate_admin_lead_status_v1(
      '${emailPrimary.lead_id}'::uuid, 'qualified', 'contacted',
      '{"status":"contacted","last_contacted_at":"2026-07-16T12:00:00Z","conversion_stage":"contacted","converted_at":null,"closed_won_at":null,"closed_lost_at":null,"closed_lost_reason":null}'::jsonb,
      null, 'system/infra02', '2026-07-16T12:00:00Z'::timestamptz
    )::text;`));
    assert(statusMutation.ok === true && statusMutation.status === "contacted", "admin_status_transaction_failed");
    const statusAuditCount = Number(psql(`select count(*) from public.audit_logs
      where resource_id='${emailPrimary.lead_id}' and action='lead.lifecycle_changed';`));
    assert(statusAuditCount === 1, "admin_status_audit_missing");

    psql(`select public.mutate_admin_lead_status_v1(
      '${emailPrimary.lead_id}'::uuid, 'contacted', 'qualified',
      '{"status":"qualified","conversion_stage":"qualified"}'::jsonb,
      null, null, '2026-07-16T12:01:00Z'::timestamptz
    );`, { expectFailure: true });
    const statusAfterAuditFailure = psql(`select status from public.leads where id='${emailPrimary.lead_id}';`);
    assert(statusAfterAuditFailure === "contacted", "admin_status_audit_failure_did_not_rollback");

    const agentMutation = parseJson(psql(`select public.mutate_admin_agent_operations_v1(
      '${TEST_AGENT_ID}'::uuid,
      '{"is_active":false,"max_daily_leads":1,"current_load":0,"priority_score":95,"notification_email":true,"notification_sms":false}'::jsonb,
      'system/infra02'
    )::text;`));
    assert(agentMutation.ok === true, "admin_agent_operations_transaction_failed");
    const agentAuditCount = Number(psql(`select count(*) from public.audit_logs
      where resource_id='${TEST_AGENT_ID}' and action='agent.operations_updated';`));
    assert(agentAuditCount === 1, "admin_agent_operations_audit_missing");
    console.log("INFRA-02 postgres-contract: atomic AdminOps mutations");

    const concurrentSla = await Promise.all([
      psqlAsync(`select public.record_sla_breach_v1(
        '${emailPrimary.lead_id}'::uuid, 'sla_accept_breached', 'critical', 'synthetic-local-only'
      )::text;`),
      psqlAsync(`select public.record_sla_breach_v1(
        '${emailPrimary.lead_id}'::uuid, 'sla_accept_breached', 'critical', 'synthetic-local-only'
      )::text;`),
    ]);
    assert(concurrentSla.filter((value) => value === "true").length === 1, "sla_breach_first_insert_missing");
    assert(concurrentSla.filter((value) => value === "false").length === 1, "sla_breach_idempotent_replay_missing");
    const slaFlagCount = Number(psql(`select count(*) from public.compliance_flags
      where lead_id='${emailPrimary.lead_id}' and flag_type='sla_accept_breached' and resolved=false;`));
    assert(slaFlagCount === 1, "sla_breach_concurrency_created_duplicates");
    console.log("INFRA-02 postgres-contract: SLA idempotency");

    const failureSession = uuid("20000000-", 8);
    psql(captureSql({
      sessionId: failureSession,
      email: "rollback@infra02.test",
      phone: "2525550108",
      attributionReferrerType: "invalid",
    }), { expectFailure: true });
    const rollbackCounts = psql(`select
      (select count(*) from public.sessions where id='${failureSession}')::text || '|' ||
      (select count(*) from public.leads where session_id='${failureSession}')::text || '|' ||
      (select count(*) from public.contact_identities where normalized_value='rollback@infra02.test')::text;`);
    assert(rollbackCounts === "0|0|0", "partial_failure_left_rows");
    console.log("INFRA-02 postgres-contract: rollback");

    psql(`update public.audit_logs set action='tampered' where id='${emailPrimary.capture_audit_id}';`, {
      expectFailure: true,
    });
    const anonVisible = Number(psql("begin; set local role anon; select count(*) from public.leads; rollback;"));
    assert(anonVisible === 0, "rls_anon_visibility_failed");
    console.log("INFRA-02 postgres-contract: immutability and RLS");

    const lifecycleCounts = parseJson(psql(`select jsonb_build_object(
      'synthetic_leads', count(*),
      'source_attribution', (select count(*) from public.source_attribution sa join public.leads l on l.id=sa.lead_id where l.source='infra02'),
      'admin_visible', (select count(*) from public.leads where source='infra02'),
      'reporting_visible', (select count(*) from public.leads where source='infra02' and created_at is not null),
      'audit_rows', (select count(*) from public.audit_logs where resource_id in (select id from public.leads where source='infra02'))
    )::text from public.leads where source='infra02';`));
    assert(lifecycleCounts.synthetic_leads === lifecycleCounts.source_attribution, "attribution_visibility_mismatch");
    assert(lifecycleCounts.admin_visible === lifecycleCounts.reporting_visible, "admin_reporting_visibility_mismatch");

    await writeEvidence("schema-verification.json", {
      decision: "PASS",
      ...schema,
    });
    await writeEvidence("security-verification.json", {
      decision: "PASS",
      rlsProtectedTables: schema.protected_table_count,
      denyPoliciesPresent: Number(schema.deny_policy_count),
      anonymousRowsVisible: anonVisible,
      auditImmutability: "hard-failure-pass",
      consentImmutabilityTrigger: schema.consent_immutable_trigger,
      serviceRoleOnlyRpc: true,
      functionSecurity: "SECURITY INVOKER",
    });
    await writeEvidence("lifecycle-verification.json", {
      decision: "PASS",
      testClass: "direct-postgresql-contract",
      normalizedEmailDuplicate: true,
      normalizedPhoneDuplicate: true,
      identityConflictRejected: true,
      idempotentReplayMatched: true,
      idempotencyConflictRejected: true,
      sharedAddressDifferentContactsNotMerged: true,
      chatLeadPersisted: true,
      sourceAttributionAtomic: true,
      partialFailureRollback: true,
      adminLifecycleMutationAtomic: true,
      adminLifecycleAuditFailureRollback: true,
      adminAgentOperationsAtomic: true,
      concurrentSlaBreachWrites: 2,
      slaBreachRowsCreated: 1,
      slaBreachIdempotent: true,
      auditImmutable: true,
      adminLeadVisible: true,
      reportingVisible: true,
    });
    console.log("INFRA-02 postgres-contract: evidence");
  } finally {
    console.log("INFRA-02 postgres-contract: cleanup");
    cleanupSynthetic();
    restoreAgents(agents);
  }
}

async function supabaseLifecycle() {
  const agents = snapshotAgents();
  cleanupSynthetic();
  try {
    prepareAgent();
    const identicalSession = uuid("30000000-", 1);
    const identicalSql = captureSql({
      sessionId: identicalSession,
      email: "concurrent-identical@infra02.test",
      phone: "2525550201",
      address: "100 Concurrent Synthetic Street",
    });
    const identical = (await Promise.all(
      Array.from({ length: 50 }, () => psqlAsync(identicalSql)),
    )).map(parseJson);
    const leadIds = new Set(identical.map((row) => row.lead_id));
    assert(leadIds.size === 1, "identical_concurrency_created_multiple_leads");
    assert(identical.filter((row) => row.idempotent_replay === true).length === 49, "idempotent_replay_count_mismatch");
    const leadId = identical[0].lead_id;

    const afterIdentical = parseJson(psql(`select jsonb_build_object(
      'sessions', (select count(*) from public.sessions where id='${identicalSession}'),
      'leads', (select count(*) from public.leads where session_id='${identicalSession}'),
      'attribution', (select count(*) from public.source_attribution where lead_id='${leadId}'),
      'routing', (select count(*) from public.lead_routing where lead_id='${leadId}'),
      'assignment_history', (select count(*) from public.agent_assignments where lead_id='${leadId}'),
      'capture_audit', (select count(*) from public.audit_logs where resource_id='${leadId}' and action='lead.created'),
      'assignment_audit', (select count(*) from public.audit_logs where resource_id='${leadId}' and action='lead.assigned'),
      'outbox', (select count(*) from public.lead_notifications where lead_id='${leadId}'),
      'skipped_outbox', (select count(*) from public.lead_notifications where lead_id='${leadId}' and status='skipped')
    )::text;`));
    for (const field of ["sessions", "leads", "attribution", "routing", "assignment_history", "capture_audit", "assignment_audit", "outbox", "skipped_outbox"]) {
      assert(Number(afterIdentical[field]) === 1, `identical_${field}_count_mismatch`);
    }

    const appointmentSql = `select public.request_public_appointment_v1(
      '${leadId}'::uuid, '${identicalSession}'::uuid, 'infra02', '2026-07-16T12:00:00Z'::timestamptz
    )::text;`;
    const appointments = (await Promise.all(
      Array.from({ length: 20 }, () => psqlAsync(appointmentSql)),
    )).map(parseJson);
    assert(new Set(appointments.map((row) => row.appointment_id)).size === 1, "appointment_idempotency_failed");
    const appointmentCounts = parseJson(psql(`select jsonb_build_object(
      'appointments', (select count(*) from public.lead_appointments where lead_id='${leadId}'),
      'followups', (select count(*) from public.tasks where lead_id='${leadId}' and category='followup:appointment_confirmation'),
      'appointment_audits', (select count(*) from public.audit_logs where resource_id='${leadId}' and action='lead.appointment_requested_public'),
      'admin_visible', (select count(*) from public.leads where id='${leadId}'),
      'reporting_visible', (select count(*) from public.leads where id='${leadId}' and status='appointment_requested')
    )::text;`));
    for (const field of Object.keys(appointmentCounts)) {
      assert(Number(appointmentCounts[field]) === 1, `appointment_${field}_count_mismatch`);
    }

    psql(`delete from public.leads where id='${leadId}'; delete from public.sessions where id='${identicalSession}';`);

    psql(`update public.agents set is_active=false where id='${TEST_AGENT_ID}';`);
    const manualOne = parseJson(psql(captureSql({
      sessionId: uuid("30500000-", 1),
      email: "manual-capacity-one@infra02.test",
      phone: "2525550251",
      address: "1 Manual Capacity Street",
    })));
    const manualTwo = parseJson(psql(captureSql({
      sessionId: uuid("30500000-", 2),
      email: "manual-capacity-two@infra02.test",
      phone: "2525550252",
      address: "2 Manual Capacity Street",
    })));
    psql(`update public.agents set is_active=true, max_daily_leads=1 where id='${TEST_AGENT_ID}';`);
    const manualAssignmentSql = (manualLeadId) => `select public.mutate_admin_assignment_v1(
      '${manualLeadId}'::uuid, '${TEST_AGENT_ID}'::uuid, null, 'assigned', 'disabled',
      'system/infra02', '2026-07-16T12:30:00Z'::timestamptz
    )::text;`;
    const manualAssignments = (await Promise.all([
      psqlAsync(manualAssignmentSql(manualOne.lead_id)),
      psqlAsync(manualAssignmentSql(manualTwo.lead_id)),
    ])).map(parseJson);
    assert(manualAssignments.filter((row) => row.ok === true).length === 1, "manual_capacity_assignment_count_mismatch");
    assert(manualAssignments.filter((row) => row.error === "agent_at_capacity").length === 1, "manual_capacity_conflict_missing");
    const manualAtomicCounts = parseJson(psql(`select jsonb_build_object(
      'assigned', (select count(*) from public.leads where email like 'manual-capacity-%@infra02.test' and assignment_status='assigned'),
      'routing', (select count(*) from public.lead_routing r join public.leads l on l.id=r.lead_id where l.email like 'manual-capacity-%@infra02.test'),
      'history', (select count(*) from public.agent_assignments a join public.leads l on l.id=a.lead_id where l.email like 'manual-capacity-%@infra02.test'),
      'audit', (select count(*) from public.audit_logs where resource_id in ('${manualOne.lead_id}'::uuid, '${manualTwo.lead_id}'::uuid) and action='lead.assigned'),
      'outbox', (select count(*) from public.lead_notifications n join public.leads l on l.id=n.lead_id where l.email like 'manual-capacity-%@infra02.test')
    )::text;`));
    for (const field of ["assigned", "routing", "history", "audit", "outbox"]) {
      assert(Number(manualAtomicCounts[field]) === 1, `manual_assignment_${field}_count_mismatch`);
    }
    psql(`
      delete from public.leads where email like 'manual-capacity-%@infra02.test';
      delete from public.sessions where id in ('${uuid("30500000-", 1)}'::uuid, '${uuid("30500000-", 2)}'::uuid);
    `);

    const capacityCommands = Array.from({ length: 10 }, (_, index) =>
      captureSql({
        sessionId: uuid("31000000-", index + 1),
        email: `capacity-${index + 1}@infra02.test`,
        phone: `252555${String(3000 + index).padStart(4, "0")}`,
        address: `${index + 1} Capacity Synthetic Lane`,
      }),
    );
    const capacity = (await Promise.all(capacityCommands.map(psqlAsync))).map(parseJson);
    const assigned = capacity.filter((row) => row.assignment_status === "assigned");
    const noEligible = capacity.filter((row) => row.assignment_status === "no_eligible_agent");
    assert(capacity.every((row) => typeof row.lead_id === "string"), "capacity_submission_not_persisted");
    assert(assigned.length === 1, "capacity_assigned_count_mismatch");
    assert(noEligible.length === 9, "capacity_no_eligible_count_mismatch");
    const capacityCounts = parseJson(psql(`select jsonb_build_object(
      'leads', (select count(*) from public.leads where email like 'capacity-%@infra02.test'),
      'assigned', (select count(*) from public.leads where email like 'capacity-%@infra02.test' and assignment_status='assigned'),
      'routing', (select count(*) from public.lead_routing r join public.leads l on l.id=r.lead_id where l.email like 'capacity-%@infra02.test'),
      'history', (select count(*) from public.agent_assignments a join public.leads l on l.id=a.lead_id where l.email like 'capacity-%@infra02.test'),
      'outbox', (select count(*) from public.lead_notifications n join public.leads l on l.id=n.lead_id where l.email like 'capacity-%@infra02.test')
    )::text;`));
    assert(capacityCounts.leads === 10, "capacity_lead_count_mismatch");
    for (const field of ["assigned", "routing", "history", "outbox"]) {
      assert(Number(capacityCounts[field]) === 1, `capacity_${field}_count_mismatch`);
    }

    psql(`update public.agents set is_active=false where id='${TEST_AGENT_ID}';`);
    const noAgent = parseJson(psql(captureSql({
      sessionId: uuid("32000000-", 1),
      email: "no-agent@infra02.test",
      phone: "2525550401",
      address: "1 No Agent Synthetic Road",
    })));
    assert(noAgent.assignment_status === "no_eligible_agent", "no_eligible_agent_not_preserved");

    await writeEvidence("concurrency-verification.json", {
      decision: "PASS",
      testClass: "local-supabase-concurrent-lifecycle",
      concurrentIdenticalSubmissions: 50,
      canonicalLeadsCreated: 1,
      idempotentReplays: 49,
      concurrentAppointmentRequests: 20,
      appointmentsCreated: 1,
      followupTasksCreated: 1,
      capacityConcurrentSubmissions: 10,
      capacityAssignmentsCreated: assigned.length,
      capacityNoEligibleResults: noEligible.length,
      concurrentManualAssignments: 2,
      manualCapacityAssignmentsCreated: 1,
      manualCapacityConflicts: 1,
      manualAssignmentAtomicProjection: true,
      assignmentHistoryRows: 1,
      outboxRows: 1,
      outboxIdempotent: true,
      disabledOutboxStatus: "skipped",
      noEligibleAgent: true,
      oneEligibleAgent: true,
      adminVisibility: true,
      reportingVisibility: true,
    });
  } finally {
    cleanupSynthetic();
    restoreAgents(agents);
  }
}

try {
  if (MODE === "postgres-contract") await postgresContract();
  else await supabaseLifecycle();
  console.log(`INFRA-02 ${MODE}: PASS`);
} catch (error) {
  console.error(`INFRA-02 ${MODE}: FAIL (${error instanceof Error ? error.message : "unknown"})`);
  process.exitCode = 1;
}
