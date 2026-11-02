# Lead Notification Operating Guide

## Current use and historical scope

The V1 sections below describe assignment-notification lineage, not the current
normal v6 public-intake delivery contract. Resolve current Production with
`pnpm release:authority:resolve`; use protected Acquisition operations for current
per-operator envelope evidence. Keep existing Mike/Brandon recipients, frozen v6
snapshots, cutover, retries and callbacks intact. Do not reenact an old activation,
migration or retry procedure merely to verify operation.

Provider acceptance, recipient-server delivery and the operator's own mailbox
receipt are separate. Normal QA stays suppressed/KPI-excluded; a separately
approved one-copy v4 review operation is not a resend of the original and does
not prove a fresh v6 transaction. Never use first-live/retry/process endpoints or
“Record observed proof” as read-only health checks. The current operational
continuation authorizes no new Production submissions, queues, sends or activation.

## What V1 Does

### Public direct contact is not staff notification delivery

The owner's November1 mobile-contact instruction supplies Mike's public direct
line `(252) 245-4337` (`tel:+12522454337`, number-only `sms:+12522454337`).
`src/lib/site-config.ts` separates it from the brokerage office `252-243-7700`.
`PublicMikeContact` is shared by public headers, the widget and confirmations;
it is not installed in the root layout, staff login or device-install utilities.
Call/Text intent events have no phone, message body or inquiry details. They
are not captured inquiries, sent messages, connected calls or conversions.
Text receipt and physical app-return behavior require separate device evidence.

The existing v6 internal-email path and recipient/provider configuration are
unchanged. The v6 branch returns no SMS/push envelopes; legacy V1 SMS flags are
not a v6 activation path. Carrier SMS remains held: current recipient/sender
authorization, provider requirements and a genuine zero-new-spend entitlement
are not established. No verified cost quote or activation is implied here.
Brandon's protected `/admin/notifications/phone` page is the existing Web Push
entry. Enrollment, provider acceptance and physical receipt are separate; a
desktop-ready button does not prove an iPhone is enrolled. Do not require Mike
to enroll or test to operate the email/Lead-Center workflow.

- Creates an assignment notification event after successful AdminOps assignment and audit.
- Prevents duplicate events with a unique idempotency key.
- Sends only when explicitly enabled and configured.
- Tracks pending, processing, sent, skipped, retry scheduled, and permanent failure states.
- Lets an AdminOps operator retry one eligible failure at a time.

## What V1 Does Not Do

- It does not send customer email or SMS.
- It does not configure production cron.
- It does not activate Twilio, Resend, DNS, or paid messaging services.
- It does not roll back a successful assignment because of notification failure.

## AdminOps Workflow

1. Assign a lead in `/admin/allocation`.
2. Review the assignment result banner.
3. Open `/admin/notifications`.
4. Confirm the notification row status, channel, provider, attempt count, and safe error summary.
5. For eligible failures, check the confirmation box and retry one row.
6. If failure persists after maximum attempts, leave the row as permanently failed and investigate provider configuration.

## Provider Configuration Names

- `LEAD_NOTIFICATION_MODE`
- `NOTIFICATION_PROVIDER_MODE`
- `AGENT_NOTIFICATIONS_ENABLED`
- `AGENT_SMS_NOTIFICATIONS_ENABLED`
- `CUSTOMER_EMAIL_ENABLED`
- `CUSTOMER_SMS_ENABLED`
- `AGENT_NOTIFICATION_FROM_EMAIL`
- `AGENT_NOTIFICATION_SANDBOX_EMAIL`
- `AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS`
- `LEAD_NOTIFICATION_PRODUCTION_ENABLED`
- `CONSOLE_NOTIFICATION_BEHAVIOR`
- `RESEND_API_KEY`
- `FROM_EMAIL`

Do not place credential values in documentation, screenshots, logs, or tickets.

## Safe Modes

- Local tests: `LEAD_NOTIFICATION_MODE=console`, `AGENT_NOTIFICATIONS_ENABLED=true`
- Provider sandbox tests: `LEAD_NOTIFICATION_MODE=sandbox`, `AGENT_NOTIFICATIONS_ENABLED=true`, configured sandbox recipient, and customer/SMS gates disabled
- Production disabled default: `LEAD_NOTIFICATION_MODE=disabled`, `AGENT_NOTIFICATIONS_ENABLED=false`
- Production email activation requires owner approval, provider prerequisites, and `LEAD_NOTIFICATION_PRODUCTION_ENABLED=true`.

## Retry Policy

- Maximum attempts: 3.
- Retry only retryable provider failures.
- Do not retry disabled-mode skips, missing recipient skips, invalid recipient failures, inactive agents, or changed assignments.
- Retry uses the same notification row and idempotency key.

## Customer Messaging State

Customer follow-up is staged only. Keep:

- `CUSTOMER_EMAIL_ENABLED=false`
- `CUSTOMER_SMS_ENABLED=false`

Before activating customer follow-up, complete consent, opt-out, DNC, template review, provider sandbox verification, and owner approval.

## Production Migration Steps

1. Review `supabase/migrations/20260710221617_lead_notifications_outbox.sql`.
2. Apply to a non-production database first.
3. Run the notification service and AdminOps tests against the migrated database.
4. Schedule production migration separately.
5. Do not enable delivery until the migration, provider config, and owner approval are complete.

## Safe Failure Handling

- Notification warning after assignment means assignment succeeded but notification work needs attention.
- Check `/admin/notifications` before retrying.
- Do not reassign merely to resend a notification.
- Do not create a new lead to test notification retry.
