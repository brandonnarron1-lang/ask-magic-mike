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
  console.error("Refusing to run the Resend webhook SQL contract against a non-local PostgreSQL host.");
  process.exit(1);
}

const routeSource = await readFile(
  path.join(process.cwd(), "app/api/webhooks/email/events/route.ts"),
  "utf8",
);
const queryStartMarker = "return await sql.query(\n    `";
const queryStart = routeSource.indexOf(queryStartMarker);
const queryEnd = routeSource.indexOf("`,\n    [", queryStart + queryStartMarker.length);
assert.notEqual(queryStart, -1, "atomic webhook SQL start marker must exist");
assert.notEqual(queryEnd, -1, "atomic webhook SQL end marker must exist");

const schema = `amm_resend_contract_${process.pid}`;
const qualifiedSchema = `"${schema}"`;
const canonicalSql = routeSource.slice(queryStart + queryStartMarker.length, queryEnd);
const isolatedSql = canonicalSql.replaceAll("public.", `${qualifiedSchema}.`);
const client = new Client({ connectionString });

const leadOne = "11111111-1111-4111-8111-111111111111";
const notificationOne = "22222222-2222-4222-8222-222222222222";
const leadTwo = "33333333-3333-4333-8333-333333333333";
const notificationTwo = "44444444-4444-4444-8444-444444444444";
const occurredAt = "2026-09-02T18:00:00.000Z";

function parameters({
  eventId,
  messageId,
  eventType,
  payloadHash,
  terminal = false,
  accepted = false,
  suppress = false,
}) {
  return [
    eventId,
    messageId,
    eventType,
    payloadHash,
    occurredAt,
    terminal,
    `resend_${eventType}`,
    accepted,
    JSON.stringify({
      provider_last_event: eventType,
      provider_last_event_at: occurredAt,
      ...(eventType === "delivered" ? { provider_delivery_confirmed: true } : {}),
      ...(terminal ? { provider_terminal_failure: true } : {}),
    }),
    suppress,
  ];
}

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(`CREATE SCHEMA ${qualifiedSchema}`);
  await client.query(`
    CREATE TABLE ${qualifiedSchema}.leads (
      id uuid PRIMARY KEY,
      email_suppressed boolean NOT NULL DEFAULT false,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE ${qualifiedSchema}.lead_notifications (
      id uuid PRIMARY KEY,
      lead_id uuid NOT NULL REFERENCES ${qualifiedSchema}.leads(id),
      provider text,
      provider_message_id text,
      status text NOT NULL,
      error_code text,
      error_summary text,
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
     VALUES ($1, $2, 'resend', 'email_one', 'sent'),
            ($3, $4, 'resend', 'email_two', 'sent')`,
    [notificationOne, leadOne, notificationTwo, leadTwo],
  );

  const deliveredParams = parameters({
    eventId: "event_delivered",
    messageId: "email_one",
    eventType: "delivered",
    payloadHash: "a".repeat(64),
    accepted: true,
  });
  const delivered = await client.query(isolatedSql, deliveredParams);
  assert.deepEqual(delivered.rows[0], {
    claimed: true,
    matched_notification: true,
    processing_status: "processed",
    recorded_payload_hash: "a".repeat(64),
    notification_updated: 1,
    communication_recorded: 1,
    lead_suppressed: 0,
  });
  const deliveredState = await client.query(
    `SELECT status, sent_at IS NOT NULL AS sent, metadata->>'provider_delivery_confirmed' AS confirmed
       FROM ${qualifiedSchema}.lead_notifications WHERE id = $1`,
    [notificationOne],
  );
  assert.deepEqual(deliveredState.rows[0], { status: "sent", sent: true, confirmed: "true" });

  const duplicate = await client.query(isolatedSql, deliveredParams);
  assert.equal(duplicate.rows[0].claimed, false);
  assert.equal(duplicate.rows[0].recorded_payload_hash, "a".repeat(64));
  const duplicateCount = await client.query(
    `SELECT count(*)::int AS count FROM ${qualifiedSchema}.communication_events
      WHERE provider_event_id = 'event_delivered'`,
  );
  assert.equal(duplicateCount.rows[0].count, 1);

  await client.query(`ALTER TABLE ${qualifiedSchema}.communication_events
    ADD CONSTRAINT local_reject_failed CHECK (event_type <> 'failed')`);
  const failedParams = parameters({
    eventId: "event_atomic_failure",
    messageId: "email_two",
    eventType: "failed",
    payloadHash: "b".repeat(64),
    terminal: true,
  });
  await client.query("SAVEPOINT expected_atomic_failure");
  await assert.rejects(client.query(isolatedSql, failedParams));
  await client.query("ROLLBACK TO SAVEPOINT expected_atomic_failure");
  await client.query("RELEASE SAVEPOINT expected_atomic_failure");
  const rollbackState = await client.query(
    `SELECT
       (SELECT count(*)::int FROM ${qualifiedSchema}.provider_webhook_events
         WHERE provider_event_id = 'event_atomic_failure') AS receipts,
       (SELECT status FROM ${qualifiedSchema}.lead_notifications WHERE id = $1) AS notification_status`,
    [notificationTwo],
  );
  assert.deepEqual(rollbackState.rows[0], { receipts: 0, notification_status: "sent" });
  await client.query(`ALTER TABLE ${qualifiedSchema}.communication_events DROP CONSTRAINT local_reject_failed`);

  await client.query(
    `INSERT INTO ${qualifiedSchema}.provider_webhook_events
       (provider, provider_event_id, provider_message_id, event_type,
        signature_verified, processing_status, payload_hash, error_code)
     VALUES ('resend', 'event_retry', 'email_two', 'clicked', true, 'failed', $1, 'transient')`,
    ["c".repeat(64)],
  );
  const retry = await client.query(isolatedSql, parameters({
    eventId: "event_retry",
    messageId: "email_two",
    eventType: "clicked",
    payloadHash: "c".repeat(64),
    accepted: true,
  }));
  assert.equal(retry.rows[0].claimed, true);
  assert.equal(retry.rows[0].processing_status, "processed");

  const bounce = await client.query(isolatedSql, parameters({
    eventId: "event_bounced",
    messageId: "email_one",
    eventType: "bounced",
    payloadHash: "d".repeat(64),
    terminal: true,
    suppress: true,
  }));
  assert.equal(bounce.rows[0].lead_suppressed, 1);
  const bounceState = await client.query(
    `SELECT notification.status, lead.email_suppressed
       FROM ${qualifiedSchema}.lead_notifications AS notification
       JOIN ${qualifiedSchema}.leads AS lead ON lead.id = notification.lead_id
      WHERE notification.id = $1`,
    [notificationOne],
  );
  assert.deepEqual(bounceState.rows[0], {
    status: "permanently_failed",
    email_suppressed: true,
  });

  const ignored = await client.query(isolatedSql, parameters({
    eventId: "event_unmatched",
    messageId: "email_missing",
    eventType: "sent",
    payloadHash: "e".repeat(64),
    accepted: true,
  }));
  assert.equal(ignored.rows[0].matched_notification, false);
  assert.equal(ignored.rows[0].processing_status, "ignored");

  console.log("Resend webhook atomic SQL contract: PASS (processed, replay, rollback, retry, suppression, unmatched)");
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  await client.end().catch(() => undefined);
}
