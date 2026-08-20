# Rollback Plan

## Application

Current production is `dpl_GJkS5dRAtzakPdtVJRiNAUWbWSKp` at merge commit
`8ca35cf3154268edf9c9d26bd9cce91a799323f0`. The retained immediately prior
Ready deployment is `dpl_4krvUvVDvgK4owaQmaHHfXyWAEke`. Re-inspect
both before a future release because aliases can move. If smoke checks fail,
stop traffic activation and use Vercel promotion/rollback to the recorded prior
deployment. Do not delete a deployment or force-push.

## Database

The same-day migration is additive. Do not run destructive cleanup or alter existing
lead rows. If the migration must be reversed before the new code is promoted, use
the migration's reviewed down notes against the same database only after approval;
retain `leads`, `consents`, `audit_logs`, and delivery records.

For the Phase 9 outcome-ledger candidate, apply the additive v2 function before
application deployment. Application rollback returns to the immediately prior
Ready deployment, which calls `mutate_admin_lead_status_v1`. Preserve all
`lead_outcomes` and audit rows. The dormant v2 function may remain installed;
dropping it is optional and requires a separately approved database change after
application rollback is verified.

## WordPress

Remove only the named reversible Custom HTML/shortcode/widget block or deactivate
the isolated bridge after backing up. Do not edit parent theme, `functions.php`,
FlexMLS/IDX, or unrelated forms. Restore prior page cache only if the owner approves.

The canonical bridge is currently shadow-only. Immediate rollback is
`AMM_CANONICAL_BRIDGE_ENABLED=false`; a one-form rollback removes only that ID
from `AMM_CANONICAL_BRIDGE_FORM_IDS`. It has not forwarded, altered, or imported
any lead record.

## Email

Set `EMAIL_ENABLED=false` / notification mode `disabled` to stop provider sends while
preserving outbox rows. Do not delete failed delivery records; investigate and retry
with the same idempotency key after correction.
