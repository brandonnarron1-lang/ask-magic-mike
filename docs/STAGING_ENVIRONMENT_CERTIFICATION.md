# Staging Environment Certification

Status: secondary Supabase project rejected for immediate staging reuse.

Tested main SHA: `05fa55a13c96baf992e7a2c89894b73ed590b8d4`

## Scope

This certification used read-only Supabase management metadata, read-only database aggregate queries, and Vercel environment-name/scope inventory. No remote database writes, migrations, deployments, Vercel environment changes, provider calls, email, or SMS occurred.

## Supabase Projects

Production safe label:

- `supabase-production-askmagicmike-prod`

Secondary candidate safe label:

- `supabase-secondary-askmagicmike`

The secondary candidate is a distinct Supabase project in the same region family as production, but distinct identity is not enough for staging certification.

## Decision

`REJECTED_FOR_STAGING`

The secondary candidate must not be wired to Vercel Preview for notification sandbox testing in its current state.

Reasons:

- It contains legacy lead, conversation, and message rows that are not clearly synthetic.
- It has no current Supabase migration ledger.
- It lacks current routing, assignment audit, source attribution, agent, and notification outbox tables.
- Reaching the current schema would require destructive reset or careful migration over potentially real legacy data.
- Vercel Preview is not currently wired to it with isolated preview-scoped Supabase variables.

An owner may separately approve archival and destructive reset of this project, but that is a data-retention decision and was not authorized in this certification.

## Vercel Preview State

The hosted configuration inventory shows the production Supabase URL and anon variables scoped to Production only. A service-role variable is scoped to both Production and Preview, so Preview must be rewired with isolated staging credentials before any preview mutation or notification sandbox test.

Preview must define its own staging-safe database identity:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`
- `DATABASE_ENV=preview`
- `PREVIEW_SUPABASE_PROJECT_REF`
- `PRODUCTION_SUPABASE_PROJECT_REF`
- `ALLOW_PREVIEW_DB_MUTATION=true`

Production scope must remain unchanged.

## Recommended Path

Create a new dedicated Supabase staging project or supported isolated database branch named clearly, for example `askmagicmike-staging`.

Before use:

- confirm it is not the production project,
- import no production data,
- apply the repository migration chain through `20260710221617_lead_notifications_outbox`,
- verify `sessions`, `leads`, `agents`, `audit_logs`, `lead_routing`, `lead_notifications`, and `source_attribution`,
- verify RLS and notification constraints,
- wire only Vercel Preview scope to the staging database.

## Notification Sandbox Readiness

Preview-only notification settings for the pre-send state:

- `LEAD_NOTIFICATION_MODE=sandbox`
- `AGENT_NOTIFICATIONS_ENABLED=false`
- `LEAD_NOTIFICATION_PRODUCTION_ENABLED=false`
- `CUSTOMER_EMAIL_ENABLED=false`
- `CUSTOMER_SMS_ENABLED=false`
- `AGENT_SMS_NOTIFICATIONS_ENABLED=false`
- `RESEND_API_KEY`
- `AGENT_NOTIFICATION_FROM_EMAIL`
- `AGENT_NOTIFICATION_SANDBOX_EMAIL`
- `AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS`

Provider-call count during certification: `0`.

The later one-send mission should temporarily change only `AGENT_NOTIFICATIONS_ENABLED=false` to `AGENT_NOTIFICATIONS_ENABLED=true`, execute exactly one synthetic assignment, then roll back immediately.

## Rollback

For Preview scope:

- `AGENT_NOTIFICATIONS_ENABLED=false`
- `LEAD_NOTIFICATION_MODE=disabled`
- `LEAD_NOTIFICATION_PRODUCTION_ENABLED=false`
- `CUSTOMER_EMAIL_ENABLED=false`
- `CUSTOMER_SMS_ENABLED=false`
- `AGENT_SMS_NOTIFICATIONS_ENABLED=false`

Do not remove evidence rows unless cleanup is explicitly approved. Do not change Production scope, DNS, WordPress, or production deployments.
