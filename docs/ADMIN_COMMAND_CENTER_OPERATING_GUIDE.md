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

## Daily Action Queue

Use `/admin/action-queue` as the first daily operating surface. It orders work by:

1. overdue follow-ups,
2. appointment requests or reschedule requests that are not scheduled,
3. appointments occurring today or needing confirmation,
4. stalled leads,
5. retry-scheduled notification review.

Each queue row links directly to the lead detail page and shows action type, owner, due time, current status, and the recommended next action. Appointment-specific rows suppress duplicate generic stalled-lead rows for the same lead so operators see the most precise action first.

## Appointment Operations

Appointment state is stored in `lead_appointments` and managed from `/admin/leads/[id]` through the protected AdminOps server boundary. The canonical states are:

- `requested`
- `scheduled`
- `confirmed`
- `completed`
- `canceled`
- `no_show`
- `reschedule_requested`

Allowed transitions are:

- `requested` -> `scheduled` or `canceled`,
- `scheduled` -> `confirmed`, `canceled`, or `reschedule_requested`,
- `confirmed` -> `completed`, `no_show`, `canceled`, or `reschedule_requested`,
- `canceled` -> `reschedule_requested`,
- `no_show` -> `reschedule_requested`,
- `reschedule_requested` -> `scheduled` or `canceled`.

Same-state appointment submissions are idempotent. Scheduled, confirmed, and completed appointments require a valid start time. End time, when supplied, must be after start time. Timezone is validated server-side.

Creating or updating an appointment writes an append-only audit event and synchronizes the lead lifecycle where appropriate:

- requested or reschedule requested -> `appointment_requested`,
- scheduled, confirmed, completed, or no-show -> `appointment_set`,
- canceled preserves the lead lifecycle.

External calendar writes are not active. The current boundary is local/AdminOps only; future calendar integration must use an adapter with explicit idempotency, failure classification, cancellation handling, and separate owner approval.

## Follow-Up Tasks

Follow-up work uses the existing `tasks` table with `category=followup:*`. Operators can create, complete, cancel, or reschedule follow-ups from `/admin/leads/[id]`.

Supported follow-up types are:

- first contact,
- qualification follow-up,
- appointment confirmation,
- appointment follow-up,
- document follow-up,
- nurture check-in,
- manual callback.

Follow-ups have an owner when the lead is assigned, a due timestamp, priority, and status. Completed and canceled actions are idempotent. Rescheduling requires a valid due timestamp. Every mutation writes an append-only audit event when the audit store is available.

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

Lifecycle field cleanup is destination-specific:

- restore to `new`: clears `conversion_stage`, `converted_at`, `closed_won_at`, `closed_lost_at`, `closed_lost_reason`, and `appointment_requested`; capture and assignment history are preserved,
- move to `contacted`: sets `last_contacted_at` and `conversion_stage=contacted`; success/loss fields are cleared,
- move to `qualified`: sets `conversion_stage=qualified`; success/loss fields are cleared,
- move to `appointment_requested`: sets `appointment_requested=true` and `conversion_stage=appointment_requested`; success/loss fields are cleared,
- move to `appointment_set`: sets `appointment_requested=true` and `conversion_stage=appointment_set`; success/loss fields are cleared,
- move to `nurture` or `escalated`: sets the matching `conversion_stage`; success/loss fields are cleared,
- move to `converted`: sets `converted_at`, `closed_won_at`, and `conversion_stage=converted`; loss fields are cleared,
- move to `dead`: sets `closed_lost_at`, `closed_lost_reason`, and `conversion_stage=dead`; success fields are cleared,
- move to `spam`: sets `closed_lost_at`, `closed_lost_reason`, and `conversion_stage=disqualified`; success fields and `appointment_requested` are cleared.

If the lead update succeeds but the audit write fails, the action returns degraded success with `lifecycle_updated_audit_failed` and the UI shows: `Lifecycle updated, but the audit event could not be recorded.` The lead update is not falsely reported as failed, but audit completeness is not guaranteed for that operation.

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

`dead` accepts only lost reasons. `spam` accepts only disqualification reasons. Non-terminal statuses reject submitted terminal reasons.

## Lead Detail And Timeline

The lead detail page shows the current lifecycle stage, assignment, source attribution, notification state, stalled-lead signals, and one unified activity timeline.

Timeline events are normalized from:

- lead capture time,
- source and campaign attribution,
- assignment and reassignment audit events,
- lifecycle audit events,
- appointment events,
- follow-up task events,
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
- appointment rate: appointment-requested-or-later leads divided by qualified-or-later leads,
- conversion rate: converted leads divided by non-spam captured leads,
- close rate: converted leads divided by converted plus closed-lost (`dead`) leads,
- disqualification rate: spam or disqualified leads divided by all captured leads.

Appointment and follow-up reporting uses:

- request-to-scheduled rate: scheduled-or-later appointments divided by requested plus scheduled-or-later appointments,
- scheduled-to-completed rate: completed appointments divided by scheduled-or-later appointments,
- no-show rate: no-show appointments divided by confirmed-or-later appointments,
- follow-up completion rate: completed follow-up tasks divided by all follow-up tasks in the selected window.

These are operational triage measures, not production revenue claims. Empty windows should render explicit empty states instead of fabricated metrics.

## Local Verification

Use the local staging harness before reviewing AdminOps changes:

```bash
pnpm run staging:local:up
pnpm run staging:local:verify
pnpm run staging:local:fixtures
```

Then run the focused AdminOps suites:

```bash
pnpm exec vitest run \
  tests/adminops/admin-agent-allocation-actions.test.ts \
  tests/adminops/admin-agent-allocation-view.test.ts \
  tests/adminops/admin-notification-guards.test.ts \
  tests/adminops/admin-appointment-followup-ops.test.ts \
  tests/adminops/admin-lead-actions.test.ts \
  tests/adminops/admin-lead-timeline.test.ts \
  tests/adminops/admin-reporting-view.test.ts
```

Clean up exact local fixtures when browser checks are complete:

```bash
pnpm run staging:local:fixtures:cleanup
```

The fixture cleanup never truncates tables. Audit rows are append-only by schema policy and may be retained as local evidence even when exact cleanup removes fixture sessions, agents, leads, attribution, and notification rows.

Stop local Supabase when verification is complete:

```bash
supabase stop --no-backup
```

Do not use production data, production Supabase credentials, or live provider delivery for Admin Command Center verification.
