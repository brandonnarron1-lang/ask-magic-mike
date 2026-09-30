# Current Release Authority

Updated 2026-09-30 from authenticated GitHub, Vercel, Neon, and public-runtime
evidence. This file and
[`config/current-release-authority.json`](../config/current-release-authority.json)
are the current application release authority. Older gates and candidate
statements elsewhere in the chronological ledger are historical receipts.

## Accepted Production

- Released PR: [#280](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/280)
- Reviewed head: `0b70701c46a7228b075e9630576df5188f5d9c62`
- Merge commit: `fa1d0fb077882309970b801bbdfaa756107c2104`
- Production tree: `d9533274418430b750a87b8259902cddff5b2937`
- Vercel deployment: `dpl_51jpakXn2zav3WPQYfUmAiSBBHqZ`
- Generated URL:
  `https://ask-magic-mike-3tg2au2ax-eyes-up-industries.vercel.app`
- Canonical URL: `https://www.askmagicmike.com`
- Immediate application rollback deployment:
  `dpl_aepoH5pzDwPMkerbrp9YekzVrdKD`

The exact `main` release gate passed in GitHub run
[36694290376](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/36694290376).
Post-deploy verification passed in run
[36694479286](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/36694479286).
The acceptance receipt records 11/11 monitor checks, 19 passing read-only smoke
checks with two intentional skips, HTTP 200 readiness, and no error-level or 5xx
runtime logs. The canonical aliases serve this exact deployment.

Canonical readiness and live probes return HTTP 200. The database credential
repair retained the canonical Neon project `bitter-star-20214385`, Production
branch `br-round-base-auh6h2wd`, and database `neondb`; it did not create a
parallel database or touch NellySelly.

The exact PR #280 release approval was consumed once:

```text
APPROVE PHASE 9 BATCH D WORDPRESS, OPEN-HOUSE, AND RENTAL PLACEMENT READINESS MERGE AND SAME-TREE PRODUCTION DEPLOYMENT
```

It authorized only that application merge and same-tree Production deployment.
It authorized no WordPress save, database migration or data write, lead
submission, notification, DNS action, purchase, external publication, deletion,
or NellySelly action. It is exhausted and cannot be replayed.

## Application review state

There is no unconsumed application candidate or application merge/deploy gate.
PR #280 is accepted Production and its gate is exhausted.

PR [#248](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/248)
remains preserved historical lineage. Its Connector 1.1.0 files are being
reconciled narrowly onto current Production in Phase E without importing its
obsolete release metadata. Connector installation and every later WordPress
page publication remain independent WordPress actions with independent backups
and exact gates.

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
