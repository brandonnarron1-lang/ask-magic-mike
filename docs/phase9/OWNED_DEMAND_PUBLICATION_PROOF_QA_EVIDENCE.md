# Owned-Demand Publication Proof Ledger QA Evidence

Date: 2026-08-21
Status: local release gate passed; exact-head CI and Preview pending; Production unchanged

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
  tests/adminops/owned-demand-command.test.ts \
  tests/admin/rbac-policy.test.ts
```

Current result: PASS, 5 files / 47 tests.

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
- RLS, public/browser-role revocation, UPDATE/DELETE immutability, audit event,
  and no raw-copy database column;
- exact migration hash, approval phrase, canonical preflight, backup/advisory
  lock/transaction, postflight, and secret redaction.

Additional completed checks:

- `pnpm run release:gate` — PASS at `2026-08-21T17:30:40Z`:
  system isolation, 14/14 release-safety controls, 199 test files / 2,821
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
  `e7dfe015e36c097effb77994c1a40f80f48625d521111f297f498610dfccea0d`
  matched and output contained no connection string.
- A fresh local Supabase startup replay applied the complete historical
  migration chain through `20260821170000` without SQL error. Docker Desktop
  then failed during remaining one-time service startup. A restart at
  `2026-08-21T17:30Z` still could not expose the local daemon, and no standalone
  PostgreSQL server binary is installed, so the final role/immutability/
  idempotency replay is not counted as passed in this candidate. Production
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

- complete PostgreSQL role/immutability/idempotency replay after the local
  Docker engine is healthy;
- create an exact-head stacked draft PR and obtain green Node 24 CI;
- deploy a Preview and verify public routes, anonymous admin denial, read-only
  Preview mutation behavior, and desktop/mobile authenticated rendering.

No Production migration, merge, deployment, provider call, publication, send,
lead write, WordPress change, DNS change, spend, or NellySelly change occurred.
