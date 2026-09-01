# Current Release Authority

Updated 2026-09-01 from authenticated GitHub, Vercel, Neon, and public-runtime
evidence. This file and
[`config/current-release-authority.json`](../config/current-release-authority.json)
are the current application release authority. Older gates and candidate
statements elsewhere in the chronological ledger are historical receipts.

## Accepted Production

- Released PR: [#247](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/247)
- Reviewed head: `a9d1c1c2779337ab38c1276be8893309ecee39d2`
- Merge commit: `a2f3de834830f600df106dbf5836ae4bbde4eb4a`
- Production tree: `0065f829fc94f87ab5e0faf596c8e56733be3972`
- Vercel deployment: `dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U`
- Generated URL:
  `https://ask-magic-mike-571exyxlz-eyes-up-industries.vercel.app`
- Canonical URL: `https://www.askmagicmike.com`
- Immediate application rollback deployment:
  `dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe`

The exact `main` release gate passed in GitHub run
[33522215178](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33522215178).
Post-deploy verification passed in run
[33522383308](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33522383308).
The acceptance receipt records 11/11 monitor checks, 19 passing read-only smoke
checks with two intentional skips, HTTP 200 readiness, and no error-level or 5xx
runtime logs. The canonical aliases serve this exact deployment.

Canonical readiness and live probes return HTTP 200. The database credential
repair retained the canonical Neon project `bitter-star-20214385`, Production
branch `br-round-base-auh6h2wd`, and database `neondb`; it did not create a
parallel database or touch NellySelly.

The exact PR #247 release approval was consumed once:

```text
APPROVE PHASE 9 WORDPRESS PLACEMENT READINESS PR 247 MERGE AND SAME-TREE PRODUCTION DEPLOYMENT
```

It authorized only that application merge and same-tree Production deployment.
It authorized no WordPress save, database migration or data write, lead
submission, notification, DNS action, purchase, external publication, deletion,
or NellySelly action. It is exhausted and cannot be replayed.

## Active application candidate

There is no active application candidate and no reusable application release
gate. The source-controlled WordPress Connector 1.1.0 work is an offline branch
candidate only until it has a Draft PR, exact-head local and hosted verification,
immutable Preview proof, rollback evidence, and a separately sealed gate.

The future Connector plugin upgrade and any later WordPress page publication
are independent WordPress actions. Neither is authorized by application
Production status.

## Historical runtime-recovery receipt

PR #246 merge `98a91f752c4c53dc0ae300dfc320f47b53e32820`
was redeployed as `dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe` after the approved,
secure Production `DATABASE_URL` replacement. Source deployment
`dpl_E3Pob3TjWdxN9u4VK9xHZC61667g` remains preserved. That credential gate is
also consumed; it did not change the canonical Neon identity, run a migration,
or touch WordPress, a lead, a notification, or NellySelly.

## Consumed PR #238 cutover receipt

PR [#238](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/238)
remains the applied and verified five-migration database cutover. Its approval
phrase is consumed and cannot be replayed:

```text
APPROVE PHASE 9 CUMULATIVE GROWTH MIGRATIONS, PR 238 MERGE, AND PRODUCTION DEPLOYMENT
```

The five hash-pinned migration receipts remain machine-verified in the
authority manifest. Each version has one ledger row, existing bounded counts
were unchanged, receipt rows remained zero, privilege and health checks passed,
and the marketing-spend, organic-search, and local-profile import gates remain
false. PR #247 did not rerun or alter those migrations.

## Superseded review artifacts

- Draft PR #244 records the pre-recovery PR #238 authority model and is
  superseded by the PR #246 reconciliation and accepted PR #247 release.
- Draft PR #245 is stacked on #244 and is superseded by the clean PR #247
  mainline port.

Neither stale Draft is merged here. Their commits, branches, and evidence stay
recoverable until an explicit archival cleanup; neither has current release
authority.

## Creating a future release gate

1. Freeze the exact PR head and tree after all code and evidence changes.
2. Confirm migration count, environment delta, external-action count, and
   rollback deployment.
3. Pass Node 24 local verification, hosted Release Gate, immutable Preview, and
   protected no-write QA on that exact source.
4. Record the exact target systems and expected impact.
5. Generate one action-specific approval phrase bound to the exact PR/head.

Head, tree, migration, environment, target, or evidence drift invalidates a
gate. No historical phrase may authorize a new release.

## Excluded authority

This record does not authorize a WordPress save or cache purge, database
migration or lead-data mutation, public lead submission, email/SMS/Web Push
send, consumer acknowledgment, DNS/domain change, GBP/social/email publication,
paid spend, vendor purchase, data deletion, or any NellySelly action. Those
remain separate exact gates.
