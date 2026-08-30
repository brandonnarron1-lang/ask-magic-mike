# Production Release and Go-Live Runbook

Updated 2026-08-28. The public funnel is live. Use this runbook for incremental,
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

## Completed durable rate-limit readiness release

PR #209 is accepted at merge
`a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` and Production deployment
`dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`. Its dedicated Production secret, readiness
booleans, bounded malformed request, 9/9 monitor, and log window passed. The
exact gate is exhausted. See
`docs/phase9/DURABLE_RATE_LIMIT_PRODUCTION_ACCEPTANCE_2026-08-28.md`.

The following command remains historical/read-only evidence and rollback
diagnostics. It cannot authorize or repeat the accepted release:

```text
pnpm run phase9:durable-rate-limit:readiness -- --plan
AMM_VERCEL_PROJECT_CWD=/absolute/path/to/linked/ask-magic-mike \
  pnpm run phase9:durable-rate-limit:readiness -- --preflight
```

The rehearsal checks names/scopes and boolean health only, never a secret value.
It refuses execute, merge, and deploy modes. Full historical behavior and
failure boundaries are in
`docs/phase9/DURABLE_RATE_LIMIT_CUTOVER_REHEARSAL.md`.

Before merge, the read-only store probe must report `table`, `schema`,
`permissions`, `rls`, and `ready` true when run with the intended secure runtime
connection:

```text
pnpm run rate-limit:verify-store
```

Vercel variables typed `sensitive` are intentionally unavailable to local
`vercel env run`. Do not weaken the variable type, export a database URL, or
interpret a local `database_not_configured` result as deployed-runtime failure.
Use the protected candidate health endpoint to prove the encrypted Vercel
runtime role, and use the public Production health endpoint after deployment.

For ongoing health, require HTTP 200 from
`/api/health/ready` and literal true for `rate_limit_required`,
`rate_limit_table`, `rate_limit_schema_ready`,
`rate_limit_permissions_ready`, `rate_limit_rls_ready`,
`rate_limit_store_ready`, `rate_limit_secret_ready`, and `rate_limit_ready`.
Do not repeat the malformed acceptance request without a new exact authorization.
Any false flag or new fallback log triggers investigation and, if required,
rollback to the recorded prior deployment. Do not delete the ignored Upstash
variables; that remains a separate cleanup action.

## Current Phase 9 release sequence

The singular current application candidate is PR #238. PRs #210–#243 are
preserved component lineage included once in that cumulative tree; do not merge
them individually or replay their former gates.

1. `#180`, `#181`, `#183`, `#184`, `#185`, `#193`, `#196`, `#194`, `#195`, and
   `#209` are complete and their gates are exhausted.
2. `#238` exact payload head `9232641329acb8a02ce4cf2419cb12768ce33d17`
   is fully sealed but held for its exact cumulative gate.
3. Re-run its already-passing guarded read-only preflight, keep all three
   import gates false, then execute/verify the five hash-pinned migrations
   before merging and deploying only that exact reviewed head.
4. Component PRs #239–#243 are preserved lineage already incorporated by the
   PR #238 fast-forward and have no independent gate.

The exact authority and current manifest are in
`docs/CURRENT_RELEASE_AUTHORITY.md` and
`config/current-release-authority.json`.

Historical cutover commands below remain evidence for already completed or
component releases. They do not supersede the current PR #238 runner or gate.

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

Preview verification left these empty Vercel helper projects intact:
`amm-phase9-campaign-compliance-20260821`
(`prj_JUyx03Rh8iABqAFepNNuPI2jJqut`) and
`amm-phase9-publication-ledger-20260821`
(`prj_QcHch6KY1m2g0BKtOoVVFregRhho`),
`amm-phase9-current-router-safety-20260821`
(`prj_iGynowHru4TBNwWgvoiSIG193Ukf`),
`amm-phase9-phone-handoff-consolidation-20260822`
(`prj_Mb30U4zzULbWox6TPJ0QlJ4cVYSY`), and
`amm-phase9-durable-rate-limit-readiness-20260823`
(`prj_Da74SJxkGLrCa1oqkRo2cOmlaAkB`). All have zero deployments and no custom
domain or Production effect. Do not delete any without a separate exact cleanup
approval.

Historical component phrases are exhausted or superseded for current release
purposes. Do not treat the preserved ordering below as authority to merge,
deploy, publish, send, import, or mutate data.

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

## Organic-search ingress candidate (PR #219)

PR #219 is downstream of PR #218 and remains non-authoritative until the full
predecessor train is released in order. Before any future release:

1. refresh PR #219 onto the exact accepted `main`;
2. rerun focused tests, the executable PostgreSQL 17 contract, full Vitest,
   typecheck, lint, Node 24 build, route manifest, release safety, isolation,
   dependency audit, secret scan, and immutable Preview/browser QA;
3. confirm `GROWTH_SEARCH_IMPORT_ENABLED=false` in the target deployment;
4. apply only `20260824220000_organic_search_ingress.sql` through the established
   secure owner connection after the exact migration/merge/deploy approval;
5. deploy the exact reviewed commit and prove protected page access, safe-off
   commit behavior, health, routes, and logs; and
6. leave Search Console access and report import unperformed.

The future release gate is:

```text
APPROVE PHASE 9 ORGANIC SEARCH INGRESS MIGRATION, PR 219 MERGE, AND PRODUCTION DEPLOYMENT
```

To import later, first export one exact Search Console **Pages** report without
the Queries dimension, validate it in the protected workbench, review every
identity/metric/opportunity and the exact fingerprint, then request the separate
report-specific gate documented in
`phase9/ORGANIC_SEARCH_INGRESS_RELEASE_GATE.md`. Disable the feature gate again
after the single reviewed import and reconcile the immutable receipt/audit.
