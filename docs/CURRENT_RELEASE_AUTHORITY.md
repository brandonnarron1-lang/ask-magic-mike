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
- Exact payload head: `9232641329acb8a02ce4cf2419cb12768ce33d17`
- Exact payload tree: `e6f388311fd07fc84ed0e580b77b190f7c56f458`
- Hosted Release Gate: [run 33296816755](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33296816755), successful on the exact payload
- Immutable Preview: `dpl_81SFJbrytTH8fZVtuNmARrqgkuNV`, [target Preview](https://ask-magic-mike-4x51tm6c7-eyes-up-industries.vercel.app), ready
- Protected no-write Preview QA: [run 33296896585](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33296896585), successful with `SAFE_DB_WRITE=false`
- Prior PR #238 head rescue: `rescue/amm-pr238-pre-neon-role-preflight-fix-20260830-0224`

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

The corrected read-only Production preflight passed on 2026-08-30 against the
exact unpooled Neon endpoint. Canonical Neon has `service_role` and intentionally
lacks the optional Supabase `anon` and `authenticated` roles; the runner treats
those absent browser roles as denied and still fails closed on every required
schema, target, ledger, and privilege condition. Re-run the preflight under lock
immediately before any authorized execution.

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
