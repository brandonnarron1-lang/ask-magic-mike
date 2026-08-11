# Security Audit — 2026-08-11

Scope: canonical rescue baseline, reuse-first hardening branch, and live
production behavior. The findings were audited read-only first; remediations
listed at the end are local candidate changes and have not been deployed.

## Critical/high findings

### SEC-01 — SLA cron reads the retired Supabase store (high)

- Evidence: `vercel.json` schedules `/api/admin/sla/sweep` hourly.
- Evidence: `src/app/api/admin/sla/sweep/route.ts:63-80` requires Supabase variables
  and constructs `createSupabaseSlaSweepRepo()`.
- Impact: Neon leads can miss SLA breach persistence and operational alerts while
  the UI implies the sweep exists.
- Remediation: implement a Neon repository for the existing `SlaSweepEngine`, add a
  production-safe dry run, and prove cron writes against a test lead before enabling
  persistence.

### SEC-02 — admin secret accepted in URL query (high)

- Evidence: `src/app/api/admin/health/route.ts:243-246` accepts `admin_secret` from
  `req.nextUrl.searchParams`.
- Impact: secrets can enter browser history, proxy/request logs, screenshots, and
  copied URLs.
- Remediation: remove query authentication, use the existing timing-safe header
  helper, rotate the shared secret after deployment, and verify logs contain no old
  query value.

### SEC-03 — shared Basic Auth is not the requested role boundary (high)

- Evidence: `src/middleware.ts:3-30` protects all dashboard users with one shared
  `ADMIN_SECRET` password and direct string comparison.
- Impact: no individual identity, role restriction, session revocation, inactivity
  timeout, or attributable admin audit actor.
- Remediation: retain the existing Lead Center UI but replace authentication with
  server-side per-user sessions and enforce role/assignment filters at the data
  boundary.

### SEC-04 — public AI endpoint can be abused (high)

- Evidence: `app/api/chat/route.ts:10-60` sends arbitrary-length public input to a
  paid provider without origin validation or rate limiting.
- Impact: cost exhaustion, latency, and abuse; the model copy guardrails do not
  control request volume.
- Remediation: apply the existing exact-origin helper and durable limiter, enforce
  JSON/body and message-size limits, add timeout/abort behavior, and record only
  PII-safe usage metrics.

### SEC-05 — vulnerable production dependency set (high)

- Evidence: `pnpm audit --prod` reported 17 advisories: 10 high and 7 moderate.
- Directly relevant findings include Next.js 15.5.20 (patched 15.5 line begins at
  15.5.21), `nanoid`, `postcss`, `sharp`, and `form-data` paths.
- Remediation: upgrade in a dedicated patch PR, retain Node 20 explicitly rather
  than `>=20`, run serial lint/test/build/typecheck, and preview-smoke all public and
  admin routes before production approval.

## Medium findings

### SEC-06 — stale Upstash production configuration (medium)

- Evidence: recent Vercel production errors on `/api/leads` and `/api/events` show
  failed Upstash DNS/URL calls and Neon fallback.
- Impact: latency, noisy alerts, and possible in-memory fail-open behavior when Neon
  also fails.
- Remediation: verify `rate_limit_buckets`, then remove stale Upstash variables so
  Neon is the intentional primary free store. Add a health assertion that reports
  the limiter backend without exposing credentials.

### SEC-07 — incomplete browser security policy (medium)

- Evidence: `next.config.ts:3-46` sets nosniff/referrer/permissions headers, but a
  CSP is limited to widget/embed `frame-ancestors`; ordinary public/admin pages have
  no general CSP or explicit anti-framing policy.
- Remediation: introduce a tested CSP for non-widget pages and deny framing there;
  preserve the exact Our Town allowlist only on versioned widget/embed routes.

### SEC-08 — legacy WordPress intake is an unsigned competing boundary (medium)

- Evidence: authenticated plugin inspection found local `wp_amm_leads`, a public
  REST intake, immediate `wp_mail`, and an unsigned optional webhook without durable
  retry or canonical idempotency.
- Impact: spoofed forwards, duplicate leads/emails, and inconsistent audit history.
- Remediation: leave it intact during shadow mode, then replace forwarding with a
  signed, timestamped, replay-resistant bridge and reconcile existing records.

### SEC-09 — consent evidence is incomplete in Gravity Forms (medium)

- Evidence: none of forms 1–7 contains a Gravity Forms Consent field.
- Impact: communication permission cannot be reconstructed as exact language,
  version, and timestamp for canonical acknowledgment/SMS decisions.
- Remediation: add approved, versioned consent fields per form; map exact text and
  entry timestamp; keep transactional request handling separate from marketing.

### SEC-10 — stale analytics logger can expose properties (medium)

- Evidence: `src/lib/analytics/ledger.ts:22-52` still writes to Supabase when stale
  variables exist and logs arbitrary `params.properties` when they do not. Tests
  observed an unexpected Supabase-client error.
