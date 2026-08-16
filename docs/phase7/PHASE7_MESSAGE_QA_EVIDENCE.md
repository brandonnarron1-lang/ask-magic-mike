# Phase 7 message QA evidence

The QA route requires a UUID lead record, validates `is_test=true` and `communication_suppressed=true`, validates the exact allowlisted recipient configuration, caps successful sends at eight, creates an outbox row before provider delivery, uses a release/lead/audience idempotency key, and never includes BCC, Mike, or a consumer recipient.

Allowed subjects begin `[TEST — BRANDON QA]` or `[TEST — BRANDON QA — MIKE VIEW]`. Provider message ID and outbox status are persisted.

## Deployed acceptance

- Authorized recipient: `brandonnarron1@gmail.com` only.
- Subject: `[TEST — BRANDON QA] Phase 7 messaging release-candidate review`.
- Resend provider message ID: `871e5b96-a10b-492a-bb23-9898824f0cd3`.
- Provider result: accepted; `duplicate=false`.
- Mike delivery: not requested.
- Consumer delivery: not requested.
- BCC: not used.
- Carrier SMS: not sent.
- Source record: synthetic, `is_test=true`, and communication-suppressed.

The connected Gmail profile is a different inbox and cannot confirm receipt. The existing Resend key is send-scoped and returned HTTP 401 for the official retrieve endpoint. Inbox delivery/rendering therefore remains unverified rather than being inferred from provider acceptance.
