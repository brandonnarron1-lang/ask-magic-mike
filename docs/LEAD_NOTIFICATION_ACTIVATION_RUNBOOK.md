# Lead Notification Activation Runbook

Production delivery remains disabled. This runbook describes the controlled path to a later non-production provider-sandbox activation and the prerequisites before any production activation.

## Pre-Activation Checks

Confirm all of the following before changing any environment:

- target environment is explicitly non-production
- no remote production Supabase project is linked
- `lead_notifications` migration is applied in the target database
- assignment audit writes are working
- `AGENT_NOTIFICATIONS_ENABLED` is currently false
- `CUSTOMER_EMAIL_ENABLED=false`
- `CUSTOMER_SMS_ENABLED=false`
- `AGENT_SMS_NOTIFICATIONS_ENABLED=false`
- provider credentials are configured only through the approved secret manager
- sandbox recipient is owner-controlled and not a real lead or real agent address
- sandbox recipient domain is included in `AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS`

## Non-Production Provider Sandbox Procedure

Set only non-production environment values:

- `LEAD_NOTIFICATION_MODE=sandbox`
- `AGENT_NOTIFICATIONS_ENABLED=true`
- `AGENT_NOTIFICATION_FROM_EMAIL`
- `AGENT_NOTIFICATION_SANDBOX_EMAIL`
- `AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS`
- `RESEND_API_KEY`

Keep disabled:

- `CUSTOMER_EMAIL_ENABLED=false`
- `CUSTOMER_SMS_ENABLED=false`
- `AGENT_SMS_NOTIFICATIONS_ENABLED=false`
- `LEAD_NOTIFICATION_PRODUCTION_ENABLED=false`

Then execute one synthetic assignment through the normal application flow.

## First-Send Verification

Verify:

- assignment succeeds
- assignment audit is written before notification processing
- exactly one `lead_notifications` row is created
- provider is `resend_sandbox`
- attempt count is `1`
- status becomes `sent`
- provider message ID is stored
- AdminOps notification summary shows the event
- sandbox provider payload contains the sandbox recipient only
- original agent recipient is not present in provider payload

## Duplicate-Send Verification

Repeat the same assignment to the same agent.

Expected:

- assignment is a same-agent no-op
- no second assignment audit is written
- no second notification row is created
- provider call count remains unchanged

## Retry Verification

Use an intercepted or provider-supported retryable failure.

Expected:

- status becomes `retry_scheduled`
- attempt count increments
- `next_attempt_at` is populated
- manual retry reuses the same notification ID and idempotency key
- sent rows cannot be retried
- max attempts are enforced

## Logging And Privacy Verification

Search captured logs and artifacts for:

- provider credentials
- authorization headers
- original agent recipient
- customer email addresses
- phone numbers
- message bodies
- raw provider responses

Expected count is zero for all sensitive values.

## AdminOps Verification

Verify protected AdminOps surfaces show:

- channel
- type
- status
- provider
- attempt count
- sent or failed timestamp
- safe error summary
- retry eligibility
- related lead
- assigned agent

AdminOps must not display provider credentials, raw provider payloads, full recipient values, or customer contact details beyond existing authorized lead views.

## Rollback

For immediate rollback:

1. Set `AGENT_NOTIFICATIONS_ENABLED=false`.
2. Set `LEAD_NOTIFICATION_MODE=disabled`.
3. Leave `CUSTOMER_EMAIL_ENABLED=false`.
4. Leave `CUSTOMER_SMS_ENABLED=false`.
5. Leave `AGENT_SMS_NOTIFICATIONS_ENABLED=false`.
6. Do not delete outbox rows; retain them for audit.

If a provider-specific secret must be removed, do so through the approved environment manager. Do not commit secret values.

## Production Activation Prerequisites

Production activation requires a separate approved mission. Before production:

- provider sandbox run completed with real provider evidence
- one controlled non-production assignment verified
- rollback was rehearsed
- owner approved the exact production recipient policy
- DNS/sender-domain requirements were separately approved and completed if needed
- compliance review for customer messaging completed before any customer channel is enabled
- `LEAD_NOTIFICATION_PRODUCTION_ENABLED=true` is explicitly approved

Do not infer production readiness from mocked tests alone.
