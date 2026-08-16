# Resend provider-event integration

Canonical route: `POST /api/webhooks/email/events` in the root Next.js app.

The route reads the raw body, requires `svix-id`, `svix-timestamp`, and `svix-signature`, verifies with `RESEND_WEBHOOK_SECRET`, rejects invalid signatures before database work, hashes rather than stores the raw payload, and deduplicates by provider event ID.

The Production subscription is intentionally limited to `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, `email.opened`, and `email.clicked`. Resend's received, scheduled, suppressed, contact, domain, and suppression-list events are not subscribed because they are outside this endpoint's release contract.

Verified events are normalized to sent, delivered, delayed, bounced, complained, failed, opened, or clicked. Matched outbox records receive provider-state metadata, a provider timestamp, explicit delivery confirmation, and terminal-failure state. Accepted provider lifecycle events preserve `sent_at`; delivery is shown independently from the constrained outbox status enum. Communication events retain provider message/event IDs. Bounce or complaint sets email suppression on the lead without converting requested-service permission into marketing permission.

The event route returns an idempotent success for duplicates. The Phase 7 suite covers valid signatures, invalid signatures, delivery metadata, delayed delivery, duplicate replay, complaint suppression, and bounce handling.
