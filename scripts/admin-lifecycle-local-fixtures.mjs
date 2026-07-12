#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RUN_DIR = path.join(ROOT, ".amm-run", "admin-lifecycle-fixtures");
const SUMMARY_PATH = path.join(RUN_DIR, "summary.json");
const CLEANUP = process.argv.includes("--cleanup");

const FIXTURE = {
  sessions: [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "44444444-4444-4444-8444-444444444444",
    "55555555-5555-4555-8555-555555555555",
  ],
  agents: [
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  ],
  audits: [
    "aaaaaaaa-1111-4111-8111-111111111111",
    "aaaaaaaa-2222-4222-8222-222222222222",
    "aaaaaaaa-3333-4333-8333-333333333333",
    "aaaaaaaa-4444-4444-8444-444444444444",
    "aaaaaaaa-5555-4555-8555-555555555555",
  ],
  notifications: [
    "bbbbbbbb-2222-4222-8222-222222222222",
    "bbbbbbbb-3333-4333-8333-333333333333",
    "bbbbbbbb-5555-4555-8555-555555555555",
  ],
};

function fail(message) {
  writeSummary({ ok: false, mode: CLEANUP ? "cleanup" : "create", error: message });
  console.error(`${message} Sanitized summary: ${SUMMARY_PATH}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    ...options,
  });
}

function writeSummary(value) {
  fs.mkdirSync(RUN_DIR, { recursive: true });
  fs.writeFileSync(SUMMARY_PATH, `${JSON.stringify({
    generated_at_utc: new Date().toISOString(),
    target_environment: "local",
    remote_project_linked: false,
    provider_calls: 0,
    emails_sent: 0,
    sms_sent: 0,
    contact_values_printed: false,
    connection_strings_printed: false,
    ...value,
  }, null, 2)}\n`);
}

function readProjectId() {
  const configPath = path.join(ROOT, "supabase", "config.toml");
  const config = fs.readFileSync(configPath, "utf8");
  const match = config.match(/^\s*project_id\s*=\s*"([^"]+)"\s*$/m);
  if (!match?.[1]) fail("Could not read supabase project_id from supabase/config.toml.");
  return match[1];
}

function findDbContainer(projectId) {
  const exact = `supabase_db_${projectId}`;
  const result = run("docker", [
    "ps",
    "--filter",
    `name=^/${exact}$`,
    "--format",
    "{{.Names}}",
  ]);
  if (result.status !== 0) fail("Could not inspect Docker containers.");

  const names = result.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  if (names.length !== 1 || names[0] !== exact) {
    fail(`Expected exactly one local Supabase database container for project_id ${projectId}.`);
  }
  return exact;
}

function psql(container, sql) {
  return run(
    "docker",
    ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-t", "-A"],
    { input: sql },
  );
}

const idList = (values) => values.map((value) => `'${value}'::uuid`).join(",");

function createSql() {
  return `
begin;

do $$
declare existing_count integer;
begin
  select
    (select count(*) from public.sessions where id in (${idList(FIXTURE.sessions)})) +
    (select count(*) from public.agents where id in (${idList(FIXTURE.agents)})) +
    (select count(*) from public.leads where id in (${idList(FIXTURE.sessions)})) +
    (select count(*) from public.audit_logs where id in (${idList(FIXTURE.audits)})) +
    (select count(*) from public.lead_notifications where id in (${idList(FIXTURE.notifications)}))
  into existing_count;
  if existing_count > 0 then
    raise exception 'admin lifecycle fixture rows already exist';
  end if;
end $$;

insert into public.sessions (id, created_at, utm_source, utm_medium, utm_campaign, landing_page, referrer_type, device_type, status)
values
  ('11111111-1111-4111-8111-111111111111', now() - interval '6 hours', 'resend_provider_sandbox', 'sandbox', 'timeline_new', '/home-value', 'direct', 'desktop', 'completed'),
  ('22222222-2222-4222-8222-222222222222', now() - interval '4 days', 'resend_provider_sandbox', 'sandbox', 'timeline_converted', '/sell', 'paid', 'desktop', 'completed'),
  ('33333333-3333-4333-8333-333333333333', now() - interval '5 days', 'partner_referral', 'referral', 'timeline_lost', '/ask', 'referral', 'mobile', 'completed'),
  ('44444444-4444-4444-8444-444444444444', now() - interval '3 days', 'widget', 'embed', 'timeline_disqualified', '/widget', 'referral', 'mobile', 'completed'),
  ('55555555-5555-4555-8555-555555555555', now() - interval '2 days', 'local_search', 'organic', 'timeline_stalled', '/home-value', 'organic', 'desktop', 'completed');

insert into public.agents (id, name, email, phone, role, is_active, max_daily_leads, current_load, priority_score, notification_email, notification_sms)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Notification Sandbox Agent Primary', 'notification.sandbox.agent.primary@example.test', '+15550101010', 'primary', true, 4, 0, 90, true, false),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Notification Sandbox Agent Backup', 'notification.sandbox.agent.backup@example.test', '+15550101011', 'backup', false, 2, 0, 40, false, false);

insert into public.leads (id, session_id, created_at, first_name, last_name, email, phone, address_line1, city, state, zip, primary_intent, lead_type, status, source, source_detail, timeline_months, lead_grade, conversion_stage, assigned_agent_id, assigned_at, assignment_status, last_contacted_at, appointment_requested, converted_at, closed_won_at, closed_lost_at, closed_lost_reason, next_follow_up_at)
values
  ('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', now() - interval '6 hours', 'Notification Sandbox', 'Newlead', 'notification.sandbox.newlead@example.test', '+15550101020', '100 Fictional Oak Lane', 'Wilson', 'NC', '27893', 'sell', 'home_value', 'new', 'resend_provider_sandbox', 'controlled_nonproduction_verification', 3, 'A', null, null, null, null, null, false, null, null, null, null, null),
  ('22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', now() - interval '4 days', 'Notification Sandbox', 'Converted', 'notification.sandbox.converted@example.test', '+15550101021', '200 Fictional Maple Court', 'Wilson', 'NC', '27896', 'sell', 'seller', 'converted', 'resend_provider_sandbox', 'controlled_nonproduction_verification', 6, 'A+', 'converted', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', now() - interval '3 days 22 hours', 'assigned', now() - interval '3 days 20 hours', true, now() - interval '1 day', now() - interval '1 day', null, null, now() + interval '2 days'),
  ('33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', now() - interval '5 days', 'Notification Sandbox', 'Lost', 'notification.sandbox.lost@example.test', '+15550101022', '300 Fictional Pine Street', 'Wilson', 'NC', '27893', 'sell', 'seller_cash_offer', 'dead', 'partner_referral', 'controlled_nonproduction_verification', 12, 'B', 'dead', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', now() - interval '4 days 20 hours', 'assigned', now() - interval '4 days 18 hours', true, null, null, now() - interval '1 day', 'timing_changed', null),
  ('44444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', now() - interval '3 days', 'Notification Sandbox', 'Disqualified', 'notification.sandbox.disqualified@example.test', '+15550101023', '400 Fictional Elm Avenue', 'Wilson', 'NC', '27896', 'unknown', 'general_question', 'spam', 'widget', 'controlled_nonproduction_verification', 0, 'D', 'disqualified', null, null, null, null, false, null, null, now() - interval '2 days', 'internal_test', null),
  ('55555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', now() - interval '2 days', 'Notification Sandbox', 'Stalled', 'notification.sandbox.stalled@example.test', '+15550101024', '500 Fictional Cedar Drive', 'Wilson', 'NC', '27893', 'sell', 'home_value', 'assigned', 'local_search', 'controlled_nonproduction_verification', 3, 'A', 'assigned', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', now() - interval '30 hours', 'assigned', null, false, null, null, null, null, now() - interval '1 hour');

insert into public.source_attribution (session_id, lead_id, utm_source, utm_medium, utm_campaign, referrer_type, landing_page, is_paid)
values
  ('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'resend_provider_sandbox', 'sandbox', 'timeline_new', 'direct', '/home-value', false),
  ('22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'resend_provider_sandbox', 'sandbox', 'timeline_converted', 'paid', '/sell', true),
  ('33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 'partner_referral', 'referral', 'timeline_lost', 'referral', '/ask', false),
  ('44444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', 'widget', 'embed', 'timeline_disqualified', 'referral', '/widget', false),
  ('55555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', 'local_search', 'organic', 'timeline_stalled', 'organic', '/home-value', false);

insert into public.audit_logs (id, created_at, actor, action, resource_type, resource_id, before_state, after_state, metadata)
values
  ('aaaaaaaa-1111-4111-8111-111111111111', now() - interval '3 days 22 hours', 'adminops', 'lead.assigned', 'lead', '22222222-2222-4222-8222-222222222222', '{"assigned_agent_id":null}', '{"assigned_agent_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"}', '{"source":"local_staging_fixture"}'),
  ('aaaaaaaa-2222-4222-8222-222222222222', now() - interval '1 day', 'adminops', 'lead.lifecycle_changed', 'lead', '22222222-2222-4222-8222-222222222222', '{"status":"appointment_set"}', '{"status":"converted"}', '{"reason":null}'),
  ('aaaaaaaa-3333-4333-8333-333333333333', now() - interval '1 day', 'adminops', 'lead.lifecycle_changed', 'lead', '33333333-3333-4333-8333-333333333333', '{"status":"nurture"}', '{"status":"dead","reason":"timing_changed"}', '{"reason":"timing_changed"}'),
  ('aaaaaaaa-4444-4444-8444-444444444444', now() - interval '2 days', 'adminops', 'lead.lifecycle_changed', 'lead', '44444444-4444-4444-8444-444444444444', '{"status":"new"}', '{"status":"spam","reason":"internal_test"}', '{"reason":"internal_test"}'),
  ('aaaaaaaa-5555-4555-8555-555555555555', now() - interval '30 hours', 'adminops', 'lead.assigned', 'lead', '55555555-5555-4555-8555-555555555555', '{"assigned_agent_id":null}', '{"assigned_agent_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"}', '{"source":"local_staging_fixture"}');

insert into public.lead_notifications (id, lead_id, agent_id, assignment_audit_id, assignment_event_at, notification_type, channel, recipient_type, recipient_reference, template_version, idempotency_key, status, attempt_count, max_attempts, provider, provider_message_id, error_code, error_summary, next_attempt_at, sent_at, failed_at, metadata)
values
  ('bbbbbbbb-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'aaaaaaaa-1111-4111-8111-111111111111', now() - interval '3 days 22 hours', 'agent_assignment', 'email', 'agent', 'agent:primary', 'agent-assignment:v1', 'fixture-converted-notification', 'sent', 1, 3, 'console', 'msg_fixture_sent', null, null, null, now() - interval '3 days 21 hours', null, '{"source":"local_staging_fixture"}'),
  ('bbbbbbbb-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', null, now() - interval '4 days 20 hours', 'agent_assignment', 'email', 'agent', 'agent:primary', 'agent-assignment:v1', 'fixture-lost-notification', 'retry_scheduled', 1, 3, 'console', null, 'provider_retryable', 'Temporary sandbox fixture failure', now() + interval '1 hour', null, now() - interval '2 hours', '{"source":"local_staging_fixture"}'),
  ('bbbbbbbb-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'aaaaaaaa-5555-4555-8555-555555555555', now() - interval '30 hours', 'agent_assignment', 'email', 'agent', 'agent:primary', 'agent-assignment:v1', 'fixture-stalled-notification', 'permanently_failed', 3, 3, 'console', null, 'missing_agent_email', 'No safe agent email available', null, null, now() - interval '20 hours', '{"source":"local_staging_fixture"}');

commit;
select jsonb_build_object(
  'sessions_created', 5,
  'agents_created', 2,
  'leads_created', 5,
  'source_attribution_created', 5,
  'audit_rows_created', 5,
  'notifications_created', 3
)::text;
`;
}

function cleanupSql() {
  return `
begin;
delete from public.lead_notifications where id in (${idList(FIXTURE.notifications)});
delete from public.source_attribution where lead_id in (${idList(FIXTURE.sessions)});
delete from public.audit_logs where id in (${idList(FIXTURE.audits)});
delete from public.leads where id in (${idList(FIXTURE.sessions)});
delete from public.agents where id in (${idList(FIXTURE.agents)});
delete from public.sessions where id in (${idList(FIXTURE.sessions)});
commit;
select jsonb_build_object(
  'remaining_sessions', (select count(*) from public.sessions where id in (${idList(FIXTURE.sessions)})),
  'remaining_agents', (select count(*) from public.agents where id in (${idList(FIXTURE.agents)})),
  'remaining_leads', (select count(*) from public.leads where id in (${idList(FIXTURE.sessions)})),
  'remaining_source_attribution', (select count(*) from public.source_attribution where lead_id in (${idList(FIXTURE.sessions)})),
  'remaining_audit_rows', (select count(*) from public.audit_logs where id in (${idList(FIXTURE.audits)})),
  'remaining_notifications', (select count(*) from public.lead_notifications where id in (${idList(FIXTURE.notifications)})),
  'audit_rows_retained_by_append_only_rule', true
)::text;
`;
}

const remoteLink = path.join(ROOT, "supabase", ".temp", "project-ref");
if (fs.existsSync(remoteLink)) {
  fail("Refusing AdminOps lifecycle fixture operation: supabase/.temp/project-ref exists.");
}

const projectId = readProjectId();
const container = findDbContainer(projectId);
const result = psql(container, CLEANUP ? cleanupSql() : createSql());

if (result.status !== 0) {
  fail(CLEANUP
    ? "AdminOps lifecycle fixture cleanup failed."
    : "AdminOps lifecycle fixture creation failed or fixtures already exist.");
}

const jsonLine = result.stdout
  .split("\n")
  .map((line) => line.trim())
  .find((line) => line.startsWith("{"));

let details = {};
if (jsonLine) {
  try {
    details = JSON.parse(jsonLine);
  } catch {
    details = {};
  }
}

writeSummary({
  ok: true,
  mode: CLEANUP ? "cleanup" : "create",
  supabase_project_id: projectId,
  docker_container_used: container,
  fixture_policy: CLEANUP ? "exact-id cleanup only; audit logs are append-only" : "reject if any fixture row already exists",
  details,
});

console.log(`AdminOps lifecycle fixtures ${CLEANUP ? "cleaned up" : "created"}. Sanitized summary: ${SUMMARY_PATH}`);
