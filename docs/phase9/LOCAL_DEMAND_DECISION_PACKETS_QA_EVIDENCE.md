# Phase 9 local-demand decision packets QA evidence

Date: 2026-08-29

Candidate branch: `codex/phase9-local-demand-decision-packets-20260825`

Base: exact sealed PR #221 head
`61e152cb7ce03fd1904a06f30435dbe7ef36c4e1`

Status: reconciled local candidate verified; immutable exact-head Preview and
protected browser evidence pending; Production unchanged

Original code-bearing commit before final PR #221 reconciliation:
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

Result after reconciliation: 8 focused files / 60 tests PASS, including the
decision builder, source parser, durable truth guard, ingress authorization,
Neon endpoint identity, and PR #221 public-event Preview refusal contracts.

The release candidate also includes a deployed-browser acceptance spec for the
authenticated Growth Command Center. It exercises desktop and mobile widths,
requires a 200 response and meaningful rendered content, rejects framework
error overlays, console/page errors, horizontal overflow, non-allowlisted packet
links, and every same-origin non-read HTTP request, and captures full-page screenshots. The
spec passed locally at both widths against the truthful unconfigured/empty
state. Hosted exact-head execution remains part of the Preview seal below.

The final sealed PR #221 funnel-identity browser proof is preserved unchanged.
PR #222 adds only the separate read-only Growth Command Center acceptance spec;
it does not weaken, replace, or reinterpret PR #221 session-linkage assertions.

## Executable PostgreSQL 17 proof

A disposable, unexposed PostgreSQL 17 runtime was created with only a minimal
`market_signals` contract and explicit `anon`, `authenticated`, and
`service_role` roles. One historical canonical conversation row was inserted
before the migration. Then
`20260825060000_local_demand_metric_truth_guard.sql` was applied. The final
reconciliation proof ran on PostgreSQL 17.11 over a private local socket/loopback
runtime; no Docker, Neon, or remote database was required.

PASS cases:

- current `website_clicks` canonical signal inserted;
- new canonical `business_conversations` insert rejected with SQLSTATE `23514`;
- update from a current metric to the retired metric rejected with SQLSTATE
  `23514`;
- trigger-function execution remained revoked from all three browser/service
  roles;
- one pre-migration historical canonical row remained present and unchanged;
- a noncanonical archive row remained outside the guard's source scope; and
- the temporary cluster was stopped and moved to the user's Trash after the
  test, outside every application execution path.

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
| Final focused decision/metric/route/migration suite | PASS — 8 files / 60 tests |
| Full Vitest suite | PASS — 263 files / 3,299 tests |
| Strict TypeScript | PASS |
| Full ESLint | PASS |
| Optimized Next.js build | PASS — Next.js 15.5.21 / 59 static pages |
| Active route manifest | PASS — 95 routes / 17 acknowledged duplicates |
| Release safety | PASS — 14/14 |
| Ask/NellySelly deployable-source isolation | PASS |
| Production dependency audit | PASS — no known vulnerabilities |
| Touched-path security review | PASS — no actionable finding |
| Growth decision-packet browser acceptance | PASS — 2/2 local desktop/mobile checks |
| PR #221 funnel identity proof | Preserved byte-for-byte relative to exact sealed PR #221 |
| `git diff --check` | PASS |
| Release doctor before commit | HEALTHY — 42 pass / one expected nonblocking dirty-tree finding |
| Release doctor on clean reconciled commit | Pending exact-head rerun after the merge commit |

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

The final PostgreSQL proof used Homebrew PostgreSQL 17.11 `initdb`, `pg_ctl`, and
`psql -v ON_ERROR_STOP=1` against a disposable local cluster. It was stopped and
moved recoverably to Trash after completion. No command printed a secret.

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
approval and cannot leapfrog PRs #210 through #221 in the ordered train. After
those predecessors release and this candidate is refreshed and reproven against
exact `main`, its only application/database release phrase is:

`APPROVE PHASE 9 LOCAL-DEMAND METRIC TRUTH GUARD MIGRATION, PR 222 MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`
