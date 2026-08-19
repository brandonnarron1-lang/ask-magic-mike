# Phase 9.2 — Email Provider Resilience

## Decision

Keep the existing canonical Neon lead/outbox pipeline and make only its email
transport selectable. Resend remains supported. Authenticated SMTP is the
free-first/open-standard fallback for an already-owned mailbox or hosting relay.
No second lead database, notification queue, or admin surface is introduced.

This closes a concrete single-provider risk: an unpaid or disabled Resend account
must not be able to silently strand a durably stored lead. It does **not** claim
that an SMTP account is free, provisioned, or deliverable until the owner selects
an existing approved server and sender.

## Preserved controls

- Neon remains the canonical lead, notification, event, and audit store.
- Lead persistence completes before notification delivery.
- Internal email and consumer acknowledgment remain separate records and gates.
- Hidden BCC stays in the envelope and never appears in body, subject, logs, or
  health output.
- Existing 1/5/30-minute bounded retries and maximum three attempts remain.
- Existing outbox claim and idempotency key remain the duplicate-send control.
- Sandbox rewrites the destination to the exact allowlisted QA address.
- Production requires notification mode, global Production delivery, and email
  gates before any network connection is created.

## Transport contract

`EMAIL_PROVIDER=resend` uses the existing HTTPS API adapter.
`EMAIL_PROVIDER=smtp` uses Nodemailer with:

- authenticated port 465 implicit TLS or port 587 required STARTTLS;
- certificate validation and explicit TLS server name;
- 10-second connection/greeting and 20-second socket defaults;
- file and URL access disabled;
- no provider debug logging;
- one connection per low-volume serverless delivery, closed in `finally`;
- deterministic RFC Message-ID derived from the outbox idempotency key; and
- safe, non-PII error summaries only.

The implementation follows the official Nodemailer SMTP transport guidance and
Vercel's Node.js Function model:

- https://nodemailer.com/smtp
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/functions/limitations

## Failure semantics

| Result | Outbox behavior |
| --- | --- |
| SMTP 4xx, timeout, DNS/socket/TLS interruption | Retry with existing bounded schedule |
| Authentication failure or SMTP 5xx | Permanent failure; visible operator action |
| Primary accepted but protected BCC rejected | Permanent partial-recipient failure; do not blindly duplicate primary |
| All protected recipients confirmed | Sent with sanitized provider Message-ID |
| Missing/invalid selector or SMTP configuration | Fail closed before socket creation |

## Deployment and rollback

The code can be deployed while the current selector remains `resend`; that makes
SMTP dormant. Before changing the selector, record the current Resend values and
deployment ID for rollback. Enter all SMTP values through Vercel Sensitive
environment variables, never source control.

Rollback is either:

1. restore `EMAIL_PROVIDER=resend` and redeploy the last verified commit; or
2. promote the recorded prior Production deployment.

Neither rollback changes Neon lead/outbox records. Any pending or failed row must
be reconciled in the Lead Center before a manual retry.

## Exact approval gates

- `APPROVE PHASE 9.2 EMAIL PROVIDER RESILIENCE MERGE AND PRODUCTION DEPLOYMENT`
- `APPROVE SMTP SECURE CONFIGURATION AND CONNECTION-ONLY VERIFICATION`
- `APPROVE SMTP INTERNAL QA EMAIL PILOT`

The final gate authorizes one unmistakably synthetic `[TEST]` message only. It
does not authorize consumer acknowledgment, Mike activation, bulk sends, DNS
changes, mailbox creation, purchases, or public marketing.
