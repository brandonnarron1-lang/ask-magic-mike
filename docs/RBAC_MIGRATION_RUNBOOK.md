# RBAC Migration Runbook

## Preview first

1. Confirm the Neon branch URL contains `br-morning-paper-aun3378r`, not the Production branch ID.
2. Confirm `lead_center_users` and `lead_center_sessions` are absent or record the current schema state.
3. Apply `supabase/migrations/20260814190000_lead_center_rbac.sql` to Preview only.
4. Verify all six RBAC tables exist and user/session counts are zero.
5. Set the Vercel Preview `DATABASE_URL` to the Preview branch using the secure Vercel interface.
6. Set a unique Preview-only `BETTER_AUTH_SECRET`; never copy the Production Basic Auth secret.
7. Set Preview flags: `LEAD_CENTER_RBAC_ENABLED=true`, `DATABASE_ENV=preview`, `PREVIEW_DATA_MODE=isolated`, `ALLOW_PREVIEW_DB_MUTATION=true`.
8. Keep all outbound delivery disabled in Preview: email, carrier SMS, consumer acknowledgments, and push test delivery.
9. Seed only fictional users and fictional leads.
10. Execute the full negative permission matrix and record redacted evidence.

## Production prerequisites

Do not apply this migration to Production until:

- Preview acceptance passes;
- the owner-approved roster is complete;
- rollback is rehearsed;
- the first Production administrator identity is verified;
- a separate Production cutover action is explicitly approved.

## Production sequence

Apply the additive schema while `LEAD_CENTER_RBAC_ENABLED=false`, provision the verified first administrator, validate authentication in a restricted acceptance window, then enable the feature flag. Keep Basic Auth rollback material available until the acceptance report is signed off.

