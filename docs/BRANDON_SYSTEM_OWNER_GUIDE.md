# Brandon System Owner Guide

## Opening check

1. Run `pnpm monitor-production` and confirm 9/9.
2. Check `/api/health/ready` for database, capture, notification, and Push
   readiness booleans only.
3. Review Lead Center unassigned, HOT, overdue, notification-failure, and
   action-queue views.
4. Check the WordPress bridge panel: Form 3 only, last success, pending retry,
   rejected form IDs, and duplicate legacy notification state.
5. Confirm test leads are suppressed and excluded from ordinary reports.

## Closing check

1. Reconcile WordPress and Neon with `pnpm reconcile-wordpress-leads` using the
   approved secure environment.
2. Run `pnpm check-lead-sla`; escalate every genuine exception.
3. Review Vercel Production errors, GitHub scheduled monitor, and the hourly SLA
   cron.
4. Record only counts and correlation IDs in the operating scoreboard; never
   export raw PII into shared artifacts.

## Controlled changes

- Forms: export definition/settings first, activate one allowlist ID, run one
  unmistakable suppressed QA, prove one record/alert/replay, and roll back only
  that form on failure.
- Users: provision only a verified roster identity; apply least privilege;
  revoke sessions on role/deactivation/lost device; keep break-glass access
  private.
- Web Push: apply reviewed schema/code, enroll one named physical device, send
  one `[TEST]`, verify protected deep link/duplicate/revocation, and never record
  endpoint values.
- Secrets: enter only through Neon/Vercel/host secure interfaces. Never paste,
  screenshot, log, document, or commit a value.

## Incident priority

- Critical: readiness/database/canonical-write failure, authentication bypass,
  genuine lead loss, or duplicate live lead.
- High: failed internal notification, unassigned genuine lead, SLA breach,
  bridge rejection spike, or unsuppressed test.
- Warning: social preview regression, invalid-submission spike, delayed queue,
  or monitoring delay.

Use `ROLLBACK_GUIDE.md`, preserve durable records and evidence, and never resend a
genuine lead by creating a second lead.
