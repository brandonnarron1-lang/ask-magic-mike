# Phase 9 — Canonical Alias Consolidation QA Evidence

Date: 2026-08-23 (America/New_York)

Candidate base: `c04655cc04135f89cf9b401a631bc503c8c70057`

Environment: isolated local worktree; no Production mutation

## Pre-change live evidence

Read-only `curl` requests to Production returned `HTTP 200` for both duplicate compatibility documents:

- `https://www.askmagicmike.com/value?...` → `200`, matched path `/value`;
- `https://www.askmagicmike.com/we-buy-houses?...` → `200`, matched path `/we-buy-houses`.

No form was submitted and the read-only query values were unmistakable audit labels.

## Focused contract

Command:

```bash
pnpm exec vitest run tests/public/canonical-alias-redirects.test.ts tests/public/search-authority-metadata.test.ts tests/public/search-authority-routes.test.ts
```

Result: PASS — 3 files, 12 tests.

The redirect test executes the real `next.config.ts` configuration through Next.js' server testing utility. Both aliases returned `308`; canonical path, origin, UTMs, and `gclid` matched exactly.

## Full local verification

| Command | Result |
|---|---|
| `pnpm run test` | PASS — 230 files, 3,066 tests |
| `pnpm run typecheck` | PASS — strict TypeScript, no diagnostics |
| `pnpm run lint` | PASS — ESLint, no diagnostics |
| `pnpm run build` | PASS — Next.js 15.5.21 optimized build, 52 generated pages |
| `pnpm run routes:verify` | PASS — 83 active routes, 17 acknowledged root/src duplicates |
| `pnpm run release:safety` | PASS — 14/14 controls |
| `pnpm run amm:verify:isolation` | PASS — deployable code contains no NellySelly project identifiers |
| `pnpm audit --prod --audit-level high` | PASS — no known Production dependency vulnerabilities |
| `gitleaks git --redact --no-banner --log-opts='--all'` | PASS — 576 commits, no leaks |
| `git diff --check` | PASS |
| migration-diff check | PASS — no migration changed |

Local Node was `v26.5.1` while the repository declares Node `24.x`; exact Node 24 CI remains required before review authority.

## Optimized-server redirect smoke

The optimized build was started locally and queried without following redirects.

```text
GET /value?utm_source=wordpress&utm_medium=owned_media&utm_campaign=canonical_consolidation&gclid=TEST_CLICK_ID
308 Location: /home-value?utm_source=wordpress&utm_medium=owned_media&utm_campaign=canonical_consolidation&gclid=TEST_CLICK_ID

GET /we-buy-houses?utm_source=wordpress&utm_medium=owned_media&utm_campaign=canonical_consolidation&fbclid=TEST_CLICK_ID
308 Location: /sell?utm_source=wordpress&utm_medium=owned_media&utm_campaign=canonical_consolidation&fbclid=TEST_CLICK_ID
```

The local server was stopped after proof.

## Safety record

- no database read requiring secrets and no database write;
- no form or test lead;
- no email, SMS, Push, or consumer acknowledgment;
- no Production environment, merge, deployment, alias, or domain change;
- no WordPress edit/publication;
- no DNS, Search Console, Business Profile, social, paid traffic, purchase, or cache action;
- no NellySelly access or change; and
- no branch, worktree, deployment, lead, or historical artifact deleted.

## Release-train monitor reconciliation — 2026-08-23 23:35 EDT

A final compatibility audit found that the inherited Production monitor still
expected `/value` to return `200`. That expectation would become false as soon
as this candidate correctly activated the permanent redirect. The candidate now
uses one shared, tested route contract that checks:

- canonical `/home-value` → `200`;
- compatibility `/value` → `308` with exact `Location: /home-value`; and
- compatibility `/we-buy-houses` → `308` with exact `Location: /sell`.

Focused verification:

```text
pnpm exec vitest run tests/scripts/monitor-contracts.test.mjs tests/public/canonical-alias-redirects.test.ts
PASS — 2 files, 20 tests
node --check scripts/monitor-production.mjs
PASS
node --check scripts/lib/monitor-contracts.mjs
PASS
git diff --check
PASS
```

The corrected monitor was also run read-only against unchanged Production. It
reported `8/11`, with exactly the three expected pre-release failures: the two
compatibility routes still return their historical `200` documents, and the
accepted Production deployment does not yet expose the durable-limiter
readiness contract. Every canonical public page, widget, liveness check, and
anonymous admin denial passed. This run submitted no form or event and changed
no external state.

## Immutable Preview and exact-head acceptance — 2026-08-24

Application head `ae9386d77380b25192b21e786925fa7ff99dcaa5` is sealed:

- GitHub Node 24 release gate
  [32687148073](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32687148073)
  passed unit tests, strict typecheck, ESLint, optimized build, route manifest,
  release-candidate report, and launch-authority report;
- release artifact `9506092188` has digest
  `sha256:fed0b12cd7adc677d32c68f8ee2c224473f311e97f7a55723552d867bf7e337c`;
- Vercel deployment `dpl_7k2xDm3nysKd7iDCgmW1LbboRbBq` is READY at
  `https://ask-magic-mike-l79zod1lq-eyes-up-industries.vercel.app` and is
  bound to PR #210 and the exact application head;
- authenticated navigation from `/value` landed on `/home-value` while
  preserving `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and
  `gclid`; the destination emitted the canonical
  `https://www.askmagicmike.com/home-value` and the route-specific title;
- authenticated navigation from `/we-buy-houses` landed on `/sell` while
  preserving `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and
  `fbclid`; the destination emitted the canonical
  `https://www.askmagicmike.com/sell` and the route-specific title;
- the inspected browser emitted no warning or error; and
- deployment-scoped Vercel log inspection found no error, warning, or fatal
  record in the acceptance window.

The browser follows redirects, so the exact `308` status and exact `Location`
contract remain proven by the real Next.js configuration test and optimized
server smoke. The deployed navigation proves the protected Preview actually
lands on the same canonical destinations with attribution intact.

No form, API mutation, analytics event, lead, email, SMS, Push, consumer
acknowledgment, database write, environment change, WordPress edit, DNS change,
publication, spend, deletion, or NellySelly action occurred.

The release-sealing documentation/test diff passed 3 focused files / 27 tests,
ESLint, optimized build, release safety 14/14, system isolation, and
`git diff --check`. A typecheck launched concurrently with the optimized build
observed `.next/types` while Next.js was regenerating that directory and failed
with transient missing generated files. The build completed successfully and a
serial typecheck immediately passed with no diagnostic. Exact-head CI runs
these phases in order and remains the authoritative Node 24 result.

## Remaining gate

PR #209 must be released first. PR #210 must then be refreshed onto the exact
new `main` and repeat exact-head verification. Only after that refresh may this
separate phrase authorize its exact reviewed merge and matching Production
deployment:

`APPROVE PHASE 9 CANONICAL ALIAS CONSOLIDATION MERGE AND PRODUCTION DEPLOYMENT`
