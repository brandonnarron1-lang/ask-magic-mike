# Phase 9 SMS Status Atomic Boundary

Date: 2026-09-02
Status: isolated successor to stacked Draft PR #272; Production unchanged

## Decision

Keep the existing Twilio adapter, signed status route, canonical Neon
`lead_notifications` outbox, `provider_webhook_events` receipt ledger, and
`communication_events` timeline. Do not add another SMS provider, route,
database, delivery table, queue, recipient, or sending switch.

The existing route verified Twilio's signature and updated the outbox, but it
did not retain an idempotent provider receipt or communication event, rewrote
timestamps on replay, trusted an unbounded body/media type, could write from a
Preview deployment, and froze whichever terminal status arrived first.
Twilio explicitly documents that status callbacks are not guaranteed to arrive
in order. This candidate closes those gaps in the established route and schema.

Official provider references:

- https://www.twilio.com/docs/messaging/guides/track-outbound-message-status
- https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks
- https://www.twilio.com/docs/usage/security

## Request boundary

`POST /api/webhooks/sms/status` now:

1. refuses Preview before body processing, signature verification, or data;
2. requires the existing server-only Twilio auth token;
3. accepts only `application/x-www-form-urlencoded`;
4. caps both declared and streamed raw bodies at 20,000 bytes;
5. validates the signature over the configured canonical HTTPS callback URL
   and every received form parameter;
6. accepts only the established outbound lifecycle vocabulary;
7. validates Twilio `SM` and `MM` message SIDs and numeric error codes;
8. hashes only normalized non-PII lifecycle fields; and
9. executes one parameterized PostgreSQL lifecycle statement.

Responses are private/no-store, `nosniff`, and carry one matching body/header
correlation ID. Failure logs contain that ID and a fixed category only—not the
raw callback, signature, auth token, database URL, recipient, or provider
exception.

## Atomic and idempotent persistence

Twilio status callbacks do not include a unique event ID. The route derives a
stable receipt key from provider + message SID + normalized status. Added
provider fields therefore continue to participate in signature validation but
cannot turn a retry into a duplicate lifecycle mutation.

One SQL statement now:

- locates at most one canonical Twilio notification;
- inserts the signed receipt, reclaims a prior `failed` receipt, or reclaims a
  prior `ignored` receipt only after the canonical notification exists;
- applies a monotonic outbox transition;
- appends one idempotent SMS communication event; and
- returns a minimized receipt.

If any downstream write fails, PostgreSQL rolls back the receipt and every
state change so Twilio can retry. Exact replay is a successful no-op. A valid
unmatched callback is recorded as `ignored` rather than inventing a match. If
that callback raced ahead of Message SID persistence, a later provider retry
can reclaim it only once the matching outbox row exists; an event that remains
unmatched remains a no-op.

## Out-of-order lifecycle policy

The deterministic progression is:

`accepted -> queued -> sending -> sent -> failed/undelivered -> delivered`

The ranking is operational state precedence, not an assertion that Twilio
normally emits failure before delivery. It ensures:

- a late `sent` callback cannot overwrite a recorded carrier failure;
- a late carrier failure cannot regress a confirmed `delivered` state;
- a later delivery confirmation can correct an earlier failure callback; and
- equal-rank failure variants remain separately audited without rewriting the
  first terminal state.

The canonical outbox continues to use `sent` plus protected delivery metadata
because its existing status constraint has no separate `delivered` value.
Failed/undelivered becomes `permanently_failed`; a later confirmed delivery
clears the provider failure fields and restores `sent` with
`provider_delivery_confirmed=true`.

## Activation and rollback

This route processes signed in-flight callbacks whenever the existing
`TWILIO_AUTH_TOKEN` is configured, even if outbound delivery is subsequently
disabled. That preserves lifecycle evidence during a sending rollback. It does
not enable or send SMS; outbound delivery still requires every existing
activation switch in `docs/SMS_DELIVERY_SPEC.md`.

This application-only candidate begins at exact PR #272 head
`933cf730f2d73665e92e513244668ce0adf7d2ba`. It adds no migration or environment
variable. Production remains accepted PR #247 merge
`a2f3de834830f600df106dbf5836ae4bbde4eb4a`, tree
`0065f829fc94f87ab5e0faf596c8e56733be3972`; PR #248 remains the sole currently
requestable application gate.

Rollback is application-only: revert this candidate after a future approved
release or restore the preceding accepted Ready artifact. Preserve receipt,
communication, and notification evidence; no database rollback or data
deletion is needed.
