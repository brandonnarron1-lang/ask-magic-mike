# Production Monitoring Runbook

## Scheduled

- Vercel SLA sweep: active hourly. Six consecutive production requests were
  observed at audit, each HTTP 200. The staged Phase 3 change makes authenticated
  cron calls persist idempotent breach flags by default; manual admin calls stay
  dry-run unless explicitly requested.
- GitHub Actions public synthetic: active hourly on `main`; the first observed
  scheduled run completed successfully.

## Point-in-time and operator-run

- `pnpm monitor-production` - nine public, health, and anonymous-admin checks.
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

This baseline is scheduled synthetic monitoring, not continuous 24-hour observation.
