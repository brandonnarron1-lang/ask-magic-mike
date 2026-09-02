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
  console.error("Refusing to run the inbound SMS SQL contract against a non-local PostgreSQL host.");
  process.exit(1);
}

const routeSource = await readFile(
  path.join(process.cwd(), "app/api/webhooks/sms/inbound/route.ts"),
  "utf8",
);
const queryStartMarker = "return await sql.query(\n    `";
const queryStart = routeSource.indexOf(queryStartMarker);
const queryEnd = routeSource.indexOf("`,\n    [", queryStart + queryStartMarker.length);
assert.notEqual(queryStart, -1, "atomic inbound SMS SQL start marker must exist");
assert.notEqual(queryEnd, -1, "atomic inbound SMS SQL end marker must exist");

const schema = `amm_sms_inbound_contract_${process.pid}`;
const qualifiedSchema = `"${schema}"`;
const canonicalSql = routeSource.slice(queryStart + queryStartMarker.length, queryEnd);
const isolatedSql = canonicalSql.replaceAll("public.", `${qualifiedSchema}.`);
const client = new Client({ connectionString });

const leadRoot = "11111111-1111-4111-8111-111111111111";
const leadDuplicate = "22222222-2222-4222-8222-222222222222";
const leadSibling = "33333333-3333-4333-8333-333333333333";
const leadLate = "44444444-4444-4444-8444-444444444444";
const leadFailure = "55555555-5555-4555-8555-555555555555";

