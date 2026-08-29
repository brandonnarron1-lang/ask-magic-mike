# Rollback Plan

## Application

Current Production is `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj` at merge commit
`a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`. Re-inspect Production and record
the immediately preceding Ready deployment before a future release because
aliases can move. If smoke checks fail, stop traffic activation and promote the
recorded prior deployment. Do not delete a deployment or force-push.

For the dependent field-experience candidate, application rollback to the prior
accepted Vercel deployment removes the reporter and Growth panel code. It has
no schema rollback. Preserve any minimized `web_vital_observed` rows already
written; the prior application ignores them. Data deletion remains a separate
approved action, not an automatic rollback step.

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

For the stacked owned-demand publication-proof release, use only
`phase9:publication-proof:cutover` after its exact approval. If application
verification fails, promote the immediately preceding verified Vercel
deployment and leave the additive `owned_demand_publication_proofs` table and
RPC dormant. Do not delete or edit proof/audit rows. A native social, GBP,
signature, or print placement must be rolled back in its native system under a
separate approval, followed by an appended removal proof; application rollback
cannot retract external content.

For PR #185, use only `phase9:wordpress-proof-scope:cutover` after its exact
migration/merge/deploy approval. Before commit, any failed preflight, backup,
constraint validation, or postflight assertion rolls the transaction back.
After commit, an application rollback returns aliases to
`dpl_ANYodUJ7VcceRRDAfpX6APkSKUcW`; leave the broader validated constraints
installed because the preceding application ignores the added tuples. Do not
restore narrower constraints if legitimate WordPress proof may have been
recorded, and never delete or edit proof/audit rows. Prefer a reviewed forward
fix. The validated backup is disaster-recovery evidence, not an automatic
rollback instruction.

## Phase 9 durable rate-limit readiness

PR #209 had no migration and passed Production acceptance. Its immediate
rollback deployment remains `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`. If a later
incident requires that rollback, restore the prior deployment/aliases first.
The prior immutable deployment does not gain the newly added Vercel environment
value retroactively. After rollback health is proven, remove only
`RATE_LIMIT_HASH_SECRET` from future Production builds if the incident requires
it; never display or copy its value. Do not alter or delete
`rate_limit_buckets` rows. Stale encrypted Upstash variable removal remains a
separate, unapproved cleanup.

The `phase9:durable-rate-limit:readiness` rehearsal has no rollback step: it
accepts only plan or authenticated read-only preflight modes, refuses an
unlinked Vercel checkout, and performs no secret entry, merge, deployment,
database/event write, provider send, or configuration change.

PR #210 has no migration or environment change. If its canonical redirect
acceptance fails, restore `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj` and its aliases.
Do not change the durable limiter secret, database, limiter rows, lead/event
records, WordPress, or DNS as part of that application rollback.

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
