# Phase 9 Durable Rate-Limit Readiness QA Evidence

Date: 2026-08-23
Branch: `codex/phase9-durable-rate-limit-readiness-20260823`
Base: `b450b41c66c6740bd20571cdbe7d8caf82e92d5e`
Rescue: `rescue/amm-pre-durable-rate-limit-readiness-20260823-1335`

## Production diagnosis (read-only)

- Custom production URL: HTTP 200.
- Apex: HTTP 308 to `https://www.askmagicmike.com/`.
- Our Town Properties: HTTP 200.
- Existing status-only production monitor: 9/9.
- Vercel deployment: READY, target `production`, exact base commit above.
- Runtime error grouping: 17 paired durable-limiter fallback occurrences on
  the two public event routes.
- Candidate contract monitor against unchanged Production: expected 8/9,
  failing only readiness-contract fields absent from the old deployment.
- No request body, lead, PII, secret, email, SMS, Push, WordPress mutation,
  analytics write, or database write was used for diagnosis.

## Local verification

All commands use Node 24.18.0 and pnpm 10.30.3.

| Check | Result |
| --- | --- |
| Frozen dependency install | PASS |
| Focused route/helper/monitor/script contract tests | PASS — 6 files / 58 tests |
| Strict typecheck | PASS |
| ESLint | PASS |
| Full Vitest suite | PASS — 218 files / 2,982 tests |
| Optimized Next.js 15.5.21 build | PASS — 52 static pages / 82 active routes |
| System isolation | PASS — no deployable NellySelly identifier |
| Release safety | PASS — 14/14 |
| Release doctor after implementation commit | HEALTHY — 43/43 |
| Production dependency audit | PASS — no known vulnerability |
| Full-history redacted secret scan | PASS — 544 commits / approximately 14.51 MB / no leak |
| Diff and migration review | PASS — no whitespace defect and no migration |

## Authenticated Neon capability proof

- Project `bitter-star-20214385`, branch `production`
  (`br-round-base-auh6h2wd`), database `neondb`.
- The exact read-only catalog query checks required columns/types/nullability,
  `updated_at` default, a valid non-partial single-key `bucket_key` unique
  index, schema `USAGE`, table `SELECT/INSERT/UPDATE/DELETE`, and effective RLS
  bypass including forced-RLS handling.
- Result: one row in 35 ms; `rate_limit_table`, `rate_limit_schema_ready`,
  `rate_limit_permissions_ready`, and `rate_limit_rls_ready` were all true.
- No table row, lead, event, secret, credential, or PII was read or written.
- Boundary: this proves the SQL editor role. The exact encrypted Vercel
  `DATABASE_URL` role can be proved only by deployed health execution.

## Superseded remote evidence

Draft PR: [#202](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/202)

- Previous final head `6067512e744d99cd30b74fdab1ce25f5f58b1ebd`
  passed GitHub run `32656354714`, Preview deployment
  `dpl_5vxPprqY9YkdMppHDHopcRxT26da`, and protected run `32656574722`.
- Acceptance: 17 pass / 6 intentional mutation skips / 0 fail; Widget
  Chromium 2 expected / 0 unexpected / 0 flaky / 0 skipped; release doctor
  43/43; launch authority `PREVIEW_READY`.
- `SAFE_DB_WRITE=false`; no lead, note, task, SLA, suppression, email, SMS,
  Push, analytics, or database mutation was executed.
- This evidence is retained for audit but is superseded: it proved only table
  existence and a usable secret, not the exact schema/upsert target, runtime
  privileges, or RLS capability. It is not releasable evidence.

## Current exact-head evidence

Pending commit and push of the hardened candidate. Exact-head GitHub Node 24
CI, canonical Vercel Preview, protected no-write acceptance, logs, artifact
digests, and launch authority remain mandatory. Production remains unchanged.

## Known boundary

Preview is intentionally read-only and reports `rate_limit_required=false`.
Production acceptance is not claimable until the dedicated encrypted secret is
entered under the exact gate and the merged deployment reports every store
capability true, `rate_limit_required=true`, `rate_limit_secret_ready=true`, and
`rate_limit_ready=true` through the exact Vercel runtime role.
