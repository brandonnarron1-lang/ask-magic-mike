import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.AMM_LOCAL_POSTGRES_URL;
if (!connectionString) {
  console.error("AMM_LOCAL_POSTGRES_URL is required and must target an isolated local PostgreSQL instance.");
  process.exit(1);
}

const target = new URL(connectionString);
if (!new Set(["localhost", "127.0.0.1", "[::1]", "::1"]).has(target.hostname)) {
  console.error("Refusing to run the consumer acknowledgment SQL contract against a non-local PostgreSQL host.");
  process.exit(1);
}

const migration = await readFile(
  path.join(process.cwd(), "supabase/migrations/20260928160000_atomic_consumer_ack_delivery_intent.sql"),
  "utf8",
);
const functionStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.capture_public_lead_v3");
const functionEndMarker = "END;\n$$;";
const functionEnd = migration.indexOf(functionEndMarker, functionStart);
assert.notEqual(functionStart, -1, "v3 capture function start marker must exist");
assert.notEqual(functionEnd, -1, "v3 capture function end marker must exist");

const schema = `amm_consumer_ack_contract_${process.pid}`;
const qualifiedSchema = `"${schema}"`;
const functionSql = migration
  .slice(functionStart, functionEnd + functionEndMarker.length)
  .replaceAll("public.", `${qualifiedSchema}.`)
  .replace("SET search_path = public, pg_temp", `SET search_path = ${qualifiedSchema}, pg_temp`);
const client = new Client({ connectionString });

const eligibleLead = "11111111-1111-4111-8111-111111111111";
const healLead = "22222222-2222-4222-8222-222222222222";
const disabledModeLead = "33333333-3333-4333-8333-333333333333";
const testLead = "44444444-4444-4444-8444-444444444444";
const suppressedLead = "55555555-5555-4555-8555-555555555555";
const noConsentLead = "66666666-6666-4666-8666-666666666666";
const missingEvidenceLead = "77777777-7777-4777-8777-777777777777";
const failureLead = "88888888-8888-4888-8888-888888888888";

function captureParameters(leadId, { enabled = true, mode = "production" } = {}) {
  return [
    JSON.stringify({ id: leadId }),
    JSON.stringify({ id: leadId }),
    JSON.stringify({}),
    mode,
    JSON.stringify({ template_version: "lead_alert_email_v3", metadata: { correlation_id: "synthetic" } }),
    JSON.stringify({
      enabled,
      template_version: "consumer_ack_email_v1",
      metadata: { correlation_id: "synthetic", consent_language_version: "synthetic-v1" },
    }),
  ];
}

