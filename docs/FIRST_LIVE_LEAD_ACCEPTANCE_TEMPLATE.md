# First Live Lead Acceptance Record

Classification: **PROTECTED OPERATIONS RECORD — NEVER USE FOR QA**

Complete this record inside the protected operator workspace. Redact contact
data from screenshots and shared artifacts.

| Field | Protected value / status |
| --- | --- |
| Confirmed non-QA | `is_test=false`; no QA markers; suppression follows actual consent |
| Submission timestamp |  |
| Entry route |  |
| WordPress entry ID, if applicable |  |
| Canonical Neon lead ID |  |
| Lead type |  |
| First-touch source |  |
| Latest-touch source |  |
| Campaign |  |
| Landing page |  |
| Consent state and version |  |
| Score |  |
| Score explanation |  |
| Assigned owner |  |
| Assignment reason |  |
| Assignment accepted at |  |
| Outbox record |  |
| Resend provider message ID |  |
| Hidden BCC confirmed, value withheld |  |
| Web Push result |  |
| Duplicate result / master record |  |
| First permitted human contact at |  |
| Contact outcome |  |
| Appointment state |  |
| Nurture state |  |
| Signed-client state |  |
| Closing state |  |
| Attributed revenue, when known |  |

## Acceptance checks

- [ ] Canonical storage completed before notification.
- [ ] Consent and source records exist.
- [ ] One `lead.first_live_detected` audit event exists.
- [ ] Assignment is present and accepted within the internal two-minute target.
- [ ] Internal email is sent with provider ID; any failure is visible and retried.
- [ ] No duplicate lead or duplicate alert exists.
- [ ] No automatic consumer contact was initiated by the monitor.
- [ ] First permitted human contact is recorded against the internal five-minute target.
- [ ] QA and public analytics exclude no genuine record.

These are internal operating targets, not public response-time guarantees.
