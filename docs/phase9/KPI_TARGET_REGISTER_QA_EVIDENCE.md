# Phase 9 KPI Target Register QA Evidence

Date: 2026-08-21
Status: local acceptance complete; Draft PR #187 opened; exact-head GitHub/Preview acceptance pending; Production unchanged

## Scope and truth boundary

The candidate reuses the existing Growth view, Lead Center authorization,
canonical Neon schema, and audit ledger. It adds a protected, append-only KPI
target register and no lead capture, routing, messaging, publication, provider,
spend, or AI action path.

The current Production observation remains six test/suppressed leads and zero
genuine contactable leads, first-response samples, outcomes, or spend. The
candidate therefore contains zero seeded targets and displays unsupported
values as **Not measured**.

## Focused application and cutover tests

```text
pnpm exec vitest run \
  tests/adminops/growth-kpi-targets.test.ts \
  tests/adminops/growth-kpi-target-register-migration.test.ts \
  tests/scripts/phase9-kpi-target-production-cutover.test.ts
```

Result: PASS — 3 files / 28 tests.

The tests cover the 32-metric catalog, baseline-state truthfulness, sample
maturity, server baseline authority, PII/secret rejection, numeric target and
approval gates, idempotency, SQL/RLS/privilege/immutability contracts, migration
hash pinning, exact gate enforcement, canonical Neon identity, backup-first
execution, and lead/audit no-change interlocks.

## Disposable PostgreSQL acceptance

- Fresh database-only local Supabase/PostgreSQL start: PASS.
- All 34 migrations applied through `20260821213000`: PASS.
- `pnpm run staging:local:verify`: PASS on PostgreSQL 17.6.
- KPI target SQL contract: PASS for service/browser role boundaries,
  idempotency, exactly-one audit, target/baseline rules, PII rejection,
  append-only behavior, and synthetic rollback.
- Provider, email, and SMS invocation counts: zero.
- Sanitized local summaries:
  `.amm-run/local-staging/start-summary.json` and
  `.amm-run/local-staging/verify-summary.json` (gitignored).

No Production connection string was loaded and no Production query or write was
performed by this acceptance.

## Static, build, and route verification

- `pnpm run typecheck`: PASS.
- `pnpm run lint`: PASS.
- `pnpm run build`: PASS on Next.js 15.5.21.
- `pnpm run routes:assert`: PASS — 81 active routes and 17 acknowledged
  root/`src` duplicates.
- `pnpm run release:gate`: PASS — system isolation, 14/14 release-safety
  controls, 206 test files / 2,874 tests, strict typecheck, ESLint, optimized
  build, and route manifest.
- `/admin/growth/targets` is a dynamic protected route and is included in the
  required admin-route manifest.
- Offline guarded cutover plan: PASS; migration SHA-256
  `1feead13bdb8db3f7108deac42d03b124a795b289320235d6b2866b5fd3591f4`.
- `pnpm audit --prod --audit-level high`: PASS — no known Production
  dependency vulnerabilities.
- `gitleaks detect --source . --redact --no-banner`: PASS — 474 commits and
  approximately 13.33 MB scanned with no detected leak.

The local workstation uses Node 26.5.1 and reports the repository's expected
24.x engine warning. The exact Node 24 GitHub proof will be recorded on the
Draft PR before it may enter the Production queue.

## Rendered visual acceptance

The optimized local Production server passed 12/12 desktop/mobile checks across
public and authenticated operator surfaces. The harness found:

- no horizontal overflow;
- no missing required copy;
- no prohibited campaign or valuation claim;
- no browser console warning/error; and
- no unsupported KPI displayed as 0%, $0, or zero ratio.

Inspected screenshots show unavailable cards as **Not measured**. Evidence is
retained under the gitignored
`.amm-run/kpi-target-register/visual-final/` directory.

## Security review

- The page requires server-side `report:view`; mutation rechecks
  `growth:manage`.
- Preview mutation fails closed before any target baseline or database query.
- Mutation is protected by the existing per-operator durable rate limiter.
- SQL is parameterized; the RPC is security-invoker with locked search path.
- RLS and grants deny public, `anon`, and `authenticated` table/function access.
- React escaping is retained; no unsafe HTML, browser credential, dynamic code,
  arbitrary URL, provider call, or client database secret was added.
- The route is dynamic/private/no-store and does not expose baseline evidence
  containing lead PII.
- No new critical or high-severity finding was identified in the touched path.

The repository has a broader, previously documented partial CSP limitation;
this candidate neither expands nor weakens it.

## Release boundary

No Production deployment, database migration/write, lead creation, target
record, email, BCC, SMS, Web Push, consumer acknowledgment, WordPress/DNS
change, external publication, spend, or NellySelly action was performed.

Exact future gate:

```text
APPROVE PHASE 9 KPI TARGET REGISTER PRODUCTION MIGRATION, MERGE, AND PRODUCTION DEPLOYMENT
```
