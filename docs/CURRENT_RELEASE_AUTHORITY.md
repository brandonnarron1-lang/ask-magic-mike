# Current Release Authority

Updated 2026-09-01 from authenticated GitHub, Vercel, Neon, and public-runtime
evidence. This file and
[`config/current-release-authority.json`](../config/current-release-authority.json)
are the current application release authority. Older gates and candidate
statements elsewhere in the chronological ledger are historical receipts.

## Accepted Production

- Released PR: [#246](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/246)
- Reviewed head: `720de14f8d5ae0d3a137cf3944d9a0f09abdba9e`
- Merge commit: `98a91f752c4c53dc0ae300dfc320f47b53e32820`
- Production tree: `d32187a46244e5fa0240119f973371fbb0c9f063`
- Vercel deployment: `dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe`
- Generated URL:
  `https://ask-magic-mike-91lrzmnnk-eyes-up-industries.vercel.app`
- Canonical URL: `https://www.askmagicmike.com`
- Immediate application rollback deployment:
  `dpl_E3Pob3TjWdxN9u4VK9xHZC61667g`

The exact `main` release gate passed in GitHub run
[33504917995](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33504917995).
Post-deploy verification passed in run
[33505043074](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33505043074).
Two manual monitors and the first scheduled six-hour monitor passed in runs
[33505253029](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33505253029),
[33505284828](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33505284828),
and
[33508066082](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33508066082).

Canonical readiness and live probes return HTTP 200. The database credential
repair retained the canonical Neon project `bitter-star-20214385`, Production
branch `br-round-base-auh6h2wd`, and database `neondb`; it did not create a
parallel database or touch NellySelly.

On 2026-09-01 the exact approval
`APPROVE SECURE ASK MAGIC MIKE DATABASE_URL REPLACEMENT AND PRODUCTION REDEPLOYMENT`
was consumed once. The Neon-generated Production connection was validated
without displaying or storing its value, written only to Vercel's encrypted
Production `DATABASE_URL`, and deployed by rebuilding the accepted PR #246
artifact. No code, migration, database row, WordPress surface, lead,
notification, provider send, or NellySelly system changed. The point-in-time
Production monitor passed 11/11 contracts on its first attempt, read-only smoke
passed 19 checks with two intentional skips and zero failures, readiness was
HTTP 200, and Vercel reported no runtime errors in the cutover window. The
approval is exhausted and cannot authorize a later credential or deployment
change.

## Active application candidate

PR [#247](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/247)
is the only active application candidate:

- reviewed content head: `f4503dc68b0f2c07a1e9c82827c27ffb5479e9f4`;
- reviewed content tree: `f1023e295332b939d21313ed626a9b3a8b2d5483`;
- code-bearing implementation head:
  `6eb2d37f7dc2c116e92ba7ee7e7c2ea4f2482e99`;
- hosted Release Gate:
  [33518169064](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33518169064), success;
- immutable Preview: `dpl_B9KeqxqyL3RE881QEX9zo38a1Vo3`, Ready;
- migrations: zero;
- environment/secret changes: zero;
- external mutations: zero;
- immediate application rollback: `dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe`.

The one current application approval phrase is:

```text
APPROVE PHASE 9 WORDPRESS PLACEMENT READINESS PR 247 MERGE AND SAME-TREE PRODUCTION DEPLOYMENT
```

It authorizes only the exact PR merge and same-tree application deployment
after the authority-only seal commit itself passes the mandatory exact-head
checks. It does not authorize a WordPress edit or publication, database
migration or data write, form submission, notification send, DNS action,
purchase, external publication, deletion, or NellySelly action.

## Sealed review vehicle

PR [#247](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/247) is a
sealed owner-approval review vehicle based directly on accepted Production commit
`98a91f752c4c53dc0ae300dfc320f47b53e32820`. Its code-bearing implementation
head is `6eb2d37f7dc2c116e92ba7ee7e7c2ea4f2482e99`.

It ports only the unique WordPress placement-readiness behavior from the stale
stacked review into current `main`: hidden, ambiguous, missing, or unavailable
placements fail closed; the Distribution Command can select a visible reviewed
placement without treating a draft or an attribution signal as publication
proof. It adds no migration, environment variable, provider, public publisher,
form, database, CRM, funnel, or notification engine.

Exact Node 24 local verification, hosted Release Gate, immutable Preview
identity, protected no-write visual/runtime QA, rollback review, dependency
audit, and secret scans pass on the reviewed content head/tree. The final
authority-only seal may update documentation and machine authority only; any
product, migration, environment, or target drift invalidates this gate.
Successful checks never substitute for receiving the exact owner approval.

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
false. PR #246 changed CI and runtime verification only; it did not rerun or
alter those migrations.

## Superseded review artifacts

- Draft PR #244 records the pre-recovery PR #238 authority model and is
  superseded by this PR #246 reconciliation.
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
