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
  console.error("Refusing to run the Twilio status SQL contract against a non-local PostgreSQL host.");
  process.exit(1);
}

const routeSource = await readFile(
  path.join(process.cwd(), "app/api/webhooks/sms/status/route.ts"),
  "utf8",
);
const queryStartMarker = "return await sql.query(\n    `";
const queryStart = routeSource.indexOf(queryStartMarker);
const queryEnd = routeSource.indexOf("`,\n    [", queryStart + queryStartMarker.length);
assert.notEqual(queryStart, -1, "atomic Twilio status SQL start marker must exist");
assert.notEqual(queryEnd, -1, "atomic Twilio status SQL end marker must exist");

const schema = `amm_twilio_status_contract_${process.pid}`;
const qualifiedSchema = `"${schema}"`;
const canonicalSql = routeSource.slice(queryStart + queryStartMarker.length, queryEnd);
const isolatedSql = canonicalSql.replaceAll("public.", `${qualifiedSchema}.`);
const client = new Client({ connectionString });

const leadOne = "11111111-1111-4111-8111-111111111111";
const notificationOne = "22222222-2222-4222-8222-222222222222";
const leadTwo = "33333333-3333-4333-8333-333333333333";
const notificationTwo = "44444444-4444-4444-8444-444444444444";
const notificationThree = "55555555-5555-4555-8555-555555555555";
const sidOne = `SM${"1".repeat(32)}`;
const sidTwo = `SM${"2".repeat(32)}`;

const rank = {
  accepted: 10,
  queued: 20,
  sending: 30,
  sent: 40,
  failed: 50,
  undelivered: 50,
  delivered: 60,
};

