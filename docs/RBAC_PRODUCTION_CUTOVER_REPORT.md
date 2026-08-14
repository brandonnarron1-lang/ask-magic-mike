# RBAC Production Cutover Report

Date: 2026-08-14
Classification: **IMPLEMENTED - PRODUCTION ROSTER REQUIRED**

## Production state

- `LEAD_CENTER_RBAC_ENABLED` remains false/unconfigured in Production.
- Shared Basic Auth remains the active fail-closed boundary.
- Production RBAC tables have not been created.
- No Production RBAC user, account, or session has been provisioned.
- Mike is verified as the proposed `primary_lead_owner`.
- Brandon's exact administrator role and approved login identity remain an owner
  decision. No personal/public identity was silently promoted.

## Preview state

- Neon Preview branch `br-morning-paper-aun3378r` contains all six additive
  RBAC tables and zero users/sessions.
- Preview readiness reports `rbac_schema_ready=true`.
- A unique Preview-only `BETTER_AUTH_SECRET` and branch-scoped RBAC flag are
  still required for fictional-user interactive acceptance.

## Cutover prerequisites not yet met

1. Complete the Preview login/session/permission/revocation acceptance matrix.
2. Approve one Production administrator login identity.
3. Approve Mike's final permissions and any additional agent/analyst users.
4. Record export scope and agent-to-routing-row links.
5. Rehearse the Basic Auth rollback with no Production user impact.

## Safe cutover order

Follow `RBAC_MIGRATION_RUNBOOK.md`: snapshot, apply additive schema while the
flag is off, provision only verified users, validate administrator and Mike,
enable a restricted acceptance window, verify assignment/export/audit/revoke,
then retain Basic Auth as break-glass until the stable acceptance period ends.

Rollback is application-first: set the feature flag false, redeploy, verify
Basic Auth denial/acceptance, revoke RBAC sessions, and leave additive tables in
place unless a separately reviewed retention-safe rollback authorizes removal.
