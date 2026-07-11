# Lead Notification Provider Sandbox

This document defines the safe boundary for exercising Ask Magic Mike lead notifications against a provider-compatible sandbox or intercepted test transport. It does not activate production delivery.

## Architecture

Assignment notifications still flow through the outbox:

`assignment -> assignment audit -> lead_notifications row -> processing claim -> provider adapter -> lead_notifications result update`

The provider adapter does not create idempotency keys, update database rows, or bypass `claimForProcessing`. Idempotency and retry state stay owned by `LeadNotificationService` and the `lead_notifications` table.

## Provider Modes

- `disabled`: fail-closed mode. No provider send occurs.
- `console`: local/test mode. Logs safe metadata only, never recipient values or message bodies.
- `sandbox`: provider-compatible email mode for a configured sandbox recipient only.
- `production`: real provider mode. Requires `LEAD_NOTIFICATION_PRODUCTION_ENABLED=true` plus provider configuration.

Default repository examples keep delivery disabled unless an operator explicitly enables the required gates.

## Sandbox Recipient Replacement

Sandbox mode never sends to the assigned agent recipient. Before provider invocation, the Resend sandbox adapter replaces the resolved agent email with `AGENT_NOTIFICATION_SANDBOX_EMAIL`.

The original recipient remains outside the provider transport in sandbox mode. It is not logged or persisted in notification rows.

## Allowlist Behavior

Sandbox mode requires:

- `LEAD_NOTIFICATION_MODE=sandbox`
- `AGENT_NOTIFICATIONS_ENABLED=true`
- `RESEND_API_KEY`
- `AGENT_NOTIFICATION_FROM_EMAIL`
- `AGENT_NOTIFICATION_SANDBOX_EMAIL`
- `AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS`

`AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS` is a comma-separated list. The sandbox recipient domain must match one of those domains or a subdomain. If the recipient is absent, invalid, or outside the allowlist, the provider fails closed before transport invocation.

## Supported Notification Types

V1 supports agent assignment email notifications:

- notification type: `agent_assignment`
- channel: `email`
- template: `agent_assignment_email_v1`

Agent SMS, customer email, and customer SMS remain separately gated and are not activated by provider-sandbox email testing.

## Database Transitions

Expected success path:

1. `lead_notifications.status=pending`
2. processor claims row as `processing`
3. provider returns success
4. row becomes `sent`
5. `provider=resend_sandbox`
6. `provider_message_id` stores only the provider-safe message ID

Retryable provider failure:

1. row becomes `retry_scheduled`
2. `attempt_count` increments
3. `next_attempt_at` is populated
4. retry reuses the same row and idempotency key

Permanent failure:

1. row becomes `permanently_failed`
2. no retry is scheduled
3. error summary is sanitized

## Privacy Rules

Do not log, persist, or expose:

- provider credentials
- authorization headers
- raw provider responses
- full recipient email addresses
- phone numbers
- message bodies
- customer contact values

Provider errors are mapped to safe codes and summaries. Email-like and phone-like strings are redacted again before persistence by the notification service.

## Local Test Procedure

Run focused tests without real provider delivery:

```bash
pnpm exec vitest run tests/adminops/lead-notification-service.test.ts tests/adminops/admin-notification-guards.test.ts
```

For local outbox integration, use console mode unless a controlled intercepted transport is supplied by the test harness:

```bash
LEAD_NOTIFICATION_MODE=console
AGENT_NOTIFICATIONS_ENABLED=true
AGENT_SMS_NOTIFICATIONS_ENABLED=false
CUSTOMER_EMAIL_ENABLED=false
CUSTOMER_SMS_ENABLED=false
```

## Prohibited Actions

- Do not set production provider mode for sandbox testing.
- Do not use a real lead or real agent address as the sandbox recipient.
- Do not enable customer email or SMS.
- Do not enable agent SMS.
- Do not bypass the outbox with a direct provider call.
- Do not run a production deployment as part of sandbox verification.
- Do not change Vercel environment variables without a separately approved activation mission.

## Evidence Requirements

A controlled provider-sandbox run must record:

- target environment is non-production
- provider mode
- sandbox recipient configured by name only
- allowlist status
- one outbox row
- one provider invocation
- provider message ID persisted
- no original recipient in provider payload
- no duplicate row on repeated assignment
- retry behavior
- AdminOps visibility
- rollback completed or available

If the run uses a mocked or intercepted transport, state that explicitly. Do not claim a live provider sandbox was verified unless the provider actually processed the sandbox request.
