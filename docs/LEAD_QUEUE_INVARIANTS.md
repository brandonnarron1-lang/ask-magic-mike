# Lead Queue Invariants

Phase 5 makes the clean queue a code and monitor contract, not a manual habit.

## Runtime contract

1. `is_test=true` never enters Active/New, Working, or Qualified views.
2. `communication_suppressed=true` never enters an operational view even when
   `is_test=false`.
3. Test and suppressed records remain reviewable under Spam / Test / Closed.
4. Test records show a TEST badge and their durable creation timestamp.
5. Test or suppressed records cannot be routing-ready and produce no stalled signals.
6. Canonical Neon reporting excludes test and suppressed lead rows in SQL.
7. Appointment and follow-up metrics join to live, unsuppressed lead rows and
   are defensively filtered against the live-lead ID set before aggregation.
8. Allocation and SLA reads exclude test and suppressed records before scoring.
9. A consumer is not classified as QA because a name or message contains an
   ordinary word such as “test.” Explicit `is_test=true` or the exact internal
   QA + do-not-contact marker pair is required at ingestion.
10. The first-live cron reports nonzero queue-health state when a QA record is
   unsuppressed or lacks privacy-safe evidence of an authorized QA origin.

## KPI exclusions

QA and suppressed records do not count toward live leads, qualification,
assignment/first-contact SLA, agent performance, form/campaign conversion,
appointments, clients, closings, or revenue. Test rows remain available only
for audited technical evidence.

## Evidence

- Unit/UI filter: `tests/adminops/admin-lead-view.test.ts`
- Reporting appointments/tasks: `tests/adminops/neon-reporting-exclusions.test.ts`
- Explicit QA classification: `tests/leadops/normalize-payload.test.ts`
- Monitor assertions: `tests/operations/first-live-lead-monitor.test.ts`
- Production point-in-time query: 0 unsuppressed QA; 0 QA without explicit evidence.

No preserved QA row was modified to establish these invariants.
