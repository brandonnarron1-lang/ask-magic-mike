# Phase 9 Public Analytics Ingress Boundary

Date: 2026-09-02
Status: isolated successor to stacked Draft PR #268; Production unchanged

## Decision

Harden the analytics path already used by the public application instead of
introducing another event service. The build and route-manifest audit found
one active handler family that converges on the canonical server-side Neon
ledger:

- `POST /api/events` accepts the current snake-case browser payload;
- `POST /api/widget/events` re-exports that exact handler.

A historical camel-case adapter remains at
`src/app/api/analytics/event/route.ts`, alongside older `src/app` components.
The canonical root `app/` router excludes that source from the build, and the
102-route manifest contains no `/api/analytics/event` endpoint. The candidate
hardens that dormant adapter in case router ownership changes, but deliberately
does not activate it or make it a public compatibility commitment.

The audit also found that Production could persist after a non-durable limiter
fallback and several responses lacked a uniform private correlation contract.
The dormant compatibility source also accepted an absent Origin and automation
could enter its KPI ledger if it were ever activated. This candidate closes
those boundaries without changing the active request format, event vocabulary,
property minimization, route manifest, or repository ownership.

## Public contract

- Every active state-changing request requires an explicit origin accepted by
  the current Ask Magic Mike / Our Town Properties public-origin policy.
- Declared and streamed JSON input remains capped at 4 KB.
- Existing event-name, public-event, protected-ledger-event, property, path,
  attribution, field-experience, and PII filters remain authoritative.
- Every response is `private, no-store`, includes `Pragma: no-cache`, and
  carries a server-generated `correlation_id` matching
  `X-AMM-Correlation-Id`.
- Public validation failures expose stable safe codes, not Zod issue trees,
  database details, environment values, or provider internals.
- HTTP 429 includes a positive `Retry-After` bounded by the existing one-minute
  analytics window.

## Runtime ordering

Origin validation runs before all shared state. A recognized automated browser
receives HTTP 202 with `persisted=false` and `excluded=automation` before the
Preview guard, limiter, or analytics repository. This prevents controlled QA
from inflating conversion evidence or consuming a durable rate-limit bucket.

A normal read-only Preview request is refused by the existing endpoint-aware
mutation guard before limiting or persistence. Production then invokes the
canonical shared limiter. Persistence is reachable only after an allowed
durable result. A non-durable allowed result returns HTTP 503 with
`rate_limit_store_unavailable`; the previously documented exact
`RATE_LIMIT_EMERGENCY_MEMORY=1` setting remains the sole Production break-glass
exception. A denied limiter result returns 429 and never persists, regardless
of limiter durability.

## Trust limits

Origin checks, coarse user-agent classification, and public rate limiting
reduce abuse; they do not authenticate a person, prove consent, establish a
lead, or authorize a canonical conversion. Public callers still cannot attach
canonical lead or agent identity or write protected server-owned lifecycle and
notification outcomes. Durable lead, appointment, routing, notification, and
admin events remain server-owned after their own authorized transactions.

## Scope and non-actions

This candidate changes the active handler, the dormant historical adapter,
focused tests, and documentation. It adds no endpoint, request field, event,
table, migration, store, provider, queue, cron, environment variable, browser
component, visual, or WordPress integration. It emits no remote analytics
event and sends no lead, email/BCC, SMS, Push, or consumer acknowledgment.

## Release order and rollback

This branch starts from exact PR #268 head
`93b44071bec9110ba391179beebddc8cbd91f011` and remains downstream of the
ordered Draft stack beginning at PR #248. PR #248 remains the only currently
requestable application merge/deployment gate.

Rollback is application-only: revert the route/test/documentation commit or
restore the immediately preceding accepted Ready deployment. No database row,
schema object, provider record, lead, message, analytics backfill, WordPress
revision, or DNS record needs restoration.
