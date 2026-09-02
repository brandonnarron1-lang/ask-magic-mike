# Email Delivery Specification

## Contract

Lead persistence is independent of provider delivery. The public capture
transaction now commits the complete lead and required internal delivery intent
together:

1. Commit one internal alert outbox row keyed by
   `lead_alert:<lead_id>:lead_alert_email_v3` for new alerts. Historical v1/v2
   rows retain their recorded version and renderer during retry.
2. After commit, atomically claim that row and send to `LEAD_NOTIFICATION_TO`
   (default `mike@ourtownproperties.com`) and the
   secure `LEAD_NOTIFICATION_BCC` value, if configured. The BCC address is never
   rendered in the subject/body or logs.
3. Create one separate consumer acknowledgment row only when the submitted email
   consent is true and suppression is false.
4. Store provider, provider message ID, status, attempt count, timestamps,
   template version, safe error summary, and related lead ID in `lead_notifications`.

`capture_public_lead_v2` also commits deterministic score factors, QA/test
suppression, exact consent evidence, first/last-touch attribution, click IDs,
placement context, and the source idempotency key. If the required outbox insert
fails, the same transaction rolls back the lead; the public form cannot claim a
durable success with no retryable internal alert. No recipient address, BCC,
message body, or provider secret is stored by the capture function.

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

The request path first claims and delivers the transaction-seeded `pending`
record. If the function stops after commit but before that claim, the scheduled
worker recovers the unclaimed row after five minutes. Idempotent request replay
can also seed a missing canonical row for a historical lead; replay itself does
not call the provider.

The existing protected retry route is also the scheduled worker. Vercel invokes
`GET /api/admin/notifications/retry` once per minute in Production with
`Authorization: Bearer $CRON_SECRET`; any other GET remains an authenticated,
read-only readiness check. Each scheduled run processes at most 25 due rows
sequentially and returns only status counts. Due selection includes a
never-claimed `pending` row only after the shared five-minute stale threshold,
so a serverless interruption after durable insertion cannot strand the first
attempt. The existing atomic conditional claim remains the concurrency and
duplicate-send boundary. It dispatches the three existing
outbox types (`lead_alert`, `consumer_ack`, and `agent_assignment`) through their
version-pinned renderers and provider adapters. Unknown types become visible
terminal failures instead of being silently dropped.

Before a Production batch reads the outbox, it verifies the existing Production
mode, global delivery gate, email enablement, and selected Resend or SMTP
configuration. An operational disablement or incomplete provider returns a
no-store `notification_retry_delivery_not_ready` response and leaves due rows
unchanged for a later healthy run. The check reports no credential value.

Preview refuses the worker before repository or provider access. Automated runs
mark QA rows skipped without sending, and every consumer-ack retry reloads the
lead and re-checks current email consent, whole-record suppression, email
suppression, and test state. Manual administrator retry remains available for a
separately approved QA exercise. The database claim and provider idempotency key
remain the duplicate-send boundary; scheduled execution creates no second queue.

Every assignment retry reloads and verifies the current exact assignee, active
agent state, global staff-notification switch, channel switch, and current
destination after atomically claiming the row but before provider delivery.
Unassignment, reassignment, deactivation, or a channel pause records a visible
`skipped` result and cannot leak the lead to a stale recipient. The protected
Lead Center retry action dispatches each row through its recorded type's own
processor rather than assuming every row is an agent assignment.

Rows already in `processing` are intentionally absent from automatic selection.
The provider may have accepted such a request before the application lost its
response. AdminOps identifies processing rows older than ten minutes and directs
the operator to reconcile provider history and message ID before any state
change or replay.

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
notification hierarchy. The runtime deliberately does **not** send those
raster examples because they contain invented lead details that cannot be
updated, selected, copied, or suppressed safely.

`leadAlertVisualTemplates.ts` selects one privacy-safe urgency background from
the deterministic score bands: `hot_priority` (80–100),
`active_assignment` (60–79), `new_lead` (<60), and `qa_test`. Email template
`lead_alert_email_v3` composes that background with the approved, unchanged
Our Town Properties logo and Mike Eatmon portrait already in the canonical
brand pack. All urgency, source, score, contact, consent, assignment, and next-
action facts remain accessible HTML and plain text. No consumer fact is burned
into an image.

The protected Message Review Studio renders HOT, ACTIVE, and NEW states only
through a design-preview mode that forces `[TEST]`, states that no lead exists,
contains no contact detail, and has no send control. Stored v1/v2 notifications
remain version-pinned to the legacy renderer during retry; an unknown recorded
template fails closed instead of silently changing content.

SMS remains text-only by default. MMS media remains independently disabled and
requires an approved registered carrier provider and non-test recipient. No AI
model determines lead importance, recipient, routing, or delivery.

## Atomic Resend lifecycle callback

The existing `POST /api/webhooks/email/events` remains the only Resend callback
and accepts only the eight lifecycle events configured on the provider
subscription. It verifies bounded Svix headers and the exact raw JSON body
before any database access, hashes rather than stores the payload, and refuses
Preview writes even if a secret is copied accidentally.

Receipt insertion, outbox mutation, communication-event insertion, and
bounce/complaint suppression now share one parameterized PostgreSQL statement.
Any database error rolls back every effect and returns a safe 503 so provider
retry remains possible. Exact replay is acknowledged without mutation; only a
receipt explicitly marked `failed` can be reclaimed. Reuse of a completed
event ID with a different payload hash fails closed.

Every callback response is private/no-store and correlated in both body and
`X-AMM-Correlation-Id`. Stored metadata contains event class, timestamp,
signature-verification truth, match state, and processing-contract version; it
contains no raw payload, recipient address, signature, secret, or provider
exception. Full contract and proof are in
[`phase9/EMAIL_WEBHOOK_ATOMIC_BOUNDARY.md`](./phase9/EMAIL_WEBHOOK_ATOMIC_BOUNDARY.md)
and
[`phase9/EMAIL_WEBHOOK_ATOMIC_BOUNDARY_QA_EVIDENCE.md`](./phase9/EMAIL_WEBHOOK_ATOMIC_BOUNDARY_QA_EVIDENCE.md).
