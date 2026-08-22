# Phase 9 Current-Router Safety Consolidation — QA Evidence

Recorded 2026-08-21 in America/New_York.

## Scope and provenance

- Branch: `codex/phase9-current-router-safety-20260821`
- Stack base: PR #184 head `866601495054b9d479e07a5d7fb252546f31ab9c`
- Reused source: only the unique runtime/security portions of Draft PR #182
- Deferred source: Draft PR #179 retains the unique iOS install handoff
- Production baseline remained PR #181 / deployment
  `dpl_HVoqg1t4j2SJWPFMEEzpiHGQ6hmM`
- Draft PR: #185
- Code-bearing head: `4b92d286caae09114b2aa0f84eb7b084ad26cb2a`
- Exact-head GitHub run: `32516288876` / job `96878556819` / passed
- Exact-head Vercel Preview:
  `dpl_BByVkaLDwDKnkScV4R4f5v3vbNwf` / Ready
- Preview URL:
  `https://ask-magic-mike-r0ocr0xlb-eyes-up-industries.vercel.app`

No Production, database, provider, WordPress, DNS, lead, message, publication,
spend, or NellySelly mutation occurred.

## Verification

```text
node scripts/release-safety-scan.mjs
14 pass / 0 fail across 535 deployable files

node scripts/amm/public-cta-final-check.mjs
24 pass / 0 fail

pnpm exec vitest run +  tests/scripts/public-cta-final-check.test.ts +  tests/scripts/release-safety-current-router.test.ts +  tests/security/public-origin.test.ts +  tests/scripts/launch-readiness-doctor.test.ts
4 files / 99 tests passed

NODE_VERSION=24.18.0 ~/.nvm/nvm-exec pnpm run release:gate
202 test files / 2,837 tests passed
strict typecheck passed
ESLint passed
Next.js 15.5.21 Production build passed
78 active routes / 17 acknowledged root-src duplicates

pnpm audit --prod --audit-level high
No known vulnerabilities found

gitleaks git --redact --no-banner
469 commits / approximately 13.24 MB scanned / no leaks found
```

An initial build attempt stopped while writing a disposable Next.js cache
because the local volume had no free space. Only reproducible npm/pnpm and
`.next` caches were removed. The clean Node 24 rerun above passed completely.

## Browser and visual evidence

- [Homepage desktop](../../../output/phase9/current-router-safety/home-desktop.png)
- [Homepage mobile](../../../output/phase9/current-router-safety/home-mobile.png)
- [Buyer funnel desktop](../../../output/phase9/current-router-safety/buy-desktop.png)
- [Buyer funnel mobile](../../../output/phase9/current-router-safety/buy-mobile.png)

Observed at 1440×1100 and 390×844 Chromium viewports:

- Buyer is visible in desktop navigation and the existing Buyer Property Match
  path is visible in the homepage grid.
- Five desktop path cards fit without collision and stack as one readable mobile
  column.
- No horizontal overflow or clipped form controls were observed.
- Buyer consent, financing context, conditional availability copy, and
  `Not a survey.` remain visible.
- Existing Our Town/Ask Magic Mike identity, Mike photography, and restrained
  black/gold/cyan visual hierarchy remain intact.

A four-case DOM audit returned HTTP 200 for both routes/viewports, no horizontal
overflow, the expected Buyer marker, zero NellySelly markers, and zero console
errors. The local Production build intentionally rejects localhost analytics
events with 403, so `/api/events` was fulfilled in-browser with a synthetic
non-persisting 200 response for this visual-only audit. No event or lead write
occurred.

## Protected Preview acceptance

- `/`, `/buy`, `/api/health/live`, and `/api/health/ready`: HTTP 200.
- Liveness identifies `ask-magic-mike`, Preview, and canonical Neon; delivery
  channels remain disabled.
- Readiness reports the database, capture function, lead/notification tables,
  RBAC schema, push subscription table, and phone setup ready.
- Anonymous `/admin/distribution`: HTTP 401, Basic challenge, no-store,
  SAMEORIGIN, and noindex.
- Malformed `POST /api/events` from the exact deployment origin reached
  application validation and returned HTTP 400 `Invalid event.`; no valid event
  or persistence was attempted.
- The same malformed request from `https://foreign.example` returned HTTP 403
  before validation.
- Render counts: 24 Ask Magic Mike markers, 34 Our Town Properties markers,
  five Buyer path markers, and zero NellySelly markers.

The first `vercel curl --yes` probe ran before the worktree had canonical link
metadata and created empty helper project
`amm-phase9-current-router-safety-20260821`
(`prj_iGynowHru4TBNwWgvoiSIG193Ukf`). It has zero deployments and no domain,
environment, or application effect. The worktree was relinked to
`eyes-up-industries/ask-magic-mike`; the helper is recorded for separately
approved cleanup and was not silently deleted.

## Rollback

This source-branch candidate was additive and had no migration. Its work is now
incorporated into consolidated PR #185, whose later WordPress proof-scope repair
and migration-specific rollback/gate supersede this historical note. Production
was not changed by the source-branch QA recorded here.
