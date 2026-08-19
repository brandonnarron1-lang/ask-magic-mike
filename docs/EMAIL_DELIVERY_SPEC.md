# Email Delivery Specification

## Contract

Lead persistence is independent of email. After the atomic lead capture commits:

1. Create one internal alert outbox row keyed by
   `lead_alert:<lead_id>:lead_alert_email_v1`.
2. Send to `LEAD_NOTIFICATION_TO` (default `mike@ourtownproperties.com`) and the
   secure `LEAD_NOTIFICATION_BCC` value, if configured. The BCC address is never
   rendered in the subject/body or logs.
3. Create one separate consumer acknowledgment row only when the submitted email
   consent is true and suppression is false.
4. Store provider, provider message ID, status, attempt count, timestamps,
   template version, safe error summary, and related lead ID in `lead_notifications`.

## Safe configuration

```text
LEAD_NOTIFICATION_TO=mike@ourtownproperties.com
LEAD_NOTIFICATION_BCC=
LEAD_SUBJECT_PREFIX=
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=
SMTP_FROM_EMAIL=
SMTP_REPLY_TO=
SMTP_CONNECTION_TIMEOUT_MS=10000
SMTP_GREETING_TIMEOUT_MS=10000
SMTP_SOCKET_TIMEOUT_MS=20000
EMAIL_PROVIDER=resend # resend | smtp
EMAIL_ENABLED=false
```

The canonical outbox can use either the existing Resend adapter or authenticated
SMTP. `EMAIL_PROVIDER=resend` preserves the current API transport;
`EMAIL_PROVIDER=smtp` selects the SMTP transport. If the selector is absent, an
existing `RESEND_API_KEY` preserves the historical Resend behavior. Any explicit
unsupported value fails closed.

SMTP accepts only port 465 with implicit TLS (`SMTP_SECURE=true`) or port 587
with required STARTTLS (`SMTP_SECURE=false`). It requires authentication, a
fully-qualified host, certificate validation, an approved sender, and bounded
timeouts. Each delivery creates one non-pooled connection and closes it after the
result, which avoids retaining TCP sockets in a serverless function. URL and file
access are disabled at both transport and message level. Credentials are never
requested in chat or committed.

Production currently uses the dedicated aligned sender subdomain
`notify.askmagicmike.com`; its DKIM, SPF, return-path MX, and DMARC records are
managed in DNS. Before selecting SMTP, verify equivalent alignment for the exact
approved SMTP sender. Resend remains a supported rollback path, but its current
billing condition is an explicit delivery risk and must not be hidden.

## Subject builder

`{{PRIORITY_TAG}} {{LEAD_LABEL}} | {{SOURCE_LABEL}} | {{INTENT_LABEL}} | {{CITY_OR_PROPERTY}} | {{LEAD_NAME}} | Score {{SCORE}}`

Priority: `[HOT]` 80–100, `[ACTIVE]` 60–79, `[NEW]` below 60, `[TEST]` for test
leads. Values are derived from recorded fields and sanitized for header injection.

## Retry behavior

Attempts are bounded to three with 1 minute, 5 minute, and 30 minute backoff. A
retryable provider/network/429/5xx response becomes `retry_scheduled`; exhaustion
becomes `permanently_failed`. AdminOps shows both states and allows a controlled
retry. A failed email does not lose or roll back the lead.

SMTP 4xx and connection/TLS timeout errors are retryable. Authentication errors,
5xx recipient rejection, and partial primary/BCC acceptance require operator
review and are not retried automatically, because a blind retry could duplicate a
message that the primary recipient already accepted. The SMTP Message-ID is
deterministically derived from the canonical outbox idempotency key for provider
correlation. SMTP does not offer Resend's API-level idempotency guarantee, so the
canonical claim/outbox state remains the primary duplicate-send control.

## Approval gate

No real email is sent by this local task. Enabling production delivery requires the
owner to enter secure values, verify sender authentication, approve the first QA
send, and confirm Mike plus the hidden audit BCC without displaying the BCC value.

Use three separate gates:

1. Merge and Production deploy the dormant provider capability.
2. Enter SMTP secrets and perform connection-only verification without sending.
3. Approve one `[TEST]` internal QA email, then verify Mike, the hidden audit BCC,
   provider Message-ID, outbox status, and duplicate suppression.
# Visual internal-alert variants

The supplied “HOT LEAD”, “Lead Assignment”, and “New Lead” images informed the
notification hierarchy. The runtime implementation deliberately does **not**
send those raster examples: they contain invented lead details and cannot be
updated or suppressed safely. Instead, `leadAlertVisualTemplates.ts` selects
an accessible HTML card from the deterministic score bands: `hot_priority`
(80–100), `active_assignment` (60–79), `new_lead` (<60), and `qa_test`.

The generated abstract frame (`public/images/ask-magic-mike/notifications/lead-alert-frame-v1.png`)
is decorative only; it has no person, logo, text, or consumer data. Email facts
remain live text. SMS remains text-only and can only be enabled for an
approved agent recipient, an approved carrier provider, score ≥60, and a
non-test lead. No AI model determines lead importance, recipient, or sends.
