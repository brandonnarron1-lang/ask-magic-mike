# Phase 9 SLA truth and cadence hardening

Date: 2026-09-01

Status: stacked Draft application candidate; no Production, database,
WordPress, notification, or communication authority

## Decision

Harden the existing SLA sweep instead of adding another scheduler, queue,
provider, lead store, or CRM workflow.

The canonical first-response migration already states that mutable
`leads.last_contacted_at` is not proof of a first human response. The scheduled
sweep still trusted that projection, the shared Growth/Action Queue evaluator
also accepted it, and the Production cron ran only hourly. Those conditions
could hide an unproven response and detect a short-window breach too late.

## Canonical behavior

- The Neon SLA reader joins `lead_response_milestones` and treats only its
  eligible `first_human_response_at` value as response proof.
- The reader retains all response-eligible open lifecycle states, including
  `scored`, `escalated`, and a public `appointment_requested` record; terminal
  and deliberate nurture states remain outside this short-window sweep.
- Live leads and immutable milestone rows are independently screened for test
  and communication-suppression state.
- Synthetic-email screening remains a second application-level guard.
- Growth Intelligence and the existing Daily Action Queue use the same
  immutable-only first-response rule. `last_contacted_at` remains available for
  lifecycle and stale-nurture projections, but it cannot satisfy the response
  SLA.
- The existing authenticated, idempotent `/api/admin/sla/sweep` cron changes
  from hourly to every five minutes in `vercel.json`.
- Existing `record_sla_breach_v1`, compliance flags, analytics events,
  protected Lead Center views, Preview mutation guard, and cron bearer
  authorization remain unchanged.

## Safety and authority

- No schema, migration, table, route, secret, recipient, template, provider,
  message, lead, task, assignment, form, WordPress placement, or AI decision is
  added.
- The sweep remains internal. It does not email, text, call, acknowledge, or
  otherwise contact a consumer or staff member.
- The five-minute schedule is compatible with the established Vercel Pro
  project contract. Vercel Cron executes only from Production deployments, so
  Preview verification cannot start the schedule.
- The current accepted Production deployment remains PR #247 and retains its
  existing hourly schedule until this stacked train receives a later explicit
  release authorization.
- No NellySelly system, domain, database, project, secret, or deployment is in
  scope.

## Acceptance evidence

Focused deterministic verification passes 11 files / 68 tests covering the
immutable reader, suppression and synthetic exclusions, shared response-risk
contract, Action Queue coverage, Growth metrics, SLA engine/persistence,
authenticated cron behavior, active-route manifest, and exact five-minute
cron policy.

The complete local Node 24.18.0 release gate passes 294 test files / 3,538
tests, strict TypeScript, full ESLint, 14/14 release-safety checks, system
isolation, an optimized Next.js 15.5.21 build, and all 102 active routes. A
first unbounded-worker attempt reached 285/294 files and 3,458 passing tests
before the host exhausted temporary disk; a clean two-worker rerun completed
with zero test failures.

The Production dependency audit reports no known vulnerabilities and the
redacted staged-change and exact-commit Gitleaks scans report no leaks. Hosted
CI, immutable Preview QA, and runtime logs remain required before this Draft
can be called release-ready.

## Rollback

Before release, close the Draft. After a separately authorized same-tree
release, revert the merge or restore the immediately preceding Ready Vercel
deployment. That restores the earlier schedule and reader together. There is
no schema, external data, message, or provider state to unwind.
