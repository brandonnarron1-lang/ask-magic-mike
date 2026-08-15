# RBAC Production Cutover Report

Date: 2026-08-14
Classification: **PRODUCTION RBAC ACTIVE - ADMIN ACCEPTANCE PASSED**

## Production state

- `LEAD_CENTER_RBAC_ENABLED=true` in Production.
- All six additive RBAC tables are present on Neon Production.
- Brandon is the verified `administrator`; Mike is provisioned as the linked
  `primary_lead_owner` but remains dormant with no credential or session.
- A one-time, 60-minute password activation/reset flow is implemented and
  independently gated. It reuses the authenticated Resend transport, requires
  the exact configured Better Auth origin, never BCCs reset links, uses opaque
  idempotency keys, revokes existing sessions after reset, and does not reveal
  whether an account exists.
- Production administrator acceptance passed: sign-in, secure cookie, lead
  inbox, reporting, user-management, logout, and stale-session denial.
- The temporary acceptance credential was cleared. Brandon's newest unused
  60-minute reset link is in the approved inbox for permanent password choice.

## Preview state

- Neon Preview branch `br-morning-paper-aun3378r` contains all six additive
  RBAC tables.
- Preview readiness reports `rbac_schema_ready=true`.
- Fictional administrator, primary-owner, agent, analyst, disabled-account,
  assignment-isolation, and session-revocation acceptance passed on deployment
  `dpl_2Kpchet8VAee8oqoWi2PovznC8ct`.
- Acceptance cleanup left five banned `example.test` users and zero active
  sessions. The temporary bootstrap route and token were removed.

## Final state

- 2 users; 1 verified; 1 credential account; 0 sessions; 1 unused active reset
  link; 3 auth audit rows.
- 0 live leads; 6 suppressed tests; notification backlog 0.
- Verified sender delivered Brandon's activation/reset messages with no BCC.
- No Mike activation, consumer message, SMS, or Push was sent.

## Safe cutover order

Follow `RBAC_MIGRATION_RUNBOOK.md` for future users. Provision only a verified
identity, link agents only to an approved canonical routing row, and run the
same role/assignment/revocation matrix before granting access.

Rollback is application-first: set the feature flag false, redeploy, verify
Basic Auth denial/acceptance, revoke RBAC sessions, and leave additive tables in
place unless a separately reviewed retention-safe rollback authorizes removal.
