# Rollback Plan

## Application

Current Production is `dpl_2PQoDZLHc562SBEY7px91CAEUrin` at merge commit
`42f80b209d5d5adc984c1d8b439c7fa830d015e6`. The retained preceding Ready
deployment is `dpl_8WyzT1bg5kj6HRnrDqwdQGvzKZfz`. Re-inspect
both before a future release because aliases can move. If smoke checks fail,
stop traffic activation and use Vercel promotion/rollback to the recorded prior
deployment. Do not delete a deployment or force-push.

## Database

The same-day migration is additive. Do not run destructive cleanup or alter existing
lead rows. If the migration must be reversed before the new code is promoted, use
the migration's reviewed down notes against the same database only after approval;
retain `leads`, `consents`, `audit_logs`, and delivery records.

The Phase 9 outcome-ledger migration is now installed and Production calls
`mutate_admin_lead_status_v2`. Preserve all `lead_outcomes` and audit rows.

For PR #181, apply the additive first-response migration before application
deployment only through `phase9:first-response:cutover`. Application rollback
returns to `dpl_2PQoDZLHc562SBEY7px91CAEUrin`, which continues to call v2.
Preserve `lead_response_milestones`, `lead_outcomes`, and audit rows; v3 and the
dedicated response recorder may remain installed but dormant. Do not drop the
table/functions or restore an older database merely to roll back application
code. Use the validated custom backup only for a separately approved disaster
recovery decision after confirming a forward fix is unsafe.

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
