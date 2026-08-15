# Phase 6 Messaging System

## Inventory

- 33 registered templates across email, SMS, internal email, push, and call scripts.
- 8 approval-required sequence definitions.
- 13 shared stop conditions.
- Quiet hours: 9:00 AM to 8:00 PM America/New_York.
- Default frequency caps: 2 SMS messages per 24 hours and 5 per 7 days.
- STOP-family and HELP/INFO inbound keyword classification.

## Purpose separation

`requested_service_response`, `transactional_acknowledgment`, `appointment_coordination`, `property_alert_subscription`, and `marketing_nurture` are separate permissions. A form request is not treated as blanket marketing consent. Property alerts require their own permission. Email opt-out and SMS opt-out are channel-specific.

## Release state

| Control | Default |
| --- | --- |
| Consumer acknowledgment | Disabled |
| Consumer follow-up email | Disabled |
| Consumer SMS | Disabled |
| Sequence scheduler | Disabled |
| Automatic send | Disabled |
| Human approval required | Enabled |
| Carrier SMS | Mock only |
| Brandon QA recipient override | Disabled until securely configured |

## Delivery design

The existing durable `lead_notifications` outbox remains authoritative for actual notification attempts, provider message IDs, retry counts, errors, timestamps, and idempotency. Phase 6 sequence steps link to that table instead of adding a competing queue.

## Stop behavior

Reply, recorded contact, appointment, signed-client state, terminal lead state, invalid contact, opt-out, legal/BIC hold, manual pause, duplicate consolidation, and test/suppressed state prevent later automated steps. Current Phase 6 sequences are previews only; no scheduler is active.
