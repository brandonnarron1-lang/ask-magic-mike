# Internal Lead SMS/MMS Delivery Spec

## Zero-cost phone-alert path

Carrier SMS is not permanently free: every legitimate U.S. provider ultimately
incurs carrier, sender, and compliance costs. The production-safe no-cost path
is encrypted Web Push using the same lead outbox. It is not mislabeled as SMS.

Web Push activation requires:

- `AGENT_PUSH_NOTIFICATIONS_ENABLED=true`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY` (Sensitive/server-only)
- `VAPID_SUBJECT=mailto:mike@ourtownproperties.com`
- `PHONE_SETUP_SIGNING_SECRET` (Sensitive/server-only, 32+ random characters)
- one device registration for the `primary` role and one for the `copy` role.
  Admin registration remains at `/admin/notifications/phone`; Brandon can use a
  short-lived, copy-only setup session at `/phone-alerts/setup`.

Each live lead creates independent push delivery records per registered device,
with provider status, attempts, retries, and deterministic idempotency. QA leads
are suppressed. Lock-screen content contains urgency, intent, broad area, and
score only; contact details and free text remain behind Lead Center auth.

On iOS/iPadOS, Web Push requires adding the site to the Home Screen before the
user grants notification permission. Android and supported desktop browsers can
subscribe directly. Removing a device deactivates its server-side capability.

The protected setup page can send an unmistakable `[TEST]` Web Push only to an
active `copy` device. That check creates no lead, does not affect KPIs, cannot
target Mike's `primary` subscription, and is guarded by a short-lived signed,
HttpOnly setup session, exact same-origin validation, an explicit request
header, runtime schema validation, and rate limiting. The invite endpoint itself
requires admin authentication and never changes lead routing.

The Brandon invite opens a token-scoped `/phone-alerts/install/[token]` page.
That page serves a private, no-store manifest whose one-time `start_url` is the
claim route. The installed iPhone web app therefore redeems the short-lived token
inside its own isolated cookie context before opening `/phone-alerts/setup`.
The flow does not rely on Safari transferring cookies to the Home Screen app and
never transfers Basic Auth credentials.

## Scope

This is an internal operational alert, not a consumer marketing message. The
canonical `lead_notifications` outbox remains the only delivery ledger. Mike is
the primary recipient and assignee; the owner-approved copy recipient receives
an audit copy and does not become the lead owner.

## Activation contract

Production delivery requires all of the following server-only variables:

- `LEAD_NOTIFICATION_MODE=production`
- `LEAD_NOTIFICATION_PRODUCTION_ENABLED=true`
- `AGENT_SMS_NOTIFICATIONS_ENABLED=true`
- `SMS_PROVIDER=twilio`
- `ENABLE_SMS=true`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_PHONE`
- `LEAD_SMS_TO` and `LEAD_SMS_COPY_TO`

Recipient values and provider credentials are hosting secrets. They are not
committed, logged, returned by health endpoints, or stored in the outbox. The
outbox stores only `sms_primary_configured` or `sms_copy_configured`.

## Safety and routing

- `is_test=true` suppresses all internal SMS/MMS.
- Every live score band (`HOT`, `ACTIVE`, and `NEW`) is eligible.
- The SMS contains urgency, lead type, recorded source, intent, city/target
  area, score, and an authenticated Lead Center URL.
- It excludes the consumer's name, email, phone, full address, free-text
  message, consent text, and click IDs.
- Primary and copy deliveries have separate idempotency keys, attempts,
  provider message IDs, retry state, and delivery callbacks.
- Enabling SMS never changes the public brokerage phone number.

## Visual urgency templates

- HOT: `/images/ask-magic-mike/notifications/lead-alert-hot-v2.png`
- ACTIVE: `/images/ask-magic-mike/notifications/lead-alert-active-v2.png`
- NEW: `/images/ask-magic-mike/notifications/lead-alert-new-v2.png`
- QA email only: `/images/ask-magic-mike/notifications/lead-alert-frame-v1.png`

The images contain no lead PII, contact details, buttons, or synthetic lead
facts. `LEAD_SMS_MEDIA_ENABLED=false` is the safe default; enable it only after
the registered sender is confirmed to support MMS. Video is intentionally not
part of the notification path because it adds latency, carrier variability,
accessibility problems, and no routing value.

## Delivery evidence

Twilio acceptance stores the Message SID in `provider_message_id`. Twilio posts
status changes to `POST /api/webhooks/sms/status`; the route verifies the
Twilio signature, records the provider status in protected metadata, and marks
failed/undelivered attempts visibly. Retry uses the original recipient role and
never reads a phone number from the database.

## Rollback

Set `AGENT_SMS_NOTIFICATIONS_ENABLED=false` or `ENABLE_SMS=false`. Email and
durable lead capture continue independently. Do not delete notification rows.
For Web Push, set `AGENT_PUSH_NOTIFICATIONS_ENABLED=false`; registered devices
may remain for a reversible rollback or be deactivated from the protected setup
screen.