function parameters({ sid, status, errorCode = null, payloadHash = "a".repeat(64) }) {
  return [
    `twilio:sms-status:${sid}:${status}`,
    sid,
    status,
    errorCode,
    payloadHash,
    rank[status],
    status === "failed" || status === "undelivered",
  ];
}

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(`CREATE SCHEMA ${qualifiedSchema}`);
  await client.query(`
    CREATE TABLE ${qualifiedSchema}.leads (
      id uuid PRIMARY KEY
    );
    CREATE TABLE ${qualifiedSchema}.lead_notifications (
      id uuid PRIMARY KEY,
      lead_id uuid NOT NULL REFERENCES ${qualifiedSchema}.leads(id),
      provider text,
      provider_message_id text,
      status text NOT NULL,
      error_code text,
      error_summary text,
      next_attempt_at timestamptz,
      failed_at timestamptz,
      sent_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb
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
      lead_notification_id uuid REFERENCES ${qualifiedSchema}.lead_notifications(id),
      provider_event_id text,
      event_type text NOT NULL,
      channel text NOT NULL,
      occurred_at timestamptz NOT NULL DEFAULT now(),
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE UNIQUE INDEX communication_events_provider_event_uq_${process.pid}
      ON ${qualifiedSchema}.communication_events(provider_event_id)
      WHERE provider_event_id IS NOT NULL;
  `);
  await client.query(
    `INSERT INTO ${qualifiedSchema}.leads (id) VALUES ($1), ($2)`,
    [leadOne, leadTwo],
  );
  await client.query(
    `INSERT INTO ${qualifiedSchema}.lead_notifications
       (id, lead_id, provider, provider_message_id, status)
     VALUES ($1, $2, 'twilio', $3, 'sent'),
            ($4, $5, 'twilio', $6, 'sent')`,
    [notificationOne, leadOne, sidOne, notificationTwo, leadTwo, sidTwo],
  );

  const failedParams = parameters({
    sid: sidOne,
    status: "failed",
    errorCode: "twilio_30007",
  });
  const failed = await client.query(isolatedSql, failedParams);
  assert.deepEqual(failed.rows[0], {
    claimed: true,
    matched_notification: true,
    processing_status: "processed",
    recorded_payload_hash: "a".repeat(64),
    notification_updated: 1,
    communication_recorded: 1,
  });
  const failedState = await client.query(
    `SELECT status, error_code, failed_at IS NOT NULL AS failed,
            metadata->>'provider_delivery_status' AS provider_status,
            metadata->>'provider_status_rank' AS provider_rank
       FROM ${qualifiedSchema}.lead_notifications WHERE id = $1`,
    [notificationOne],
  );
  assert.deepEqual(failedState.rows[0], {
    status: "permanently_failed",
    error_code: "twilio_30007",
    failed: true,
    provider_status: "failed",
    provider_rank: "50",
  });

  const duplicate = await client.query(isolatedSql, failedParams);
  assert.equal(duplicate.rows[0].claimed, false);
  assert.equal(duplicate.rows[0].notification_updated, 0);
  assert.equal(duplicate.rows[0].communication_recorded, 0);

  const staleSent = await client.query(isolatedSql, parameters({ sid: sidOne, status: "sent" }));
  assert.equal(staleSent.rows[0].claimed, true);
  assert.equal(staleSent.rows[0].notification_updated, 0);
  assert.equal(staleSent.rows[0].communication_recorded, 1);
  const staleState = await client.query(
    `SELECT status, metadata->>'provider_delivery_status' AS provider_status
       FROM ${qualifiedSchema}.lead_notifications WHERE id = $1`,
    [notificationOne],
  );
  assert.deepEqual(staleState.rows[0], { status: "permanently_failed", provider_status: "failed" });
  const staleEvent = await client.query(
    `SELECT metadata->>'status_applied' AS status_applied
       FROM ${qualifiedSchema}.communication_events
      WHERE provider_event_id = $1`,
    [`twilio:sms-status:${sidOne}:sent`],
  );
  assert.equal(staleEvent.rows[0].status_applied, "false");

  const delivered = await client.query(isolatedSql, parameters({ sid: sidOne, status: "delivered" }));
  assert.equal(delivered.rows[0].notification_updated, 1);
  const deliveredState = await client.query(
    `SELECT status, error_code, error_summary, failed_at,
            metadata->>'provider_delivery_status' AS provider_status,
            metadata->>'provider_delivery_confirmed' AS confirmed
       FROM ${qualifiedSchema}.lead_notifications WHERE id = $1`,
    [notificationOne],
  );
  assert.deepEqual(deliveredState.rows[0], {
    status: "sent",
    error_code: null,
    error_summary: null,
    failed_at: null,
    provider_status: "delivered",
    confirmed: "true",
  });

  const staleFailure = await client.query(isolatedSql, parameters({
    sid: sidOne,
    status: "undelivered",
    errorCode: "twilio_30003",
  }));
  assert.equal(staleFailure.rows[0].notification_updated, 0);
  const nonRegressedState = await client.query(
    `SELECT status, error_code, metadata->>'provider_delivery_status' AS provider_status
       FROM ${qualifiedSchema}.lead_notifications WHERE id = $1`,
    [notificationOne],
  );
  assert.deepEqual(nonRegressedState.rows[0], {
    status: "sent",
    error_code: null,
    provider_status: "delivered",
  });

  await client.query(`ALTER TABLE ${qualifiedSchema}.communication_events
    ADD CONSTRAINT local_reject_failed CHECK (
      event_type <> 'failed'
      OR lead_notification_id <> '${notificationTwo}'::uuid
    )`);
  const atomicFailure = parameters({
    sid: sidTwo,
    status: "failed",
    errorCode: "twilio_30005",
    payloadHash: "b".repeat(64),
  });
  await client.query("SAVEPOINT expected_atomic_failure");
  await assert.rejects(client.query(isolatedSql, atomicFailure));
  await client.query("ROLLBACK TO SAVEPOINT expected_atomic_failure");
  await client.query("RELEASE SAVEPOINT expected_atomic_failure");
  const rollbackState = await client.query(
    `SELECT
       (SELECT count(*)::int FROM ${qualifiedSchema}.provider_webhook_events
         WHERE provider_event_id = $1) AS receipts,
       (SELECT status FROM ${qualifiedSchema}.lead_notifications WHERE id = $2) AS notification_status`,
    [`twilio:sms-status:${sidTwo}:failed`, notificationTwo],
  );
  assert.deepEqual(rollbackState.rows[0], { receipts: 0, notification_status: "sent" });
  await client.query(`ALTER TABLE ${qualifiedSchema}.communication_events DROP CONSTRAINT local_reject_failed`);

  const retryEventId = `twilio:sms-status:${sidTwo}:queued`;
  await client.query(
    `INSERT INTO ${qualifiedSchema}.provider_webhook_events
       (provider, provider_event_id, provider_message_id, event_type,
        signature_verified, processing_status, payload_hash, error_code, metadata)
     VALUES ('twilio', $1, $2, 'queued', true, 'failed', $3, 'transient', '{}'::jsonb)`,
    [retryEventId, sidTwo, "c".repeat(64)],
  );
  const retried = await client.query(isolatedSql, parameters({
    sid: sidTwo,
    status: "queued",
    payloadHash: "c".repeat(64),
  }));
  assert.equal(retried.rows[0].claimed, true);
  assert.equal(retried.rows[0].processing_status, "processed");

  const unmatchedSid = `MM${"3".repeat(32)}`;
  const unmatched = await client.query(isolatedSql, parameters({
    sid: unmatchedSid,
    status: "delivered",
    payloadHash: "d".repeat(64),
  }));
  assert.equal(unmatched.rows[0].matched_notification, false);
  assert.equal(unmatched.rows[0].processing_status, "ignored");
  assert.equal(unmatched.rows[0].notification_updated, 0);

  const unmatchedReplay = await client.query(isolatedSql, parameters({
    sid: unmatchedSid,
    status: "delivered",
    payloadHash: "d".repeat(64),
  }));
  assert.equal(unmatchedReplay.rows[0].claimed, false);
  assert.equal(unmatchedReplay.rows[0].processing_status, "ignored");
  await client.query(
    `INSERT INTO ${qualifiedSchema}.lead_notifications
       (id, lead_id, provider, provider_message_id, status)
     VALUES ($1, $2, 'twilio', $3, 'sent')`,
    [notificationThree, leadTwo, unmatchedSid],
  );
  const healedRace = await client.query(isolatedSql, parameters({
    sid: unmatchedSid,
    status: "delivered",
    payloadHash: "d".repeat(64),
  }));
  assert.equal(healedRace.rows[0].claimed, true);
  assert.equal(healedRace.rows[0].processing_status, "processed");
  assert.equal(healedRace.rows[0].notification_updated, 1);
  assert.equal(healedRace.rows[0].communication_recorded, 1);

  console.log("Twilio status atomic SQL contract: PASS (processed, replay, out-of-order, correction, non-regression, rollback, retry, unmatched, late-match healing)");
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  await client.end().catch(() => undefined);
}
