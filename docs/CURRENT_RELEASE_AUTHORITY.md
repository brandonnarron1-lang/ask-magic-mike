# Current Release Authority

Updated 2026-08-30. This is the canonical operator record for the next Ask
Magic Mike application release. Historical per-PR gates remain evidence only.

The machine-readable companion is
[`config/current-release-authority.json`](../config/current-release-authority.json).
The protected Growth capability ledger consumes the same manifest.

## Accepted Production

- Released PR: **#209**
- Merge commit: `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`
- Vercel deployment: `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`
- Disposition: live and accepted; its release gate is consumed and cannot
  authorize another action.

## Single cumulative candidate

- Draft PR: [#238](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/238)
- Branch: `codex/phase9-cumulative-release-20260829`
- Exact payload head: `fd4f12c2438964f9fac08e63eba457f8ef3d1d84`
- Exact payload tree: `4aa9840fccf699587f4705ce00804899abb32d8e`
- Hosted Release Gate: [run 33295435772](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33295435772), successful on the exact payload
- Immutable Preview: `dpl_EGLYa4m2FLA3FUCz4dzesA2dUeB3`, [target Preview](https://ask-magic-mike-kfp0zu2ge-eyes-up-industries.vercel.app), ready
- Protected no-write Preview QA: [run 33295219129](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33295219129), successful with `SAFE_DB_WRITE=false`
- Prior PR #238 head rescue: `rescue/amm-pr238-pre-admin-persistence-rollup-20260830-0145`

PR #238 fast-forwards the tested Phase 9 component tail and later reconciliation,
environment-presence, durable Neon Lead Center, and cumulative-cutover work
through PR #243 into one reviewable application candidate.
Those component PRs, branches, rescue refs, checks, and evidence remain
preserved as lineage, but none has independent current merge or Production
authority. Do not start with PR #210 and do not replay an individual component
gate.

PR #238 contains the hash-pinned, backup-first runner for exactly five additive
migrations, including the service-role-only Neon functions required by the
canonical Lead Center APIs. All import gates stay false. A migration release
does not authorize importing a report.

## Exact gate

The current Production authority is **HOLD** until this exact phrase is supplied:

```text
APPROVE PHASE 9 CUMULATIVE GROWTH MIGRATIONS, PR 238 MERGE, AND PRODUCTION DEPLOYMENT
```

The phrase is valid only for the exact PR #238 head and reviewed migration
hashes recorded in the manifest. Any head, tree, migration, target, or gate
drift invalidates the approval and requires fresh evidence.

## Ordered execution

1. Revalidate exact PR head/tree, hosted checks, Preview identity, and rollback.
2. Run the guarded read-only Production preflight against the exact unpooled
   Neon Production endpoint using a securely entered connection.
3. Confirm all three growth import gates are explicitly false.
4. After the exact gate, execute and verify the five migrations through
   `pnpm run phase9:cumulative-growth:cutover -- --execute`.
5. Merge only the exact PR #238 head without rewriting history.
6. Deploy only that reviewed commit to the canonical Vercel project.
7. Verify health, public routes, authorization boundaries, logs, database
   postconditions, and the rollback deployment.

## Preserved review lineage

PRs #210 through #243 remain preserved review records. Advancing PR #238 by
fast-forward caused GitHub to mark PR #239 incorporated into its base; no
Production merge or deployment occurred. The remaining component branches and
Draft PRs stay preserved for provenance and have no independent current gate.

## Excluded authority

The cumulative phrase does not authorize a growth-report import, provider
login, WordPress publication, DNS/domain change, lead submission, email/SMS/Web
Push send, consumer acknowledgment, social/GBP/email publication, paid spend,
data deletion, or any NellySelly action. Those remain separate exact gates.
