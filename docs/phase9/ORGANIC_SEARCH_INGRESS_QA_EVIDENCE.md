# Phase 9 organic-search ingress QA evidence

Date: 2026-08-24

Draft PR: [#219](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/219)

Branch: `codex/phase9-organic-search-ingress-20260824`

Base: sealed PR #218 `f065d8801bec295c99185d846ff4bc38de2a0a6f`

Latest code-bearing commit: `5552a1a77f17f94656952126c69fb003e11fbf95`

Pre-refresh head: `5486bed20272d2a661bc28a0e3a4a4576b2cb11f`

Rescue: `rescue/amm-pr219-pre-pr218-exact-seal-20260829-004949`

Exact-parent reconciliation merge: `f2754d0e1858c1afcf639977051f3488ab591f89`

## Evidence boundary

Evidence covers a protected, safe-off organic-search ingress candidate. It uses
only a synthetic local page report, a disposable unexposed PostgreSQL 17
container, and intercepted browser validation. No Neon branch, Production
database, Search Console property, provider credential, page, lead, message,
campaign, budget, WordPress/DNS surface, purchase, deletion, or NellySelly
system was touched.

The original detailed results below remain immutable historical proof for the
pre-refresh head. Fresh local and PostgreSQL proof for the reconciled head is
recorded next. Exact-head GitHub CI, immutable Preview, browser, visual, and
runtime-log proof remain mandatory after the documentation-only evidence seal.

## Fresh reconciled-head local seal — 2026-08-29

Code-and-governance head `5d598cc2228b6564af883a9716aedf1aa28cb2fb`
is an exact descendant of sealed PR #218
`f065d8801bec295c99185d846ff4bc38de2a0a6f`. The exact-parent reconciliation
merge has that PR #218 head as its second parent, and `git diff --check` is
clean.

```text
Node 24.18.0
Ask Magic Mike / NellySelly isolation PASS
release safety PASS — 14/14
full Vitest PASS — 252 files / 3,210 tests
strict TypeScript PASS
full ESLint PASS
Next.js 15.5.21 optimized build PASS — 57 static-generation tasks
route manifest PASS — 92 active / 17 acknowledged root-src duplicates
release doctor PASS — 43/43
Production dependency audit PASS — no known vulnerabilities
gitleaks PASS — 653 commits / 16.24 MB / no leaks
```

Focused Next.js, React, browser, API, and SQL review found no actionable new
security defect. The candidate retains server-side `growth:manage`, exact
same-origin checks before authentication, bounded streamed input, private
responses, React-escaped operator data, server-only environment access,
parameterized SQL, exact Production endpoint attestation, disabled import
authority, `SECURITY INVOKER`, owner-connected execution, revoked browser and
legacy-role execution, immutable receipts, and atomic replay handling. The
exact PR diff adds no unsafe HTML, dynamic code execution, browser storage, or
cross-origin navigation sink.

Fresh disposable database proof:

```text
PostgreSQL 17.11 (Homebrew)
36 migrations applied in lexical order
supabase/tests/marketing_spend_ingress_pg17.sql PASS
supabase/tests/organic_search_ingress_pg17.sql PASS
anon/authenticated/service_role execution denied for both import functions
both synthetic transactions ROLLBACK
0 synthetic channels / campaigns / spend rows / receipts retained
0 synthetic organic signals / opportunities / receipts retained
```

The unexposed local cluster was stopped and moved recoverably to Trash at
`amm-pr219-pg17.4uq7CJ-20260829-010146`. No Neon or other remote database was
connected. A documentation-only evidence commit follows this proof; the full
release gate and all remote proof must bind to that resulting exact head.

## Focused contract proof

```text
pnpm exec vitest run \
  tests/adminops/organic-search-ingress.test.ts \
  tests/adminops/neon-organic-search-ingress.test.ts \
  tests/adminops/organic-search-ingress-guards.test.ts \
  tests/adminops/organic-search-ingress-migration.test.ts \
  tests/api/organic-search-ingress-routes.test.ts \
  tests/adminops/marketing-spend-ingress.test.ts \
  tests/adminops/neon-marketing-spend-ingress.test.ts

7 files passed
39 tests passed
```

The suite proves exact headers and report identity, bounded RFC-style CSV,
owned-host and safe-URL enforcement, raw-query-column refusal, date and CTR
reconciliation, duplicate refusal, deterministic row/batch fingerprints,
explainable scores, synthetic commit refusal, stale Preview refusal, safe-off
feature state, exact Production Neon endpoint attestation, parameterized
database-function-only mutation, minimized receipt reads, same-origin before
RBAC, private response headers, exact request keys, and route registration.

The shared CSV and HTTP primitives also reran the established spend-ingress
regression contract. The first full suite found one stale source-text assertion
after that intentional refactor; the guard was corrected to prove delegation
and the shared same-origin/private-header implementation. No runtime invariant
was removed.

## Executable PostgreSQL 17 proof

An isolated `public.ecr.aws/supabase/postgres:17.6.1.106` container used tmpfs,
published no host port, and was removed immediately after proof. Repository
migrations were applied in lexical order, followed by:

```text
supabase/tests/organic_search_ingress_pg17.sql
BEGIN
5 synthetic contract result inserts
3 assertion blocks
ROLLBACK
PASS
```

The executable contract proves initial atomic insertion, exact replay,
evidence revision, malformed/unsafe row rejection, synthetic-source rejection,
immutable receipt update/delete refusal with SQLSTATE `55000`, signal and
opportunity audit counts, operator-state preservation, no raw query/CSV fields,
and revoked execution for public browser and legacy service roles.

The first run found a real portability defect: Supabase/Neon places `pgcrypto`
in the `extensions` schema, so the migration now calls
`extensions.digest(...)` explicitly. A role-switching assertion also triggered
a segmentation fault in the disposable Supabase PostgreSQL image while calling
a deliberately revoked function from PL/pgSQL. The test was hardened to inspect
`has_function_privilege` for each denied role, which proves the grant boundary
without exercising that image defect. The server recovered, the transaction
rolled back, and the fresh contract passed. No remote database was involved.

## Full regression and build

```text
pnpm test
252 test files passed
3,207 tests passed

pnpm typecheck
PASS

pnpm lint
PASS

Node 24.18.0 · pnpm 10.30.3 · Next.js 15.5.21
pnpm build
PASS · 57 static-generation tasks

pnpm routes:assert
PASS · 92 active routes / 17 acknowledged root-src duplicates
```

The protected workbench is 4.47 kB route code and retains the established 102
kB shared first-load bundle.

## Security, dependency, and isolation gates

```text
pnpm release:safety                  PASS · 14/14
pnpm amm:verify:isolation            PASS
pnpm audit --prod --audit-level high PASS · no known vulnerabilities
node --check scripts/staging-local-verify.mjs PASS
git diff --check                     PASS
gitleaks git --staged --redact       PASS · 152.95 KiB · no leaks
```

The review found no raw-HTML sink, dynamic external navigation, provider fetch,
browser secret read, raw query retention, raw CSV persistence, unparameterized
application SQL, or cross-origin mutation path. The implementation uses Node
runtime routes, exact same-origin before authentication, server RBAC, bounded
stream reads, strict URL/domain validation, private no-store/noindex/CSP
headers, server-only endpoint identity, owner-only database execution,
idempotency, minimized receipts, and generic client errors.

## Local rendered-browser proof

```text
PREVIEW_URL=http://127.0.0.1:3109 \
ADMIN_SECRET=<synthetic local-only value> \
pnpm exec playwright test tests/e2e/organic-search-ingress-preview.spec.ts

2/2 Chromium scenarios passed
```

Desktop `1280×720` and mobile `390×844` each prove:

- one intercepted deterministic validation request;
- zero commit requests;
- commit disabled before and after synthetic validation;
- zero console errors and zero page errors;
- zero unlabeled inputs;
- keyboard-visible focus from the CSV field to the visible file selector; and
- document width no greater than viewport width.

Artifacts (gitignored):

```text
artifacts/organic-search-ingress-desktop.png
artifacts/organic-search-ingress-mobile.png
```

The first local browser invocation used the repository's intentionally refused
Production default `ADMIN_SECRET=changeme-local` and received the expected 503
`Admin not configured`. Re-running with a synthetic non-default local-only
value passed. No real credential was read or emitted.

## Immutable Preview evidence

```text
Exact runtime head: 5552a1a77f17f94656952126c69fb003e11fbf95
Release Gate:       32801867752 · PASS
Immutable Preview:  https://ask-magic-mike-qlrl9o1cg-eyes-up-industries.vercel.app
Vercel deployment:  dpl_FcBUJ7hDxKu7oeMpXb8UuVHpkkCz · READY
Protected QA:       32801994614 · PASS
```

The branch-native runner checked out the exact code head, installed with the
frozen lockfile on Node 24, and passed release safety, 252 files / 3,207 tests,
strict TypeScript, ESLint, optimized build, release doctor 43/43, protected QA,
browser E2E, release report `GO`, launch authority `PREVIEW_READY`, and the exact
verdict assertion.

Protected remote results:

```text
read-only verifier: 17 pass · 6 intentional skip · 0 fail
browser E2E:         10 expected · 0 unexpected · 0 flaky · 0 skipped
mutation gate:       blocked · SAFE_DB_WRITE not set
provider delivery:   disabled
live email / SMS:    disabled / disabled
```

The two organic-radar scenarios again passed at desktop and mobile dimensions:
one intercepted validation and zero commit calls per viewport, no overflow,
unlabeled input, console error, or page error. Exact deployed screenshots are in
the protected run artifact as `organic-search-ingress-desktop.png` and
`organic-search-ingress-mobile.png`.

Visual review of the first immutable Preview found that an expected unattested
Preview endpoint appeared as a generic red read error. Code head `5552a1a`
preserves the same fail-closed behavior but renders a precise amber sealed-read
notice: no receipt query or write occurred, while synthetic validation remains
available. The final deployed screenshots and source guard prove that correction.

### Exact-deployment log audit

A bounded latest-1,000 request sample for the deployment contained 820 HTTP
200, 160 HTTP 204, 20 expected initial HTTP 401, and only `info` level entries.
Separate deployment-scoped queries avoid relying on that sample cap:

```text
search-ingress page: 2 GET 200 · 2 expected GET 401 · 2 HEAD 204
preview API:         0 requests (browser route interception)
commit API:          0 requests
provider query:      0 matches
error level:         0
fatal level:         0
```

The expected 401s are the initial protected-page requests before Vercel
automation authentication. No organic-search commit, database mutation,
provider call, page publication, lead action, or message occurred.

## Release state and truth statement

PR #219 remains Draft and stacked after PR #218. Its runtime candidate is sealed
behind the exact gate below, which has not been supplied:

```text
APPROVE PHASE 9 ORGANIC SEARCH INGRESS MIGRATION, PR 219 MERGE, AND PRODUCTION DEPLOYMENT
```

The gate keeps `GROWTH_SEARCH_IMPORT_ENABLED=false` and does not authorize a
Search Console import. Production remains unchanged.
The candidate proves that a specifically reviewed owned-page report can be
validated and later reconciled atomically after separate authority. It does not
prove that Search Console was accessed, an export is complete, any real search
traffic exists, a page was changed, a lead was generated, or a business outcome
occurred.
