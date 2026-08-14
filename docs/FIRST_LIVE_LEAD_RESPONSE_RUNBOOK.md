# First Live Lead Response Runbook

These are internal operating targets, not public response-time guarantees.

## Immediate triage

1. Confirm `is_test=false` and all QA markers are absent.
2. Confirm communication suppression reflects the submitted consent; never
   remove suppression merely to make follow-up easier.
3. Confirm one canonical lead and one local WordPress entry when WordPress is the
   source.
4. Confirm source, campaign, landing page, form/placement, click IDs, consent,
   score, assignment, and routing reason.
5. Confirm the internal notification is `sent` and has a provider message ID.
6. Confirm no duplicate lead or duplicate message exists.
7. Start the assignment timer.

## Targets and escalation

| State | Target | Escalation |
| --- | --- | --- |
| Assignment acceptance | Within 2 minutes | Mike/admin alert; mark `unaccepted_assignment` |
| First human contact | Within 5 minutes when consent permits | Mike/admin alert; mark `first_contact_sla_breach` |
| Failed email | Immediate | Keep lead stored; retry with bounded backoff; mark `notification_failed` |
| Unassigned lead | Immediate | Assign to Mike or `unassigned_admin_review`; store routing reason |
| Duplicate suspicion | Before contact | Link to master; preserve prior owner; do not double-contact |
| Invalid contact | Before contact | Mark invalid field, preserve record, request admin review |
| Out of area | Before advice | Mark `out_of_area_review`; do not promise coverage |
| Coastal request | Before advice | Mark `coastal_review`; no unapproved territory claims |

## Human outcome recording

Record attempted, contacted, appointment, nurture, signed client, closing, bad
lead, and attributed revenue only when they actually occur. Never rewrite a live
lead as QA, delete it for dashboard cleanliness, or use it for testing.

## Current first action

Review WordPress Form 7 entry 1550 as a possible genuine property-alert request.
It is not in Neon because Form 7 is intentionally not allowlisted. Do not use it
as QA. Confirm whether the existing native notification reached its operational
recipient, then perform only consent-permitted human follow-up.
