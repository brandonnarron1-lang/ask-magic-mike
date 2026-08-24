# Environment Configuration

This is the current environment guide. Copy `.env.example` to an ignored local
file for development. Store real values only in the approved Vercel, Neon,
WordPress, or hosting secret interface and never print them during verification.

The complete name/scope register is `ENVIRONMENT_VARIABLE_MATRIX.md`.

## Canonical database

| Variable | Scope | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Server sensitive | Canonical Neon PostgreSQL connection |
| `DATABASE_ENV` | Server | Explicit `production`, `preview`, or `development` identity |
| `PREVIEW_NEON_ENDPOINT_ID` | Preview server | Expected Neon Preview endpoint ID; no connection URL or credential |
| `PRODUCTION_NEON_ENDPOINT_ID` | Preview server | Production endpoint ID that Preview must never match |
| `ALLOW_PREVIEW_DB_MUTATION` | Preview server | Separate reviewed Preview-write opt-in |
| `PREVIEW_DATA_MODE` | Preview server | Must also be `enabled` for controlled Preview writes |

Production fails closed without `DATABASE_URL`; it never falls back to Supabase.
Preview writes additionally fail closed unless the endpoint parsed from
`DATABASE_URL` exactly matches the expected Preview endpoint, does not match the
Production endpoint, and the two expected endpoint IDs are valid and distinct.
`ALLOW_LEGACY_SUPABASE_FALLBACK` exists only for non-Production compatibility
tests and must remain false in Production. The `supabase/migrations/` directory
name is historical; reviewed SQL in that directory applies to canonical
PostgreSQL.

## Lead Center identity

| Variable | Scope | Purpose |
| --- | --- | --- |
| `LEAD_CENTER_RBAC_ENABLED` | Server | Enables Better Auth plus server-side RBAC |
| `BETTER_AUTH_URL` | Server | Exact canonical authentication origin |
| `BETTER_AUTH_SECRET` | Server sensitive | Better Auth signing secret |
| `ADMIN_SECRET` | Server sensitive | Break-glass fallback and protected operational endpoints |
| `CRON_SECRET` | Server sensitive | Scheduled operational endpoint authorization |

Production uses per-user Better Auth sessions and RBAC. When RBAC is enabled but
its required variables are missing, admin access returns 503. Disabling RBAC is
a separately approved rollback action; it is not the normal login workflow.

## Internal email and delivery ledger

| Variables | Purpose |
| --- | --- |
| `EMAIL_PROVIDER`, `EMAIL_ENABLED`, `LEAD_NOTIFICATION_MODE` | Select and gate the canonical provider path |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `RESEND_WEBHOOK_ENABLED` | Resend delivery and signed status callbacks |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | Authenticated SMTP fallback |
| `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`, `SMTP_REPLY_TO` | Aligned sender identity |
| `LEAD_NOTIFICATION_TO`, `LEAD_NOTIFICATION_BCC` | Approved internal destinations; values remain private |

Internal lead storage and outbox creation are independent of provider delivery.
Provider message IDs, attempts, status, and errors remain in the protected
notification ledger. Consumer acknowledgment and marketing have independent
flags and permission checks.

## Free phone alerts and deferred carrier SMS

Web Push uses `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT`, and `AGENT_PUSH_NOTIFICATIONS_ENABLED`. Only the public VAPID
key may reach browser code. Device enrollment requires the device owner.

Carrier SMS uses the `TWILIO_*`, `LEAD_SMS_*`, and
`AGENT_SMS_NOTIFICATIONS_ENABLED` group. It remains disabled until a compliant
paid sender and a separately approved QA are available. Never substitute a
consumer phone, personal wireless takeover, or unregistered sender.

## Optional adapters

- AI features are env-gated. Deterministic scoring and routing do not depend on
  an AI provider.
- CRM defaults to the null adapter until approved FUB or kvCORE credentials are
  configured.
- AVM providers remain optional and may not create a guaranteed valuation,
  appraisal, or offer claim.
- Analytics identifiers are browser-safe only when explicitly named public;
  raw lead PII never belongs in analytics parameters.

## Safe defaults

The example file intentionally defaults sends, consumer automation, database
mutation, public experiments, and paid channels to disabled. Production values
are verified through health endpoints and the hosting interface, not inferred
from example defaults.
