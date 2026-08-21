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

## Current Phase 9 release state

The database-bearing release sequence is complete:

1. `#180` — outcome-ledger lifecycle seam: complete at merge commit
   `42f80b209d5d5adc984c1d8b439c7fa830d015e6`, Production deployment
   `dpl_2PQoDZLHc562SBEY7px91CAEUrin`;
2. `#181` — first-human-response intelligence: complete at merge commit
   `5335697edf31eed0b8a38cd0295a4f5e7d501a3e`, Production deployment
   `dpl_HVoqg1t4j2SJWPFMEEzpiHGQ6hmM`, with migration `20260820013000` applied
   exactly once and independently postflight-verified; and
3. the validated mode-600 PR #180 and PR #181 backups remain retained. Do not
   delete them as routine cleanup.

PR #179 is the only existing open product PR. It is refreshed on the PR #181
baseline with green Node 24 CI and a protected Ready Preview. It still requires
its own exact merge/deploy approval. Physical iPhone enrollment and a `[TEST]`
push are separate device/send gates.

Every new branch must start from current `main`, prove Node 24 CI and Preview,
and retain an exact release-specific gate. Do not treat completion of #180/#181
as authorization to merge, deploy, publish, send, or mutate another system.

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
