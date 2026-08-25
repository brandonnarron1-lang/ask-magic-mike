# Phase 9 organic-search ingress QA evidence

Date: 2026-08-24

Draft PR: [#219](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/219)

Branch: `codex/phase9-organic-search-ingress-20260824`

Base: `cd087e5c5c0fda82a3175b86b550c966120eb2ab`

Code-bearing commit: `ddc944fc10dd994ba79365c608a42534e91f7e57`

## Evidence boundary

Evidence covers a protected, safe-off organic-search ingress candidate. It uses
only a synthetic local page report, a disposable unexposed PostgreSQL 17
container, and intercepted browser validation. No Neon branch, Production
database, Search Console property, provider credential, page, lead, message,
campaign, budget, WordPress/DNS surface, purchase, deletion, or NellySelly
system was touched.

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
38 tests passed
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
3,206 tests passed

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

Pending exact-head Vercel Preview and protected branch-native QA. This section
must be replaced with the deployment ID, immutable URL, GitHub run IDs, browser
counts, and bounded log audit before PR #219 is called sealed.

## Release state and truth statement

PR #219 remains Draft and stacked after PR #218. Production remains unchanged.
The candidate proves that a specifically reviewed owned-page report can be
validated and later reconciled atomically after separate authority. It does not
prove that Search Console was accessed, an export is complete, any real search
traffic exists, a page was changed, a lead was generated, or a business outcome
occurred.
