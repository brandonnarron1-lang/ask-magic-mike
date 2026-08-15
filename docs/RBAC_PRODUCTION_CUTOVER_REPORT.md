# RBAC Production Cutover Report

Date: 2026-08-14
Classification: **PREVIEW ACCEPTED - SECURE ACTIVATION READY - PRODUCTION ROSTER REQUIRED**

## Production state

- `LEAD_CENTER_RBAC_ENABLED` remains false/unconfigured in Production.
- Shared Basic Auth remains the active fail-closed boundary.
- Production RBAC tables have not been created.
- No Production RBAC user, account, or session has been provisioned.
- A one-time, 60-minute password activation/reset flow is implemented and
  independently gated. It reuses the authenticated Resend transport, requires
  the exact configured Better Auth origin, never BCCs reset links, uses opaque
  idempotency keys, revokes existing sessions after reset, and does not reveal
  whether an account exists.
- Mike is verified as the proposed `primary_lead_owner`.
- Brandon's exact administrator role and approved login identity remain an owner
  decision. No personal/public identity was silently promoted.

## Preview state

- Neon Preview branch `br-morning-paper-aun3378r` contains all six additive
  RBAC tables.
- Preview readiness reports `rbac_schema_ready=true`.
- Fictional administrator, primary-owner, agent, analyst, disabled-account,
  assignment-isolation, and session-revocation acceptance passed on deployment
  `dpl_2Kpchet8VAee8oqoWi2PovznC8ct`.
- Acceptance cleanup left five banned `example.test` users and zero active
  sessions. The temporary bootstrap route and token were removed.

## Cutover prerequisites not yet met

1. Approve one Production administrator login identity.
2. Approve Mike's final permissions and any additional agent/analyst users.
3. Record export scope and agent-to-routing-row links.
4. Apply the additive migration and configure Production-only auth values.
5. Enable `RBAC_PASSWORD_RESET_EMAIL_ENABLED` only after the verified Resend
   sender and Production auth origin are confirmed; send each activation link
   only to the approved account identity.
6. Rehearse the Basic Auth rollback with no Production user impact.

## Safe cutover order

Follow `RBAC_MIGRATION_RUNBOOK.md`: snapshot, apply additive schema while the
flag is off, provision only verified users, validate administrator and Mike,
enable a restricted acceptance window, verify assignment/export/audit/revoke,
then retain Basic Auth as break-glass until the stable acceptance period ends.

Rollback is application-first: set the feature flag false, redeploy, verify
Basic Auth denial/acceptance, revoke RBAC sessions, and leave additive tables in
place unless a separately reviewed retention-safe rollback authorizes removal.
