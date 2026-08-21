# Owned-Demand Publication Proof Ledger QA Evidence

Date: 2026-08-21
Status: local database contract and full release gate passed; final exact-head CI and Preview pending; Production unchanged

## Scope and truth boundary

This evidence covers the additive ledger, its authenticated recording action,
database contract, cutover interlocks, and protected operator surface. It does
not claim that any GBP/social placement was published or that a genuine prospect
submitted a lead.

## Reuse and Production observation

- Canonical app: existing `brandonnarron1-lang/ask-magic-mike` repository and
  `eyes-up-industries/ask-magic-mike` Vercel project.
- Base: exact PR #183 head
  `e9fbc48ed436c74aa9ab178c426626230f8ddf9b`.
- Canonical database: Neon `bitter-star-20214385`, Production branch
  `br-round-base-auh6h2wd`, endpoint `ep-proud-bonus-autwv60g`, database
  `neondb`.
- Aggregate-only read at `2026-08-21T16:49:56.789167Z`: six total/test/suppressed
  leads, zero live/contactable leads, zero measured first responses, zero live
  queued/failed/sent notifications, zero outcomes/revenue, zero spend rows,
  zero experiments/opportunities/recommendations, and zero overdue routing.
- No lead identity, email, phone, address, message, consent text, credential, or
  other consumer PII was selected or retained.

## Focused automated verification

The current focused command is:

```text
pnpm exec vitest run \
  tests/scripts/phase9-publication-proof-production-cutover.test.ts \
  tests/adminops/owned-demand-publication-proof.test.ts \
  tests/adminops/owned-demand-publication-migration.test.ts \
  tests/adminops/owned-demand-publication-local-db.test.ts \
  tests/adminops/owned-demand-command.test.ts \
  tests/admin/rbac-policy.test.ts
```

Current result: PASS, 6 files / 51 tests.

Covered contracts include:

- canonical placement and UTM resolution;
- deterministic idempotency and raw-copy non-retention;
- channel/state/proof compatibility;
- HTTPS native-host allowlists and read-time URL revalidation;
- secret-like query, PII, unsupported-claim, placeholder, and Fair Housing
  rejection;
- non-test bounded reads;
- Preview fail-closed behavior before any query;
- parameterized, minimized RPC arguments;
- administrator/primary-owner-only `growth:manage` permission;
- fail-closed mutation denial when Lead Center RBAC is disabled, even if legacy
  Basic auth protects the read-only route;
- executable PostgreSQL 17 service-role, browser-role, RLS, idempotency, audit,
  native-host, UPDATE/DELETE immutability, rollback, and no-raw-copy contracts;
- exact migration hash, approval phrase, canonical preflight, backup/advisory
  lock/transaction, postflight, and secret redaction.

Additional completed checks:

- `pnpm run release:gate` — PASS at `2026-08-21T18:08Z`:
  system isolation, 14/14 release-safety controls, 200 test files / 2,825
  tests, strict typecheck, ESLint, Next.js 15.5.21 Production build, and 78
  active routes with 17 acknowledged root/src duplicates.
- `pnpm audit --prod --audit-level high` — PASS; no known vulnerabilities.
- `gitleaks detect --source . --redact --no-banner` — PASS; no leaks found
  across 465 commits and approximately 13.05 MB scanned.
- `git diff --check` — PASS.
- Production-render Playwright visual smoke — PASS, 10/10 desktop/mobile
  checks across `/home-value`, `/ask`, `/embed/ask`, `/widget-preview`, and
  protected `/admin/distribution`: HTTP 200, no horizontal overflow, no missing
  required copy, no prohibited claim, no bare-appraisal wording, and no browser
  console error. Local evidence is under
  `output/playwright/publication-ledger-production-local/` and intentionally
  ignored from Git.
- `pnpm run phase9:publication-proof:cutover -- --plan` — PASS; migration hash
  `c60c1a6e692d487e0adfd98d0eb3a9cff89ad77a3233b53075a4c8b63bde3ede`
  matched and output contained no connection string.
