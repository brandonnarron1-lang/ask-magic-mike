# Phase 9 inbound SMS consent atomic boundary

Date: 2026-09-02
Status: stacked Draft/Preview candidate; not Production authority

## Reuse decision

This change retains the existing Twilio account/adapter, root App Router
endpoint `POST /api/webhooks/sms/inbound`, canonical Neon lead records,
`provider_webhook_events` receipt ledger, `communication_events` timeline,
`communication_permissions`, and `message_sequence_instances`. It adds no
provider, route, table, migration, secret name, queue, or alternate lead store.

## Closed gaps

- A signed Twilio callback is authenticated as Twilio even when outbound SMS
  has been disabled during rollback. Provider reception and provider sending
  are separate authorities.
- Production refuses the admin-secret JSON mock transport. Read-only Preview
  refuses before body parsing, authentication, provider work, or persistence.
- The endpoint accepts only exact form or JSON media types, caps both declared
  and streamed bodies at 20 KB, rejects duplicate form fields, and validates
  U.S. phone identity, message length, and `SM`/`MM` provider IDs.
- One PostgreSQL statement claims the receipt, writes one canonical timeline
  event, suppresses every existing lead record with the replying number,
  upserts all six SMS permission purposes, and cancels every eligible sequence.
  Any downstream failure rolls back the receipt and all consent changes.
- Exact replay is a no-op. A reused provider event ID with different normalized
  content fails as a conflict. A failed receipt can be retried; an ignored
  unmatched receipt can be reclaimed if the same payload is replayed after a
  matching lead appears.
- Receipt/timeline metadata stores only provider identifiers, classification,
  counts, authentication mode, and hashes. It stores no raw phone number or
  message body. Responses are private, no-store, and share one safe correlation
  ID between body and header.

## Consent semantics

`STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, and `QUIT` set
`sms_suppressed=true` on every currently matching lead and set these purposes
to `opted_out`:

- requested service response;
- transactional acknowledgment;
- appointment coordination;
- property-alert subscription;
- marketing nurture; and
- manual one-to-one.

A normal consumer reply cancels active automation so a human can take over.
`HELP`/`INFO` is recorded without changing permission or sequence state.
`START`/`UNSTOP` is deliberately not an automatic re-opt-in command; renewed
permission requires separately reviewed affirmative consent evidence.

## Residual boundary

The current canonical schema records permission per lead. An unmatched inbound
number is retained only as a minimized ignored provider receipt; the phone is
not stored. Because an outbound consumer message already requires an existing
lead, this is not a normal contacted-lead path. A future cross-lead suppression
registry would require a separately reviewed migration, retention policy, and
capture-path integration and is not invented in this bounded repair.

## Release order and rollback

This candidate is stacked after PR #273 and cannot leapfrog the singular PR
#248 Production application gate. Rollback is an application rollback to the
immediately preceding accepted commit; there is no schema rollback. Disabling
`ENABLE_SMS` or `AGENT_SMS_NOTIFICATIONS_ENABLED` stops new outbound sends but
must not remove `TWILIO_AUTH_TOKEN` while carrier callbacks remain in flight.
