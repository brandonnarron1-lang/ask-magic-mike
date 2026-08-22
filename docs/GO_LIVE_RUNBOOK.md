# Production Release and Go-Live Runbook

Updated 2026-08-22. The public funnel is live. Use this runbook for incremental,
reversible releases and controlled owned-traffic activation.

## Before merge

1. Fetch current `origin/main`; use an isolated worktree and preserve unrelated
   user or agent changes.
2. Record PR, immutable head commit, Vercel project, Preview deployment, current
   Production deployment, and rollback deployment.
3. Run the Node 24 release gate and confirm the Vercel Preview is Ready.
4. Verify changed routes in the protected Preview. Separate build, DOM/runtime,
   screenshot, database, provider-delivery, and physical-device evidence.
5. Classify migrations, environment changes, sends, WordPress publication, DNS,
   and external marketing as separate state changes.
6. Present the release-specific Production gate from the PR. Do not reuse a gate.

## Merge and deploy

1. Merge only the approved clean PR into `main` using the repository ruleset.
2. Let the canonical Git integration deploy the resulting `main` commit to the
   single owned Vercel project. Do not deploy from a different repository or
   attach Ask Magic Mike domains to another project.
3. Wait for Ready and confirm both custom aliases resolve to the approved
   deployment. Do not promote an artifact built from a different commit.
4. If an additive Neon Production migration is part of the release, use its own
   exact approval, pre/post assertions, transaction boundary, and forward-fix
   plan. A code approval alone is insufficient.

## Immediate verification

Run the repository health, funnel, route, release, and isolation verifiers. At a
minimum confirm:

- `/`, `/ask`, `/sell`, `/value`, `/home-value`, `/buy`, `/rent`,
  `/open-house/<approved-id>`, `/widget/v1`, `/privacy`, `/terms`,
  `/accessibility`, `/contact`, `/robots.txt`, and `/sitemap.xml`;
- apex 308 redirect and canonical metadata;
- live/readiness health with canonical Neon;
- anonymous `/admin` redirect to `/lead-center-login` and authorized RBAC access;
- no NellySelly hostname, project, database, variable, or content crossover; and
- no error-level regression in the observed Vercel window.

## Lead or messaging release verification

When the change touches capture, routing, email, push, SMS, or sequences:

1. Use a synthetic record marked `is_test=true` and
   `INTERNAL QA — DO NOT CONTACT` only after the exact QA-send/mutation approval.
2. Submit through the public form, not directly into the database.
3. Prove one canonical lead, attribution/consent, deterministic score/routing,
   one idempotent notification set, Lead Center visibility, and KPI exclusion.
4. For real provider tests, prove provider message ID and final delivery or
   failure/retry state. A 200 or queued state is not delivery proof.
5. Never contact a genuine WordPress-only entry whose purpose or consent is
   unclear; preserve it for BIC review.

## Current Phase 9 release sequence

Release only one approved PR at a time and verify Production before advancing:

1. `#180` — outcome-ledger lifecycle seam: complete;
2. `#181` — first-human-response intelligence: complete;
3. `#183` — campaign safety and three-offer owned-demand flight: complete;
4. `#184` — owned-demand publication-proof ledger: complete at merge commit
   `f5f82f1bfaadea0ed20da50738ebc1f83e8dab97`, Production deployment
   `dpl_ANYodUJ7VcceRRDAfpX6APkSKUcW`; its migration is installed and verified
   on canonical Neon Production; and
5. `#185` — consolidated owned-demand command plus the WordPress proof-scope
   constraint repair: next candidate. It must pass exact-head Node 24 CI,
   canonical Vercel Preview, executable PostgreSQL contract, protected visual
   QA, and the migration-specific approval before any Production action.

PR #193 is stacked on #185, #194 on #193, and #195 on #194. Do not merge or
deploy them out of order. Rebase and re-prove each one after its predecessor is
released.

PR #181 uses:

