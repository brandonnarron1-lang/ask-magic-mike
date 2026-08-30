# Current Release Authority

Updated 2026-08-29. This is the canonical operator record for the next Ask
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
- Exact head: `de67db6e1183b2a47d329d4a9a11993d48d1992a`
- Exact tree: `75abbbbe6767092e1d31b225014dd1bf574acda1`
- Hosted Release Gate: [run 33286824049](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33286824049), successful on the exact head
- Immutable Preview: `dpl_4vstQQGaY6HxsgjNB8UrDkB2bX6t`, target Preview
- Protected no-write Preview QA: [run 33286951924](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33286951924), successful

PR #238 is byte-equivalent to the tested Phase 9 component tail and
consolidates PRs #210 through #237 into one reviewable application candidate.
Those component PRs, branches, rescue refs, checks, and evidence remain
preserved as lineage, but none has independent current merge or Production
authority. Do not start with PR #210 and do not replay an individual component
gate.

PR #238 also contains the hash-pinned, backup-first runner for exactly four
additive growth migrations. All import gates stay false. A migration release
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
4. After the exact gate, execute and verify the four migrations through
   `pnpm run phase9:cumulative-growth:cutover -- --execute`.
5. Merge only the exact PR #238 head without rewriting history.
6. Deploy only that reviewed commit to the canonical Vercel project.
7. Verify health, public routes, authorization boundaries, logs, database
   postconditions, and the rollback deployment.

## Dependent review artifacts

Draft [PR #239](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/239)
adds read-only, PII-free WordPress legacy-lead reconciliation tooling after the
PR #238 head. It is not part of the PR #238 Production gate, does not query or
import live WordPress data, and must not be merged ahead of PR #238.

## Excluded authority

The cumulative phrase does not authorize a growth-report import, provider
login, WordPress publication, DNS/domain change, lead submission, email/SMS/Web
Push send, consumer acknowledgment, social/GBP/email publication, paid spend,
data deletion, or any NellySelly action. Those remain separate exact gates.
