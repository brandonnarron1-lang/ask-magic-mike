# Cumulative release-authority refresh QA evidence

Date: 2026-08-30

Authority branch: `codex/phase9-cumulative-release-authority-refresh-20260830`

Production authority: **HOLD**. This change is metadata, documentation, tests,
and protected runtime authority copy only. It does not change the immutable
application payload or any live system.

## Canonical payload

- Draft PR: [#238](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/238)
- Branch: `codex/phase9-cumulative-release-20260829`
- Exact payload head: `9232641329acb8a02ce4cf2419cb12768ce33d17`
- Exact payload tree: `e6f388311fd07fc84ed0e580b77b190f7c56f458`
- Prior-head rescue:
  `rescue/amm-pr238-pre-neon-role-preflight-fix-20260830-0224`

The PR #238 branch moved from `de67db6e1183b2a47d329d4a9a11993d48d1992a`
to the payload above by fast-forward only. No force push, branch deletion, or
history rewrite occurred.

## Exact hosted evidence

- Hosted Release Gate:
  [run 33296816755](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33296816755), successful.
- Vercel Preview deployment: `dpl_5LPXmh9LJdGqmzGCFonRTQJvUU1X`, ready at
  `https://ask-magic-mike-1e44zit4f-eyes-up-industries.vercel.app`.
- Protected Preview QA:
  [run 33297711504](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33297711504), successful with
  `SAFE_DB_WRITE=false`.
- Runtime identity: exact Preview database match, explicit Production endpoint
  refusal, distinct endpoint IDs, email/SMS disabled, provider delivery
  disabled, and the database-mutation gate closed.
- Mutation-free widget/browser E2E and `PREVIEW_READY` authority assertion:
  successful.

## Controlled-mutation evidence reuse

The candidate does not need a second synthetic write to repeat the already
accepted Neon Lead Center proof. Commit
`382ebe32d41a23eeb0e4a969c733be78930ba87a` is an ancestor of the exact PR #238
payload. A bounded `git diff --name-only` over the 36 lead intake, admin
mutation, persistence, Preview-safety, and candidate migration files returned
no changes between that controlled commit and PR #238.

- Controlled evidence:
  `NEON_ADMIN_API_PERSISTENCE_QA_EVIDENCE.md`.
- Covered surface SHA-256:
  `823997fb72aed87a9c73e313c682361055a8622bc8d79c16dfbd62e7184c67d4`.
- Candidate migration SHA-256:
  `f50ffe91740fdd0690a87d673daf9e5753f122e19279ef84d729d9435d7adc35`.
- Proven behavior: one test-marked lead, one idempotent replay, durable
  note/task/patch/assignment IDs, exact authenticated readback, notifications
  skipped with zero provider attempts, and terminal suppressed closeout.
- New writes performed during this refresh: zero.

## Manifest assertions

The schema-version-3 authority manifest pins:

1. accepted Production PR #209, commit, and deployment;
2. exact PR #238 payload head and tree;
3. the unconsumed cumulative Production approval phrase;
4. all five reviewed migration files and SHA-256 values;
5. the exact hosted Release Gate, Preview deployment, and no-write QA run;
6. the prior-head rescue branch; and
7. PRs #210–#243 as preserved lineage with no independent current authority;
   and
8. the controlled-mutation evidence commit, unchanged 36-file surface hash,
   candidate migration hash, durable readback, idempotency, disabled delivery,
   and terminal test closeout.

## Local verification

Commands:

```text
pnpm exec vitest run tests/scripts/current-release-authority-docs.test.ts tests/adminops/growth-capability-ledger.test.ts tests/scripts/phase9-cumulative-growth-production-cutover.test.ts
PATH=/opt/homebrew/Cellar/node@24/24.18.0/bin:$PATH pnpm run release:gate
```

Results:

- focused authority/cutover coverage: 3 files / 39 tests passed;
- Ask Magic Mike / NellySelly isolation: passed;
- release safety: 14/14 passed;
- full Vitest suite: 278 files / 3,424 tests passed;
- strict TypeScript typecheck: passed;
- ESLint: passed;
- optimized Next.js 15.5.21 Production build: passed; and
- route manifest: 100 active routes with 22 acknowledged root/source
  duplicates, passed.

## Read-only Production preflight

The exact payload runner connected through Neon's authenticated secure console
to the unpooled Production endpoint and passed every bounded preflight check.
It confirmed PostgreSQL 18.4, the canonical owner, `service_role`, all required
tables/functions/columns, the immutable guard, absent target objects, and zero
ledger rows for all five migrations. Optional `anon` and `authenticated` roles
were absent and correctly treated as denied. The complete PII-free proof is in
`CUMULATIVE_PRODUCTION_PREFLIGHT_2026-08-30.md`.

## Production boundary

Production received only the bounded read-only catalog/count preflight. No
Production database migration or mutation, Vercel Production change,
WordPress save/publication, lead mutation, email/SMS/Push send, provider
action, DNS change, publication, spend, deletion, or NellySelly action
occurred.

The only current Production gate remains:

```text
APPROVE PHASE 9 CUMULATIVE GROWTH MIGRATIONS, PR 238 MERGE, AND PRODUCTION DEPLOYMENT
```
