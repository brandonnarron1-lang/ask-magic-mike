# Internal Lead SMS/MMS Delivery Spec

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
