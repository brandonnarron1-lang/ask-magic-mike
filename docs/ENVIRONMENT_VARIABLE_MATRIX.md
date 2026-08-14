# Environment Variable Matrix

Values belong only in Vercel/hosting secret interfaces. This matrix records names
and scope, never values.

| Group | Variables | Scope | Required for |
| --- | --- | --- | --- |
| Canonical DB | `DATABASE_URL`, `DATABASE_ENV` | server, Production/Preview separated | durable Neon capture |
| Admin | `ADMIN_SECRET`, `AUTH_SECRET`, `CRON_SECRET` | server sensitive | Lead Center/cron |
| Internal email | `LEAD_NOTIFICATION_TO`, `LEAD_NOTIFICATION_BCC`, `EMAIL_PROVIDER`, `EMAIL_ENABLED`, `RESEND_API_KEY`, `SMTP_*`, `LEAD_NOTIFICATION_*` | server sensitive except modes | internal alert/outbox |
| Staff push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PHONE_SETUP_SIGNING_SECRET`, `AGENT_PUSH_NOTIFICATIONS_ENABLED` | public key browser-safe; all others server sensitive | free phone alerts |
| Carrier SMS | `LEAD_SMS_TO`, `LEAD_SMS_COPY_TO`, `TWILIO_*`, `AGENT_SMS_NOTIFICATIONS_ENABLED` | server sensitive | deferred paid sender |
| WordPress | `WORDPRESS_BRIDGE_SECRET` | server sensitive on both systems | signed form forwarding |
| Public identity | `NEXT_PUBLIC_SITE_URL`, approved `NEXT_PUBLIC_AGENT_*` metadata | browser-safe | canonical links/copy |
| Rate limit | Upstash variables or local fallback settings | server sensitive | distributed abuse control |
| Customer channels | `CUSTOMER_EMAIL_ENABLED`, `CUSTOMER_SMS_ENABLED` | server | separately approved acknowledgments |
| Legacy rollback | `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` | rollback only | SUPERSEDED |

Production and Preview must use different Neon branches/credentials. Preview
mutation stays fail-closed unless `DATABASE_ENV=preview`, Vercel reports Preview,
and both explicit preview-mutation flags are enabled. NellySelly credentials,
project IDs, domains, or database branches are forbidden in this project.
