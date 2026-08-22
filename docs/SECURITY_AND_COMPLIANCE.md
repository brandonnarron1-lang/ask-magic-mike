# Security and Compliance

## Controls in the canonical implementation

- Server-side validation and bounded field lengths for public lead payloads.
- Honeypot, origin checks, durable rate limiting through canonical Neon
  PostgreSQL, and safe in-memory fallback only for local/degraded
  acknowledgement. Durable bucket identifiers are domain-separated HMACs; raw
  IPs and staff principals are not stored, and stale buckets expire after 24
  hours.
- Canonical Neon database credentials and compatibility adapters remain
  server-only; public routes never return provider/database errors.
- The Lead Center uses per-user Better Auth sessions and server-side RBAC.
  Sensitive mutations recheck permissions and assigned-lead scope. A small set
  of reviewed operational/cron or legacy compatibility endpoints retains
  timing-safe `ADMIN_SECRET`/`CRON_SECRET` authorization; those secrets are not
  ordinary staff login credentials and never belong in URLs.
- Append-only consent and audit records; no raw IP in logs or durable limiter
  storage, with a hash/minimization policy for legal review.
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
- Phone setup response origins are restricted to the owned Ask Magic Mike
  Production hosts, exact Vercel Preview deployment/branch metadata, or local
  development. Our Town, NellySelly, arbitrary `*.vercel.app` hosts, malformed
  Preview metadata, and unsafe configured fallbacks are rejected.
- The setup URL is a short-lived bearer capability and is not described as
  durably single-use. Admin/install UI warns that anyone holding an unexpired
  link could register a copy device; it must be shared only with Brandon.
- The phone invite route never returns `ADMIN_SECRET`, validates exact origin
  and bounded copy-role input, and returns only a short-lived claim URL. The
  client rejects cross-origin or malformed invite URLs and stores no token in
  localStorage/sessionStorage.
- Push/phone API handlers repeat authorization inside each route in addition to
  the outer admin boundary. This prevents a future matcher or routing
  regression from silently exposing subscription metadata,
  registration/removal, test delivery, or invite creation. Push mutations also
  retain exact same-origin checks.
- Public appointment follow-up requests use a dedicated durable rate-limit
  bucket before request-body parsing or persistence. A throttled request returns
  HTTP 429 with a bounded `Retry-After` value and performs no appointment write.
  Read-only Preview rejects the request before even the rate-limit bucket can
  write, preserving the zero-mutation Preview boundary.
- Both public analytics compatibility routes use exact origin checks, 4 KiB
  bounded JSON, scalar-only schemas, public-event/property allowlists, and
  value-level contact/secret rejection. Request IP stays inside the rate-limit
  decision; durable analytics receives only a coarse browser/automation device
  class. The Neon repository repeats property, UTM, path, and user-agent
  minimization before every write.

## Required human/legal review

The brokerage/BIC should approve consent language/version, retention/deletion,
TCPA/email practices, Equal Housing language, sender identity, and any direct-
purchase or valuation copy. Product language stays conditional and human-reviewed:
broker-reviewed local guidance, not an appraisal, no fabricated availability or
guaranteed result.

## Security best-practices review — 2026-08-21

Primary stack reviewed: TypeScript, Next.js 15.5.21 App Router, React, Vercel,
and Neon PostgreSQL. The focused review covered the changed server/client
boundary, secret exposure, runtime validation, SQL parameterization, health
output, logs, durable abuse controls, route imports, HMAC strength, retention,
and the documented reverse-proxy assumption.

### AMM-RL-001 — resolved

- Rule: `NEXT-LOG-001` / privacy minimization.
- Severity: Medium before the fix; resolved in the candidate.
- Location: `src/lib/security/rate-limit.ts`, durable Neon bucket construction.
- Evidence: the former identifier interpolated the raw limiter key as
  `<prefix>:<key>`, so a client IP or staff principal could remain in an
  operational table.
- Impact: an unnecessary durable pseudonymous identifier increased privacy and
  incident-response exposure even though it was not returned publicly.
