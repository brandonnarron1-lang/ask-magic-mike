# Phase 9 Email Webhook Atomic Boundary

Date: 2026-09-02
Status: isolated successor to stacked Draft PR #271; Production unchanged

## Decision

Keep the established Resend subscription, Svix signature, canonical Neon
outbox, `provider_webhook_events`, `communication_events`, and lead suppression
fields. Do not add another provider, queue, callback route, database, delivery
ledger, or notification system.

The existing callback already verified Resend signatures and minimized stored
payloads, but it wrote the receipt, notification state, communication event,
and suppression flag in separate database calls. A failure after the receipt
insert could leave the receipt marked complete while later writes were absent;
the provider replay would then be acknowledged as a duplicate. This candidate
closes that recovery gap in the same route and tables.

## Request boundary

`POST /api/webhooks/email/events` now enforces this order:

1. require the existing explicit Resend enablement;
2. refuse Preview mutation even if provider secrets are accidentally copied;
3. require `application/json` and bounded Svix header values;
4. cap both declared and streamed raw bodies at 256,000 bytes;
5. verify the signature against the exact raw bytes before normalization or
   database access;
6. accept only the eight event types configured on the existing subscription;
7. validate the provider message ID and normalize a valid timestamp;
8. hash, rather than store, the raw payload; and
9. execute one parameterized PostgreSQL lifecycle statement.

Every response is private/no-store, carries one body/header correlation ID,
and returns only stable error codes. Logs contain the correlation ID and a
fixed failure category—not raw payloads, signatures, database URLs, recipient
addresses, contact data, or provider errors.

## Atomic persistence contract

One PostgreSQL statement now:

- deterministically locates at most one canonical Resend notification;
- inserts the signed provider receipt, or reclaims only a prior `failed`
  receipt;
- updates the matching outbox notification;
- inserts the idempotent communication timeline event;
- applies email suppression for bounce, complaint, or suppression events; and
- returns a minimized processing receipt.

PostgreSQL commits all of those effects together. If any mutation fails, the
entire statement—including the provider receipt—rolls back and HTTP 503 tells
the provider to retry. Exact replay performs no lifecycle mutation. Reuse of a
completed provider event ID with a different payload hash fails with
`event_id_conflict` rather than being accepted as an ordinary duplicate. A
durable row explicitly marked `failed` remains retryable.

The route records unmatched signed events as `ignored`, preserving provider
evidence without inventing a notification match. Raw provider payloads and
email addresses remain absent from webhook metadata.

## Lifecycle semantics

- `sent`, `delivered`, `opened`, and `clicked` preserve the earliest `sent_at`.
- `delivered` adds the durable delivery-confirmed metadata marker.
- `delivery_delayed` records the timeline without creating a terminal state.
- `bounced`, `complained`, and `failed` mark the notification
  `permanently_failed` with a fixed review-safe summary.
- `bounced` and `complained` suppress future email for the canonical lead.
- unsupported signed events fail before database access.

These rules do not send email, retry an outbox item, alter assignment, change
consent, or claim provider delivery without a signed lifecycle event.

## Compatibility, release order, and rollback

This is an application-only stacked Draft candidate from exact PR #271 head
`da61572f3c76e37c436c6f8d266508619cb8181e`. It adds one local-only executable
PostgreSQL contract check and no migration, environment variable, provider
subscription, or deployment setting.

Accepted Production remains PR #247 merge
`a2f3de834830f600df106dbf5836ae4bbde4eb4a`, exact tree
`0065f829fc94f87ab5e0faf596c8e56733be3972`. PR #248 remains the sole currently
requestable application gate; this Draft has no release authority and cannot
leapfrog it.

Rollback is application-only: revert this candidate after a future approved
release or restore the immediately preceding accepted Ready deployment. No
database rollback or data deletion is needed because the schema is unchanged.
No Production, Neon, Resend, WordPress, lead, message, DNS, publication, spend,
deletion, or NellySelly state is changed by this candidate.