- Impact: events can be dropped or PII can enter logs if callers pass unsafe data.
- Remediation: route all server analytics through the current Neon-safe sanitizer,
  enforce property allowlists, and remove this stale logger after reference audit.

## Low/operational findings

- `src/lib/crm/null-adapter.ts:18-50` logs email/phone in a fallback adapter. Remove
  PII logging before enabling that adapter in any production path.
- Query Monitor is active on the production WordPress site, increasing overhead and
  potentially exposing diagnostic detail to privileged sessions.
- WordPress has pending security/maintenance updates and inactive AMM plugin variants;
  patch/archive only after backup and compatibility testing.
- AskMagicMike.com has no detectable GA/GTM tag and no observed DMARC record at the
  apex. Transactional mail is correctly documented on the aligned notify subdomain;
  do not move sending to the apex without a separate DNS review.

## Positive controls observed

- Public lead storage precedes notification and uses canonical idempotency.
- Neon queries inspected use parameter binding.
- Admin API routes generally use timing-safe header authentication.
- Widget parent origins and `postMessage` origins use exact allowlists.
- Public analytics properties are sanitized on the current `/api/events` route.
- No `eval`/`new Function` use was found; local storage contains session identifiers,
  not dashboard authentication tokens.
- Full-history gitleaks review found only a QA UUID and deliberate fake-secret test
  fixtures; no live credential was identified.
- Release safety scan passed 14/14 and unauthenticated admin routes return 401.

## Verification evidence

- `pnpm audit --prod`: 17 advisories (10 high, 7 moderate, 0 critical).
- `pnpm lint`: pass.
- `pnpm test`: 130 files / 2,473 tests pass; warnings exposed stale Supabase and
  analytics behavior documented above.
- `pnpm build`: pass; 43 active routes and 13 acknowledged root/src duplicates.
- `pnpm typecheck`: pass when run after build.
- `pnpm release:safety`: 14 pass / 0 fail.
- `node scripts/amm/lead-pipe-health-check.mjs`: live route/health checks pass.

## Remediation update — reuse-first hardening branch

- SEC-01 resolved in code: SLA sweep now uses the canonical Neon repository and
  existing engine/function contract.
- SEC-02 resolved in code: admin health accepts header/Bearer credentials only;
  secret query parameters were removed.
- SEC-03 partially mitigated: middleware comparison is Edge-safe and digest-based;
  shared Basic Auth still requires per-user session/RBAC replacement before
  high-traffic Agent Hub use.
- SEC-04 resolved in code: public chat has exact-origin enforcement, bounded input,
  durable rate limiting, timeout, and no-store handling.
- SEC-05 resolved: patched dependency set; production audit reports zero known
  vulnerabilities.
- SEC-06 resolved in code: rate limiting is Neon-first with no Upstash dependency.
- SEC-08 resolved as a disabled candidate: timestamped HMAC Gravity Forms bridge,
  explicit form allowlist, deterministic idempotency, and bounded retry. Activation
  and staging proof remain gated.
- SEC-10 resolved in code: all active server event writers use one sanitized Neon
  repository and do not log arbitrary properties or raw IP.
- Full-history gitleaks: 319 commits, no leaks after review/allowlisting of three
  documented security-test fixture false positives.
# Addendum: Ask Magic Mike / NellySelly isolation

## Finding ISO-001

- Rule ID: NEXT-ENV-001 / system boundary
- Severity: High (resolved)
- Location: `app/lib/persistence/neonPushSubscriptionRepository.ts`, schema readiness
- Evidence: the runtime repository previously issued `CREATE TABLE`, `ALTER
  TABLE`, `CREATE POLICY`, and `CREATE INDEX` while handling an authenticated
  request. Production correctly rejected this with `permission denied for
  schema public`.
- Impact: request-time DDL violated least privilege and could modify whichever
  database a deployment was accidentally configured to use.
- Fix: runtime now performs only a read-only `to_regclass` readiness probe;
  schema changes remain in the reviewed migration.
- Mitigation: the production database role retains no schema-create privilege.
- False-positive notes: none; the production error and source path matched.

## Finding ISO-002

- Rule ID: deployment/data isolation
- Severity: High (preventive control added)
- Location: `.vercel/project.json`, `scripts/amm/verify-system-isolation.mjs`,
  `package.json`
- Evidence: Ask Magic Mike is linked to Vercel project
  `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`; deployable code contains no NellySelly
  identifiers; the production deployment aliases only Ask Magic Mike domains.
- Impact: a future wrong-project link or cross-product identifier could route a
  build, domain, or integration toward the wrong product.
- Fix: the release gate now validates the exact Vercel team/project and rejects
  known NellySelly identifiers from deployable code/configuration.
- Mitigation: separate Neon organizations/projects and operator rules are
  recorded in `docs/SYSTEM_ISOLATION.md`.
- False-positive notes: documentation is intentionally excluded so historical
  conflicts and isolation decisions remain auditable.
