# Owner Approval Queue

These are the only remaining human gates. Complete unrelated work without waiting
on them.

1. **Finish the reviewed Preview/Production device-label release, then enroll Brandon's phone.** Screen: `/admin/notifications/phone`. Action:
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
4. **Approve Form 1/Form 6 consent text.** Add an unselected requested-response
   choice and separate optional marketing choice before either form is allowlisted.
5. **Fix Facebook crawler 403.** Screen: hosting ModSecurity audit/rule panel.
   Action: identify the exact rule ID and apply only the GET/HEAD public-path
   exception in `FACEBOOK_CRAWLER_FIREWALL_CHANGE.md`. Rollback: remove that one
   exception.
6. **Add `hub.ourtownproperties.com`.** After the reviewed deployment, attach
   only that domain in Vercel and add only the CNAME target Vercel displays.
7. **Approve any external communication.** Name the exact QA email/push,
   consumer acknowledgment, social/GBP/email asset, or paid campaign. No external
   publication or carrier SMS is implied by general autonomy.

## Resolved gates

- PR #137 merged at `8ca35cf3154268edf9c9d26bd9cce91a799323f0` and production
  deployment `dpl_GJkS5dRAtzakPdtVJRiNAUWbWSKp` passed post-release smoke.
- Git integrations were disconnected from legacy projects `ask-magic-mike-4miw`
  and `askmagicmike-domain-bridge-v29`; the canonical project remains linked.
- WordPress bridge 1.1.0 is active with Form 3 only, the duplicate legacy Form 3
  notification is inactive, controlled QA passed, and the pre-fix QA row is
  reconciled without deletion.
- PR #140 merged at `178bdefd499187d749a22af02762e38aeb6e532d` and production
  deployment `dpl_3AVXKtKCuiqytNqNQXvSKF4YBPCL` passed post-release checks.
