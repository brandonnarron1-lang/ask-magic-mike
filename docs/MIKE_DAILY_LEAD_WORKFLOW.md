# Mike Daily Lead Workflow

## Solo-operator handling

Brandon is the product operator/tester; Mike remains the assigned lead owner and
alert recipient. Use the actual operator's own authorized account, never Mike's
credentials or signature. Ownership does not require Mike to join development,
inbox/device QA or a technical approval. An administrator's existing scope can
support handling a Mike-owned request without reassignment; a scoped agent still
needs direct action authority. Unknown previous contact stays unknown.

On a source that includes the contact-readiness correction, open the protected
lead overview → **Contact readiness**. It shows supplied methods, the specific
permission reason and expandable wording/version/time. If eligible, choose
**Review & email**, read the unsent prepared reply, confirm the review and open
your email app. Nothing sends or records a response automatically; fresh access
and permission are checked again. **Save evaluation to audit** is not consent
approval. An explicit hold/denial/opt-out remains restricted. Record an actual
result and next task only after it happened. Keep the existing review task's real
due/overdue state; do not replace it with another reminder.

## Current operating check — October 30, 2026

Use your own Better Auth account: `/lead-center-login?returnTo=/admin/today`.
An alert is a pointer to a saved request, not proof of an assignment or consumer
contact. Never share credentials or put contact details in an external checklist.
Public forms do not require a staff/consumer account. Live allocation stays OFF.
Current broker-approved availability, service coverage, staffed hours and backup
must be confirmed from current records; neither this guide nor a routing label
attests them. Missing readiness must not stop capture or Mike/Brandon alerts.

## Alert priority

- `HOT` (80-100): open first and accept assignment immediately.
- Priority `ACTIVE` (60-79): review after every HOT or unassigned lead; this is
  not an assignment acknowledgment or lifecycle state.
- `NEW` (below 60): validate and place into the correct next-action queue.
- `[TEST]`: internal QA only. Do not call, text, email, or include in KPIs.

## Every new genuine lead

1. Open the authenticated Lead Center at the start of the day and after each
   internal alert.
2. Work in this order: unassigned, HOT, overdue SLA, notification failures,
   ACTIVE, then NEW/follow-up work.
3. Open the lead detail; confirm source, consent/channel permission, duplicate
   master, score factors, assignment reason, and original request.
4. Check the actual assignment and deadline on the record. Legacy capture SQL
   sets two-minute acceptance/five-minute contact targets; the separate offer
   claim service retains its own offer deadline and follow-up due time. These
   are distinct contracts, not proof of achieved response or staffed capacity.
   No timer is changed by this guide; the proposed 15-staffed-minute policy is
   NOT activated. Escalate an unavailable owner rather than invent acceptance.
5. Use only a currently permitted channel after the action's fresh permission
   check. Supplied contact visibility does not itself grant contact permission.
   Inherited canonical ownership grants reading, not mutation: a genuine repeat
   inquiry needs direct assignment in the existing queue and deliberate
   supervisor resolution of its duplicate-stage hold. Preserve its own consent.
6. Record only the actual result: an attempt/no answer, a real two-way
   conversation, an appointment request, a separately confirmed appointment,
   nurture or a documented terminal/outcome reason. Opening a native composer
   or clicking a call button is not sent/contacted/booked or a first response.
7. Add a concise note, next action, owner, and due time. Never copy raw lead PII
   into an external note, document, or personal device.
8. If no owner is available, leave the lead unassigned/admin-review and escalate
   through the Lead Center; the audit BCC is not an assignment.

## Opening, during the day, and closing

- Opening: read Today, the authorized lead queue and notification exceptions.
  Distinguish action counts from unique inquiries; respect limited/unavailable
  coverage rather than reporting missing counts as zero.
- New work: triage unassigned, held/failed/unknown alerts, overdue actions and
  genuine repeat inquiries. Do not retry, reassign, drain a queue or contact a
  consumer merely to test the workflow. QA records remain read-only/suppressed.
- After permitted human follow-up: record the real result, next-action owner
  and due time. Escalate exceptions through existing authorized staff workflow;
  do not schedule work for Mike or name a backup without genuine acceptance.
- Closing: review unacknowledged/unassigned/overdue/failed-alert exceptions and
  each pending next action. Leave a truthful hold when staffing or consent is
  missing; do not clear a deadline by fabricating contact.

## Delivery and operator acceptance

Provider acceptance, recipient-server delivery and personal mailbox receipt are
different evidence. Review Mike and Brandon separately in Acquisition operations;
the audit recipient is not an assignment. For a human walkthrough, the operator
locates an existing alert, follows its saved-lead link through their own sign-in,
and confirms contact/request/source/timing/owner/consent/next-action visibility.
Record operator, observed time/device and each actual step; automated screenshots
and older acceptance do not establish today's human or mailbox acceptance.

For an empty inquiry cohort there is no delivery/follow-up denominator. Unknown
visits or report access are not zero demand. Do not use the write-producing
first-live endpoint, retry buttons or “Record observed proof” as health probes.

## Daily close detail

Clear or explicitly escalate unassigned and overdue items, review failed
deliveries, confirm appointments/follow-ups, and reconcile new public submissions
against durable lead and notification rows. Use the technical escalation path in
`PRODUCTION_MONITORING_RUNBOOK.md` for readiness, database, duplicate, or delivery
failures.

Target operational SLA remains configurable. The dashboard deadline is an
internal workflow goal, not a public response-time promise.
