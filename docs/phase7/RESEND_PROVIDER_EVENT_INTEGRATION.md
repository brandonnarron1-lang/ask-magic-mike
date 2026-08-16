# Resend provider-event integration

Canonical route: `POST /api/webhooks/email/events` in the root Next.js app.

The route reads the raw body, requires `svix-id`, `svix-timestamp`, and `svix-signature`, verifies with `RESEND_WEBHOOK_SECRET`, rejects invalid signatures before database work, hashes rather than stores the raw payload, and deduplicates by provider event ID.

The Production subscription is intentionally limited to `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, `email.opened`, and `email.clicked`. Resend's received, scheduled, suppressed, contact, domain, and suppression-list events are not subscribed because they are outside this endpoint's release contract.

Verified events are normalized to sent, delivered, delayed, bounced, complained, failed, opened, or clicked. Matched outbox records receive provider-state metadata, a provider timestamp, explicit delivery confirmation, and terminal-failure state. Accepted provider lifecycle events preserve `sent_at`; delivery is shown independently from the constrained outbox status enum. Communication events retain provider message/event IDs. Bounce or complaint sets email suppression on the lead without converting requested-service permission into marketing permission.

The event route returns an idempotent success for duplicates. The Phase 7 suite covers valid signatures, invalid signatures, delivery metadata, delayed delivery, duplicate replay, complaint suppression, and bounce handling.

## Production acceptance — 2026-08-16

Resend webhook `d466d4d9-6837-49ae-9343-86c54c2bd720` is enabled on the canonical route with the exact eight-event allowlist above. The signing secret is Sensitive and Production-scoped in Vercel; it was never printed or committed. Deployment `dpl_5g43rkAatsVi3FHyarZf7Km1jZfG` returned HTTP 400 for an invalid signature, then accepted a correctly signed no-PII synthetic `email.sent` event and returned `duplicate=true` for exact replay. Neon Production contains one verified row for `msg_phase7_live_acceptance_1786914537362`, with only a payload hash and safe metadata. Because the synthetic provider message ID matched no notification, the row is intentionally `processing_status=ignored`. No email, lead, notification, BCC, SMS, Push notification, or consumer acknowledgment was created.
