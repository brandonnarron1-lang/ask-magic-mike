# Lead Center Authentication Rollback

## Fast rollback

1. Set `LEAD_CENTER_RBAC_ENABLED=false` in the affected Vercel environment.
2. Redeploy the last verified commit or redeploy with the changed variable.
3. Confirm anonymous `/admin` returns `401` with the Basic challenge.
4. Confirm the approved shared credential still opens the Lead Center.
5. Revoke affected per-user sessions in `lead_center_sessions`; do not delete users or audit evidence.
6. Run `pnpm monitor-production` and the production smoke suite.

The RBAC migration is additive. Do not drop identity tables after provisioning users. Table removal is permitted only before provisioning and only through the commented migration rollback after a backup.
