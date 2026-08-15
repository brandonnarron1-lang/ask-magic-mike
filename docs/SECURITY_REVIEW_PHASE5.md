# Security Review — Phase 5

This was a repository-grounded security review and production configuration
check, not a penetration test.

## Result

No critical or high-severity finding remains in the Phase 5 release candidate.
Git-history secret scanning found zero leaks, the production dependency audit
found no known vulnerabilities, and public HTML scans found no secret or
confidential MLS marker.

## Controls verified

- Production fails closed when the canonical database, identity service, or
  administrative secret is not configured.
- Lead Center permissions are enforced server-side; a cookie-presence check in
  middleware is followed by full session and role checks on pages, actions, and
  routes.
- Better Auth disables public signup, requires 14-character passwords, limits
  sign-in and reset attempts, revokes sessions after password reset, uses secure
  production cookies, and limits the session lifetime.
- Lead Center mutation actions bind the principal to the target lead and apply
  least-privilege permission checks before database changes.
- Widget `postMessage` calls use an exact approved-origin result and never `*`.
- Public API origins are allowlisted in production; local origins are allowed
  only outside production.
- Browser storage contains a public intake-session identifier and expiry only,
  not an administrative credential or authorization token.
- JSON-LD `dangerouslySetInnerHTML` values are static application-owned objects,
  not consumer-controlled strings.
- Public forms retain validation, honeypot, rate-limit, idempotency, consent,
  attribution, and durable-storage-before-notification controls.
- The canonical Ask Magic Mike project contains no deployable NellySelly project
  identifier and remains isolated from legacy deployments.

## Phase 5 correction

Private Lead Center, login, password-help, and password-set pages now receive:

- `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`
- `Content-Security-Policy: frame-ancestors 'self'`
- `X-Frame-Options: SAMEORIGIN`
- `X-Robots-Tag: noindex, nofollow, noarchive`

This closes the pre-release framing/indexing gap without changing the widget
allowlist or applying a risky site-wide CSP during stabilization. Automated
regression coverage is in `tests/admin/rbac-security-headers.test.ts`.

## Residual risks and holds

1. Facebook's crawler is blocked by the Our Town hosting WAF on two exact public
   GET/HEAD paths. No broad bypass was applied. The exact hosting action is in
   `META_CRAWLER_HOSTING_OPERATOR_ACTION.md`.
2. Legacy Supabase adapters remain for historical compatibility tests, but the
   production Neon-only boundary and system-isolation tests pass. Supabase must
   not be restored as the production runtime.
3. Web Push has zero enrolled devices because browser permission is a physical
   user action. Carrier SMS remains disabled.
4. `hub.ourtownproperties.com` intentionally has no DNS record because `/admin`
   is the approved canonical Lead Center; this is not an authentication gap.

## Evidence

- `pnpm test`: 2,579 passed.
- `pnpm test:e2e`: 13 passed.
- `pnpm release:safety`: 14 passed.
- `pnpm amm:verify:isolation`: passed.
- `pnpm audit --prod --audit-level high`: no known vulnerabilities.
- `gitleaks git --redact --no-banner`: 349 commits, zero findings.
- Six-hour production review: zero error logs, zero warning logs, zero
  PostgreSQL TLS-warning matches.
