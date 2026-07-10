# Lead Notification Activation Plan

## Current State

Agent assignment notification infrastructure is implemented but disabled by default. Customer messaging is staged only and remains disabled.

## Prerequisites

- Apply `lead_notifications` migration to the target database.
- Confirm RLS and server-only write boundaries.
- Configure provider credentials through the approved secret manager.
- Configure sender identity.
- Verify no DNS changes are required or obtain separate approval if they are.
- Confirm the designated owner-controlled test recipient.
- Complete compliance review before any customer email or SMS.

## Agent Email Activation

1. Keep `CUSTOMER_EMAIL_ENABLED=false` and `CUSTOMER_SMS_ENABLED=false`.
2. Set provider secrets in the deployment environment through the approved UI or CLI process.
3. Set `AGENT_NOTIFICATION_FROM_EMAIL`.
4. Set `LEAD_NOTIFICATION_MODE=sandbox` if the provider supports no-real-delivery sandbox behavior, otherwise keep disabled until production test approval.
5. Run a local/sandbox assignment notification test.
6. With owner approval, set `AGENT_NOTIFICATIONS_ENABLED=true`.
7. For production delivery, set `LEAD_NOTIFICATION_MODE=production`.
8. Execute one controlled QA assignment and verify one sent row.

## Agent SMS Readiness

SMS templates and channel types are prepared, but SMS delivery is not activated in v1. Before activation:

- Confirm `AGENT_SMS_NOTIFICATIONS_ENABLED` behavior.
- Confirm Twilio sender, opt-out handling, and inbound webhook state.
- Run sandbox/no-real-delivery tests.
- Obtain owner approval for any live SMS.

## Customer Follow-Up Readiness

Future templates:

- submission confirmation
- appointment link
- seller follow-up
- home-value follow-up
- no-response nurture
- agent handoff confirmation

Activation is blocked until:

- consent state is enforced per channel
- opt-out and STOP handling are verified
- DNC policy is documented
- message templates are reviewed
- provider sandbox tests pass
- owner explicitly enables customer messaging

Do not claim legal approval from this document.

## Rollback

- Set `AGENT_NOTIFICATIONS_ENABLED=false`.
- Set `LEAD_NOTIFICATION_MODE=disabled`.
- Leave outbox records intact for audit.
- Hide or revert AdminOps retry controls if needed.
- Reverse the migration only if no production records need retention and rollback is explicitly approved.

## Non-Goals

- No production deployment during implementation.
- No production schema execution during implementation.
- No DNS or WordPress change.
- No paid messaging activation.
- No real consumer contact.
