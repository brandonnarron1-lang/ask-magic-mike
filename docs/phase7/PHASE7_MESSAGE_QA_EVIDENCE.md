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
- Resend events: `sent` and `delivered` on 2026-08-16 at 10:50 AM.
- Recipient-inbox result: present in the authorized `brandonnarron1@gmail.com` Inbox.
- Recipient-side sender and subject: `Ask Magic Mike <leads@notify.askmagicmike.com>` and the required `[TEST — BRANDON QA]` prefix.
- Recipient-side render: branded HTML, QA banner, body copy, and secure review CTA rendered in Gmail.
- Link behavior: the review CTA resolves to the protected Message Review Studio and correctly requires a valid Lead Center session.

The Gmail connector profile remains a different mailbox, but the already-authenticated in-app browser exposed the authorized recipient inbox at Gmail account slot `u/0`. Read-only inspection confirmed the message in Inbox; no reply, forwarding, label mutation, or other mailbox write occurred. Resend independently showed `sent` and `delivered`, so delivery is supported by both provider-side and recipient-side evidence rather than inferred from the send API response.

Evidence files:

- `output/phase7/screenshots/email-acceptance/01-gmail-desktop-inbox-render.png`
- `output/phase7/screenshots/email-acceptance/02-resend-delivered-events.png`
- `output/phase7/screenshots/email-acceptance/03-gmail-mobile-inbox-render.png`
- `output/phase7/screenshots/email-acceptance/04-resend-mobile-render.png`

The Gmail desktop screenshot is the authoritative recipient render. The narrow-viewport Gmail capture documents the responsive audit attempt but is not classified as full mobile-client conformance because Gmail retained its desktop-width message canvas in the captured browser surface.
