# Phase 9 local-demand decision packets QA evidence

Date: 2026-08-25

Candidate branch: `codex/phase9-local-demand-decision-packets-20260825`

Base: exact sealed PR #221 head
`65eb466a2e7991364efe2db78044006ebcdf8b5d`

Status: local exact-engine candidate verified; immutable Preview and protected
browser evidence pending; Production unchanged

Code-bearing commit:
`5d550c5e76005f898cbe0482b12ca982359e46e8`

## Executive result

The canonical Growth Command Center now converts already-persisted organic and
local-profile opportunities into deterministic, privacy-minimized operator
decision packets. No provider, AI, publishing, messaging, spend, lead, or
external mutation path was added.

The same candidate removes Google's retired `business_conversations` metric
from active CSV acceptance and adds a forward-only PostgreSQL guard at the
canonical signal boundary. Historical rows remain untouched.

## Focused behavior proof

The focused suite proves:

- organic and local-profile opportunity types receive fixed workbench links and
  type-specific next decisions;
- only documented aggregate evidence keys can render;
- raw page URLs, arbitrary JSON, fingerprints, provider location IDs, consumer
  values, and retired conversation metrics cannot appear in a packet;
- confidence is clamped and labeled deterministically;
- freshness uses a strict calendar date, then the persisted detection timestamp;
- malformed/future dates and negative, oversized, or unbounded numeric evidence
  fail closed;
- the command center remains dynamic, server-authorized, and read-only; and
- the active local-profile CSV parser rejects `business_conversations` while
  keeping the legacy database summary field fixed at zero.

Result: 4 focused files / 22 tests PASS after the final validation hardening.
The broader adjacent suite passed 7 files / 36 tests before that final edge-case
test was added.

The release candidate also includes a deployed-browser acceptance spec for the
authenticated Growth Command Center. It exercises desktop and mobile widths,
requires a 200 response and meaningful rendered content, rejects framework
error overlays, console/page errors, horizontal overflow, non-allowlisted packet
links, and every same-origin non-read HTTP request, and captures full-page screenshots. The
spec passed locally at both widths against the truthful unconfigured/empty
state. Hosted exact-head execution remains part of the Preview seal below.

The stacked Preview suite was also reconciled with the intentional automation
exclusion introduced by the sealed cross-domain measurement base. Playwright
now proves privacy-safe browser events and zero canonical event requests from
automation; existing unit and component suites continue to prove that genuine
consumer browsers send the same anonymous submission UUID to the first-party
ledger. The complete mutation-free browser set passes 15/15 locally.

## Executable PostgreSQL 17 proof

A disposable, unexposed `postgres:17-alpine` container was created with only a
minimal `market_signals` contract and explicit `anon`, `authenticated`, and
`service_role` roles. One historical canonical conversation row was inserted
before the migration. Then
`20260825060000_local_demand_metric_truth_guard.sql` was applied.

PASS cases:

- current `website_clicks` canonical signal inserted;
- new canonical `business_conversations` insert rejected with SQLSTATE `23514`;
- update from a current metric to the retired metric rejected with SQLSTATE
  `23514`;
- trigger-function execution remained revoked from all three browser/service
  roles;
- one pre-migration historical canonical row remained present and unchanged;
- a noncanonical archive row remained outside the guard's source scope; and
- the temporary container was absent after the test.

Observed final counts:

| Assertion | Rows |
| --- | ---: |
| Preserved historical canonical conversation rows | 1 |
| Accepted current canonical metric rows | 1 |
| Accepted noncanonical archive rows | 1 |

No Neon connection, remote database, credential, Production branch, or live row
was used.

## Exact-engine application verification

Runtime: Node `v24.18.0`, pnpm `10.30.3`.

| Check | Result |
| --- | --- |
| Final focused decision/metric/route/migration suite | PASS — 4 files / 22 tests |
| Full Vitest suite | PASS — 263 files / 3,283 tests |
| Strict TypeScript | PASS |
| Full ESLint | PASS |
| Optimized Next.js build | PASS — Next.js 15.5.21 / 59 static pages |
| Active route manifest | PASS — 95 routes / 17 acknowledged duplicates |
| Release safety | PASS — 14/14 |
| Ask/NellySelly deployable-source isolation | PASS |
| Production dependency audit | PASS — no known vulnerabilities |
| Touched-path security review | PASS — no actionable finding |
| Growth decision-packet browser acceptance | PASS — 2/2 local desktop/mobile checks |
| Complete mutation-free browser suite | PASS — 15/15 local checks |
| `git diff --check` | PASS |
| Release doctor before commit | HEALTHY — 42 pass / one expected nonblocking dirty-tree finding |
| Release doctor on clean code-bearing commit | HEALTHY — 43 pass / 0 fail / 0 skip |

## Security review

The touched path was reviewed against Next.js, React, and browser JavaScript
security guidance.

- `/admin/growth` remains a Server Component behind
  `requireLeadCenterPermission("report:view")`, `force-dynamic`, and zero
  revalidation.
- The page adds no form, Server Action, state-changing request, client component,
  raw HTML sink, dynamic script, postMessage handler, or environment exposure.
- All database values render through normal JSX escaping.
- Every packet link is a fixed application constant, never a persisted URL.
- Neon SQL remains a static query; evidence values are not interpolated into
  SQL.
- The loader bounds the top-level JSON object and the packet builder independently
  allowlists scalar fields, lengths, numeric ranges, and calendar dates.
- The trigger is `SECURITY INVOKER`, has an empty search path, and has direct
  execution revoked.

No Critical, High, Medium, or Low actionable issue remains in the touched scope.

## Commands

```text
pnpm exec vitest run <focused files>
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run routes:assert
pnpm run release:safety
pnpm run amm:verify:isolation
pnpm audit --prod --audit-level=high
pnpm exec playwright test tests/e2e/growth-decision-packets-preview.spec.ts
git diff --check
```

The PostgreSQL proof used `docker exec ... psql -v ON_ERROR_STOP=1` against the
disposable local container and then verified its removal. No command printed a
secret.

## Remaining proof before any release gate

1. Commit and push the exact candidate head.
2. Open a stacked Draft PR after PR #221.
3. Pass exact-head GitHub Release Gate.
4. Bind and verify the immutable Vercel Preview for that exact commit.
5. Run protected no-write browser QA at desktop and mobile widths, including the
   authenticated Growth Command Center packet state.
6. Seal deployment logs, artifact digest, ancestry, secret/history scan, and
   launch authority.

Production migration, merge, and deployment require their own later explicit
approval and cannot leapfrog PR #209 or any predecessor in the ordered train.
