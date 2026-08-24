# Vercel Preview Security Boundary

Vercel Preview is a protected visual, navigation, and read-only QA surface by
default. It uses the isolated Neon Preview branch, but remains non-mutating
until the controlled mutation procedure is separately approved and all
attestation and delivery gates pass.

## Operating Mode

Preview must run with:

```text
DATABASE_ENV=preview
PREVIEW_NEON_ENDPOINT_ID=<approved Preview endpoint ID>
PRODUCTION_NEON_ENDPOINT_ID=<Production endpoint ID to refuse>
PREVIEW_DATA_MODE=disabled
ALLOW_PREVIEW_DB_MUTATION=false
LEAD_NOTIFICATION_MODE=disabled
AGENT_NOTIFICATIONS_ENABLED=false
LEAD_NOTIFICATION_PRODUCTION_ENABLED=false
CUSTOMER_EMAIL_ENABLED=false
CUSTOMER_SMS_ENABLED=false
AGENT_SMS_NOTIFICATIONS_ENABLED=false
```

Preview must receive only the isolated Preview `DATABASE_URL`. It must not
receive a Production connection string or these legacy/provider delivery
secrets:

```text
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
```

Production scope remains independent. The endpoint parsed from Preview's
`DATABASE_URL` must match `PREVIEW_NEON_ENDPOINT_ID`, must not match
`PRODUCTION_NEON_ENDPOINT_ID`, and the two expected IDs must be distinct.

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

- `database.identity.database_env=preview`
- `database.identity.endpoint_identity_configured=true`
- `database.identity.endpoint_ids_distinct=true`
- `database.identity.database_neon_endpoint_resolved=true`
- `database.identity.preview_endpoint_match=true`
- `database.identity.production_endpoint_match=false`
- `database.identity.preview_identity_confirmed=true`
- `preview_data_mode=disabled`
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

Hosted mutation QA follows `docs/controlled-preview-mutation-qa.md` and requires
a separate exact approval. The branch-scoped environment may switch both
mutation flags on only for that controlled run, with live delivery disabled.
After evidence and deterministic cleanup, restore both flags to their disabled
defaults and redeploy the same reviewed commit.

## Rollback

Rollback must not restore Production credentials to Preview. If a Preview
deployment misbehaves, redeploy the last known-good Preview code while keeping:

- `PREVIEW_DATA_MODE=disabled`
- `ALLOW_PREVIEW_DB_MUTATION=false`
- the isolated Preview `DATABASE_URL`
- valid, distinct `PREVIEW_NEON_ENDPOINT_ID` and
  `PRODUCTION_NEON_ENDPOINT_ID`
- no `SUPABASE_SERVICE_ROLE_KEY` in Preview
- notification and customer channel gates disabled
