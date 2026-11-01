# Agent allocation status

Status: `LIVE_PRODUCTION`

The protected Lead Center supports deterministic scoring, assignment,
reassignment, assignment audit, role-based views, notes, tasks, stage changes,
SLA/action queues, notification history, and export auditing.

## Current routing authority

- Mike remains the default approved owner for seller, value, urgent, unmapped
  buyer/listing, and other leads under the current rules.
- Existing approved owner is retained for duplicates unless an authorized
  reassignment occurs.
- Missing eligible recipient resolves to unassigned/admin review with an alert;
  BCC is never treated as assignment.
- AI may summarize or recommend but cannot silently set score, priority,
  assignment, suppression, or communication permission.

## Expansion boundary

Agent-specific routing beyond Mike requires an approved roster, exact
listing/open-house/property mapping, role/object-scope verification, and agent
acceptance. Batch B will consolidate first-response coverage and SLA truth;
Batch D will add bounded open-house host/property mapping. No roster or live
assignment mapping was changed here.
