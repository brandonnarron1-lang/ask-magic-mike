# Current Release Authority

Updated 2026-10-02. This document describes how to resolve current authority;
it is not itself a Production acceptance receipt.

## Authoritative current-state procedure

Tracked policy lives in
[`config/release-authority-policy.json`](../config/release-authority-policy.json).
Resolve accepted Production from the latest deployment-generated receipt and
cross-check it against authenticated GitHub, Vercel, alias, health, verifier,
and rollback evidence:

```bash
pnpm release:authority:resolve
```

The command exits non-zero on any contradiction. It never substitutes a dated
source literal for authenticated current evidence. See
[`RELEASE_AUTHORITY_RECEIPTS.md`](./RELEASE_AUTHORITY_RECEIPTS.md) for schema,
storage, generation, retention, and recovery details.

## Three separate authority objects

- **Policy:** source-authored validation and approval rules that remain valid
  before and after merge.
- **Candidate:** optional, exact-head review state. No candidate means
  `CURRENT_APPLICATION_RELEASE_GATE` is null.
- **Accepted Production receipt:** post-deployment observed facts, created only
  after required Production verification succeeds.

Ordinary application requests use policy/candidate data only. They never call
GitHub or Vercel to render a customer or staff page.

## Historical bootstrap receipt: PR #282

PR [#282](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/282)
is the historical bootstrap for the corrected model. Its existing immutable PR
acceptance comment records merge
`f663593ee9fc218baf95ce8603a143585391c9e1`, tree
`bac41fef833597e0efd16333a015c35cc8ff4ba3`, Production deployment
`dpl_Cv5a7am4BeAtCropzGddTQsYZpxs`, and rollback
`dpl_8488csXCtbfHMMZUF6KDQRiJVwTk`. The resolver authenticates those claims
against GitHub and Vercel before returning them. This paragraph is historical
evidence, not a source-authored assertion that PR #282 remains current forever.

PR #281 and PR #280 remain superseded historical application receipts in the
tracked policy and chronological release log. PR #238 remains the consumed,
hash-pinned five-migration cutover receipt. None of their approval phrases is
replayable.

## Future acceptance

For each future successful Production deployment, the post-deploy workflow:

1. verifies the canonical host serves the exact deployed merge;
2. waits for the exact-SHA hosted Release Gate;
3. runs the bounded Production monitor and read-only smoke;
4. derives PR, merge, tree, deployment, target, rollback, and verification
   identifiers from authenticated state;
5. validates and hashes canonical JSON; and
6. publishes an idempotent, append-only GitHub Release receipt.

No follow-up source commit is required merely to record what was deployed.

## Creating a future candidate gate

1. Freeze the exact PR head/tree after all source and evidence edits.
2. Record migration, environment, and external-mutation counts in the PR's
   strict release-intent block.
3. Pass Node 24 local gates, hosted Release Gate, immutable Preview, and
   protected no-write QA.
4. Bind one owner phrase to that exact PR and reviewed source.
5. Treat any source or scope drift as invalidating the gate.

## Excluded authority

Release policy and receipts do not authorize WordPress, cache, database/data,
lead, notification, DNS, publication, spend, provider, deletion, or NellySelly
actions. Each remains a separate exact action boundary.
