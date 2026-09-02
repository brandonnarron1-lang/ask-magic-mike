# Phase 9 first-response Action Queue reconciliation

Date: 2026-09-01

Status: stacked Draft application candidate; no Production or communication
authority

## Decision

Repair the existing protected Daily Action Queue instead of creating another
queue, SLA service, task store, notification, or CRM workflow.

Authenticated read-only Production evidence showed one eligible live lead in
the 90-day Growth view, one speed-to-lead risk, zero immutable first-human-
response milestones, and zero open items in the Daily Action Queue. The
notification ledger was healthy: one terminal internal alert and zero
permanent internal failures. The defect was therefore not capture or delivery;
it was a drift between two existing read models.

Growth Intelligence correctly evaluated recent, non-terminal, uncontacted
leads after 15 minutes. The Daily Action Queue evaluated only explicit tasks,
appointments, notification retries, and older stalled-lead thresholds of two
to four hours. It also did not read the immutable
`lead_response_milestones` ledger.

## Reused architecture

- canonical Neon `leads` and `lead_response_milestones` tables;
- existing Growth Intelligence response-risk summary;
- existing protected `/admin/action-queue` page;
- existing Better Auth and server-side `task:manage_assigned` authorization;
- current agent-only assigned-lead filtering;
- existing tasks, appointments, stalled signals, and notification retry rows;
- current Lead Center detail route, which already records an immutable first
  human response only through an authenticated human action.

No route, database table, provider, message, assignment engine, or parallel
queue was added.

## Shared deterministic contract

`app/lib/firstResponseRisk.ts` is now the single pure evaluator used by Growth
Intelligence and the Action Queue. A first-response risk exists only when:

1. the durable lead is not test or communication-suppressed;
2. its effective lifecycle state is non-terminal;
3. its creation time is valid and within the most recent seven days;
4. at least 15 minutes have elapsed;
5. no valid immutable first-human-response timestamp exists.

The evaluator returns an explainable reason, exact SLA due time, and age in
minutes. Invalid, future, excluded, terminal, responded, stale, and inside-SLA
inputs fail closed. A mutable `leads.last_contacted_at` projection alone is
not accepted as first-response proof.

## Queue behavior

The canonical Neon queue query now left-joins the immutable response ledger
while independently excluding test and suppressed rows on both sides. It marks
response evidence as available only when that canonical join was actually
performed. The legacy fallback cannot manufacture response-risk items from an
unknown ledger state.

An uncovered response risk creates one existing queue-card shape:

- type `first_response_overdue`;
- priority `1`;
- due time equal to durable creation time plus 15 minutes;
- current immutable assignment identity when available;
- protected link to the existing lead detail; and
- next action: complete one-to-one follow-up and record the immutable
  first-response milestone.

The queue does not duplicate work. An existing priority-1/2 task or
appointment covers the response risk. When the response risk is covered, older
unassigned, assigned-not-contacted, and hot-idle signals do not add a second
card for the same underlying first-contact obligation. Other independent
follow-up, appointment, outcome, and retry actions remain unchanged.

## Security, privacy, and authority

- The change is read-only and performs no lead, task, status, response,
  assignment, notification, analytics, or provider mutation.
- Test and communication-suppressed rows are excluded in SQL and again in the
  pure builder.
- Agent roles continue to see only queue items assigned to their immutable
  agent identity; broader visibility still requires `lead:view_all`.
- No recipient, contact value, question, address, message body, secret, or row-
  level Production evidence is committed to the repository.
- A queue recommendation is not proof that contact occurred and cannot record
  the response milestone automatically.
- No email, SMS, Push, call, reassignment, consumer acknowledgment, or AI
  mutation authority is added.

## Verification and release boundary

Focused tests cover the exact threshold, active window, exclusion reasons,
canonical Neon join, unavailable-ledger failure, deterministic priority and
due time, and duplicate suppression. Growth regression tests prove the shared
evaluator preserves the existing aggregate contract.

This candidate is stacked behind PR #257 and ultimately PR #248. It cannot
leapfrog the only current application gate, and it creates no independent
Production approval phrase while stacked. After a future refreshed release,
acceptance must prove that every eligible Growth response risk is represented
by either `first_response_overdue` or an existing priority-1/2 action, without
exposing lead details in evidence.

Rollback before release is to close the Draft. After a separately approved
application release, revert the merge or restore the immediately preceding
Ready Vercel deployment. There is no schema or external state to unwind.
