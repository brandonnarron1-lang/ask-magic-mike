# Production Monitoring Runbook

Run the existing read-only monitor; do not create synthetic leads:

```bash
TARGET_URL=https://www.askmagicmike.com pnpm run monitor:synthetic
pnpm run amm:verify:health
pnpm run amm:verify:funnel
pnpm run amm:verify:isolation
```

Then inspect Vercel production logs for HTTP 5xx, bridge authorization failures,
`notification_failed`, and queue retry growth. In WordPress, open Settings → AMM
Canonical Bridge and confirm only approved forms appear as forwarded. In Gravity
Forms, reconcile each forwarded entry to one canonical lead ID.

Escalate immediately if readiness fails, an unauthorized form forwards, a saved
entry lacks a canonical ID, a lead has multiple internal alerts, or NellySelly
appears in any Ask Magic Mike project/domain/database identifier.

This is a point-in-time operating procedure, not a claim of continuous external
monitoring.
