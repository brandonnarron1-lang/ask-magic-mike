# Rollback Plan

## Application

Current Production is `dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U` at PR #247 merge
commit `a2f3de834830f600df106dbf5836ae4bbde4eb4a` and exact tree
`0065f829fc94f87ab5e0faf596c8e56733be3972`. Deployment
`dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe` is the immediate application rollback;
immutable source deployment `dpl_E3Pob3TjWdxN9u4VK9xHZC61667g` remains
second-level evidence. Re-inspect deployments before any future release because
aliases and environment revisions can move. If smoke checks fail, stop traffic
activation and promote the recorded prior deployment. Do not display a database
credential, delete a deployment, change database rows, or force-push.

PR #247 changed no database migration, provider configuration, or WordPress
surface. Its consumed gate cannot authorize later work. PR #248 is a reviewed
application candidate with zero migrations and zero environment changes. If it
is separately approved, merged, and fails Production acceptance, promote
`dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U` as the immediate rollback and rerun the
read-only monitor, smoke, auth-boundary, readiness, and runtime-log checks. Do
not alter Neon or WordPress during that application rollback.

The pending-notification recovery candidate has no migration or configuration
change. Its eventual rollback is to restore the immediately preceding Ready
application deployment while retaining every `lead_notifications` row. Never
reset a stale `processing` row or delete delivery history as part of application
rollback; reconcile the provider result first.

The atomic public-lead delivery-intent candidate must be released in two phases:
apply `20260902012000_atomic_public_lead_delivery_intent.sql`, verify the v2
function and server-only privileges, then promote the same verified application
tree. If migration verification fails before application promotion, drop only
`capture_public_lead_v2(jsonb,jsonb,jsonb,text,jsonb)` and keep v1 active. If the
application fails after promotion, immediately restore the prior Ready
application before considering a reviewed forward database correction. Do not
drop v2 while an application that calls it is live, and never delete lead,
consent, attribution, audit, or notification rows during rollback.

The Connector 1.1.0 plugin package remains offline and independently gated. A
future WordPress upgrade must first back up the exact active plugin/options and
use the byte-preserved 1.0.0 plugin package as its separate rollback. The PR
#248 application gate cannot authorize installation, activation, page 3952
publication, a form submission, or a cache purge.

For cross-domain measurement, the pre-activation rollback is to leave the Ask
Production configuration unset and keep
`AMM_GOOGLE_MEASUREMENT_ENABLED` disabled in WordPress. After a separately
approved WordPress activation, disable that constant and restore the backed-up
1.1.0 bridge/source configuration through the reviewed rollback procedure; do
not reintroduce a pre-consent GTM head/noscript bootstrap. After a separately
approved Ask activation, remove the measurement configuration and promote the
recorded prior Ready deployment if application smoke checks fail. Preserve the
canonical first-party event ledger; external-tag rollback does not authorize
event deletion.

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

For cumulative PR #238, record and retain
`dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj` as the immediate application rollback before
cutover. Keep all three growth import gates false. If application acceptance
fails before any separately approved import, restore that deployment and its
aliases while leaving the empty additive migration objects and ledger rows in
place for a reviewed forward fix. Do not drop receipt/audit objects, restore an
older database automatically, alter the durable limiter secret, mutate
lead/event/notification rows, change WordPress/DNS, or replay a historical
component gate as part of rollback.

## WordPress

Remove only the named reversible Custom HTML/shortcode/widget block or deactivate
the isolated bridge after backing up. Do not edit parent theme, `functions.php`,
FlexMLS/IDX, or unrelated forms. Restore prior page cache only if the owner approves.

Available Rentals page 226 currently has no approved Ask Magic Mike block, so
the read-only rental readiness manifest has no executable rollback action. A
future additive candidate must first capture and hash the exact editor source,
current revision, database/page backup, insertion anchor, and source-level
removal procedure. If later public acceptance fails, restore only that verified
page-226 revision or remove only the exact inserted block, then recheck the
FlexMLS listings, canonical, layout, and prior page source. Do not alter page
4120 / Gravity Form 6 or duplicate Mike's already-live page-597 CTA as part of
that rollback.

Canonical bridge 1.1.0 is currently active only for the already-approved Form 3
path. Preserve its exact enable flag, allowlist, HMAC secret, endpoint, Gravity
entry, and notification state during a 1.2.0 upgrade. Lead-forwarding rollback
is `AMM_CANONICAL_BRIDGE_ENABLED=false`; a one-form rollback removes only that
ID from `AMM_CANONICAL_BRIDGE_FORM_IDS`. Do not use a measurement issue as
authority to disable Form 3 or delete a WordPress/Neon record.

Bridge 1.2.0 measurement rollback is independently
`AMM_GOOGLE_MEASUREMENT_ENABLED=false`. Preserve the pre-change GTM head and
noscript source and the 1.1.0 archive before installation. If controlled QA
fails, disable the measurement flag first; reinstall 1.1.0 and restore the
exact prior GTM source only when required by the approved rollback. Do not
change the cookie-choice provider, purge unrelated cache, edit the parent
theme, or touch NellySelly.

For the separately gated homepage CTA restoration, first download and hash the
complete active Lead Ops `2.10.0` plugin file. The accepted pre-change SHA-256
is `41de351d57e91b8ecf1d611d8b052381166effaf693319b0f9e8da32f5d8e972`;
the reviewed `2.10.1` result is
`6b9a30de24e3fbbbac5aa49def7552afd6b2e21b7ede7beafa8ad095d9a9f44c`.
If public acceptance fails, restore the exact backed-up `2.10.0` bytes and
verify the original hash. Do not edit page 149, reactivate the Gravity Forms
notification, disable Canonical Bridge Form 3 forwarding, alter lead or
notification records, purge a cache without separate approval, or touch
NellySelly.

## Email

Set `EMAIL_ENABLED=false` / notification mode `disabled` to stop provider sends while
preserving outbox rows. Do not delete failed delivery records; investigate and retry
with the same idempotency key after correction.

## Phase 9 organic-search ingress

PR #219 is additive and safe-off. Before an import, rollback is to keep or set
`GROWTH_SEARCH_IMPORT_ENABLED=false`, restore the immediately preceding verified
Vercel deployment if application behavior regresses, and leave the empty
`organic_search_import_batches` table plus owner-only function dormant. Do not
drop the migration merely to roll back code.

After a separately authorized report import, disable the feature gate and
restore the prior application if needed, but preserve `market_signals`,
`market_opportunities`, immutable import receipts, and audit rows. Prefer a
reviewed forward correction. Deleting or rewriting organic-search evidence is a
separate destructive-data action and is not authorized by application rollback.
