# Vercel Preview Security Boundary

Vercel Preview is currently a public visual and navigation QA surface only.
It is not a mutable staging environment until an isolated hosted staging
database is available and separately approved.

## Operating Mode

Preview must run with:

```text
DATABASE_ENV=preview
PREVIEW_DATA_MODE=disabled
ALLOW_PREVIEW_DB_MUTATION=false
LEAD_NOTIFICATION_MODE=disabled
AGENT_NOTIFICATIONS_ENABLED=false
LEAD_NOTIFICATION_PRODUCTION_ENABLED=false
CUSTOMER_EMAIL_ENABLED=false
CUSTOMER_SMS_ENABLED=false
AGENT_SMS_NOTIFICATIONS_ENABLED=false
```

Preview must not receive:

```text
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
```

Production scope remains independent. Do not copy Production Supabase
credentials into Preview.

## Allowed Preview Use

- Public page rendering and navigation QA.
- Visual checks for lead forms, funnels, Ask Mike, widget, and appointment
  request surfaces.
- Admin authentication boundary checks.
- Read-only health inspection with categorical fields only.

## Blocked Preview Use

- Lead writes.
- Public appointment requests.
- AdminOps mutations.
- Assignment, lifecycle, appointment, and follow-up writes.
- Notification retry or outbox processing.
- Cron persistence.
- Provider calls, email, SMS, or calendar writes.

When a public mutation is attempted, Preview returns:

```text
This preview is in read-only demonstration mode. No lead or appointment data was saved.
```

## Health Expectations

`/api/admin/health` must report, categorically:

- `database_environment=preview`
- `preview_data_mode=disabled`
- `service_role_available=false`
- `safe_for_preview_mutation=false`
- `provider_delivery_enabled=false`
- `customer_email_enabled=false`
- `customer_sms_enabled=false`
- `agent_sms_enabled=false`

The health response must not expose project refs, URLs, keys, hashes,
recipient addresses, or sender addresses.

## Mutable Testing

Use local staging for mutable tests:

```text
pnpm run staging:local:up
pnpm run staging:local:verify
pnpm run staging:local:fixtures
```

Hosted mutable staging requires a separate approved mission with an isolated
database credential scoped only to Preview. That future mission may replace
Preview's disabled mode with a staging mode only after confirming Production
scope remains unchanged.

## Rollback

Rollback must not restore Production credentials to Preview. If a Preview
deployment misbehaves, redeploy the last known-good Preview code while keeping:

- `PREVIEW_DATA_MODE=disabled`
- `ALLOW_PREVIEW_DB_MUTATION=false`
- no `SUPABASE_SERVICE_ROLE_KEY` in Preview
- notification and customer channel gates disabled
