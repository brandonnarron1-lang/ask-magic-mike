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
| Focused route/helper/monitor contract tests | PASS — 4 files / 45 tests |
| Strict typecheck | PASS |
| ESLint | PASS |
| Full Vitest suite | PASS — 216 files / 2,969 tests |
| Optimized Next.js 15.5.21 build | PASS — 52 static pages / 82 active routes |
| System isolation | PASS — no deployable NellySelly identifier |
| Release safety | PASS — 14/14 |
| Release doctor before commit | HEALTHY — 42 pass / 1 expected non-blocking dirty-tree result |
| Production dependency audit | PASS — no known vulnerability |
| Full-history redacted secret scan | PASS — 544 commits / approximately 14.51 MB / no leak |
| Diff and migration review | PASS — no whitespace defect and no migration |

## Remote evidence

Exact-head GitHub Node 24 CI, canonical Vercel Preview, and protected Preview QA
will be attached after the Draft PR is pushed. Production remains unchanged.

## Known boundary

Preview is intentionally read-only and reports `rate_limit_required=false`.
Production acceptance is not claimable until the dedicated encrypted secret is
entered under the exact gate and the merged deployment reports
`rate_limit_required=true` and `rate_limit_ready=true`.