- Draft PR [#184](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/184)
  remains correctly stacked on PR #183. Pre-database-hardening head
  `cfc5a08967c48997b444e15b4e317cbacc0267f3` passed the complete Node 24
  release gate in GitHub run
  [32509835413](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32509835413).
- Its matching Vercel Preview `dpl_FPmHXBqKc1tWZpgHG1FK79aNhzs1` is Ready on
  Node 24 at
  `https://ask-magic-mike-o7kgzmrx3-eyes-up-industries.vercel.app`.
  Protection-bypassed read-only checks returned 200 for `/`, `/home-value`,
  `/buy`, `/rent`, `/api/health/live`, and `/api/health/ready`; the live health
  response identified `ask-magic-mike`, Preview, canonical Neon configuration,
  and disabled notification sending. Anonymous `/admin/distribution` returned
  401 with Basic challenge, `no-store`, `SAMEORIGIN`, and noindex headers.
  Root identity contained Ask Magic Mike and Our Town Properties markers and no
  NellySelly marker. The later database hardening intentionally supersedes this
  exact head, so fresh CI and Preview evidence are required after push.
- Docker Desktop was recovered with its own force-stop/start controls; no
  container or volume was deleted. A disposable local reset applied all 33
  migrations through `20260821170000`. The CLI returned a 502 only while
  restarting auxiliary services after the second reset; the database recovered
  healthy and the post-reset verifier passed.
- `pnpm run staging:local:verify` — PASS against PostgreSQL 17.6 with no remote
  Supabase link. The executable contract proved one proof plus one audit on the
  first call, same-proof/no-second-audit idempotent replay, native-host
  rejection, minimized test metadata, service-role least privilege,
  authenticated table denial, and hard UPDATE/DELETE rejection. The transaction
  rolled back; resulting proof/audit counts remained zero, with zero provider
  calls, emails, or SMS.
- The executable replay found two pre-Production defects and the candidate now
  fixes both: PostgreSQL canonical trigger ordering made a text-based postflight
  check false, and Supabase default privileges left `service_role` with excess
  UPDATE/DELETE/TRUNCATE/admin rights. Postflight now uses trigger event bits,
  and the migration revokes all service-role table rights before granting only
  SELECT and INSERT.
- The local Supabase PostgreSQL 17 image segfaulted on a redundant direct call
  to the revoked function after `SET ROLE authenticated`. That unstable probe
  was removed; function denial remains proven from the catalog ACL, while an
  actual authenticated table read still returns SQLSTATE `42501`. Production
  Neon was not used as a substitute test target.

## Security review

Applied the TypeScript/React/Next.js secure-by-default review. The first pass
found that a database URL value, although validated on write, would have been
trusted when rendered later. The implementation now independently revalidates
protocol, native host, embedded credentials, and sensitive query parameters on
read before React receives an `href`; an unsafe persisted value renders no
clickable link. Regression coverage proves the boundary.

The recording Server Action performs server-side authorization and runtime
validation. A final review closed a Basic-auth downgrade edge: the mutation
now redirects unless a real Lead Center principal with `growth:manage` is
present. React escaping is retained, outbound provider fetches are absent, all
SQL parameters are bound, errors are generic, the page is uncached, and no
secret or raw post body is logged or persisted.

## Visual review

The real-browser production render preserves the existing restrained Black
Diamond visual system, source/offer hierarchy, readable tracked links, mobile
stacking, keyboard-visible controls, and explicit authority boundary. The new
proof section separates prepared assets from recorded evidence and renders a
clear read-only state when the schema or mutation authority is unavailable.

An initial development-server pass produced intermittent Next.js HMR/compiler
500s on unrelated routes as well as the changed route. The same suite was
rerun against a fresh optimized Production build and passed 10/10; the failed
development run is not counted as release evidence.

## Remaining candidate proof

- after the database-hardening evidence commit, obtain a final green exact-head
  Node 24 CI run and Ready Vercel Preview;
- do not bypass authenticated Preview access merely to render mutation controls.
  The Preview fail-closed-before-query path is covered by unit tests; the real
  authenticated record flow remains post-migration Production verification.

During authenticated CLI verification, Vercel first auto-linked the worktree to
empty helper project `amm-phase9-publication-ledger-20260821`
(`prj_QcHch6KY1m2g0BKtOoVVFregRhho`) before the local link was corrected to the
canonical project. The helper has zero deployments, domains, or application
effect. It remains intact pending a separate exact cleanup approval.

No Production migration, merge, deployment, provider call, publication, send,
lead write, WordPress change, DNS change, spend, or NellySelly change occurred.
