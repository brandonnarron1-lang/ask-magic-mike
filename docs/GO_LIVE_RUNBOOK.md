# Production Release and Go-Live Runbook

Updated 2026-08-23. The public funnel is live. Use this runbook for incremental,
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

## Durable rate-limit readiness release

For PR #209, add only the dedicated 32-or-more-character
`RATE_LIMIT_HASH_SECRET` through the Ask Magic Mike Vercel Production secret
interface under its exact combined gate. Never display, copy into chat, or
persist the value in a shell argument or file. The old immutable deployment
does not gain the new value; only a subsequent build does.

Before requesting or using that gate, run the no-write operator rehearsal from
the exact candidate head. It resolves the live PR/Vercel Preview itself and
requires an existing checkout linked to the canonical Vercel project so it
cannot auto-create a helper project:

```text
pnpm run phase9:durable-rate-limit:readiness -- --plan
AMM_VERCEL_PROJECT_CWD=/absolute/path/to/linked/ask-magic-mike \
  pnpm run phase9:durable-rate-limit:readiness -- --preflight
```

Do not continue unless the second command reports `READY_FOR_EXACT_GATE`. It
checks names/scopes and boolean health only, never a secret value. It refuses
all execute, merge, and deploy modes. Full behavior and failure boundaries are
in `docs/phase9/DURABLE_RATE_LIMIT_CUTOVER_REHEARSAL.md`.

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

After the exact merge commit reaches Production, require HTTP 200 from
`/api/health/ready` and literal true for `rate_limit_required`,
`rate_limit_table`, `rate_limit_schema_ready`,
`rate_limit_permissions_ready`, `rate_limit_rls_ready`,
`rate_limit_store_ready`, `rate_limit_secret_ready`, and `rate_limit_ready`.
Then execute only the approved malformed analytics request, verify HTTP 400,
confirm no event/lead/message write, inspect the runtime log window, and rerun
the nine-check monitor. Any false flag or new fallback log triggers rollback to
the recorded prior deployment. Do not delete the ignored Upstash variables;
that remains a separate cleanup action.

## Current Phase 9 release sequence

Release only one approved PR at a time and verify Production before advancing:

1. `#180`, `#181`, `#183`, `#184`, `#185`, `#193`, `#196`, `#194`, and
   `#195` are complete and their gates are exhausted.
2. `#209` is the sole next atomic application candidate. It contains the
   reviewed cumulative work from #202 through #208 once; those incremental PRs
   have no independent merge or Production authority.
3. Any later stacked candidate remains non-authoritative until #209 is accepted,
   refreshed onto the exact new `main`, re-proven, and given its own exact gate.

Do not merge or deploy candidates out of order. Rebase and re-prove each one
after its predecessor is released.

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
