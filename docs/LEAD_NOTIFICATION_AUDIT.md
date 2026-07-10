# Lead Notification Audit

Release baseline: `d96a6c4a766b87e7a48f897fa62f9e5990f28efd`

## Current Provider Dependencies

- Active root app dependencies do not include a dedicated email or SMS SDK for the new AdminOps assignment path.
- `app/api/leads/route.ts` has a direct Resend email helper gated by `RESEND_API_KEY`. It is public lead-capture adjacent and is not an assignment notification outbox.
- Legacy/canonical `src/` code includes provider abstractions for communications:
  - `src/lib/engines/communications.ts`
  - `src/lib/adapters/email-types.ts`
  - `src/lib/adapters/email-mock.ts`
  - `src/lib/adapters/sms-types.ts`
  - `src/lib/adapters/sms-mock.ts`
  - `src/lib/adapters/sms-twilio.ts`
- Existing webhook support includes inbound SMS signature verification under `src/app/api/webhooks/sms/inbound/route.ts`.

## Existing Messaging Helpers

- Legacy `CommunicationsEngine` supports templated SMS/email and mock adapters.
- Active `app/` lead assignment does not currently call that engine.
- Existing provider variables by name include:
  - `RESEND_API_KEY`
  - `EMAIL_PROVIDER`
  - `EMAIL_API_KEY`
  - `FROM_EMAIL`
  - `ENABLE_EMAIL`
  - `SMS_PROVIDER`
  - `ENABLE_SMS`
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`
  - `TWILIO_FROM_PHONE`

## Assignment Hook Points

- Active AdminOps assignment action: `app/lib/adminAgentAllocationActions.ts`
- Assignment audit writer: `app/lib/adminAssignmentAudit.ts`
- Allocation UI: `app/admin/allocation/page.tsx`
- Allocation server actions: `app/admin/allocation/actions.ts`
- Current safe order before this work: preflight current lead, narrow assignment patch, assignment audit.

## Status Hook Points

- Lead status actions are separate from assignment. Notification v1 does not send customer follow-up on status changes.
- Future follow-up can subscribe to status changes after consent, opt-out, and activation requirements are complete.

## Current Persistence Support

- Existing migrations include lead assignment columns and audit logs.
- Existing `messages` tables in earlier migrations are broader communications records, not a dedicated idempotent assignment-notification outbox for active AdminOps.
- No active `app/` table tracked assignment notification attempts, retry state, provider result, or idempotency before this change.

## Current Retry Support

- No active assignment-notification retry path existed.
- Existing SLA cron is unrelated to notification delivery.

## Current AdminOps Visibility

- Leads, reporting, and allocation views show lead and assignment state.
- Assignment audit appears in allocation activity.
- No active AdminOps surface answered whether an assigned agent was notified, whether delivery failed, or whether retry is available.

## Current Environment Names

Existing provider and activation names are documented by name only:

- `RESEND_API_KEY`
- `EMAIL_PROVIDER`
- `EMAIL_API_KEY`
- `FROM_EMAIL`
- `ENABLE_EMAIL`
- `SMS_PROVIDER`
- `ENABLE_SMS`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_FROM_PHONE`
- `NEXT_PUBLIC_AGENT_NAME`
- `NEXT_PUBLIC_AGENT_PHONE`
- `NEXT_PUBLIC_AGENT_LICENSE`

New v1 names:

- `LEAD_NOTIFICATION_MODE`
- `NOTIFICATION_PROVIDER_MODE`
- `AGENT_NOTIFICATIONS_ENABLED`
- `AGENT_SMS_NOTIFICATIONS_ENABLED`
- `CUSTOMER_EMAIL_ENABLED`
- `CUSTOMER_SMS_ENABLED`
- `AGENT_NOTIFICATION_FROM_EMAIL`
- `CONSOLE_NOTIFICATION_BEHAVIOR`

## Missing Layers

- Dedicated immutable-ish notification event/outbox table.
- Unique idempotency key for lead, agent, assignment event, notification type, channel, and template version.
- Safe provider abstraction for assignment notices.
- Delivery attempt count and bounded retry state.
- AdminOps notification state and manual retry.
- Customer follow-up activation boundary separate from agent notifications.
- Tests proving no duplicate sends and no public access to notification controls.

## Risks

- Direct public lead-capture email helper is not a durable outbox and should not be extended for assignment delivery.
- Legacy `src/` communications code is useful but not on the active root AdminOps assignment path.
- Provider outages must not roll back successful assignment.
- Retries must not change idempotency keys.
- Agent reassignment must prevent notifying the wrong agent.
- Customer follow-up needs consent, opt-out, DNC, and legal review before activation.

## Recommended V1 Architecture

Use an outbox-style assignment notification path:

1. Assignment succeeds.
2. Assignment audit succeeds.
3. Notification event is created idempotently.
4. Provider adapter processes the event only when explicitly enabled.
5. Attempt result is persisted with safe error metadata.
6. AdminOps shows state and permits one-record retry for eligible failures.
7. Customer email/SMS remain disabled independently.
