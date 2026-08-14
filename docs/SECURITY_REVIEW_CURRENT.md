# Current Security Review

Audit date: 2026-08-14. Scope: active Next.js root `app/`, shared server code,
Vercel configuration names, public routes, AdminOps boundary, and dependency
state. Secrets were neither printed nor copied into repository artifacts.

## AMM-SEC-001 — Shared admin credential

- Rule ID: `AMM-AUTH-IDENTITY-001`
- Severity: HIGH
- Location: `src/middleware.ts:4-45`; `src/lib/admin/auth.ts:36-71`
- Evidence: every AdminOps user authenticates with the same `ADMIN_SECRET` and
  the returned actor is the generic string `admin`.
- Impact: no individual revocation, least-privilege role, or reliable actor
  attribution for a private lead center containing consumer PII.
- Fix: replace shared Basic auth with server-side sessions tied to approved
  `super_admin`, `admin`, `agent`, `marketing`, and `viewer` identities; enforce
  row/assignment scope in server queries and record the user ID in audit events.
- Mitigation: production fails closed when the secret is absent/default; secret
  comparisons are timing-safe; middleware and handlers apply defense in depth;
  this branch adds no-store and `X-Frame-Options` on admin responses.
- False positive notes: Basic auth is real server-side protection, not
  client-side hiding, but it does not satisfy the target multi-user RBAC model.
- Status: BLOCKED — HUMAN ACTION (approved user roster and auth cutover).

## AMM-SEC-002 — Public page CSP not yet restrictive

- Rule ID: `AMM-HTTP-CSP-002`
- Severity: MEDIUM
- Location: `next.config.ts:3-47`, global header configuration
- Evidence: widget routes restrict `frame-ancestors`, but public pages do not
  set a `script-src`, `object-src`, or `base-uri` CSP.
- Impact: a future injection defect would have fewer browser-level constraints.
- Fix: deploy a nonce- or hash-based CSP in report-only mode, inventory Vercel,
  analytics, and widget needs, then enforce after zero-violation verification.
- Mitigation: React escaping, input validation, `nosniff`, strict referrer policy,
  exact widget origins, no browser secrets, and production dependency audit.
- False positive notes: CSP absence is hardening debt, not proof of XSS.
- Status: IMPLEMENTED — ACTIVATION REQUIRED (report-only rollout first).

## AMM-SEC-003 — Analytics event-name pollution

- Rule ID: `AMM-INPUT-ALLOWLIST-003`
- Severity: LOW
- Location: `app/api/events/route.ts:6-29`, `POST`
- Evidence: the prior handler accepted any syntactically valid snake-case event.
- Impact: an approved-origin browser could manufacture arbitrary event names and
  degrade source reporting, without creating a lead or contacting anyone.
- Fix: this branch restricts names to `app/lib/constants.ts` and adds route tests.
- Mitigation: durable rate limits, exact origin checks, and property sanitization
  already constrained volume and PII.
- False positive notes: this did not grant data access or execution.
- Status: COMPLETE — READY TO MERGE.

## AMM-SEC-004 — Legacy route/provider surface

- Rule ID: `AMM-MAINT-BOUNDARY-004`
- Severity: LOW
- Location: `src/app`; Supabase compatibility modules; SQL under the historical
  `supabase/migrations` directory
- Evidence: root `app/` is active, while preserved modules still use Supabase-era
  names and duplicate several routes.
- Impact: future engineers could patch the wrong tree or configure a competing
  store.
- Fix: retire modules only after route-by-route replacement and rollback review;
  keep release manifest and current-state reconciliation authoritative.
- Mitigation: build manifest recognizes duplicates; persistence selects Neon
  first; system-isolation and launch-doctor checks run before release.
- False positive notes: the directory name does not mean Supabase is production.
- Status: SUPERSEDED, retained for rollback/reference.

## AMM-SEC-005 — Admin caching/framing headers

- Rule ID: `AMM-HTTP-ADMIN-005`
- Severity: LOW
- Location: `src/middleware.ts:10-42`
- Evidence: prior success and failure responses did not consistently set
  no-store/frame controls.
- Impact: private pages could be cached by an intermediary or framed.
- Fix: this branch sets private/no-store and `X-Frame-Options: SAMEORIGIN`.
- Mitigation: authentication was already server-side.
- False positive notes: framework or hosting headers may also apply, but explicit
  route-boundary headers are safer.
- Status: COMPLETE — READY TO MERGE.

## Supply chain and secret result

- `pnpm audit --prod`: no known production vulnerabilities.
- Repository and history pattern scan: no verified secret; only safe placeholders.
- No secret value, BCC value, connection string, token, or private key appears in
  this report.

## Supply-chain refresh — 2026-08-14 11:42 EDT

The full dependency audit identified newly published issues in development-only
Vitest, Vite, form-data, js-yaml, and brace-expansion paths. The release now pins
patched compatible transitive versions and upgrades Vitest plus coverage support
from 2.1.9 to 3.2.6 with Vite 6.4.3. `pnpm audit --audit-level high` now reports
no known vulnerabilities. The complete 2,539-test suite, lint, typecheck, build,
route verification, release safety scan, and 13 Chromium end-to-end tests pass
with the updated toolchain.
