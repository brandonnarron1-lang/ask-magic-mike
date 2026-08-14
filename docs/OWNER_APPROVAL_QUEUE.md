# Owner Approval Queue

These are the only remaining human gates. Complete unrelated work without waiting
on them.

1. **Enroll Brandon's phone.** Screen: `/admin/notifications/phone`. Action:
   authenticated admin generates a short-lived `copy` link; Brandon opens it on
   his phone and grants notification permission. Impact: free internal copy
   alerts. Rollback: revoke the subscription. No credential is texted.
2. **Enroll Mike's phone.** Same screen, Mike's own physical device and approved
   `primary` flow. Do not substitute Brandon's device or contact Mike without his
   approval.
3. **Approve user roster and roles.** Provide only approved staff email/role/
   assigned-scope metadata—not passwords. Impact: replace shared Basic auth with
   per-user sessions and agent-scoped data. Rollback: retain current fail-closed
   admin boundary until cutover proves complete.
4. **Activate WordPress bridge.** Screen: Our Town WordPress plugin/hosting
   configuration. Action: back up, upgrade shadow-only bridge 1.0.0 to reviewed
   1.1.0, enter the shared secret through hosting config, allowlist only one exact
   form, then run its controlled QA window. Rollback:
   `AMM_CANONICAL_BRIDGE_ENABLED=false` or remove that form ID.
5. **Fix Facebook crawler 403.** Screen: Our Town host/WAF/security plugin. Action:
   permit Facebook crawler access only to public pages and retest `/ask-mike/` and
   `/agents/mike-eatmon/`. Rollback: restore prior rule.
6. **Approve any external communication.** Name the exact QA email/push,
   consumer acknowledgment, social/GBP/email asset, or paid campaign. No external
   publication or carrier SMS is implied by general autonomy.

## Resolved gates

- PR #137 merged at `8ca35cf3154268edf9c9d26bd9cce91a799323f0` and production
  deployment `dpl_GJkS5dRAtzakPdtVJRiNAUWbWSKp` passed post-release smoke.
- Git integrations were disconnected from legacy projects `ask-magic-mike-4miw`
  and `askmagicmike-domain-bridge-v29`; the canonical project remains linked.
