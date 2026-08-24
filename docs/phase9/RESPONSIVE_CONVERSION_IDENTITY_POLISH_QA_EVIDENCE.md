# Responsive conversion-identity polish QA evidence

Date: 2026-08-24

Candidate: Draft PR #213 on
`codex/phase9-conversion-identity-polish-20260824`

Parent: exact Draft PR #211 head
`6eacc33d16e34897c97288e48cd736433a3d9e15`

## Screenshot-first audit

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

Focused command:

```bash
pnpm exec vitest run \
  tests/public/black-diamond-header-navigation.test.tsx \
  tests/public/ask-conversion-accessibility.test.tsx
```

Result: 2 files / 8 tests passed.

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

## Pending exact-head evidence

The documentation commit changes the PR head. Before any later release claim,
run and record the full Node 24 suite, strict typecheck, ESLint, optimized
build, route manifest, release safety, release doctor, dependency audit,
history/changed-file secret scans, system isolation, immutable Vercel Preview,
protected no-write acceptance, current-parent identity, and Preview runtime
logs. No Production gate is eligible until the ordered predecessors release.
