# Phase 9 channel-economics truth QA evidence

Date: 2026-08-29

Candidate branch: `codex/phase9-channel-economics-truth-20260825`

Base: exact sealed PR #222 head
`c6ff9157e66705128a283b98096f74ca8247cdab`

Preserved original head:
`rescue/amm-pr223-pre-pr222-exact-seal-20260829-040442` at
`294e08fc8524e515364c7a7bd49cfe8413d3d08c`

Reconciliation merge: `66e27e897cf23d1b60e47d74807e0d05c8c9fdf5`

Status: reconciliation and refreshed focused verification complete; fresh full
local, immutable Preview, protected hosted-browser, and runtime-log evidence
pending; Production unchanged

## Story under test

An authorized operator opens `/admin/growth`; the server reads canonical,
non-test lead, spend, and outcome rows; the deterministic engine separates
closed revenue from referral fees, verifies evidence completeness, computes
only supportable channel economics, and renders a read-only response.

## Focused proof

The focused suite currently proves:

- `referral_paid` is subtracted as cost and never counted as revenue;
- only the latest typed amount snapshot per lead is used;
- explicit zero remains valid evidence while absent data remains unknown;
- one missing amount among multiple closes makes financial coverage partial;
- incomplete closed-revenue or portal/referral-fee evidence withholds both ROAS
  and tracked contribution;
- missing spend for any paid channel also withholds aggregate contribution and
  ROAS;
- a fee row from an unrelated channel—or a non-closed lead in the same
  channel—cannot satisfy a portal close's evidence requirement;
- missing-evidence opportunity counts reflect only unresolved closes;
- a portal channel cannot receive `scale_candidate` until fee review is
  complete;
- signed-client counts and cost per signed client use agreement-or-later
  evidence;
- summary contribution subtracts all tracked spend and recorded referral fees;
- the Growth route remains server-authorized and read-only; and
- owned-demand decision systems compile against the expanded canonical summary.

Current refreshed result: 5 focused files / 64 tests PASS on exact Node 24.18.0
and pnpm 10.30.3. This includes a dedicated proof that an explicit zero
referral fee completes the review while an absent fee remains unknown.

## Former-head local release result — historical

The original PR #223 head previously passed:

- system isolation: PASS;
- release safety: 14/14 PASS;
- Vitest: 263 files / 3,289 tests PASS;
- strict TypeScript: PASS;
- full ESLint: PASS;
- optimized Next.js 15.5.21 build: PASS, 59 static pages;
- route manifest: PASS, 95 active routes / 17 acknowledged duplicates;
- Production dependency audit: no known vulnerabilities at high severity or
  above;
- full Git-history gitleaks scan: PASS across 642 commits and approximately
  16 MB;
- exact staged-content gitleaks scan: PASS across approximately 41.6 KB; and
- `git diff --check`: PASS.

Those results and screenshots do not seal the refreshed head. A fresh full
local gate, clean-tree doctor, exact-head GitHub CI, immutable Preview,
protected browser suite, visual inspection, and runtime-log review remain
required below.

## Security review

The changed Growth route remains a Next.js Server Component protected by
server-side `requireLeadCenterPermission("report:view")`, forced dynamic, and
uncached. The only query input is the existing `window` selector, allowlisted
to 30, 90, or 365 days.

No changed path adds a form, Server Action, mutation request, redirect, raw HTML
sink, DOM sink, `eval`, client storage, `postMessage`, browser secret, SQL, or
external provider call. Persisted labels render through normal React escaping.
Errors remain generic, and no actionable security issue was found in the
touched scope.

## Former-head local protected-browser proof — historical

Exact Node 24 Chromium Playwright passes 2/2 authenticated desktop and mobile
scenarios for `/admin/growth`:

- protected route returns 200;
- the new signed-client, fee, contribution, and CPQL evidence is visible;
- the missing-database state refuses to invent economics;
- zero same-origin non-read requests;
- zero page errors and zero console errors; and
- zero page-level horizontal overflow. The intentionally wide channel table is
  contained by its own horizontal scroller.

Visual inspection confirms legible desktop and 390 px mobile layouts, intact
navigation, contained channel-table overflow, and truthful unknown-data states.

Local screenshots (gitignored evidence only):

- `artifacts/growth-channel-economics-desktop.png` — SHA-256
  `22e1b9b06bf997ab7944b3757bbb731177183f0d85ce76d737cf72a3f05df111`
  (1280 × 4197);
- `artifacts/growth-channel-economics-mobile.png` — SHA-256
  `c1539e45e5c63db466dffae7257965817b8bc26059ef978d95a375c0809a485b`
  (390 × 10353).

## Required exact-head seal

Before this candidate can receive a Production gate, evidence must include:

1. exact Node 24 full Vitest, typecheck, ESLint, optimized build, route manifest,
   release safety, dependency audit, secret scan, and Ask/NellySelly isolation;
2. a clean code-bearing commit and exact-base ancestry proof;
3. a stacked Draft PR and passing exact-head GitHub Release Gate;
4. one immutable READY Vercel Preview bound to that exact SHA;
5. authenticated desktop and mobile `/admin/growth` screenshots;
6. zero same-origin mutation requests, page errors, console errors, or horizontal
   page overflow during protected Preview QA; and
7. an exact-deployment log review with no unexpected error or mutation signal.

## Commands run

```text
pnpm exec vitest run \
  tests/adminops/growth-intelligence.test.ts \
  tests/adminops/admin-growth-route-guards.test.ts \
  tests/adminops/owned-demand-command.test.ts \
  tests/adminops/owned-demand-assets.test.ts \
  tests/adminops/owned-demand-activation-loop.test.ts
pnpm run typecheck
pnpm run release:gate
pnpm audit --prod --audit-level=high
gitleaks git --redact --no-banner --log-opts='--all'
pnpm exec playwright test \
  tests/e2e/growth-decision-packets-preview.spec.ts \
  --project=chromium
pnpm run release:doctor
git diff --check
```

No command printed a credential or private financial row. An overbroad
generated-directory scan was interrupted after entering dependency output and
is not counted as evidence; the repository-history and exact staged-content
scans above passed.

## Production and external-state result

No Production deployment, Vercel environment edit, Neon connection, schema or
row mutation, lead/event/message, provider action, WordPress/DNS change,
publication, spend, deletion, or NellySelly action occurred. Production remains
on its current PR #209 authority. The separate current live-action gate remains
the explicitly named Our Town Basic Consent bridge installation/runtime-QA
gate; this Draft candidate does not consume or broaden it.
