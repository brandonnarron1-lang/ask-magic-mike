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

- A new genuine lead is reconciled immediately after canonical capture by the
  PII-safe first-live monitor.
- Production also calls `/api/admin/operations/first-live` every two minutes
  with Vercel cron authentication. The monitor scans only non-test,
  non-suppressed recent leads.
- One immutable `lead.first_live_detected` audit event is recorded per complete
  canonical lead. A partial unique index prevents duplicate detections.
- Missing consent, missing source, missing assignment, internal-email failure,
  or duplicate suspicion creates one `lead.first_live_escalation` event and a
  non-200 cron result. Contact data, source URLs, consent text, and provider
  payloads are never written to monitor logs or audit metadata.
- The monitor never sends a consumer message. Internal notification and bounded
  retry remain owned by the canonical outbox.

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
