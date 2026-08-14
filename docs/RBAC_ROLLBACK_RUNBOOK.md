# RBAC Rollback Runbook

## Application rollback

1. Set `LEAD_CENTER_RBAC_ENABLED=false` in the affected Vercel environment.
2. Redeploy that environment so middleware and server actions return to the existing Basic Auth boundary.
3. Verify `/admin`, `/admin/leads`, and `/admin/reporting` require Basic Auth and no RBAC session grants access.
4. Revoke active RBAC sessions if database access remains available.
5. Record the rollback actor, reason, deployment, and verification timestamp.

## Database rollback

The safest rollback is to leave the additive tables in place while disabled. Drop the six RBAC tables only before real users are provisioned and only after the application is rolled back. Never drop them after authentication/audit history exists without a reviewed retention/export plan.

Preview-only clean rollback, when counts are zero:

```sql
DROP TABLE IF EXISTS public.lead_center_auth_audit,
  public.lead_center_rate_limits,
  public.lead_center_verifications,
  public.lead_center_accounts,
  public.lead_center_sessions,
  public.lead_center_users;
```

This command is not authorized for Production by this runbook.

