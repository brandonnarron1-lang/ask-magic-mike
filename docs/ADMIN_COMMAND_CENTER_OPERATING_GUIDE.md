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

## Lead Lifecycle

Lead lifecycle changes are made from `/admin/leads` or `/admin/leads/[id]` and are enforced by the protected AdminOps server action. The canonical statuses are:

- `new`
- `scored`
- `assigned`
- `contacted`
- `qualified`
- `appointment_requested`
- `appointment_set`
- `nurture`
- `escalated`
- `converted`
- `dead`
- `spam`

The lifecycle action reloads the current lead status, validates the requested transition, patches one lead through an optimistic status filter, and writes a `lead.lifecycle_changed` audit event with the prior status, new status, actor, timestamp, and structured reason when present.

Same-state submissions are idempotent. Terminal success and loss states do not regress except for the explicit restore-to-new path from `dead`, `spam`, or `escalated`.

Closed-lost reasons use the structured lost reason set:

- chose another agent
- timing changed
- price expectations
- financing
- unresponsive
- duplicate
- outside service area
- other

Spam or disqualified records use the structured disqualification reason set:

- invalid contact
- spam
- not real estate
- unsupported location
- duplicate record
- internal test
- other

## Lead Detail And Timeline

The lead detail page shows the current lifecycle stage, assignment, source attribution, notification state, stalled-lead signals, and one unified activity timeline.

Timeline events are normalized from:

- lead capture time,
- source and campaign attribution,
- assignment and reassignment audit events,
- lifecycle audit events,
- notification outbox state changes.

Timeline metadata is intentionally concise. It must not include raw provider payloads, authorization headers, credentials, or full contact values.

## Stalled-Lead Triage

Stalled-lead signals are centralized in the AdminOps lifecycle model. Current thresholds are:

- unassigned past assignment SLA: 4 hours after capture,
- assigned but not contacted: 2 hours after assignment,
- contacted but not progressed: 72 hours after contact,
- appointment requested but not set: 48 hours after request,
- hot lead idle: 24 hours after capture for A/A+ or immediate-timeline leads.

Each stalled signal includes a reason, age, and next-action label. The signal is advisory; operators still use the normal assignment and lifecycle actions.

## Reporting Definitions

The allocation and reporting views use the current lead store to show:

- source mix,
- source conversion rate,
- campaign/source-detail performance,
- intent mix,
- timeline mix,
- stale unassigned leads,
- assigned leads by agent,
- current active load,
- agent conversion counts,
- stalled assigned leads,
- notification sent, retry, and permanent-failure counts,
- recent assignment activity.

The reporting denominators are:

- qualification rate: qualified-or-later leads divided by non-spam captured leads,
- appointment rate: appointment-set-or-later leads divided by qualified-or-later leads,
- conversion rate: converted leads divided by non-spam captured leads,
- close rate: converted leads divided by converted plus lost or disqualified leads.

These are operational triage measures, not production revenue claims. Empty windows should render explicit empty states instead of fabricated metrics.

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
  tests/adminops/admin-lead-timeline.test.ts \
  tests/adminops/admin-reporting-view.test.ts
```

Stop local Supabase when verification is complete:

```bash
supabase stop --no-backup
```

Do not use production data, production Supabase credentials, or live provider delivery for Admin Command Center verification.
