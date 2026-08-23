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
| Release doctor after implementation commit | HEALTHY — 43/43 |
| Production dependency audit | PASS — no known vulnerability |
| Full-history redacted secret scan | PASS — 544 commits / approximately 14.51 MB / no leak |
| Diff and migration review | PASS — no whitespace defect and no migration |

## Remote evidence

Draft PR: [#202](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/202)

- Reviewed implementation/evidence head:
  `8a2fa4d7d8150e6f1825ba3dfc04b163784a8a24`.
- GitHub Node 24 release run `32655836987`, job `97234315833`: PASS.
- Release artifact `9497448582`:
  `sha256:a0e228be2437019c96fcb0645fef563b17f5df27410f74ead25d850d9e36d860`.
- Canonical Vercel Preview deployment
  `dpl_3Dj8wBXnKLYrS9EoXLhkrLgBsKyy`: READY, exact reviewed head.
- Immutable Preview URL:
  `https://ask-magic-mike-9qy59tvc0-eyes-up-industries.vercel.app`.
- Protected Preview QA run `32656042058`, job `97234854132`: PASS.
- Preview artifact `9497505410`:
  `sha256:fc11119a2c8603e0e1ee6231847b9d6134ab52eb4c4f9d082af9c3f83137bde4`.
- Acceptance: 17 pass / 6 intentional mutation skips / 0 fail; Widget
  Chromium 2 expected / 0 unexpected / 0 flaky / 0 skipped; release doctor
  43/43; launch authority `PREVIEW_READY`.
- `SAFE_DB_WRITE=false`; no lead, note, task, SLA, suppression, email, SMS,
  Push, analytics, or database mutation was executed.
- Vercel reported no error/fatal logs for the Preview deployment during the
  acceptance window.

The evidence-seal commit is documentation-only. Its exact-head GitHub/Vercel
checks remain mandatory after push. Production remains unchanged.

## Known boundary

Preview is intentionally read-only and reports `rate_limit_required=false`.
Production acceptance is not claimable until the dedicated encrypted secret is
entered under the exact gate and the merged deployment reports
`rate_limit_required=true` and `rate_limit_ready=true`.
