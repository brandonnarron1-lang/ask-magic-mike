# Production Monitoring Runbook

## Scheduled

- Vercel SLA sweep: active hourly. Six consecutive production requests were
  observed at audit, each HTTP 200. The staged Phase 3 change makes authenticated
  cron calls persist idempotent breach flags by default; manual admin calls stay
  dry-run unless explicitly requested.
- GitHub Actions public synthetic: every six hours on `main`, plus a bounded
  verification after each successful Vercel Production deployment.
- Each production verification makes at most three read-only attempts. A final
  failure remains red; a transient recovery is preserved in the run artifact.
- Failed runs open or update one rolling GitHub incident. A later green run
  records the recovery and closes it automatically.

## Point-in-time and operator-run

- `pnpm monitor-production` - eleven public, canonical-redirect, health,
  readiness, and anonymous-admin checks. It writes aggregate-only JSON and
  Markdown evidence to `artifacts/production-monitor-report.*`.
- `pnpm reconcile-wordpress-leads` - Neon-side WordPress identity, allowlist,
  idempotency, and queue check; requires `DATABASE_URL`.
- `pnpm reconcile-wordpress-leads -- --legacy-csv /absolute/private/path.csv` -
  Production-attested, transaction-read-only comparison of an approved legacy
  WordPress export with canonical identity candidates. It emits no contact values
  and performs no import. See `WORDPRESS_LEGACY_LEAD_RECONCILIATION.md`.
- `pnpm check-lead-sla` - assignment, contact, unassigned, duplicate, and test-suppression check; requires `DATABASE_URL`.

## First-live protection

- A new genuine lead registers a runtime-tracked Next.js `after` callback only
  after canonical capture. Monitoring no longer holds the public confirmation
  open. Local synthetic acceptance targets under 100 ms commit-to-response
  overhead; this is not a Production latency SLA.
- Production also calls `/api/admin/operations/first-live` every two minutes
  with Vercel cron authentication. The monitor scans only non-test,
  non-suppressed recent leads and older never-assessed inquiries (including new
  inquiries on an old contact), up to 500 per run with unaudited work first.
  Durable capture remains the catch-up source if an `after` callback is lost.
- A whole monitor run has a 10-second HTTP abort deadline and transaction-local
  PostgreSQL statement timeouts (at most 8 seconds, bounded by time remaining).
  A timeout is a failed execution, not an all-clear. Partial audit commits are
  idempotent and recoverable on the existing two-minute schedule.
- Current ownership follows direct or linked canonical ownership without adding
  an assignment event. A fingerprinted, separate-session inquiry on the same
  canonical contact is a legitimate repeat, not automatically an accidental
  duplicate. Missing/broken linkage remains suspicious.
- Consent evidence can record declined permission; it never grants contact.
  Both frozen v6 operator envelopes are checked, not only the latest email.
- One immutable `lead.first_live_detected` audit event is recorded per complete
  canonical lead. A partial unique index prevents duplicate detections.
- Missing consent, missing source, missing assignment, internal-email failure,
  or duplicate suspicion creates one `lead.first_live_escalation` event and a
  non-200 cron result. Contact data, source URLs, consent text, and provider
  payloads are never written to monitor logs or audit metadata.
- The monitor never sends a consumer message. Internal notification and bounded
  retry remain owned by the canonical outbox.
- Each execution logs only correlation, stage, duration, aggregate counts,
  outcome (`healthy`, `unhealthy_report`, `missing_configuration`, or
  `execution_error`) and safe SQLSTATE/error category. Historical status-only
  503s cannot be retroactively assigned a cause.
- Existing `/admin/activity?source=audit` and the lead's unified activity history
  expose immutable monitor incidents. An audit record or server log is not an
  operator Inbox receipt: receipt/escalation acknowledgement stays separate.

## Failure handling

Readiness/database/queue/unassigned/unsuppressed-test failures and first-live
escalations are immediate incidents. Preserve correlation IDs and records, do
not resubmit a genuine lead, and use `FIRST_LIVE_LEAD_RESPONSE_RUNBOOK.md`.
Normal status belongs in one daily digest; do not send minute-by-minute all-clear
messages.

Every CI failure summary must retain `ROOT_CAUSE_CATEGORY`, `FAILED_COMPONENT`,
`EXPECTED`, `ACTUAL`, `REMEDIATION`, `RETRY_SAFE`, and `PRODUCTION_IMPACT`.
Never paste environment values, provider payloads, lead contact data, or BCC
recipients into an issue or artifact.

This baseline is scheduled synthetic monitoring, not continuous 24-hour observation.
