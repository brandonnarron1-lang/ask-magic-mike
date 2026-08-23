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

## Final pre-release re-audit (read-only)

- At 2026-08-23T21:10Z, canonical Production remained on
  `b450b41c66c6740bd20571cdbe7d8caf82e92d5e`. The candidate monitor again
  returned the expected 8/9: every public route and anonymous-admin boundary
  passed, while only the old readiness body lacked the durable-limiter fields.
- The encrypted Vercel Production inventory contains sensitive `DATABASE_URL`
  and no `RATE_LIMIT_HASH_SECRET` or `RATE_LIMIT_EMERGENCY_MEMORY`. Two encrypted
  `UPSTASH_REDIS_REST_*` names remain present but are unused by this code and
  remain outside the approved release scope. No value was retrieved or shown.
- Production emitted nine rate-limit-matching runtime log entries in the prior
  24-hour query window, confirming the operational drift remains live.
- The canonical immutable candidate Preview returned HTTP 200 with database,
  table, exact schema/upsert target, CRUD privileges, effective RLS, and
  aggregate store capability all true through the deployed Vercel runtime
  role. Preview correctly reported `rate_limit_required=false`, dedicated
  secret false, and aggregate readiness true.
- Vercel intentionally excludes variables typed `sensitive` from local
  `vercel env run`; therefore a local `database_not_configured` result is not
  evidence that the deployed runtime lacks `DATABASE_URL`. No variable was
  downgraded, copied, exported, or persisted to work around that control.

## Local verification

All commands use Node 24.18.0 and pnpm 10.30.3.

| Check | Result |
| --- | --- |
| Frozen dependency install | PASS |
| Focused route/helper/monitor/script contract tests | PASS — 6 files / 59 tests |
| Strict typecheck | PASS |
| ESLint | PASS |
| Full Vitest suite | PASS — 218 files / 2,983 tests |
| Optimized Next.js 15.5.21 build | PASS — 52 static pages / 82 active routes |
| System isolation | PASS — no deployable NellySelly identifier |
| Release safety | PASS — 14/14 |
| Release doctor after implementation commit | HEALTHY — 43/43 |
| Production dependency audit | PASS — no known vulnerability |
| Full-history redacted secret scan | PASS — 548 commits / approximately 14.56 MB / no leak |
| Diff and migration review | PASS — no whitespace defect and no migration |

The limiter privacy test now forces a Neon failure containing a synthetic
private connection marker. Runtime output contains only
`authentication_failed`, `permission_denied`, `connection_failed`, or
`query_failed`; the raw marker is absent.

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

## Hardened application-head remote evidence

- Application head: `abd2269b77496024a20d172e83a5404f013c5a43`.
- GitHub run `32659072474`, job `97242352114`: PASS. The workflow status is
  attached to that head and executes the clean PR merge ref
  `c126025ea7b90fb2830ae7e18fbf592bbb2b237d`, whose parents are exact base
  `b450b41c66c6740bd20571cdbe7d8caf82e92d5e` and exact application head.
- Release artifact `9498271868`:
  `sha256:392a18b8be74d3d5adb726bc459263ffd7fa69c70121a38a5566901607c7ff0a`.
- Canonical Vercel Preview `dpl_FvHmNSQLKq9EGp24LPijSfPAW3Me`: READY and
  linked by the successful Vercel status on the exact application head.
- Immutable Preview URL:
  `https://ask-magic-mike-h9c94yzgp-eyes-up-industries.vercel.app`.
- Deployed Preview health: HTTP 200; core database and all four store
  capabilities true; `rate_limit_required=false`, dedicated-secret false, and
  aggregate rate-limit readiness true as designed for isolated Preview.
- Protected Preview run `32659271882`, job `97242839107`: PASS against the
  exact application head with `SAFE_DB_WRITE=false` hard-pinned.
- Preview artifact `9498333700`:
  `sha256:6d1fe179c33690bba278a127200f8ca62da73cacadc636a1f1fd158e64833698`.
- Acceptance: 17 pass / 6 intentional mutation skips / 0 fail; Widget
  Chromium 2 expected / 0 unexpected / 0 flaky / 0 skipped; release doctor
  43/43; release candidate GO; launch authority `PREVIEW_READY`.
- Preview runtime logs after health and acceptance: 0 warning / 0 error / 0
  fatal.
- `SAFE_DB_WRITE=false`; no lead, note, task, SLA, suppression, email, SMS,
  Push, analytics, or database mutation ran.

The evidence-seal commit is documentation-only. Its own GitHub/Vercel checks
remain mandatory after push; final-head evidence belongs in the PR record to
avoid an endless evidence-commit loop. Production remains unchanged.

## Stack compatibility preflight

The hardened application commit was overlaid on the existing synthetic
PR #197–#201 stack. Every executable/configuration file merged automatically;
only the cumulative `docs/GO_LIVE_RUNBOOK.md` required later editorial
reconciliation. The preflight merge was aborted cleanly and no source PR was
changed.

## Vercel CLI hygiene note

The first protected `vercel curl` from the isolated worktree auto-created empty
helper project `amm-phase9-durable-rate-limit-readiness-20260823`
(`prj_Da74SJxkGLrCa1oqkRo2cOmlaAkB`). It has zero deployments and no domain,
environment, alias, or Production effect. The worktree was immediately relinked
to canonical project `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`. The empty helper is
preserved pending separate cleanup approval.

## Known boundary

Preview is intentionally read-only and reports `rate_limit_required=false`.
Production acceptance is not claimable until the dedicated encrypted secret is
entered under the exact gate and the merged deployment reports every store
capability true, `rate_limit_required=true`, `rate_limit_secret_ready=true`, and
`rate_limit_ready=true` through the exact Vercel runtime role.