function parameters({
  messageId,
  classification,
  payloadHash = "a".repeat(64),
  bodyHash = "b".repeat(64),
  phone = "9195550101",
  mode = "mock",
}) {
  return [
    `${mode}:${messageId}:inbound`,
    messageId,
    classification,
    payloadHash,
    bodyHash,
    mode,
    mode === "twilio",
    `${mode}_sms_inbound`,
    phone,
  ];
}

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(`CREATE SCHEMA ${qualifiedSchema}`);
  await client.query(`
    CREATE FUNCTION ${qualifiedSchema}.amm_normalize_phone(value text)
    RETURNS text LANGUAGE sql IMMUTABLE RETURN CASE
      WHEN NULLIF(regexp_replace(COALESCE(value, ''), '[^0-9]', '', 'g'), '') IS NULL THEN NULL
      WHEN length(regexp_replace(value, '[^0-9]', '', 'g')) = 11
       AND left(regexp_replace(value, '[^0-9]', '', 'g'), 1) = '1'
        THEN substring(regexp_replace(value, '[^0-9]', '', 'g') FROM 2)
      ELSE regexp_replace(value, '[^0-9]', '', 'g')
    END;

    CREATE TABLE ${qualifiedSchema}.leads (
      id uuid PRIMARY KEY,
      phone text,
      phone_normalized text,
      normalized_phone text,
      is_duplicate boolean NOT NULL DEFAULT false,
      duplicate_of_lead_id uuid,
      sms_suppressed boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE ${qualifiedSchema}.provider_webhook_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      provider text NOT NULL,
      provider_event_id text NOT NULL,
      provider_message_id text,
      event_type text NOT NULL,
      signature_verified boolean NOT NULL,
      processing_status text NOT NULL CHECK (processing_status IN ('processed', 'ignored', 'failed')),
      payload_hash text NOT NULL,
      error_code text,
      occurred_at timestamptz,
      received_at timestamptz NOT NULL DEFAULT now(),
      processed_at timestamptz,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      UNIQUE (provider, provider_event_id)
    );
    CREATE TABLE ${qualifiedSchema}.communication_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id uuid REFERENCES ${qualifiedSchema}.leads(id),
      provider_event_id text,
      event_type text NOT NULL,
      channel text NOT NULL,
      occurred_at timestamptz NOT NULL DEFAULT now(),
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE UNIQUE INDEX communication_events_provider_event_uq_${process.pid}
      ON ${qualifiedSchema}.communication_events(provider_event_id)
      WHERE provider_event_id IS NOT NULL;
    CREATE TABLE ${qualifiedSchema}.communication_permissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id uuid NOT NULL REFERENCES ${qualifiedSchema}.leads(id),
      channel text NOT NULL,
      purpose text NOT NULL,
      state text NOT NULL,
      source text,
      evidence_at timestamptz,
      opted_out_at timestamptz,
      manual_review_required boolean NOT NULL DEFAULT false,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (lead_id, channel, purpose)
    );
    CREATE TABLE ${qualifiedSchema}.message_sequence_instances (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id uuid NOT NULL REFERENCES ${qualifiedSchema}.leads(id),
      status text NOT NULL,
      stopped_at timestamptz,
      stop_reason text,
      last_transition_at timestamptz,
      last_transition_by text,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await client.query(
    `INSERT INTO ${qualifiedSchema}.leads
       (id, phone, normalized_phone, is_duplicate, duplicate_of_lead_id, created_at)
     VALUES
       ($1, '+1 (919) 555-0101', NULL, false, NULL, '2026-01-01'),
       ($2, NULL, '19195550101', true, $1, '2026-01-02'),
       ($3, NULL, '9195550101', false, NULL, '2026-01-03')`,
    [leadRoot, leadDuplicate, leadSibling],
  );
  await client.query(
    `INSERT INTO ${qualifiedSchema}.message_sequence_instances (lead_id, status)
     VALUES ($1, 'active'), ($2, 'scheduled'), ($3, 'paused')`,
    [leadRoot, leadDuplicate, leadSibling],
  );

  const stopId = "mock_inbound_stop_001";
  const stopParams = parameters({ messageId: stopId, classification: "stop" });
  const stop = await client.query(isolatedSql, stopParams);
  assert.deepEqual(stop.rows[0], {
    claimed: true,
    matched_leads: 3,
    processing_status: "processed",
    recorded_payload_hash: "a".repeat(64),
    communication_recorded: 1,
    suppressed_leads: 3,
    permission_rows: 18,
    stopped_sequences: 3,
  });
  const stopState = await client.query(
    `SELECT
       (SELECT count(*)::int FROM ${qualifiedSchema}.leads WHERE sms_suppressed) AS suppressed,
       (SELECT count(*)::int FROM ${qualifiedSchema}.communication_permissions WHERE state = 'opted_out') AS permissions,
       (SELECT count(*)::int FROM ${qualifiedSchema}.message_sequence_instances
         WHERE status = 'cancelled' AND stop_reason = 'opt_out') AS cancelled,
       (SELECT lead_id::text FROM ${qualifiedSchema}.communication_events
         WHERE provider_event_id = $1) AS canonical_event_lead`,
    [`mock:${stopId}:inbound`],
  );
  assert.deepEqual(stopState.rows[0], {
    suppressed: 3,
    permissions: 18,
    cancelled: 3,
    canonical_event_lead: leadRoot,
  });

  const replay = await client.query(isolatedSql, stopParams);
  assert.equal(replay.rows[0].claimed, false);
  assert.equal(replay.rows[0].matched_leads, 3);
  assert.equal(replay.rows[0].communication_recorded, 0);
  assert.equal(replay.rows[0].suppressed_leads, 0);
  assert.equal(replay.rows[0].permission_rows, 0);

  const conflict = await client.query(isolatedSql, parameters({
    messageId: stopId,
    classification: "stop",
    payloadHash: "c".repeat(64),
  }));
  assert.equal(conflict.rows[0].claimed, false);
  assert.equal(conflict.rows[0].recorded_payload_hash, "a".repeat(64));

  await client.query(
    `UPDATE ${qualifiedSchema}.message_sequence_instances
        SET status = 'active', stopped_at = NULL, stop_reason = NULL`,
  );
  const reply = await client.query(isolatedSql, parameters({
    messageId: "mock_inbound_reply_001",
    classification: "reply",
    payloadHash: "d".repeat(64),
  }));
  assert.equal(reply.rows[0].suppressed_leads, 0);
  assert.equal(reply.rows[0].permission_rows, 0);
  assert.equal(reply.rows[0].stopped_sequences, 3);
  const replyState = await client.query(
    `SELECT count(*)::int AS cancelled FROM ${qualifiedSchema}.message_sequence_instances
      WHERE status = 'cancelled' AND stop_reason = 'consumer_reply'`,
  );
  assert.equal(replyState.rows[0].cancelled, 3);

  await client.query(
    `UPDATE ${qualifiedSchema}.message_sequence_instances
        SET status = 'active', stopped_at = NULL, stop_reason = NULL`,
  );
  const help = await client.query(isolatedSql, parameters({
    messageId: "mock_inbound_help_001",
    classification: "help",
    payloadHash: "e".repeat(64),
  }));
  assert.equal(help.rows[0].stopped_sequences, 0);

  const lateId = "mock_inbound_late_001";
  const lateParams = parameters({
    messageId: lateId,
    classification: "reply",
    payloadHash: "f".repeat(64),
    phone: "2525550199",
  });
  const unmatched = await client.query(isolatedSql, lateParams);
  assert.equal(unmatched.rows[0].claimed, true);
  assert.equal(unmatched.rows[0].matched_leads, 0);
  assert.equal(unmatched.rows[0].processing_status, "ignored");
  assert.equal(unmatched.rows[0].communication_recorded, 0);
  const unmatchedReplay = await client.query(isolatedSql, lateParams);
  assert.equal(unmatchedReplay.rows[0].claimed, false);

  await client.query(
    `INSERT INTO ${qualifiedSchema}.leads (id, phone, created_at)
     VALUES ($1, '+1 252-555-0199', '2026-01-04')`,
    [leadLate],
  );
  const healed = await client.query(isolatedSql, lateParams);
  assert.equal(healed.rows[0].claimed, true);
  assert.equal(healed.rows[0].processing_status, "processed");
  assert.equal(healed.rows[0].matched_leads, 1);
  assert.equal(healed.rows[0].communication_recorded, 1);

  const retryId = "mock_inbound_retry_001";
  await client.query(
    `INSERT INTO ${qualifiedSchema}.provider_webhook_events
       (provider, provider_event_id, provider_message_id, event_type,
        signature_verified, processing_status, payload_hash, metadata)
     VALUES ('mock', $1, $2, 'sms.inbound.reply', false, 'failed', $3, '{}'::jsonb)`,
    [`mock:${retryId}:inbound`, retryId, "1".repeat(64)],
  );
  const retried = await client.query(isolatedSql, parameters({
    messageId: retryId,
    classification: "reply",
    payloadHash: "1".repeat(64),
  }));
  assert.equal(retried.rows[0].claimed, true);
  assert.equal(retried.rows[0].processing_status, "processed");

  await client.query(
    `INSERT INTO ${qualifiedSchema}.leads (id, phone, created_at)
     VALUES ($1, '+1 252-555-0188', '2026-01-05')`,
    [leadFailure],
  );
  await client.query(`ALTER TABLE ${qualifiedSchema}.leads
    ADD CONSTRAINT local_reject_failure_suppression CHECK (
      id <> '${leadFailure}'::uuid OR sms_suppressed = false
    )`);
  const failureId = "mock_inbound_failure_001";
  await client.query("SAVEPOINT expected_atomic_failure");
  await assert.rejects(client.query(isolatedSql, parameters({
    messageId: failureId,
    classification: "stop",
    payloadHash: "2".repeat(64),
    phone: "2525550188",
  })));
  await client.query("ROLLBACK TO SAVEPOINT expected_atomic_failure");
  await client.query("RELEASE SAVEPOINT expected_atomic_failure");
  const rollbackState = await client.query(
    `SELECT
       (SELECT count(*)::int FROM ${qualifiedSchema}.provider_webhook_events
         WHERE provider_event_id = $1) AS receipts,
       (SELECT sms_suppressed FROM ${qualifiedSchema}.leads WHERE id = $2) AS suppressed,
       (SELECT count(*)::int FROM ${qualifiedSchema}.communication_events
         WHERE provider_event_id = $1) AS timeline_events`,
    [`mock:${failureId}:inbound`, leadFailure],
  );
  assert.deepEqual(rollbackState.rows[0], { receipts: 0, suppressed: false, timeline_events: 0 });

  const persisted = await client.query(
    `SELECT provider_event_id, provider_message_id, metadata::text
       FROM ${qualifiedSchema}.provider_webhook_events
     UNION ALL
     SELECT provider_event_id, NULL, metadata::text
       FROM ${qualifiedSchema}.communication_events`,
  );
  const persistedText = JSON.stringify(persisted.rows);
  assert.equal(persistedText.includes("9195550101"), false);
  assert.equal(persistedText.includes("+1 (919)"), false);

  console.log("Inbound SMS atomic SQL contract: PASS (all-record STOP, permissions, reply stop, HELP, replay, payload conflict, rollback, retry, unmatched, late-match healing, minimized receipt)");
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  await client.end().catch(() => undefined);
}
