# Lead Status Definitions

| Status | Meaning | Required next step |
| --- | --- | --- |
| `new` | Durable lead, not yet accepted | validate assignment and contact permission |
| `assigned` | Owner recorded | assigned person accepts within SLA |
| `contacting` | First outreach in progress | record attempt/channel/outcome |
| `qualified` | Brokerage-relevant need and follow-up agreed | task/appointment/pipeline action |
| `nurture` | Valid but later/uncertain | consent-compliant dated follow-up |
| `appointment_requested` | Consumer requested scheduling | confirm; never invent availability |
| `appointment_set` | Human-confirmed appointment | record date/owner/context |
| `closed_won` | Brokerage-approved converted outcome | record source/outcome audit |
| `closed_lost` | Not proceeding | reason and suppression if requested |
| `duplicate` | Linked to canonical master | retain approved owner and one alert path |
| `suppressed` | No outbound contact on blocked channel(s) | preserve evidence; do not silently re-enable |
| `test` | `is_test=true`, internal QA only | exclude from KPIs and suppress contact |

Notification state is separate: `queued`, `processing`, `sent/delivered`,
`retry_scheduled`, `permanently_failed`, or `skipped`. Assignment state must not
be inferred from a BCC copy or notification delivery.
