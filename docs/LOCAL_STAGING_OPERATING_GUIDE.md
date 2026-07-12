# Local Staging Operating Guide

This guide keeps Ask Magic Mike verification moving while hosted Supabase staging is blocked by billing.

## Scope

Local staging is for repeatable product and database verification only.

It proves:

- the full repository migration chain replays locally,
- routing SLA behavior is intact,
- notification outbox schema is present,
- AdminOps and lead lifecycle code can be tested against a disposable database,
- notification delivery remains disabled or console-only.

It does not prove:

- Vercel Preview database wiring,
- hosted Supabase credentials,
- Resend provider delivery,
- production readiness for a live provider send.

## Safety Rules

- Do not run `supabase link`.
- Do not run remote SQL.
- Do not use production Supabase credentials.
- Do not copy production data.
- Do not send email or SMS.
- Do not enable production notification mode.
- Use synthetic fixtures only.

The scripts refuse to run when `supabase/.temp/project-ref` exists.

## Start Local Staging

```bash
pnpm run staging:local:up
```

The script starts local Supabase from repository migrations. Raw Supabase CLI output is not printed and is deleted after the command finishes because it can include local keys.

Sanitized evidence is written under:

```text
.amm-run/local-staging/start-summary.json
```

## Verify Local Staging

```bash
pnpm run staging:local:verify
```

The verifier uses the local Docker Postgres container directly, without connection strings or service-role keys. It checks:

- expected migration count,
- final migration `20260710221617_lead_notifications_outbox`,
- routing SLA SQL,
- `sessions`, `leads`, `agents`, `audit_logs`, `lead_routing`, `lead_notifications`, and `source_attribution`,
- notification RLS,
- notification idempotency and processing indexes,
- notification update trigger,
- local data counts.

Sanitized evidence is written under:

```text
.amm-run/local-staging/verify-summary.json
```

## Synthetic Data Policy

Use only:

- names beginning `Notification Sandbox`,
- `example.test` email addresses,
- reserved fictional phone values,
- fictional property addresses,
- `source=resend_provider_sandbox`,
- `source_detail=controlled_nonproduction_verification`.

Cleanup must target exact fixture IDs only. Do not truncate tables after evidence has been created.

## Notification State

Default local verification makes zero provider calls.

Allowed local-only settings for console-mode notification tests:

```bash
LEAD_NOTIFICATION_MODE=console
AGENT_NOTIFICATIONS_ENABLED=true
AGENT_SMS_NOTIFICATIONS_ENABLED=false
CUSTOMER_EMAIL_ENABLED=false
CUSTOMER_SMS_ENABLED=false
LEAD_NOTIFICATION_PRODUCTION_ENABLED=false
```

Console mode must not print recipient values.

## Stop Local Staging

```bash
supabase stop --no-backup
```

This is a disposable local environment. Recreate it from repository migrations whenever a clean replay is required.

## Hosted Staging Blocker

Hosted staging still requires either:

- an approved dedicated Supabase staging project, or
- a certified existing empty owned Supabase project.

The current no-new-cost inventory did not identify a safe hosted staging substitute. Vercel Preview must not receive production service-role credentials for mutation testing.
