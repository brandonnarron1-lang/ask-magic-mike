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
- Short-lived phone setup invites and sessions use a distinct server-only HMAC
  key, explicit token kinds, bounded expiry, an HttpOnly Secure SameSite=Strict
  cookie, exact-origin and CSRF checks, rate limiting, strict schemas, and
  server-side `copy` role enforcement. The bearer invite is exchanged for a
  separate unpredictable session token and is never accepted directly as the
  setup cookie. Neither credential can access the Lead Center or register
  Mike's primary device.
- iPhone installation uses a private, token-scoped page and manifest so the
  installed Home Screen app—not Messages or an ordinary Safari tab—performs the
  claim exchange. A durable canonical-Neon one-time guard stores only an
  HMAC-pseudonymized nonce key, denies cross-context replay, and fails closed in
  Production when durability is unavailable. The token is not stored in browser
  storage, analytics, or the database and is removed from the URL after claim.
- Phone-install origins are a narrower exact Ask Magic Mike allowlist than the
  general public/widget allowlist. Our Town, NellySelly, arbitrary Vercel apps,
  and attacker-controlled subdomains cannot mint or host the privileged setup
  response. Private/no-store, no-referrer, noindex, a self-only resource CSP,
  frame denial, and a `/phone-alerts/`-restricted PWA scope cover the entire
  phone-alert route family.
- The admin invite UI relies on browser-managed Basic Auth and never receives
  `ADMIN_SECRET`. Its route repeats the Basic Auth check server-side, validates
  exact origin and input, and returns only a bounded copy-role claim URL. The
  client rejects cross-origin or malformed invite URLs and stores no token in
  localStorage/sessionStorage.
- Every `/admin/api` push/phone handler now repeats Basic Auth inside the route,
  in addition to the `/admin/:path*` middleware boundary. This prevents a future
  matcher or routing regression from silently exposing subscription metadata,
  registration/removal, test delivery, or invite creation. Push mutations also
  retain exact same-origin checks.
- Public appointment follow-up requests use a dedicated durable rate-limit
  bucket before request-body parsing or persistence. A throttled request returns
  HTTP 429 with a bounded `Retry-After` value and performs no appointment write.
  Read-only Preview rejects the request before even the rate-limit bucket can
  write, preserving the zero-mutation Preview boundary.

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

## Phase 9 privacy and KPI-trust hardening — 2026-08-22

- Durable abuse-control identifiers are domain-separated HMAC-SHA-256 values
  backed by a 32+ character server secret; raw caller keys are absent from SQL
  parameters and protected health exposes readiness as a boolean only.
- Both public analytics routes validate origin, content type, body size, event
  name, scalar schema, event-specific dimensions, safe paths, and coarse device
  class before asynchronous persistence.
- Browser callers cannot write trusted notification lifecycle events or attach
  arbitrary events to canonical lead/agent IDs. Trusted server writers retain
  the protected association after authorization.
- The Neon analytics repository repeats minimization at the final write boundary
  and drops provider message IDs, raw errors, uncontrolled reasons, IPs, click
  IDs, full URLs/referrers, and full user-agent strings.
- Growth delivery SQL is parameterized, aggregate-only, test/suppression
  excluded, and schema-detected. Missing optional delivery tables produce an
  unavailable state rather than fabricated zeroes or a broken command center.