async function capture(leadId, options) {
  const result = await client.query(
    `SELECT ${qualifiedSchema}.capture_public_lead_v3(
       $1::jsonb, $2::jsonb, $3::jsonb, $4::text, $5::jsonb, $6::jsonb
     ) AS result`,
    captureParameters(leadId, options),
  );
  return result.rows[0].result;
}

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(`CREATE SCHEMA ${qualifiedSchema}`);
  await client.query(`
    CREATE TABLE ${qualifiedSchema}.leads (
      id uuid PRIMARY KEY,
      email text,
      consent_email boolean NOT NULL DEFAULT false,
      consent_timestamp timestamptz,
      consent_language_version text,
      consent_language_text text,
      is_test boolean NOT NULL DEFAULT false,
      communication_suppressed boolean NOT NULL DEFAULT false,
      email_suppressed boolean NOT NULL DEFAULT false
    );
    CREATE TABLE ${qualifiedSchema}.capture_effects (
      id bigserial PRIMARY KEY,
      lead_id uuid NOT NULL
    );
    CREATE TABLE ${qualifiedSchema}.lead_notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id uuid NOT NULL REFERENCES ${qualifiedSchema}.leads(id),
      agent_id uuid,
      assignment_audit_id uuid,
      notification_type text NOT NULL,
      channel text NOT NULL,
      recipient_type text NOT NULL,
      recipient_reference text,
      template_version text NOT NULL,
      idempotency_key text NOT NULL UNIQUE,
      status text NOT NULL,
      max_attempts integer NOT NULL,
      provider text,
      error_code text,
      error_summary text,
      failed_at timestamptz,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE FUNCTION ${qualifiedSchema}.capture_public_lead_v2(
      p_session jsonb,
      p_lead jsonb,
      p_attribution jsonb,
      p_notification_mode text DEFAULT 'disabled',
      p_internal_notification jsonb DEFAULT '{}'::jsonb
    ) RETURNS jsonb LANGUAGE plpgsql AS $$
    DECLARE
      v_lead_id uuid := (p_lead->>'id')::uuid;
    BEGIN
      INSERT INTO ${qualifiedSchema}.capture_effects (lead_id) VALUES (v_lead_id);
      RETURN jsonb_build_object(
        'ok', true,
        'lead_id', v_lead_id,
        'session_id', (p_session->>'id')::uuid,
        'widget_session_id', p_session->>'id',
        'duplicate_of_lead_id', null,
        'idempotent_replay', true,
        'capture_version', 'v2'
      );
    END;
    $$;
  `);
  await client.query(functionSql);

  await client.query(
    `INSERT INTO ${qualifiedSchema}.leads (
       id, email, consent_email, consent_timestamp, consent_language_version,
       consent_language_text, is_test, communication_suppressed, email_suppressed
     ) VALUES
       ($1, 'eligible@example.test', true, now(), 'synthetic-v1', 'Synthetic exact consent.', false, false, false),
       ($2, 'heal@example.test', true, now(), 'synthetic-v1', 'Synthetic exact consent.', false, false, false),
       ($3, 'disabled@example.test', true, now(), 'synthetic-v1', 'Synthetic exact consent.', false, false, false),
       ($4, 'test@example.test', true, now(), 'synthetic-v1', 'Synthetic exact consent.', true, true, true),
       ($5, 'suppressed@example.test', true, now(), 'synthetic-v1', 'Synthetic exact consent.', false, true, false),
       ($6, 'denied@example.test', false, now(), 'synthetic-v1', 'Synthetic exact consent.', false, false, false),
       ($7, 'missing@example.test', true, null, null, null, false, false, false),
       ($8, 'failure@example.test', true, now(), 'synthetic-v1', 'Synthetic exact consent.', false, false, false)`,
    [eligibleLead, healLead, disabledModeLead, testLead, suppressedLead, noConsentLead, missingEvidenceLead, failureLead],
  );

  const eligible = await capture(eligibleLead);
  assert.equal(eligible.capture_version, "v3");
  assert.equal(eligible.consumer_notification_seeded, true);
  assert.equal(eligible.consumer_notification_status, "pending");

  const replay = await capture(eligibleLead);
  assert.equal(replay.consumer_notification_id, eligible.consumer_notification_id);
  const oneRow = await client.query(
    `SELECT count(*)::int AS count FROM ${qualifiedSchema}.lead_notifications WHERE lead_id = $1`,
    [eligibleLead],
  );
  assert.equal(oneRow.rows[0].count, 1);

  const minimized = await client.query(
    `SELECT recipient_reference, metadata::text AS metadata
       FROM ${qualifiedSchema}.lead_notifications WHERE lead_id = $1`,
    [eligibleLead],
  );
  assert.equal(minimized.rows[0].recipient_reference, "email_configured");
  assert.equal(minimized.rows[0].metadata.includes("eligible@example.test"), false);
  assert.equal(minimized.rows[0].metadata.includes("capture_public_lead_v3"), true);

  const notRequested = await capture(healLead, { enabled: false });
  assert.equal(notRequested.consumer_notification_seeded, false);
  const healed = await capture(healLead, { enabled: true });
  assert.equal(healed.consumer_notification_seeded, true);

  const disabledMode = await capture(disabledModeLead, { mode: "disabled" });
  assert.equal(disabledMode.consumer_notification_status, "skipped");
  const disabledRecord = await client.query(
    `SELECT error_code, provider FROM ${qualifiedSchema}.lead_notifications WHERE lead_id = $1`,
    [disabledModeLead],
  );
  assert.deepEqual(disabledRecord.rows[0], { error_code: "notifications_disabled", provider: "disabled" });

  for (const blockedLead of [testLead, suppressedLead, noConsentLead, missingEvidenceLead]) {
    const blocked = await capture(blockedLead);
    assert.equal(blocked.consumer_notification_seeded, false);
  }

  await client.query(`ALTER TABLE ${qualifiedSchema}.lead_notifications
    ADD CONSTRAINT local_reject_failure_ack CHECK (lead_id <> '${failureLead}'::uuid)`);
  await client.query("SAVEPOINT expected_atomic_failure");
  await assert.rejects(capture(failureLead));
  await client.query("ROLLBACK TO SAVEPOINT expected_atomic_failure");
  await client.query("RELEASE SAVEPOINT expected_atomic_failure");
  const rollbackState = await client.query(
    `SELECT
       (SELECT count(*)::int FROM ${qualifiedSchema}.capture_effects WHERE lead_id = $1) AS v2_effects,
       (SELECT count(*)::int FROM ${qualifiedSchema}.lead_notifications WHERE lead_id = $1) AS notifications`,
    [failureLead],
  );
  assert.deepEqual(rollbackState.rows[0], { v2_effects: 0, notifications: 0 });

  console.log("Consumer acknowledgment atomic SQL contract: PASS (stored consent, suppression, test exclusion, release gate, replay, healing, disabled mode, PII minimization, rollback)");
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  await client.end().catch(() => undefined);
}
