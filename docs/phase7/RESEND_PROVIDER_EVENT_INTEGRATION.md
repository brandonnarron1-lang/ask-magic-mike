# Resend provider-event integration

Canonical route: `POST /api/webhooks/email/events` in the root Next.js app.

The route reads the raw body, requires `svix-id`, `svix-timestamp`, and `svix-signature`, verifies with `RESEND_WEBHOOK_SECRET`, rejects invalid signatures before database work, hashes rather than stores the raw payload, and deduplicates by provider event ID.

Verified events are normalized to sent, delivered, delayed, bounced, complained, failed, opened, clicked, suppressed, or unknown; matched outbox records receive provider state metadata and terminal failures become visible. Communication events retain provider message/event IDs. Bounce, complaint, or provider suppression sets email suppression on the lead without converting requested-service permission into marketing permission.

The event route returns an idempotent success for duplicates. The Phase 7 suite covers valid signatures, invalid signatures, event linking, and complaint suppression.