```text
pnpm run phase9:first-response:cutover -- --plan
pnpm run phase9:first-response:cutover -- --preflight
pnpm run phase9:first-response:cutover -- --execute
pnpm run phase9:first-response:cutover -- --verify
```

Enter the unpooled owner connection only through the secure environment; never
place it in chat, a command argument, a report, or a committed file. `--execute`
must fail unless the exact release-specific approval phrase is present. Retain
the validated mode-600 backup until the exact application deployment and
authenticated checks pass.

The stacked publication-proof ledger uses:

```text
pnpm run staging:local:verify
pnpm run phase9:publication-proof:cutover -- --plan
pnpm run phase9:publication-proof:cutover -- --preflight
pnpm run phase9:publication-proof:cutover -- --execute
pnpm run phase9:publication-proof:cutover -- --verify
```

Run `staging:local:verify` only against the disposable local Supabase stack and
only when `supabase/.temp/project-ref` is absent. It must prove the executable
role/idempotency/audit/immutability contract before any Production preflight.

Its exact approval is:

```text
APPROVE PHASE 9 OWNED-DEMAND PUBLICATION PROOF LEDGER PRODUCTION MIGRATION, MERGE, AND PRODUCTION DEPLOYMENT
```

That approval permits only the additive migration, reviewed code merge, and
canonical application deployment. It does not authorize a GBP/social post,
email campaign/signature change, QR distribution, consumer message, or spend.

PR #184 and that exact gate are complete and exhausted. Do not replay them.

The PR #185 WordPress proof-scope repair uses:

```text
pnpm run phase9:wordpress-proof-scope:cutover -- --plan
pnpm run phase9:wordpress-proof-scope:cutover -- --preflight
pnpm run phase9:wordpress-proof-scope:cutover -- --execute
pnpm run phase9:wordpress-proof-scope:cutover -- --verify
```

Its exact approval is:

```text
APPROVE PHASE 9 OWNED-DEMAND WORDPRESS PROOF MIGRATION, PR 185 MERGE, AND PRODUCTION DEPLOYMENT
```

The runner pins the reviewed migration bytes, accepts the unpooled owner
connection only through a secure environment, validates the backup, fails
closed unless exactly six legacy constraints are present, and proves six
validated v2 constraints plus unchanged rows, function, RLS, trigger, and
grants. The gate does not authorize recording proof or publishing externally.

Preview verification left two empty Vercel helper projects intact:
`amm-phase9-campaign-compliance-20260821`
(`prj_JUyx03Rh8iABqAFepNNuPI2jJqut`) and
`amm-phase9-publication-ledger-20260821`
(`prj_QcHch6KY1m2g0BKtOoVVFregRhho`). Both have zero deployments and no domain
effect. Do not delete either without a separate exact cleanup approval.

Each item retains its own exact approval phrase. Refresh any downstream branch
after the preceding Production merge, rerun Node 24 CI and Vercel Preview, and do
not treat this ordering as authorization to merge, deploy, publish, send, or
mutate data.

## Owned-traffic activation

After the lead path and exact publication gate pass, activate one reversible
placement at a time: canonical Our Town CTA, then approved page-specific widget,
then tagged GBP/social/email assets. Monitor conversion, source attribution,
duplicate rate, notification failures, and response SLA before expanding.
Paid traffic and carrier SMS remain separate approvals.

## Rollback

- Code: restore the recorded prior Vercel deployment/alias; verify health and
  canonical routes.
- WordPress: disable only the changed placement/form ID and restore its proven
  prior notification behavior without deleting entries.
- Messaging: pause only the affected channel/processor; preserve lead and outbox
  records for reconciliation.
- RBAC: revoke affected sessions first. Disable the feature only under the
  reviewed break-glass procedure; retain identity/audit tables.
- Database: prefer a forward fix. Never delete or drop canonical lead, consent,
  notification, audit, identity, or session data as an application rollback.

Record the outcome in `PRODUCTION_CHANGE_LOG.md`, including anything not proven.
