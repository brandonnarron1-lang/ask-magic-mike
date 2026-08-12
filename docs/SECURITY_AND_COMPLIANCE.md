# Security and Compliance

## Controls in the canonical implementation

- Server-side validation and bounded field lengths for public lead payloads.
- Honeypot, origin checks, durable rate limiting through canonical Neon PostgreSQL, and
  safe in-memory fallback only for local/degraded acknowledgement.
- Supabase service-role/database code remains server-only; public routes never
  return provider/database errors.
- Admin routes are server-protected and API mutations use constant-time secret
  comparison. Current MVP auth is shared Basic Auth, not per-user RBAC.
- Append-only consent and audit records; no raw IP in logs, with a hash/minimization
  policy for legal review.
- Email/SMS suppression, unsubscribe handling, test-lead exclusion, idempotency,
  provider retries, and safe error summaries.
- Internal SMS destination numbers are deployment secrets. Outbox rows retain
  only recipient roles; SMS bodies omit consumer contact details, full
  addresses, free text, and click IDs. Twilio delivery callbacks require
  signature verification.
- Security headers and exact iframe `frame-ancestors` allowlist.
- No protected-class fields or proxies in scoring, routing, targeting, or public
  recommendations; no private MLS fields are exposed.
- Short-lived phone setup sessions use a distinct server-only HMAC key, bounded
  expiry, an HttpOnly Secure SameSite=Strict cookie, exact-origin and CSRF
  checks, rate limiting, strict schemas, and server-side `copy` role enforcement.
  They cannot access the Lead Center or register Mike's primary device.
- The admin invite UI relies on browser-managed Basic Auth and never receives
  `ADMIN_SECRET`. Its route repeats the Basic Auth check server-side, validates
  exact origin and input, and returns only a bounded copy-role claim URL. The
  client rejects cross-origin or malformed invite URLs and stores no token in
  localStorage/sessionStorage.

## Required human/legal review

The brokerage/BIC should approve consent language/version, retention/deletion,
TCPA/email practices, Equal Housing language, sender identity, and any direct-
purchase or valuation copy. Product language stays conditional and human-reviewed:
broker-reviewed local guidance, not an appraisal, no fabricated availability or
guaranteed result.

## Known findings

1. Current AdminOps uses a shared Basic Auth secret. It is protected server-side,
   but per-user role/session controls remain before claiming full role-based access.
2. The legacy root route had `postMessage('*')` paths and PII-rich PostHog fields;
   the consolidation narrows message targets and analytics properties.
3. The full development dependency audit reports advisories in the Vitest/Vite,
   jsdom, and ESLint toolchain. Production dependencies have no known audit
   findings; the toolchain upgrade should be handled in an isolated follow-up.
