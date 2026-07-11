# Lead Notification Architecture

## Selected Design

V1 uses a dedicated `lead_notifications` outbox table plus server-only notification service code in the active `app/` AdminOps stack.

Assignment flow:

1. Validate lead and agent IDs.
2. Load current assignment state.
3. Patch exactly one lead assignment with a narrow optimistic filter.
4. Write assignment audit.
5. Create an idempotent assignment-notification event.
6. Process the event only when agent notifications and provider mode are enabled.
7. Persist sent, skipped, failed, retry, and permanent failure states.

## Data Flow

`/admin/allocation` -> server action -> `adminAgentAllocationActions` -> Supabase `leads` -> Supabase `audit_logs` -> `lead_notifications` -> provider adapter -> `lead_notifications` result update -> AdminOps notification view.

## Trust Boundaries

- Public routes cannot read or retry notification records.
- Provider selection and credentials are server-only.
- Notification rows store minimized recipient references such as `email_configured`, not full contact values.
- Provider request payloads are not persisted.
- Safe error summaries redact email-like and phone-like strings.

## Provider Abstraction

The provider contract accepts a channel, recipient, rendered text/html, and idempotency key, and returns either a provider message ID or safe failure metadata.

Modes:

- `disabled`: default. Creates/skips events without delivery.
- `console`: local/test only. Logs safe metadata, never recipient values.
- `sandbox`: provider-compatible email boundary that replaces the assigned agent recipient with an allowlisted sandbox recipient before transport invocation.
- `production`: gated production adapter boundary that also requires explicit production activation.

The email boundary uses Resend in sandbox or production modes only when `AGENT_NOTIFICATIONS_ENABLED=true`, `RESEND_API_KEY` is present, and a sender is configured. Sandbox mode also requires `AGENT_NOTIFICATION_SANDBOX_EMAIL` and `AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS`. Production mode also requires `LEAD_NOTIFICATION_PRODUCTION_ENABLED=true`. SMS is template-ready but not activated.

## Idempotency

The assignment-notification idempotency key includes:

- lead ID
- assigned agent ID
- assignment audit ID or assignment timestamp
- notification type
- channel
- template version

The key is unique in `lead_notifications`. Manual retry reuses the same notification row and idempotency key.

## Retry Rules

- Maximum attempts: 3.
- Retryable provider failures move to `retry_scheduled`.
- Non-retryable failures move to `permanently_failed`.
- Missing recipient, disabled mode, inactive agent, or changed assignment do not produce live sends.
- Manual retry is one-record only in v1.
- No production cron is configured in this mission.

## Failure Handling

- Assignment provider outages do not roll back successful assignment.
- If notification creation fails after audit succeeds, AdminOps receives a warning and the assignment remains valid.
- Safe retry is available through `/admin/notifications` when the row is eligible.

## Privacy Rules

- Do not store provider secrets.
- Do not store full message bodies.
- Do not store raw provider payloads.
- Do not display full recipient contact values in AdminOps.
- Do not send customer follow-up until explicit activation and compliance review are complete.

## AdminOps Behavior

AdminOps shows:

- type and channel
- status
- provider
- attempt count
- sent/failed timestamps
- safe error summary
- related lead and agent IDs
- retry eligibility

Manual retry requires a confirmation checkbox and targets one notification ID.

## Activation Controls

- `AGENT_NOTIFICATIONS_ENABLED`
- `LEAD_NOTIFICATION_MODE`
- `CUSTOMER_EMAIL_ENABLED`
- `CUSTOMER_SMS_ENABLED`
- `AGENT_NOTIFICATION_SANDBOX_EMAIL`
- `AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS`
- `LEAD_NOTIFICATION_PRODUCTION_ENABLED`

Customer messaging remains disabled by default and independently from agent notification mode.

## Rollback Behavior

- Set `LEAD_NOTIFICATION_MODE=disabled` and `AGENT_NOTIFICATIONS_ENABLED=false` to stop delivery while preserving outbox records.
- Revert the application change to remove AdminOps controls.
- If the migration must be reversed before production use, drop `lead_notifications` and its trigger/indexes using the rollback guidance in the migration.