- Fix: store only a versioned, domain-separated `HMAC-SHA-256` digest using a
  server-only secret of at least 32 characters; prune stale buckets after 24
  hours; expose only a protected boolean readiness flag.
- Verification: a mocked Neon tagged-template test proves neither the raw key
  nor secret enters the SQL parameter list. Release safety scanned 548 files for
  client secret reads; full tests, typecheck, lint, optimized build, route
  manifest, isolation, and Production dependency audit pass.
- Residual: a Neon/secret outage deliberately fails open to per-process memory
  to preserve funnel availability and emits a critical log. Vercel WAF remains
  optional defense in depth. A future reverse proxy must revalidate client-IP
  header trust before cutover.

### AMM-AN-001 — resolved in the analytics privacy candidate

- Rule: `NEXT-INPUT-001`, `NEXT-LOG-001`, and data-minimization boundary.
- Severity: Medium before the fix; resolved for new writes in the candidate.
- Location: `app/api/events/route.ts`, `src/app/api/analytics/event/route.ts`,
  `app/lib/analytics.ts`, and
  `src/lib/persistence/neon/analytics-event-repository.ts`.
- Evidence: the prior public contracts accepted arbitrary `properties` and the
  final repository filtered only PII-shaped key names. A contact value hidden
  under an innocent key could therefore persist, while one compatibility route
  forwarded raw user-agent data and client analytics copied full attribution to
  browser integrations.
- Fix: one shared fail-closed contract now enforces approved event/property
  pairs, scalar/body/field bounds, sensitive-value rejection, known public
  paths, sanitized UTM dimensions, internal-event exclusion, coarse user-agent
  classification, and final-write defense in depth. Client DOM/dataLayer/
  PostHog/postMessage payloads use the same minimized fields.
- Verification: focused tests prove disguised email/phone values, arbitrary
  keys, nested properties, oversized bodies, foreign origins, internal-event
  spoofing, raw IP forwarding, raw user agents, and sensitive client attribution
  do not cross the analytics boundary. Existing funnel, widget, UTM, review
  planner, and Core Web Vitals dimensions remain available.
- Residual: no code can detect intentionally encoded covert data in every
  machine-token field. Strict key/value grammar, value-level detectors, route
  normalization, small bounds, and server/repository repetition materially
  constrain that risk. Historical Production rows were not read or rewritten.

No additional Critical or High issue was confirmed in the touched path. The
rate-limit module is imported only by server routes/actions and the protected
health route; no Client Component imports it or reads the new server-only
variable. Existing structured-data HTML sinks are outside this change and use
static/serialized schema data; no attacker-controlled flow was established in
this review.

## Known findings

1. Reviewed secret-gated compatibility endpoints still exist beside the
   per-user RBAC Lead Center. New ordinary staff workflows must use RBAC; each
   remaining compatibility endpoint should migrate only when its caller and
   rollback path are proven.
2. The repository retains acknowledged root/`src` route duplicates. Release
   safety scans both deployable trees so a stale compatibility route cannot
   silently weaken current CORS, messaging, auth, or PII controls.
3. The full development dependency audit reports advisories in the Vitest/Vite,
   jsdom, and ESLint toolchain. Production dependencies have no known audit
   findings; the toolchain upgrade should be handled in an isolated follow-up.

## Privileged-route hardening verification — 2026-08-14

- All three active `/admin/api` route handlers contain route-level Basic Auth;
  middleware remains the first boundary.
- All three active `/api/admin` handlers require admin or cron authorization;
  preview persistence remains fail-closed.
- New regression tests cover unauthorized subscription list/register/remove,
  unauthorized push test, sensitive endpoint omission, same-origin mutation,
  appointment throttling, and allowed appointment pass-through.
- Full verification passed: 148 Vitest files / 2,538 tests, strict typecheck,
  lint, production build, 54-route manifest, 14/14 release safety checks, 13/13
  Playwright tests, production dependency audit, whitespace check, and a
  315-commit redacted gitleaks scan.
