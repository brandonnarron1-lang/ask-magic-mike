# Current Release Authority

## November1 mobile/direct-contact continuation

Authenticated resolution at `2026-11-02T02:40:23.668Z` (November1 Eastern)
confirmed accepted PR316, merge `f221acf13264761973ab5ab7e30067b337c0a603`,
tree `61677c45210bbea98f618449131046351c2afd51`, deployment
`dpl_FDdVc7wBBCn36tdPNuaJ78kzXpbQ`; all25 checks passed. The local mobile
follow-on is not accepted Production. Frozen PR317 remains separately held;
neither native profile edits nor a hosted CI pass replaces immutable protected
Preview acceptance or exact-source release authority.

## October31 accepted application and bounded continuation

The authenticated resolver returned accepted25/25 at2026-10-31T13:32:01.352Z:
PR315 merge `117f3811ce21cd8cce40cf6f695f36a9b7641da4`, tree
`fa76f6c8f0c6ef7300ac97c56866941dea8bcec5`, canonical deployment
`dpl_56JSYryUtcEuKPWD3Gq8YoUGPYjQ`. This is a fresh resolver result, not a new
release or reuse of its consumed app-only approval. Earlier review-only prose
below is dated history, not current Production state.

The owner's October31 instruction supplies conditional technical authority for
a necessary bounded app-only continuation, with exact final head/tree, scope,
review, immutable Preview, hosted/protected gates and rollback recorded before
effects. It does not waive those gates, claim personal inspection of unseen
source, authorize migrations/env/provider changes or require a new release.
No application source correction or release was needed for the internal task
and cleanup actually completed. Current private execution evidence is under
`.amm-run/home-value-lead-loop-20261029/owner-execution-20261031/`.

Permanent QA cleanup and bounded audited task administration have their own
explicit authority in `OWNER_APPROVAL_QUEUE.md`; neither grants consumer consent
or activates allocation. Current app recovery retains R2privacy/revocation,
S2guards and v6readers/data; no recovery deployment was invoked.

## October 29 review-only continuation

`codex/home-value-lead-loop-20261029` starts from the freshly resolved PR #314
main/tree. Source-local `candidate` remains null; no consumed Production approval
is replayed. Review publication does not authorize merge, Production deployment,
WordPress publication, remote data/migrations, messages, live allocation or spend.
Automatic Vercel builds for this new branch are disabled in its source until a
safe exact-source Preview review is established. Existing CI remains enabled.
The final head/tree and required review evidence belong in the one private
owner packet referenced by `OWNER_APPROVAL_QUEUE.md`, not an invented deployment.

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
