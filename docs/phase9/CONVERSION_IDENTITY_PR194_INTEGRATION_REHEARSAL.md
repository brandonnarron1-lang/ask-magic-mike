# Phase 9 conversion identity integration rehearsal

Date: 2026-08-22

Status: detached compatibility evidence only. This is not merge, Production,
Preview, migration, publication, or messaging authority.

## Exact inputs

- PR #195 head:
  `24745d4611652f141a2972f6bb6d3eacdedeb50a`
- Current exact PR #194 Draft head:
  `276d5a20992dd8e2dfe709ace0c1bd03443c4a36`
- Shared pre-refresh base:
  `be566d7fb66501d7321eaf3367c3070408a47aff`

The PR #195 remote branch was not changed. The rehearsal merged the current
PR #194 head into a detached copy of PR #195.

## Reconciliation result

- Application code merged cleanly.
- The only automatic conflict was chronological documentation at
  `docs/QA_EVIDENCE.md`.
- Resolution retains the conversion-identity evidence, then the released PR
  #193 privacy evidence, then the historical PR #185 evidence.
- Unique PR #195 delta after reconciliation remains 22 files, 360 insertions,
  and 33 deletions before the two rehearsal fixes below; it adds no migration.

## Browser issues found and closed

1. The site footer was nested inside `<main>`, so HTML correctly did not expose
   it as the page-level `contentinfo` landmark. The footer now renders as a
   sibling immediately after the single main landmark; its existing
   `aria-label="Footer"` navigation remains intact.
2. Homepage E2E allowed the page tracker to call the real analytics route.
   Without a configured local database, the route truthfully returned HTTP
   503 and Chromium logged a failed resource. Homepage E2E now intercepts only
   `/api/events` with a synthetic HTTP 202, making the browser proof explicitly
   database-mutation-free. The durable API success/refusal contract remains
   covered by route tests.

## Proof

- Focused PR #194 + PR #195 matrix: 11 files / 62 tests — PASS.
- Python capture helper compilation — PASS.
- Full exact Node 24 release gate after both fixes: 215 files / 2,940 tests,
  strict typecheck, ESLint, optimized Next.js 15.5.21 build, 82 active routes,
  14/14 safety, and Ask Magic Mike/NellySelly isolation — PASS.
- Browser verification after installing the pinned Playwright Chromium:
  eight homepage/widget checks passed. `/api/leads` and `/api/events` were
  intercepted; no lead or analytics row was written.
- Production dependency audit: no known vulnerabilities.
- Candidate text gitleaks scan: 26.06 KB, no finding.
- Diff/conflict-marker checks: PASS.
- PR #195 migration delta versus current PR #194: empty.

## Release order

PR #194 remains the next stacked application candidate and requires its own
exact approval. Only after PR #194 is released should PR #195 be refreshed on
the exact resulting `main`, the resolution and fixes above be applied, and all
exact-head GitHub/Vercel/Preview evidence be regenerated.

No Production deployment, database write, lead, email, SMS, Push, consumer
acknowledgment, WordPress/DNS change, external publication, spend, deletion,
or NellySelly action occurred.
