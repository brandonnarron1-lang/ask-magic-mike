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
- `pnpm reconcile-wordpress-leads` - Neon-side WordPress identity, allowlist, idempotency, and queue check; requires `DATABASE_URL`.
- `pnpm check-lead-sla` - assignment, contact, unassigned, duplicate, and test-suppression check; requires `DATABASE_URL`.

## Failure handling

Readiness/database/queue/unassigned/unsuppressed-test failures are immediate incidents. Preserve correlation IDs and records, do not resubmit a genuine lead, and use `FIRST_LIVE_LEAD_RESPONSE_RUNBOOK.md`. Normal status belongs in one daily digest; do not send minute-by-minute all-clear messages.

This baseline is scheduled synthetic monitoring, not continuous 24-hour observation.
