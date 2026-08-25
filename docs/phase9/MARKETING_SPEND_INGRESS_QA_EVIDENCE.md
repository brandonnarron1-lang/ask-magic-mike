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
30 tests passed
```

The focused suite proves deterministic fingerprints, quoted CSV compatibility,
strict header/date/formula/metric/duplicate/identity/size validation, synthetic
commit refusal across every identity field, feature and Preview gates, exact
Production Neon endpoint attestation, cross-project read refusal before any
query, stale-preview refusal, exact confirmation, no raw CSV in the database
payload, database-function-only mutation, safe conflict mapping, minimized
receipt reads, same-origin/RBAC enforcement, and private no-store/noindex
headers. A source-level route guard also proves the protected browser Preview
test cannot call the commit API.

### Strict TypeScript

```text
pnpm typecheck
PASS
```

### Full regression, lint, build, and route proof

```text
pnpm test
247 test files passed
3,182 tests passed

pnpm lint
PASS

pnpm routes:verify
Next.js 15.5.21 optimized Production build PASS
55 static-generation tasks completed
89 active routes / 17 acknowledged root-src duplicates PASS
```

The protected page and both bounded APIs are present in the build. The spend
workbench adds approximately 4.16 kB route size and keeps the established 102
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

An exploratory repository-directory scan also traversed generated dependency
and `.next` artifacts and produced 14 redacted generated-artifact findings. It
is not candidate evidence. Exact staged-file scans for every candidate commit
and the full Git-history scan above are clean.

The focused security review found no raw-HTML sink, dynamic navigation,
provider fetch, client secret read, unparameterized application SQL, raw CSV
logging/storage, or cross-origin mutation path in the new surface. It hardened
the candidate with exact same-origin/RBAC checks, streamed request bounds,
private no-store headers, application and database validation, exact Preview
and Production Neon endpoint attestation, parameterized SQL, owner-only
function authority, immutable dimension/fact/batch audits, generic client
errors, and no secret-bearing browser import.

### Clean code-bearing commits

```text
commit 9cbbc5731c928f9fd98226b6757132cdf1fc2dca
commit 8b7271ebef06e61368eb474e3be5d6cf2c8f1fa9
commit ed02f26af99911253f398ec5c1448e183a5dd976
exact base d04984b4d162f13c79af261beb55a82f15a86b80 is an ancestor
release doctor 43 pass / 0 fail / 0 skip
staged gitleaks 148.84 KiB / no leaks
git diff --check PASS
clean worktree PASS
```

`9cbbc573` implements the contract. `8b7271e` fixes the visual defect found by
mobile QA. `ed02f26` adds the durable browser contract and deploys the exact
visually tested behavior.

## Exact-head Preview evidence

### GitHub and immutable deployment

```text
Exact head: ed02f26af99911253f398ec5c1448e183a5dd976
Release Gate run: 32795263654 — PASS
Immutable Preview:
https://ask-magic-mike-o64ycgkev-eyes-up-industries.vercel.app
Vercel deployment: dpl_2E7rVLVQy5wHnabTwcCSjpwSjpS6 — READY
Protected QA run: 32795486986 — PASS
```

The protected verifier recorded 17 read-only checks passed, 6 intentionally
skipped, and 0 failed. Mutation authority remained false with the expected
reason `SAFE_DB_WRITE not set`.

### Authenticated browser and visual proof

All 8 protected browser scenarios passed, including the spend-ingress workbench
at 1280 x 720 and 390 x 844. The scenarios authenticated through the established
Preview boundary, generated the preview result from the canonical parser,
blocked and counted any commit request, and proved:

- one validation interaction per viewport and zero commit requests;
- the commit control remained disabled before and after validation;
- zero console errors and zero page errors;
- zero unlabeled inputs and zero unnamed buttons;
- keyboard-visible focus, with the hidden file input skipped and its visible
  file-selector control focusable;
- synthetic and sealed-state copy remained visible; and
- document width equaled viewport width at desktop and mobile.

Artifacts:

```text
preview-qa-artifacts/spend-ingress-desktop.png
preview-qa-artifacts/spend-ingress-mobile.png
```

The first exact-build mobile run found a genuine 1,098 px document width at a
390 px viewport, caused by an unconstrained grid item and the wide normalized-
row table. It also exposed a hidden-file-input labeling/focus gap. The candidate
was corrected with `min-w-0`, explicit max-width and horizontal table
containment, constrained textarea sizing, an accessible file-input label, and
removal of the hidden input from the tab order. A source guard and both deployed
viewport scenarios now prevent regression.

### Exact deployment-log audit

The final bounded runtime audit was scoped to
`dpl_2E7rVLVQy5wHnabTwcCSjpwSjpS6` in the Preview environment:

```text
error/fatal logs: 0
query `/commit`: 0 logs
query `provider`: 0 logs
spend-ingress API requests: 0
spend-ingress page traffic: 2 authenticated GET + 2 expected unauthenticated
                              GET + 2 HEAD
status totals: 116 x 200, 16 x 204, 12 x 401, 1 x 307, 1 x 404, 1 x 503
```

The 401s are the expected first protected-page requests before Preview
authentication. The single 404 is the verifier's invalid synthetic-token case;
the 503 is the intentionally refused SLA cron check. No spend-ingress commit,
provider call, database write, campaign action, or message occurred.

## Release state

PR #218 remains Draft, open, clean, and mergeable. Production remains on the
previously verified deployment. No Production migration, environment change,
merge, deployment, import, or provider action has been performed.

## Truth statement

The candidate proves that a reviewed real spend report can be normalized and
atomically recorded after later Production authorization. It does not prove
that any provider report has been obtained, any media was purchased, any
campaign ran, any live spend exists, or any return on spend has been measured.
