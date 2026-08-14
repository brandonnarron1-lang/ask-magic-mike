# Emergency Access Runbook

Use only for a confirmed Lead Center authentication incident. Never place
credentials, session tokens, Push endpoints, or hidden recipient values in this
runbook, chat, screenshots, or incident notes.

## Immediate containment

1. Confirm public funnel and `/api/health/ready` status; do not take lead capture
   offline merely because staff login is impaired.
2. Record incident time, affected environment/deployment, correlation IDs, and
   the least-sensitive evidence needed.
3. If RBAC is enabled and malfunctioning, set `LEAD_CENTER_RBAC_ENABLED=false`
   through the secure environment interface and redeploy the last reviewed
   release.
4. Verify anonymous `/admin` remains denied and the existing Basic Auth
   break-glass boundary is active.
5. Revoke affected RBAC sessions and deactivate a compromised user when the
   canonical database remains available.

## Lost or compromised credential/device

- Rotate only the affected credential in its secure provider interface.
- Revoke the affected RBAC sessions and Web Push subscription.
- Do not rotate unrelated database, email, or deployment credentials.
- For a lost phone/browser, remove that named Push device; do not display or
  copy its endpoint.
- Record actor, reason, timestamp, scope, and verification result.

## Recovery verification

- anonymous admin request is denied;
- approved break-glass access succeeds;
- public smoke, readiness, funnel, and monitor pass;
- no unauthorized export, assignment, note, or notification action appears in
  the audit log;
- no Production lead or consent record was deleted or rewritten;
- NellySelly isolation still passes.

Return from break-glass only after the Preview reproduction and reviewed fix
pass. Restore RBAC for a restricted administrator window first, then verify
Mike, role filters, exports, revocation, and audit history before broader use.
