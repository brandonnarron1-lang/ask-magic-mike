# Cumulative admin-persistence cutover QA evidence

Date: 2026-08-30

Candidate branch: `codex/phase9-cumulative-cutover-admin-persistence-20260830`

Production authority: **HOLD**. This evidence used disposable local PostgreSQL
only. Neon Production, Vercel Production, WordPress, leads, notifications,
providers, domains, DNS, publication systems, and NellySelly were not changed.

## Gap closed

The existing cumulative runner sealed the four growth migrations in Draft PR
#238, but the later Neon Lead Center implementation added
`20260830190000_admin_lead_api_persistence.sql`. Leaving that migration outside
the runner would allow application code to deploy without the four PostgreSQL
functions it requires.

The runner now hash-pins and applies all five migrations in this order:

1. `20260824193000_marketing_spend_ingress.sql`
2. `20260824220000_organic_search_ingress.sql`
3. `20260825033000_local_profile_performance_ingress.sql`
4. `20260825060000_local_demand_metric_truth_guard.sql`
5. `20260830190000_admin_lead_api_persistence.sql`

The fifth SHA-256 is
`f50ffe91740fdd0690a87d673daf9e5753f122e19279ef84d729d9435d7adc35`.
Any source-byte drift still fails before a database connection.

## New preflight and postflight assertions

Preflight now requires the existing lead, agent, message, task, routing,
assignment, and audit tables; every column referenced by the new functions;
and `mutate_admin_assignment_v1`. It requires all eight target functions and
all five migration-ledger versions to be absent.

Postflight requires every function to be owned by `neondb_owner`, remain
`SECURITY INVOKER`, use a pinned search path, and deny `PUBLIC`, `anon`, and
`authenticated`. The four growth functions must deny `service_role`; the four
Lead Center functions must grant only `service_role` as required by the
server-side Neon adapter.

## Focused executable checks

Commands:

```text
pnpm exec vitest run tests/scripts/phase9-cumulative-growth-production-cutover.test.ts
pnpm run phase9:cumulative-growth:cutover -- --plan
```

Results:

- 1 test file / 9 tests passed;
- offline plan listed five migrations in the reviewed order;
- all five source hashes passed;
- the exact Production identity remained declarative only; and
- no Production connection variable was present or read.

## Full release gate

Command:

```text
PATH=/opt/homebrew/Cellar/node@24/24.18.0/bin:$PATH pnpm run release:gate
```

Results:

- Ask Magic Mike / NellySelly isolation passed;
- release safety passed 14/14 checks;
- Vitest passed 278 files / 3,423 tests;
- strict TypeScript typecheck passed;
- ESLint passed;
- the optimized Next.js 15.5.21 Production build passed; and
- route-manifest verification passed 100 active routes with 22 acknowledged
  root/source duplicates.

## Real PostgreSQL 17.11 success rehearsal

A disposable cluster was initialized with owner `neondb_owner`. Every canonical
migration before `20260824193000` was applied in order to create the real
pre-cutover schema. The actual runner `migrationSources`, `execute`, and
`verify` functions then ran against that cluster.

Results:

- five migrations committed once;
- five migration-ledger rows recorded once;
- baseline growth row counts unchanged;
- all three receipt tables hardened with RLS and denied privileges;
- all eight functions had the expected owner, invoker mode, search path, and
  role-specific execute policy;
- all four triggers were enabled and bound to the expected function;
- all receipt tables remained empty;
- validated mode-600 custom backup: 330,638 bytes;
- backup SHA-256:
  `1841c53c618bd81e4ded33d48959a788f030d3d0d2ad89b0fc0495c21b704d5c`;
- `pg_restore --list`: 616 restore entries; and
- read-only `verify` repeated every postcondition successfully.

## Injected late-failure rollback rehearsal

A second disposable PostgreSQL 17.11 cluster restored the exact pre-cutover
backup. The reviewed migration sources were loaded, then the test harness added
`SELECT 1/0` after the fifth migration body. This tests transaction rollback;
it is not a source accepted by the hash-pinned CLI path.

The server returned PostgreSQL `22012`. After rollback:

- all three target receipt tables were absent;
- all eight target functions were absent;
- all four target triggers were absent;
- all five target ledger counts were zero;
- every required table, column, role, function, owner, and database preflight
  check still passed; and
- the failure-path backup was 330,638 bytes with 616 validated restore entries.

This proves that a late migration failure cannot leave partial application
schema or migration-ledger state.

## Release boundary

This stacked candidate passed the complete local Release Gate. Its immutable
remote head must next pass exact-head CI and protected read-only Preview QA,
then be consolidated into the single PR #238 payload and resealed before the
existing approval phrase can be requested. No prior component approval
authorizes Production execution.

The exact Production gate remains:

```text
APPROVE PHASE 9 CUMULATIVE GROWTH MIGRATIONS, PR 238 MERGE, AND PRODUCTION DEPLOYMENT
```
