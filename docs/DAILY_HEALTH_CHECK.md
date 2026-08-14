# Daily Health Check

1. Run `TARGET_URL=https://www.askmagicmike.com pnpm run monitor:synthetic`.
2. Confirm `/api/health/live` and `/api/health/ready` are healthy.
3. Review new live leads, unassigned leads, overdue SLA, and failed notifications.
4. Reconcile new WordPress forwarded entries to canonical lead IDs.
5. Confirm Form 3 is the only active bridge allowlist entry.
6. Confirm test leads are excluded from production counts.
7. Review Vercel 5xx and bridge rejection logs.
8. Record date, operator, exceptions, and remediation in the operations log.

Do not submit a QA lead as a routine daily check.
