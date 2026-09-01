# Environment Variable Matrix

Values belong only in Vercel/hosting secret interfaces. This matrix records names
and scope, never values.

| Group | Variables | Scope | Required for |
| --- | --- | --- | --- |
| Canonical DB | `DATABASE_URL`, `DATABASE_ENV`, `PREVIEW_NEON_ENDPOINT_ID`, `PRODUCTION_NEON_ENDPOINT_ID` | server, Production/Preview separated; endpoint IDs are Preview-scoped attestation inputs | durable Neon capture and fail-closed Preview identity |
| Lead Center identity | `LEAD_CENTER_RBAC_ENABLED`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` | server sensitive except URL | Better Auth sessions and RBAC |
| Break-glass/operations | `ADMIN_SECRET`, `AUTH_SECRET`, `CRON_SECRET` | server sensitive | disabled-RBAC fallback and protected cron/health operations; not normal staff login |
| Internal email | `LEAD_NOTIFICATION_TO`, `LEAD_NOTIFICATION_BCC`, `EMAIL_PROVIDER`, `EMAIL_ENABLED`, `RESEND_API_KEY`, `RESEND_WEBHOOK_*`, `SMTP_*`, `LEAD_NOTIFICATION_*` | server sensitive except modes | internal alert/outbox and provider status |
| Staff push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PHONE_SETUP_SIGNING_SECRET`, `AGENT_PUSH_NOTIFICATIONS_ENABLED` | public key browser-safe; all others server sensitive | free phone alerts |
| Carrier SMS | `LEAD_SMS_TO`, `LEAD_SMS_COPY_TO`, `TWILIO_*`, `AGENT_SMS_NOTIFICATIONS_ENABLED` | server sensitive | deferred paid sender |
| WordPress | `WORDPRESS_BRIDGE_SECRET`, `WORDPRESS_BRIDGE_FORM_IDS`, `WORDPRESS_BRIDGE_CONSENT_CONTRACTS` | secret is server-sensitive on both systems; form IDs and consent contracts are server configuration | signed, per-form forwarding with exact consent-copy pinning |
| Public identity | `NEXT_PUBLIC_SITE_URL`, approved `NEXT_PUBLIC_AGENT_*` metadata | browser-safe | canonical links/copy |
| Rate limit | `DATABASE_URL`, `RATE_LIMIT_HASH_SECRET`, `CONSENT_IP_HASH_SALT`, `CRON_SECRET`, `ADMIN_SECRET`, `LEAD_RATE_LIMIT_PER_MINUTE`, `RATE_LIMIT_EMERGENCY_MEMORY` | server sensitive | HMAC-pseudonymized durable Neon abuse control; dedicated hash secret is required for Production readiness and emergency memory mode requires exact value `1` |
| Customer channels | `CUSTOMER_EMAIL_ENABLED`, `CUSTOMER_SMS_ENABLED` | server | separately approved acknowledgments |
| Legacy compatibility | `ALLOW_LEGACY_SUPABASE_FALLBACK`, `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` | non-Production only | SUPERSEDED; forbidden as a Production fallback |

Production and Preview must use different Neon branches/credentials. Preview
mutation stays fail-closed unless `DATABASE_ENV=preview`, Vercel reports Preview,
the parsed Neon endpoint matches the approved Preview endpoint and not the
Production endpoint, the expected IDs are distinct, and both explicit
preview-mutation flags are enabled. NellySelly credentials,
project IDs, domains, or database branches are forbidden in this project.
Example values default to disabled even where Production is active; read live
state from the health endpoints and hosting interface, never from `.env.example`.
