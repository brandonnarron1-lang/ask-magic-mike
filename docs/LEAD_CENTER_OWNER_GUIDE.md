# Lead Center Owner Guide

Current Production authentication remains fail-closed shared Basic Auth. Named
RBAC is implemented and migrated on Neon Preview, but Production cutover waits
for one verified administrator roster decision and completed Preview session/
permission acceptance.

## Owner controls

- Administrator: users, all leads, assignment, export, audit, notification and
  revocation controls.
- Primary lead owner: approved leads, contact/lifecycle/appointment/follow-up
  actions and permitted outcome/revenue fields.
- Approved agent: assigned leads and permitted lead actions only.
- Read-only analyst: approved non-sensitive reporting; no mutations or raw PII
  export.

Provision only identities marked `VERIFIED - READY TO PROVISION`. Deactivation,
role changes, and lost-device incidents require session revocation and an audit
event. Keep emergency credentials out of this guide and use
`EMERGENCY_ACCESS_RUNBOOK.md`.

The preferred `hub.ourtownproperties.com` behavior is a noindex/no-referrer
shortcut to the one canonical protected `https://www.askmagicmike.com/admin`
surface, not a second application or data store.
