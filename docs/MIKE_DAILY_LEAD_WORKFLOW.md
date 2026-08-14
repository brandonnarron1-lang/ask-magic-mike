# Mike Daily Lead Workflow

## Alert priority

- `HOT` (80-100): open first and accept assignment immediately.
- `ACTIVE` (60-79): review after every HOT or unassigned lead.
- `NEW` (below 60): validate and place into the correct next-action queue.
- `[TEST]`: internal QA only. Do not call, text, email, or include in KPIs.

## Every new genuine lead

1. Open the authenticated Lead Center at the start of the day and after each
   internal alert.
2. Work in this order: unassigned, HOT, overdue SLA, notification failures,
   ACTIVE, then NEW/follow-up work.
3. Open the lead detail; confirm source, consent/channel permission, duplicate
   master, score factors, assignment reason, and original request.
4. Accept the assignment within the two-minute internal target.
5. Use only a permitted contact channel. First human contact has a five-minute
   internal target; neither target is a public promise.
6. Record the exact outcome: `attempted`, `contacted`, `appointment requested`,
   `appointment set`, `nurture`, `signed client`, `closing`, `bad lead`, or
   `unavailable-owner fallback`.
7. Add a concise note, next action, owner, and due time. Never copy raw lead PII
   into an external note, document, or personal device.
8. If no owner is available, leave the lead unassigned/admin-review and escalate
   through the Lead Center; the audit BCC is not an assignment.

## Daily close

Clear or explicitly escalate unassigned and overdue items, review failed
deliveries, confirm appointments/follow-ups, and reconcile new public submissions
against durable lead and notification rows. Use the technical escalation path in
`PRODUCTION_MONITORING_RUNBOOK.md` for readiness, database, duplicate, or delivery
failures.

Target operational SLA remains configurable. The dashboard deadline is an
internal workflow goal, not a public response-time promise.
