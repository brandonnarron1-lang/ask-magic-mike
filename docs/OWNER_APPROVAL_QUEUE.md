# Owner Approval Queue

These are the only remaining human gates. Complete unrelated work without waiting
on them.

1. **Review draft PR #137 for merge/deploy.** Screen: GitHub draft PR created
   from `codex/free-first-gap-remediation-2026-08-14`. Action: approve the exact commit
   set. Impact: health/release checks, analytics allowlist, admin headers,
   route-level push auth, appointment throttling, and current docs. Rollback:
   Vercel prior Ready deployment plus git revert. Required words:
   `APPROVE MERGE AND PRODUCTION DEPLOY <PR number>`.
2. **Stop duplicate legacy Vercel builds.** Screen: Vercel project Git settings
   for `ask-magic-mike-4miw` and `askmagicmike-domain-bridge-v29`. Action:
   disconnect their Git integrations only; do not delete projects or domains.
   Impact: only canonical `ask-magic-mike` builds future repository commits.
   Rollback: reconnect the same GitHub repository/branch. Required words:
   `APPROVE DISCONNECT LEGACY VERCEL GIT INTEGRATIONS`.
3. **Enroll Brandon's phone.** Screen: `/admin/notifications/phone`. Action:
   authenticated admin generates a short-lived `copy` link; Brandon opens it on
   his phone and grants notification permission. Impact: free internal copy
   alerts. Rollback: revoke the subscription. No credential is texted.
4. **Enroll Mike's phone.** Same screen, Mike's own physical device and approved
   `primary` flow. Do not substitute Brandon's device or contact Mike without his
   approval.
5. **Approve user roster and roles.** Provide only approved staff email/role/
   assigned-scope metadata—not passwords. Impact: replace shared Basic auth with
   per-user sessions and agent-scoped data. Rollback: retain current fail-closed
   admin boundary until cutover proves complete.
6. **Activate WordPress bridge.** Screen: Our Town WordPress plugin/hosting
   configuration. Action: back up, install shadow-only, enter shared secret through
   hosting config, then approve a form-specific controlled QA window. Rollback:
   `AMM_CANONICAL_BRIDGE_ENABLED=false`.
7. **Fix Facebook crawler 403.** Screen: Our Town host/WAF/security plugin. Action:
   permit Facebook crawler access only to public pages and retest `/ask-mike/` and
   `/agents/mike-eatmon/`. Rollback: restore prior rule.
8. **Approve any external communication.** Name the exact QA email/push,
   consumer acknowledgment, social/GBP/email asset, or paid campaign. No external
   publication or carrier SMS is implied by general autonomy.
