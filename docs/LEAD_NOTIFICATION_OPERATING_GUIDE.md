# Lead Notification Operating Guide

## What V1 Does

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
- `CONSOLE_NOTIFICATION_BEHAVIOR`
- `RESEND_API_KEY`
- `FROM_EMAIL`

Do not place credential values in documentation, screenshots, logs, or tickets.

## Safe Modes

- Local tests: `LEAD_NOTIFICATION_MODE=console`, `AGENT_NOTIFICATIONS_ENABLED=true`
- Production disabled default: `LEAD_NOTIFICATION_MODE=disabled`, `AGENT_NOTIFICATIONS_ENABLED=false`
- Production email activation requires owner approval and provider prerequisites.

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
