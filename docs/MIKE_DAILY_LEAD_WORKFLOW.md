# Mike Daily Lead Workflow

1. Open the authenticated Lead Center at the start of the day and after each
   internal alert.
2. Work in this order: unassigned, hot, overdue SLA, notification failures, then
   active/new follow-ups. Test leads never enter the production queue.
3. Open the lead detail; confirm source, consent/channel permission, duplicate
   master, score factors, assignment reason, and original request.
4. Accept/assign the lead, make the approved contact, record outcome and note,
   set stage, next action, due time, and suppression when requested.
5. Before close, clear unassigned and overdue items, review failed deliveries,
   and reconcile new public submissions against durable lead/outbox rows.

Target operational SLA remains configurable. The dashboard deadline is an
internal workflow goal, not a public response-time promise.
