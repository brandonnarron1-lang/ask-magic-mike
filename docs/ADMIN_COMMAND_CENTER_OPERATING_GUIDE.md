# Admin Command Center Operating Guide

This guide covers the AdminOps controls that are active in the Ask Magic Mike command center.

## Daily Allocation Flow

1. Open `/admin/allocation`.
2. Review the KPI strip for unassigned leads, hot unassigned leads, assigned active leads, and available agents.
3. Check the agent cards before assigning a lead:
   - inactive agents are excluded from assignment,
   - agents at capacity are excluded from assignment,
   - capacity is computed from live active assigned leads,
   - routing priority is visible and editable.
4. Assign hot and stale leads first.
5. Review recent assignment activity and notification outbox state before ending the triage pass.

## Agent Operations

Each agent card supports guarded updates for:

- active routing status,
- maximum lead capacity,
- manual current load,
- routing priority,
- agent email notification preference,
- agent SMS readiness preference.

Saving agent operations writes to the `agents` table through the protected AdminOps server action and records an `agent.operations_updated` audit event when the audit store is configured.

Manual assignment is also guarded server-side. The assignment action rejects:

- inactive agents,
- agents whose active assigned lead count has reached `max_daily_leads`,
- invalid lead IDs,
- invalid agent IDs,
- assignment conflicts caused by concurrent reassignment.

The UI only offers currently eligible agents in the assignment selector, but the server-side guard is the authoritative boundary.

## Lead Assignment And Reassignment

Assignments use the protected `/admin/allocation` action path:

1. load current lead assignment,
2. verify selected agent eligibility,
3. patch exactly one lead through a narrow optimistic filter,
4. write assignment audit,
5. create the idempotent assignment notification event when applicable.

Same-agent assignment is a no-op and does not create another audit or notification row.

## Notification Review

The allocation page summarizes the notification outbox and links to `/admin/notifications` for details and one-record retry controls.

Notification delivery remains governed by the notification provider gates. Local and staging verification must keep external delivery disabled unless a later mission explicitly authorizes a controlled provider sandbox send.

## Reporting Definitions

The allocation view uses the current lead store to show:

- source mix,
- intent mix,
- timeline mix,
- stale unassigned leads,
- assigned leads by agent,
- recent assignment activity.

These are operational triage measures, not production revenue claims.

## Local Verification

Use the local staging harness before reviewing AdminOps changes:

```bash
pnpm run staging:local:up
pnpm run staging:local:verify
```

Then run the focused AdminOps suites:

```bash
pnpm exec vitest run \
  tests/adminops/admin-agent-allocation-actions.test.ts \
  tests/adminops/admin-agent-allocation-view.test.ts \
  tests/adminops/admin-notification-guards.test.ts \
  tests/adminops/admin-lead-actions.test.ts \
  tests/adminops/admin-reporting-view.test.ts
```

Stop local Supabase when verification is complete:

```bash
supabase stop --no-backup
```

Do not use production data, production Supabase credentials, or live provider delivery for Admin Command Center verification.
