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
  short-lived, copy-only setup session beginning at
  `/phone-alerts/install/[token]` and ending at token-free
  `/phone-alerts/setup`.

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

The token-scoped installed-app manifest starts at
`/phone-alerts/setup/claim?token=…`, not at the Basic Auth-protected admin route.
This is required because iPhone Push permission is available only inside the
Home Screen app and Basic Auth is not a transferable app session. The claim is
signed, expiring, restricted to `copy`, durably one-time, exact-origin bound,
and exchanged for an HttpOnly cookie before redirecting to the token-free setup
URL. The cookie contains a separately minted signed session credential—not the
bearer invite—so manually pasting the invite into a cookie cannot bypass the
one-time guard. The installed manifest is scoped to `/phone-alerts/` only.
Production refuses the claim when the durable guard is unavailable.

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
Twilio signature over the exact configured URL and form parameters, refuses
Preview, bounds the raw body, and commits the receipt, monotonic notification
transition, and communication event atomically. Twilio does not supply a unique
status-event ID, so the idempotency key is provider + Message SID + normalized
status. Duplicate delivery callbacks are no-ops, out-of-order callbacks cannot
regress confirmed delivery, and a later `delivered` callback can correct an
earlier carrier-failure callback. Failed/undelivered attempts remain visible.

The signed status route remains available for in-flight callbacks when the
Twilio auth token is configured, even if outbound sending is disabled during a
rollback. It never enables delivery itself. Retry uses the original recipient
role and never reads a phone number from the database.

## Consumer reply and STOP evidence

Twilio posts consumer replies to `POST /api/webhooks/sms/inbound`. Exact form
media is always treated as a provider callback and requires the canonical URL
signature even if outbound delivery flags have since been disabled. Production
does not accept the local admin-secret JSON mock path; Preview does not mutate.

The callback atomically claims a minimized provider receipt, records one
canonical timeline event, applies STOP to every existing lead record sharing
the normalized U.S. number, upserts all SMS permission purposes, and cancels
every eligible automated sequence. A normal reply cancels automation for human
follow-up; HELP/INFO does not. Exact replay does nothing, changed payload reuse
conflicts, and downstream failure rolls back the receipt so retry remains
possible. Neither raw message text nor the phone number is stored in receipt or
timeline metadata. START/UNSTOP does not restore permission automatically.

## Rollback

Set `AGENT_SMS_NOTIFICATIONS_ENABLED=false` or `ENABLE_SMS=false`. Email and
durable lead capture continue independently. Do not delete notification rows.
For Web Push, set `AGENT_PUSH_NOTIFICATIONS_ENABLED=false`; registered devices
may remain for a reversible rollback or be deactivated from the protected setup
screen.
