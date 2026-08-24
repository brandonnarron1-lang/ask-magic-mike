# Lead-alert brand identity v3 QA evidence

Date: 2026-08-24

Candidate: Draft PR #214 on
`codex/phase9-lead-alert-brand-identity-20260824`

Parent: exact Draft PR #213 head
`d666289f91962cd836e87aec6cb3d809e93e72a7`

## Scope and no-send boundary

The candidate changes only the canonical internal lead-alert renderer and its
protected review surface. It reuses the existing deterministic score bands,
outbox, provider adapter, recipients, BCC behavior, retry ledger, approved Our
Town logo, approved Mike portrait, and urgency backgrounds.

The three acceptance renders are fixed synthetic records. Every subject begins
`[TEST]`; every body says `INTERNAL DESIGN PREVIEW — NO LEAD EXISTS`; no email
or phone is present; no form, button, mutation route, recipient, provider,
queue, or send action exists. The acceptance route is executable only in local
or Vercel Preview runtime and returns 404 when `VERCEL_ENV=production`.

## Automated local evidence

Executed with Node 24.18.0:

```bash
pnpm run test -- --reporter=dot
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run routes:assert
pnpm run amm:verify:isolation
pnpm run release:safety
git diff --check
```

Results:

- Vitest: 234 files / 3,088 tests passed;
- strict TypeScript: passed;
- full ESLint: passed;
- optimized Next.js 15.5.21 build: passed, 52 generated pages;
- route manifest: passed, 84 active routes / 17 acknowledged root-`src`
  duplicates;
- release safety: 14/14 passed;
- Ask Magic Mike / NellySelly deployable-source isolation: passed; and
- whitespace validation: passed.

Focused lead-alert/notification proof passed 5 files / 48 tests before the full
suite. The contract proves approved asset paths and alt text, zero embedded
raster PII, all three urgency bands, no synthetic contact details, v1/v2 retry
pinning, unknown-version fail-closed behavior, visuals-disabled fallback, a
read-only review gallery, and the Production-disabled acceptance boundary.

The first route-manifest invocation correctly refused to assert against missing
`.next` output. After the required fresh optimized build, the same route proof
passed 84/17. A TypeScript check then caught an overly narrow helper parameter;
the helper was corrected to accept the exact optional Vercel environment value,
and strict typecheck plus focused regression tests passed before this evidence
was recorded.

## Immutable application Preview and browser evidence

Exact application head:
`46a9af538302951f1190df24a8bdf64f3be07450`

Immutable Vercel Preview:
`https://ask-magic-mike-5aghc96rb-eyes-up-industries.vercel.app`

Deployment: `dpl_CX5UbqeFUVE9BDdVCmhpttmNyy3Q`, `READY`, exact same Git SHA.

The Vercel build completed with no build error. After fresh requests to the
acceptance route, deployment-scoped Preview runtime warning/error/fatal logs
were empty. GitHub's `local-release-gate` and Vercel checks both passed.

### Screenshot-first design audit

The supplied HOT lead poster and the rendered implementation were inspected in
one comparison set. The implementation preserves the source's black/gold/red
urgency, Our Town logo, Mike identity, score-band hierarchy, and fast-scan
structure while deliberately omitting invented raster lead facts and fake
action buttons.

The first exact Preview exposed a real mobile defect: in a 307-pixel email pane,
the 150-pixel logo plus 96-pixel portrait forced the email body from a
276-pixel client width to a 324-pixel scroll width. That evidence was rejected.
The current head reduces only those two approved assets, fixes the header/table
layout, and adds long-value wrapping. The corrected exact Preview measures:

- page client/scroll width: 375 / 375 at a 390 × 844 viewport;
- email HTML client/scroll width: 292 / 292;
- email body client/scroll width: 276 / 276;
- three synthetic iframes, zero outer forms, and zero outer buttons;
- zero forms and zero buttons inside the inspected HOT email;
- `[TEST] SELLER LEAD` and
  `INTERNAL DESIGN PREVIEW — NO LEAD EXISTS` present; and
- exact Our Town and Mike alternative text present.

Desktop 1280 × 720 measures 1,265 / 1,265 page client/scroll width and renders
all three HOT, ACTIVE, and NEW cards in one row. Browser console inspection
returned no entries.

Accepted screenshots are retained in the ignored local evidence directory:

- `output/playwright/phase9-lead-alert-brand-identity/03-preview-mobile-390x844-corrected.png`;
- `output/playwright/phase9-lead-alert-brand-identity/04-preview-desktop-1280x720-corrected.png`.

### Production boundary proof

The exact optimized build was started locally with `VERCEL_ENV=production`.
`/preview/lead-alert-identity` returned 404 while `/` returned 200. Current
public Production independently returned the same 404/200 pair. The helper's
unit contract also proves local/Preview enabled and Production disabled.

### Exact-head security and supply-chain proof

- `pnpm audit --prod --audit-level high`: no known vulnerabilities;
- `gitleaks git --redact --no-banner --log-opts='--all'`: 599 commits and
  approximately 15.16 MB scanned, no leaks;
- clean Git working tree after the application commit; and
- Draft PR #214 remained cleanly mergeable on its required PR #213 base.

The evidence reconciliation commit that contains this section is documentation
only. Its final GitHub/Vercel exact-head seal is recorded in the Draft PR so the
runtime application evidence above is not recursively invalidated by writing
its own SHA into this file.

## Release boundary

No Production, environment, database, lead/event, notification, email/BCC,
consumer acknowledgment, SMS/MMS, Push, provider test, WordPress/GTM/GA4/DNS,
publication, spend, deletion, or NellySelly action occurred.

After every ordered predecessor releases and this branch is refreshed onto
exact accepted `main`, the later application-only gate is:

`APPROVE PHASE 9 LEAD-ALERT BRAND IDENTITY V3 MERGE AND PRODUCTION DEPLOYMENT`

That gate does not authorize a message send or any separately gated external
action.
