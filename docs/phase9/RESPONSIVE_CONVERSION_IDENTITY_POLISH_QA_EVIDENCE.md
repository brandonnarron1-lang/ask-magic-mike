# Responsive conversion-identity polish QA evidence

Date: 2026-08-24

Candidate: Draft PR #213 on
`codex/phase9-conversion-identity-polish-20260824`

Parent: exact sealed Draft PR #211 head
`c5700eda5e32ff6ead9a985c86b811a3c46e1e66`

## Current PR #211 exact-seal refresh — 2026-08-28

- Preserved prior PR #213 head
  `3c5ecdec2941a3ef01fa26bd2810a3ffa3156eea` at remote rescue branch
  `rescue/amm-pr213-pre-pr211-exact-seal-20260828-215231`.
- Merged exact sealed PR #211 head
  `c5700eda5e32ff6ead9a985c86b811a3c46e1e66` while retaining the responsive
  header implementation and all upstream accepted-Production, redirect, Ask,
  keyboard, and no-write contracts once.
- Application files merged without manual resolution. Conflicts were limited
  to additive changelog and executable release-authority records.
- All evidence below predates this refresh and is historical until fresh
  exact-head Node 24, immutable Preview, screenshot-first responsive audit,
  browser interaction, and no-write runtime proof pass.
- No Production, environment, database, lead/event, notification, WordPress,
  DNS, publication, spend, deletion, or NellySelly mutation occurred.

## Historical screenshot-first audit

The exact PR #209 Preview was inspected before implementation at:

`https://ask-magic-mike-qi8t97s7i-eyes-up-industries.vercel.app`

Accepted screenshots covered:

1. desktop homepage — healthy identity, hero, local trust, and primary CTAs;
2. mobile homepage — healthy art direction and CTA stacking;
3. mobile Home Value step one — clear durable-intake expectation and address
   action;
4. mobile Seller — healthy intent hierarchy, with the form beginning below the
   first screen;
5. mobile Buyer — healthy content and form composition;
6. mobile Ask — healthy identity, with consumer-facing copy already improved
   by downstream PR #211; and
7. mobile Ask card — legible Mike identity and starter-question controls.

The shared mobile header exposed only logo + Ask CTA. Source inspection of the
exact PR #211 parent confirmed the full navigation remained `md:flex` only.

## Local rendered acceptance

Fresh in-app-browser screenshots of the implementation are retained under the
ignored local evidence directory:

`output/playwright/phase9-conversion-identity-polish/`

Accepted states:

- `01-buyer-mobile-nav-closed.png` — 390 × 844 closed state;
- `02-buyer-mobile-nav-open.png` — 390 × 844 open state with current Buyer
  identity;
- `03-seller-after-switch-mobile.png` — real local `/buy` → `/sell` route
  switch and automatic close;
- `04-buyer-desktop-active-navigation.png` — 1280 × 720 active desktop state;
- `05-buyer-narrow-320.png` — 320 × 700 closed state; and
- `06-buyer-narrow-menu-open.png` — 320 × 700 open state.

At 320 pixels, `document.documentElement.scrollWidth` was 305 against
`window.innerWidth` 320. The Ask CTA remained one line; the current-state text
hid below 360 pixels while `aria-current` remained; the full-width Ask row and
all other destination labels remained legible.

Real-browser interactions proved:

- open/close button state changed `aria-expanded` correctly;
- `/buy` was exposed as the current path;
- choosing Sell navigated to `/sell` and removed the menu;
- clicking outside removed the menu;
- Escape removed the menu and returned focus to the trigger; and
- a fresh local tab reported zero browser warning/error entries after the
  smooth-scroll declaration.

No field was filled and no form, lead, event, chat message, appointment,
notification, provider call, or database write was created.

## Automated local evidence

Focused command under Node 24.18.0:

```bash
pnpm vitest run \
  tests/recurring-value/review-planner-route.test.ts \
  tests/public/black-diamond-header-navigation.test.tsx \
  tests/public/ask-conversion-accessibility.test.tsx
```

Result: 3 files / 11 tests passed. The recurring-value contract now recognizes
the shared header's typed navigation registry while still requiring the exact
`/plan` destination and label.

Focused ESLint command:

```bash
pnpm exec eslint \
  app/components/black-diamond/BlackDiamondHeader.tsx \
  app/layout.tsx \
  tests/public/black-diamond-header-navigation.test.tsx \
  tests/public/ask-conversion-accessibility.test.tsx
```

Result: passed with no warning or error.

The tests prove complete destination exposure, current-route semantics,
non-wrapping narrow-header contracts, open/close state, Escape/focus return,
outside-pointer dismissal, full-width Ask treatment, retained Ask tracking,
retained PR #211 skip-link behavior, and the Next.js smooth-scroll declaration.

Full local release evidence under Node 24.18.0:

- Vitest: 232 files / 3,082 tests passed;
- strict TypeScript: passed;
- full ESLint: passed;
- optimized Next.js 15.5.21 build: passed, 52 generated pages;
- route manifest: passed, 83 active routes / 17 acknowledged root-`src`
  duplicates;
- release safety: 14/14 passed;
- Ask Magic Mike / NellySelly deployable-source isolation: passed;
- Production dependency audit: no known vulnerabilities;
- redacted full-history gitleaks: 596 commits scanned, no leak; and
- `git diff --check`: passed.

The first remote gate run found one stale source-string assertion for the Plan
link after the header moved to one typed navigation registry. It failed with
3,081 tests already passing. The contract was repaired to assert the exact
registry destination and label, and the complete local suite then passed
3,082/3,082.

## Pending immutable exact-head evidence

After this evidence and compatibility-test commit is pushed, rerun and record
the GitHub release gate, clean-tree release doctor, immutable Vercel Preview,
protected no-write acceptance, exact parent/head identity, fresh 320/390/
desktop visual/interaction acceptance, and Preview runtime logs. No Production
gate is eligible until the ordered predecessors release.

## Final PR #211 cutover-hygiene refresh — 2026-08-24

- Preserved prior PR #213 head
  `431ae9eebba7d38712305fa257f118cf0e498a89` at remote rescue branch
  `rescue/amm-pr213-pre-final-pr211-cutover-hygiene-20260824-170330`.
- Merged exact final PR #211 head
  `5d566a4a14d4a7cb67175683fdf099e8d62747b7`, retaining all upstream durable
  rate-limit, canonical-alias, Ask semantics, skip-focus, and browser no-write
  contracts once.
- Merge conflicts were limited to additive changelog history. The responsive
  header implementation and its tests merged without manual application-file
  resolution.
- Earlier CI, Preview, interaction, geometry, and console evidence is now
  historical. The refreshed exact head must repeat full Node 24, immutable
  Preview, responsive-navigation, protected Chromium, and zero-mutation
  runtime proof before this candidate is sealed.
- No Production environment, merge, deployment, database/lead/event write,
  AI/provider request, message, WordPress edit, DNS change, publication, spend,
  deletion, or NellySelly action occurred.
