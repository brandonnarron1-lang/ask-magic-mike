# Owned-Demand Publication Proof Ledger QA Evidence

Date: 2026-08-22
Status: Production migration and independent postflight passed; exact-head application release tracked on PR #184

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

- `pnpm run release:gate` — PASS after the operating-truth/tooling
  reconciliation at `2026-08-21T18:32Z`: system isolation, 14/14
  release-safety controls, 200 test files / 2,828
  tests, strict typecheck, ESLint, Next.js 15.5.21 Production build, and 78
  active routes with 17 acknowledged root/src duplicates.
- `pnpm run amm:launch:doctor` — PASS with 25 code/document checks, zero
  failures, and 17 authenticated-host environment verifications intentionally
  skipped because Production secrets are not loaded locally.
- `pnpm run amm:launch:authority` — zero code/document failures; external
  environment verification remains owner-scoped. The current scanner checks PR
  #181, canonical Neon/Better-Auth/Resend/Web-Push names, both deployable app
  trees, and does not mistake an ordinary readiness matrix for MLS data.
- Focused launch-scanner tests — PASS, 2 files / 82 tests.
- `pnpm audit --prod --audit-level high` — PASS; no known vulnerabilities.
- `gitleaks detect --source . --redact --no-banner` — PASS; no leaks found
  in the redacted full-history scan.
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
  remains correctly stacked on PR #183. Code-bearing database-hardening head
  `755cf686fccea3facd0071aebbdd24734e818ccd` passed the complete Node 24
  release gate in GitHub run
  [32512057769](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32512057769).
- Its matching Vercel Preview `dpl_4JxCp1UxebTPof1fvK55NTrrnHqY` is Ready on
  Node 24 at
  `https://ask-magic-mike-28htaxkie-eyes-up-industries.vercel.app`.
  Protection-bypassed read-only checks returned 200 for `/`, `/home-value`,
  `/buy`, `/rent`, `/api/health/live`, and `/api/health/ready`; the live health
  response identified `ask-magic-mike`, Preview, canonical Neon configuration,
  and disabled notification sending. Anonymous `/admin/distribution` returned
  401 with Basic challenge, `no-store`, `SAMEORIGIN`, and noindex headers.
  Root identity contained Ask Magic Mike and Our Town Properties markers and no
  NellySelly marker. The final documentation/tooling head must retain the same
  required GitHub/Vercel checks; those mutable exact-head identifiers belong in
  PR metadata rather than a self-referential evidence commit.
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

## Application release proof

- immediately before merge, verify PR #184's current immutable head has a
  green Node 24 release gate and matching Ready Vercel Preview;
- do not bypass authenticated Preview access merely to render mutation controls.
  The Preview fail-closed-before-query path is covered by unit tests; no
  publication proof is fabricated merely to exercise the Production control.

During authenticated CLI verification, Vercel first auto-linked the worktree to
empty helper project `amm-phase9-publication-ledger-20260821`
(`prj_QcHch6KY1m2g0BKtOoVVFregRhho`) before the local link was corrected to the
canonical project. The helper has zero deployments, domains, or application
effect. It remains intact pending a separate exact cleanup approval.

No provider call, publication, send, lead write, WordPress change, DNS change,
spend, or NellySelly change occurred.

## Production migration evidence — 2026-08-22

- Exact target: Neon project `bitter-star-20214385`, Production branch
  `br-round-base-auh6h2wd`, unpooled primary endpoint
  `ep-proud-bonus-autwv60g`, database `neondb`, owner `neondb_owner`, TLS.
- Exact migration: `20260821170000`, SHA-256
  `c60c1a6e692d487e0adfd98d0eb3a9cff89ad77a3233b53075a4c8b63bde3ede`.
- Initial preflight: six leads, nine audit rows, zero proof rows, target objects
  absent, target migration count zero, and all prerequisite/role checks true.
- First guarded attempt: backup `3f4ca5b0e6720e87db5894a363a5c836722161469d4b89e8a02d01e8f267dce9`
  (351,600 bytes; 646 restore entries) validated; verifier rejected a brittle
  PostgreSQL 18 escaped-catalog comparison and the transaction rolled back.
- Rollback proof: target table/function/migration remained absent and both the
  lead and audit counts/digests remained identical.
- Regression: six focused files / 54 tests passed; a rollback-only Production
  diagnostic proved the semantic constraint markers against the actual
  PostgreSQL 18 catalog; full local gate passed 200 files / 2,831 tests,
  typecheck, lint, optimized build, 78-route manifest, 14/14 safety, and system
  isolation.
- Successful guarded attempt: second validated backup
  `3bcb03718855523e4ebbc634556a1ce8e716a73680ae3743fe2301a71aa40f88`
  (351,600 bytes; 646 restore entries); migration committed once.
- Independent read-only verify: table owner/RLS, immutable UPDATE/DELETE
  trigger, three indexes, attribution/state/evidence/hash constraints,
  `SECURITY INVOKER` function with locked search path, idempotency, audit code,
  service-role SELECT/INSERT/function-only rights, browser/public denial, and
  migration count one all passed.
- Data invariants: six leads and nine pre-existing audit rows retained identical
  digests; zero proof rows were seeded. No lead, message, provider call,
  publication, WordPress/DNS change, spend, or NellySelly action occurred.
