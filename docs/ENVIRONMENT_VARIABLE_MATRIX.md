# Environment Variable Matrix

Values belong only in Vercel/hosting secret interfaces. This matrix records names
and scope, never values.

## Prepared request/response controls (not activated by source presence)

- `REQUEST_RESPONSE_WORKER_ENABLED=false`: independent new outbox worker kill
  switch within the existing notification cron; does not pause v6 staff emails.
- `REQUEST_RECEIPTS_ENABLED=false`, `REQUEST_RECEIPTS_ACTIVATED_AT` (unset):
  generation + dispatch require both, plus existing `CUSTOMER_EMAIL_ENABLED` at
  dispatch. Use a truthful cutoff; inquiries created before it never enter this
  scope even if they later request a conversation. No historical seeding job.
- `REQUEST_RECEIPTS_REPLY_TO` (unset): verified monitored mailbox; no guessed
  fallback to the sender. Sender/provider and Mike/Brandon destinations reuse
  their existing approved bindings; no BCC on the new per-recipient intents.
- New request receipts require an explicit `amm_request_receipt_email_v1`
  purpose row from the separate unchecked first-party receipt choice AND current
  retained request-email evidence. Recheck opt-out/denial/suppression on claim.
  A preferred channel, manual permission projection or template edit cannot seed
  or authorize a receipt. Signed legacy WordPress forms cannot claim the new copy.
- `AGENT_PUSH_NOTIFICATIONS_ENABLED` retains its existing gate. The new atomic
  capture wrapper can seed one intent per active subscription (bounded to ten),
  and claims recheck activation/role. Physical enrollment/receipt are separate.
- Leave `CONSUMER_ACKNOWLEDGMENT_ENABLED` OFF; the legacy path is not the new
  worker. Leave carrier SMS, allocation and remote address predictions OFF.

Deploy only after `20261105224500_public_request_response.sql` passes exact-source
review/guarded migration and protected acceptance. Roll back application code only;
retain all additive columns, consent, task, outbox and provider history.

| Group | Variables | Scope | Required for |
| --- | --- | --- | --- |
| Canonical DB | `DATABASE_URL`, `DATABASE_ENV`, `PREVIEW_NEON_ENDPOINT_ID`, `PRODUCTION_NEON_ENDPOINT_ID` | server, Production/Preview separated; endpoint IDs are Preview-scoped attestation inputs | durable Neon capture and fail-closed Preview identity |
| Lead Center identity | `LEAD_CENTER_RBAC_ENABLED`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` | server sensitive except URL | Better Auth sessions and RBAC |
| Optional consumer comparison | `CONSUMER_WORKSPACE_ACCOUNTS_ENABLED` | server, false/absent by default; requires reviewed consumer schema and the existing approved database/auth configuration | separate consumer cookie/models/domain-derived signing key, own saved comparisons/export/deletion; no staff permission, email verification, password-reset mail, prior-inquiry linking or provider action |
| R2 source governance and feedback | `R2_SOURCE_GOVERNANCE_ENABLED` | server, false/absent by default; four reviewed additive R2 migrations must precede callers; independent per-venue activation | current-revision source eligibility, scoped guest/account answer receipts, source review and feedback disposition; not permission for paid public AI, sends, schedules or new source rights; recovery retains tombstones/readers |
| Break-glass/operations | `ADMIN_SECRET`, `AUTH_SECRET`, `CRON_SECRET` | server sensitive | disabled-RBAC fallback and protected cron/health operations; not normal staff login |
| Internal email | `LEAD_NOTIFICATION_TO`, `LEAD_NOTIFICATION_BCC`, `EMAIL_PROVIDER`, `EMAIL_ENABLED`, `RESEND_API_KEY`, `RESEND_WEBHOOK_*`, `SMTP_*`, `LEAD_NOTIFICATION_*` | server sensitive except modes | internal alert/outbox and provider status |
| Staff push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PHONE_SETUP_SIGNING_SECRET`, `AGENT_PUSH_NOTIFICATIONS_ENABLED` | public key browser-safe; all others server sensitive | free phone alerts |
| Carrier SMS | `LEAD_SMS_TO`, `LEAD_SMS_COPY_TO`, `TWILIO_*`, `AGENT_SMS_NOTIFICATIONS_ENABLED` | server sensitive | deferred paid sender |
| WordPress | `WORDPRESS_BRIDGE_SECRET`, `WORDPRESS_BRIDGE_FORM_IDS`, `WORDPRESS_BRIDGE_CONSENT_CONTRACTS` | secret is server-sensitive on both systems; form IDs and consent contracts are server configuration | signed, per-form forwarding with exact consent-copy pinning |
| Public identity | `NEXT_PUBLIC_SITE_URL`, approved `NEXT_PUBLIC_AGENT_*` metadata | browser-safe | canonical links/copy |
| Rate limit | `DATABASE_URL`, `RATE_LIMIT_HASH_SECRET`, `CONSENT_IP_HASH_SALT`, `CRON_SECRET`, `ADMIN_SECRET`, `LEAD_RATE_LIMIT_PER_MINUTE`, `RATE_LIMIT_EMERGENCY_MEMORY` | server sensitive | HMAC-pseudonymized durable Neon abuse control; dedicated hash secret is required for Production readiness and emergency memory mode requires exact value `1` |
| Customer channels | `CUSTOMER_EMAIL_ENABLED`, `CUSTOMER_SMS_ENABLED` | server | separately approved acknowledgments |
| Legacy compatibility | `ALLOW_LEGACY_SUPABASE_FALLBACK`, `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` | non-Production only | SUPERSEDED; forbidden as a Production fallback |
| Optional address lookup candidate | `ADDRESS_LOOKUP_ENABLED`, `ADDRESS_GOOGLE_CONTENT_USE_APPROVED`, `GOOGLE_PLACES_API_KEY`, `ADDRESS_LOOKUP_SIGNING_SECRET` | server only; absent/false by default, never enabled in Preview | separately approved Places REST New lookup; manual entry requires none of these. Activation is not part of review publication. |
| Address cost admission candidate | `ADDRESS_ZERO_SPEND_ADMISSION_APPROVED`, `ADDRESS_LOOKUP_DAILY_CALL_CAP`, `ADDRESS_LOOKUP_MONTHLY_CALL_CAP` | server only, held until current account-wide evidence; caps1–100/day and day–1000/32days | durable shared pre-dispatch limits include errors/abandonment; not a provider/account billing ceiling |
| Daily operator digest (accepted PR322 contract) | `OPERATOR_DAILY_DIGEST_USER_ID`, `OPERATOR_DAILY_DIGEST_ACTIVATED_AT`, `OPERATOR_DAILY_DIGEST_ENABLED` | server only; actual enablement/time in private receipt and final deployment | verified administrator/existing second-operator mailbox only; first due scheduled report, no immediate send; no Mike fallback/BCC |
| Traffic coverage (accepted PR322 contract) | `PUBLIC_TRAFFIC_COLLECTION_STARTED_AT` | server UTC collection timestamp, never backdated | partial/complete labels; optional browser storage still requires analytics grant; legacy events are not traffic-v1 visit estimates |

Production and Preview must use different Neon branches/credentials. Preview
mutation stays fail-closed unless `DATABASE_ENV=preview`, Vercel reports Preview,
the parsed Neon endpoint matches the approved Preview endpoint and not the
Production endpoint, the expected IDs are distinct, and both explicit
preview-mutation flags are enabled. NellySelly credentials,
project IDs, domains, or database branches are forbidden in this project.
Example values default to disabled even where Production is active; read live
state from the health endpoints and hosting interface, never from `.env.example`.
