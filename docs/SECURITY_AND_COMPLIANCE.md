# Security and Compliance

## Controls in the canonical implementation

- Server-side validation and bounded field lengths for public lead payloads.
- Honeypot, origin checks, durable rate limiting through canonical Neon PostgreSQL, and
  safe in-memory fallback only for local/degraded acknowledgement.
- Supabase service-role/database code remains server-only; public routes never
  return provider/database errors.
- Admin routes use server-validated per-user RBAC when enabled; the shared Basic
  Auth path remains a fail-closed pre-RBAC fallback. API secret comparisons are
  constant-time.
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
  Production when durability is unavailable. Vercel Production is authoritative
  when its runtime metadata exists; otherwise owned/self-hosted
  `NODE_ENV=production` receives the same fail-closed treatment. The token is
  not stored in browser storage, analytics, or the database and is removed from
  the URL after claim.
- Phone-install origins are a narrower exact Ask Magic Mike allowlist than the
  general public/widget allowlist. Our Town, NellySelly, arbitrary Vercel apps,
  and attacker-controlled subdomains cannot mint or host the privileged setup
  response. Private/no-store, no-referrer, noindex, a self-only resource CSP,
  frame denial, and a `/phone-alerts/`-restricted PWA scope cover the entire
  phone-alert route family.
- The admin invite UI relies on the browser-managed RBAC session, or the
  fail-closed Basic Auth fallback, and never receives `ADMIN_SECRET`. Its route
  repeats the applicable authorization server-side, validates exact origin and
  input, and returns only a bounded copy-role claim URL. The client rejects
  cross-origin or malformed invite URLs and stores no token in
  localStorage/sessionStorage.
- Every `/admin/api` push/phone handler repeats route-level authorization in
  addition to the `/admin/:path*` middleware boundary. This prevents a future
  matcher or routing regression from silently exposing subscription metadata,
  registration/removal, test delivery, or invite creation. Push mutations also
  retain exact same-origin checks.
- In RBAC mode, the legacy secret-header phone-invite endpoint is disabled, so
  only a Lead Center operator with `notification:manage` can mint a link. The
  scoped copy repository rejects conflicts with existing Mike/primary
  endpoints, and the optional setup QA Push fails closed unless its one-shot
  guard is durable in Production.
- Public appointment follow-up requests use a dedicated durable rate-limit
  bucket before request-body parsing or persistence. A throttled request returns
  HTTP 429 with a bounded `Retry-After` value and performs no appointment write.
  Read-only Preview rejects the request before even the rate-limit bucket can
  write, preserving the zero-mutation Preview boundary.

## WordPress activation-manifest boundary — 2026-08-22

- The new endpoint is GET-only, force-dynamic, and protected server-side by
  Lead Center `report:view`; the Distribution UI link is convenience, not the
  authorization boundary.
- The route parameter is runtime-checked against three exact placement keys.
  No request URL, query parameter, header, cookie, page content, or page-index
  value can select the outbound destination.
- Server-side fetches use fixed exact HTTPS Our Town hosts, reject credentials
  and nonstandard ports, revalidate every redirect hop, limit redirects,
  enforce content type and response size, and use a bounded timeout. Unsafe,
  insecure, or lookalike AskMagicMike links make the manifest fail closed.
- Public WordPress index rows are runtime-validated and minimized before use;
  TypeScript types are not treated as validation. Duplicate/missing page rows,
  page-ID drift, duplicate hrefs, malformed JSON, and fetch failures cannot
  produce a ready state.
- Responses are private/no-store JSON attachments with `nosniff`, same-origin
  resource policy, no referrer, no indexing, and a deny-all sandbox CSP. They
  contain no raw HTML, cookies, request headers, environment values, lead data,
  database data, or form values.
- Every manifest emits `publicationAuthorized=false`,
  `approvalRequired=true`, and `mutationPerformed=false`. A future write must
  independently require a fresh SHA-256 precondition, recoverable WordPress
  revision/backup, and the exact page-specific owner gate.
- Security review found no state-changing verb, SQL/file/subprocess sink,
  arbitrary URL fetch, redirect, CORS relaxation, browser-storage credential,
  raw HTML render, provider send, or secret exposure in the candidate.

## Required human/legal review

The brokerage/BIC should approve consent language/version, retention/deletion,
TCPA/email practices, Equal Housing language, sender identity, and any direct-
purchase or valuation copy. Product language stays conditional and human-reviewed:
broker-reviewed local guidance, not an appraisal, no fabricated availability or
guaranteed result.

## Known findings

1. Per-user Lead Center RBAC is the active target boundary; a fail-closed shared
   Basic Auth path remains for rollback/pre-RBAC operation. Mike's dormant
   account still requires his own activation and role-scope acceptance.
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
  class before awaited canonical persistence. HTTP 202 means the Neon write
  succeeded; an unavailable write fails truthfully with HTTP 503.
- Public UTM and placement dimensions accept only a registered operational
  vocabulary. Slug shape alone is not trusted, so unregistered single-token
  names/address slugs are discarded and dynamic open-house IDs reduce to a
  generic placement class. Every JSON-LD script surface uses a shared serializer
  that escapes script-closing input.
- Browser callers cannot write trusted notification lifecycle events or attach
  arbitrary events to canonical lead/agent IDs. Trusted server writers retain
  the protected association after authorization.
- The Neon analytics repository repeats minimization at the final write boundary
  and drops provider message IDs, raw errors, uncontrolled reasons, IPs, click
  IDs, full URLs/referrers, and full user-agent strings.
- Growth delivery SQL is parameterized, aggregate-only, test/suppression
  excluded, and schema-detected. Missing optional delivery tables produce an
  unavailable state rather than fabricated zeroes or a broken command center.
- Current public responses retain HSTS, `nosniff`, referrer, permissions, and
  frame controls, while protected admin responses also retain private/no-store,
  noindex, same-origin framing, and server authorization. A complete
  nonce/hash-based public `script-src` CSP remains a defense-in-depth follow-up
  requiring a dedicated compatibility pass across the established funnel.
