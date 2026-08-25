# Phase 9 marketing-spend ingress QA evidence

Date: 2026-08-24
Branch: `codex/phase9-spend-ledger-ingress-20260824`
Base: `d04984b4d162f13c79af261beb55a82f15a86b80`

## Evidence boundary

Evidence covers a protected, feature-gated spend-ingestion candidate. It uses
only synthetic local CSVs and a disposable PostgreSQL 17.11 cluster. No Neon
branch, Production database, lead, provider account, campaign, budget, message,
WordPress surface, DNS record, Vercel Production environment, purchase,
deletion, or NellySelly system was touched.

## Completed evidence

### Parser, persistence, migration, guard, and API tests

```text
pnpm exec vitest run \
  tests/adminops/marketing-spend-ingress.test.ts \
  tests/adminops/neon-marketing-spend-ingress.test.ts \
  tests/adminops/marketing-spend-ingress-migration.test.ts \
  tests/adminops/marketing-spend-ingress-guards.test.ts \
  tests/api/marketing-spend-ingress-routes.test.ts

5 files passed
29 tests passed
```

The focused suite proves deterministic fingerprints, quoted CSV compatibility,
strict header/date/formula/metric/duplicate/identity/size validation, synthetic
commit refusal across every identity field, feature and Preview gates, exact
Production Neon endpoint attestation, cross-project read refusal before any
query, stale-preview refusal, exact confirmation, no raw CSV in the database
payload, database-function-only mutation, safe conflict mapping, minimized
receipt reads, same-origin/RBAC enforcement, and private no-store/noindex
headers.

### Strict TypeScript

```text
pnpm typecheck
PASS
```

### Full regression, lint, build, and route proof

```text
pnpm test
247 test files passed
3,181 tests passed

pnpm lint
PASS

pnpm routes:verify
Next.js 15.5.21 optimized Production build PASS
55 static-generation tasks completed
89 active routes / 17 acknowledged root-src duplicates PASS
```

The protected page and both bounded APIs are present in the build. The spend
workbench adds approximately 4.12 kB route size and keeps the established 102
kB shared first-load bundle unchanged.

### Executable PostgreSQL 17 contract

Fresh disposable cluster:

```text
PostgreSQL 17.11
35 repository migrations applied in lexical order
supabase/tests/marketing_spend_ingress_pg17.sql PASS
synthetic transaction ROLLBACK
```

The executable database test proves initial atomic insertion, exact replay,
audited same-day revision, conflicting campaign identity refusal, synthetic
source refusal, malformed-calendar-date safe failure, append-only receipt
enforcement with SQLSTATE `55000`, channel/campaign creation audits,
`authenticated` execution denial, batch/row audit evidence, and absence of raw
CSV/payload fields in durable metadata.

The first disposable run exposed a real SQL portability defect:
`jsonb_object_length(jsonb)` does not exist in PostgreSQL 17. The contract was
corrected to count `jsonb_object_keys`, after which the full fresh-migration and
transactional test passed. No remote database was involved.

### Release, dependency, isolation, and security gates

```text
pnpm release:safety                 PASS — 14/14
pnpm audit --prod --audit-level high PASS — no known vulnerabilities
pnpm amm:verify:isolation           PASS
node --check scripts/staging-local-verify.mjs PASS
git diff --check                    PASS
gitleaks git --redact --no-banner --log-opts='--all'
                                     PASS — 625 commits, no leaks
```

The focused security review found no raw-HTML sink, dynamic navigation,
provider fetch, client secret read, unparameterized application SQL, raw CSV
logging/storage, or cross-origin mutation path in the new surface. It hardened
the candidate with exact same-origin/RBAC checks, streamed request bounds,
private no-store headers, application and database validation, exact Preview
and Production Neon endpoint attestation, parameterized SQL, owner-only
function authority, immutable dimension/fact/batch audits, generic client
errors, and no secret-bearing browser import.

The pre-commit release doctor reports 42 pass / one expected nonblocking dirty-
tree check. Clean-head doctor, staged secret scan, CI, and Preview evidence are
recorded after the exact candidate is committed.

## Pending exact-head evidence

- clean-head release doctor, staged secret scan, ancestry, and diff proof;
- GitHub Release Gate;
- immutable Vercel Preview;
- authenticated desktop/mobile visual and keyboard QA;
- Preview API/RBAC/no-write runtime QA; and
- exact deployment-log audit proving no mutation or provider call.

## Truth statement

The candidate proves that a reviewed real spend report can be normalized and
atomically recorded after later Production authorization. It does not prove
that any provider report has been obtained, any media was purchased, any
campaign ran, any live spend exists, or any return on spend has been measured.
