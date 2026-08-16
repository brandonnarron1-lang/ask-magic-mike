# SMS provider interface

Phase 7 keeps `SMS_PROVIDER=mock` and `ENABLE_SMS=false`. The interface accepts a normalized destination, purpose, versioned body, consent decision, idempotency key, and audit context, and returns provider/message status without exposing credentials.

Carrier delivery is intentionally absent. SMS previews display segment count and STOP/HELP language. Phone-number presence is never consent. Mike and Brandon phone activation remains deferred; this release neither texts nor registers a carrier sender.

The inbound interface accepts only a signed Twilio form callback when carrier mode is explicitly enabled, or a timing-safe admin-authenticated synthetic callback in mock mode. It records only normalized event metadata and a SHA-256 body hash. STOP/HELP/reply handling is canonical in Neon, not Supabase, and duplicate events are ignored by provider-event idempotency.
