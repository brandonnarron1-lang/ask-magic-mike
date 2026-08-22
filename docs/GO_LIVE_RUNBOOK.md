# Production Release and Go-Live Runbook

Updated 2026-08-21. The public funnel is live. Use this runbook for incremental,
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

1. `#180` — outcome-ledger lifecycle seam: complete at merge commit
   `42f80b209d5d5adc984c1d8b439c7fa830d015e6`, Production deployment
   `dpl_2PQoDZLHc562SBEY7px91CAEUrin`;
2. `#181` — first-human-response intelligence: complete at merge commit
   `5335697edf31eed0b8a38cd0295a4f5e7d501a3e`, Production deployment
   `dpl_HVoqg1t4j2SJWPFMEEzpiHGQ6hmM`, with migration `20260820013000` installed
   on canonical Neon Production;
3. `#183` — campaign safety and three-offer owned-demand flight, exact head
   `95a4f210eed4f8991e96e2eee595da5907112ba9`, Node 24 run `32539636103`;
4. `#184` — owned-demand publication-proof ledger, exact head
   `4b9109492bb157e45babc23aeda58b30022bae2e`, Node 24 run `32540355761`;
5. `#185` — current-router safety and Buyer discovery, exact head
   `74b4b142ace5b7a1a258e6423638bc434ef1f532`, Node 24 run `32540396465`;
6. `#186` — protected deterministic owned-demand assets and allowlisted QR
   attribution, exact head `d193ab52215bd4d8a29db023bbfd4b45ded821ac`,
   Node 24 run `32540497485`;
7. `#187` — protected evidence-first KPI target register, exact head
   `9d9a1e6f38dbf96e26750945a3d00e1a6fb65827`, Node 24 run `32540533222`;
8. `#188` — WordPress owned-traffic audit and exact placement plan, exact head
   `35438c311f8a3a5658691aa9568a5e80e4b5ef18`, Node 24 run `32540568531`;
9. `#189` — exact owned-demand activation loop, exact head
   `f5b3165f63873dbf3b4c2719cb522b00935f72c7`, Node 24 run `32540823212`;
10. `#179` — iOS install handoff, exact head
    `9dd6684596ac8afbc52076d2c1597c12a0fa33e2`, Node 24 run `32540896724`;
11. `#190` — code-only durable rate-limit privacy hardening, Draft stacked on
    exact #179, exact head `d431bc3427720ae68167b1864e98e406206a47a3`,
    Node 24 run `32543177677`;
12. `#191` — code-only analytics privacy hardening, exact head
    `695bd11f3bb4727c684e4fef0186734be3c9c7fa`, Node 24 run `32544720391`; and
13. `#192` — aggregate-only outcome and delivery KPI trust, Draft stacked on
    exact #191. Its immutable final head, Node 24 run, and Preview deployment
    are recorded in PR #192 metadata after final documentation reconciliation.

Items #183–#189, #179, and #190–#192 are Draft, correctly stacked in that exact
order, GitHub `CLEAN`, and green for exact-head Node 24 plus Vercel checks. The
cumulative #192 tree is a clean 44-commit descendant of current Production.
Only #184 and #187 add migrations; their offline cutover plans verify the
reviewed migration hashes and dependency order. All candidates remain unmerged
and Production-undeployed.
The next permitted Production action is still #183 only, under this exact gate:

```text
APPROVE PHASE 9 CAMPAIGN SAFETY AND THREE-OFFER OWNED-DEMAND FLIGHT MERGE AND PRODUCTION DEPLOYMENT
```

After each merge, verify Production, refresh every downstream branch onto the
resulting `main`, and rerun exact Node 24 plus Vercel Preview proof. Never treat
the stack order as authorization for a later migration, merge, deployment,
publication, send, spend, or database mutation.

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

The stacked KPI target register uses:

```text
pnpm run staging:local:verify
pnpm run phase9:kpi-targets:cutover -- --plan
pnpm run phase9:kpi-targets:cutover -- --preflight
pnpm run phase9:kpi-targets:cutover -- --execute
pnpm run phase9:kpi-targets:cutover -- --verify
```

Its exact approval is:

```text
APPROVE PHASE 9 KPI TARGET REGISTER PRODUCTION MIGRATION, MERGE, AND PRODUCTION DEPLOYMENT
```

The runner must prove the canonical Neon project/branch/endpoint/database,
publication-proof prerequisite, exact migration hash, valid backup, RLS/grant/
immutability contract, no migration seed rows, and unchanged lead/audit state.
The gate does not authorize recording any KPI target; target approval remains a
separate evidence-backed operator action in the protected register.

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
