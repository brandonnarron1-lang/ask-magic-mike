# Phase 9 public owned-referral handoff QA evidence

Refreshed: 2026-08-29 06:42 EDT

Branch: `codex/phase9-owned-referral-handoff-20260828`

Parent: exact sealed Draft PR #227 head
`cf92b9cb64a7cc5b70c98d629cc86d2289fbfedb`

Original PR #228 head: `c755764846a3aa2708def5c47cc36e6fa700941d`,
preserved at
`rescue/amm-pr228-pre-pr227-exact-seal-20260829-0636`

Restack method: normal merge commit
`9b4b748f1513d6a00ed713e9fe5cd45c4546af98`; no rebase or force-push

Production mutation: none

## Reuse-first result

The active homepage already had a mature Black Diamond funnel, the canonical
`/ask` intake, approved Mike/Our Town imagery, attribution persistence, and a
privacy-filtered first-party event route. The protected Distribution Command
already covered operator asset generation and publication proof. This
candidate therefore adds no new campaign center, lead store, publisher,
provider, database, or message sender.

The single gap closed is a public, privacy-safe referral handoff. The homepage
no longer promotes the internal `Social ad support` surface or links consumers
to `/social-preview`; it offers native Share and Copy controls for one fixed
canonical `/ask` URL instead.

## Automated local proof

Toolchain: Node `24.18.0`, pnpm `10.30.3`, Next.js `15.5.21`.

Focused acceptance:

```bash
pnpm exec vitest run \
  tests/public/consumer-referral-handoff.test.tsx \
  tests/analytics/client-analytics-privacy.test.ts \
  tests/api/public-events-route.test.ts
```

Result after capability hardening: **3 files / 36 tests passed**. Coverage
includes the fixed packet,
closed surface registry, active-homepage substitution, native handoff,
cancelled/blocked chooser, `canShare` rejection, Clipboard fallback,
denied-Clipboard manual selection,
registered attribution, and PII-property rejection.

The complete local release gate passed:

- Ask Magic Mike / NellySelly deployable-source isolation: PASS;
- release safety: 14/14 PASS;
- Vitest: **266 files / 3,338 tests passed**;
- strict TypeScript: PASS;
- full ESLint: PASS;
- optimized Next.js build: PASS, 59 static pages generated;
- route manifest: PASS, 95 active routes / 17 acknowledged duplicates;
- Production dependency audit: no known vulnerability;
- redacted full-history Gitleaks: 671 commits / approximately 16.34 MB / no
  detected leak;
- exact sealed-parent delta Gitleaks: two commits / approximately 32.93 KB / no
  detected leak; and
- `git diff --check`: PASS.

Clean-tree release doctor: **43/43 PASS** with no failure or skip.

## No-write browser acceptance

The original code-bearing candidate's Playwright evidence drove the optimized
local build at desktop `1440 × 1000` and mobile
`390 × 844`. The accepted fresh mobile session installed a synthetic
`/api/events` response before navigation. No lead, appointment, chat,
notification, provider, or database endpoint was invoked.

Accepted visual evidence is retained under the stable worktree's ignored local
evidence directory:

- `output/playwright/owned-referral/desktop-referral-section.png`;
- `output/playwright/owned-referral/mobile-referral-390x844.png`; and
- `output/playwright/owned-referral/mobile-referral-section-390.png`.

The first exploratory page open occurred before the event intercept and
received the local origin guard's expected `403` for `/api/events`; it created
no write. The fresh accepted session installed the intercept before navigation
and produced:

- zero console warnings/errors;
- zero page errors;
- zero failed requests;
- zero responses at or above 400;
- zero external network requests;
- zero horizontal overflow at 390 px;
- two visible, keyboard-focusable, 48 px controls;
- a loaded responsive 1200×630 referral card;
- no visible `Social ad support` copy; and
- no homepage link containing `/social-preview`.

The browser-observed native packet was exactly:

```text
title: Ask Magic Mike | Our Town Properties
text: Have a Wilson-area real estate question? Ask Mike for local guidance from Our Town Properties.
url: https://www.askmagicmike.com/ask?utm_source=consumer_share&utm_medium=referral&utm_campaign=amm_owned_demand_2026&utm_content=homepage_referral_share
```

Native Share was stubbed at the browser boundary so no operating-system share
sheet, recipient, app, or external send was activated. Clipboard was also
stubbed. The accepted status copy was `Share options opened. You choose the
person and app.` and `Referral link copied.`

All first-party event requests were intercepted and inspected. They contained:

- `page_view` with the existing homepage funnel properties;
- `referral_share_handoff` with only `surface=homepage` and
  `share_method=native`; and
- `referral_link_copied` with only `surface=homepage` and
  `share_method=clipboard`.

No contact detail, form answer, saved plan, free text, recipient, lead/session
ID, click ID, or current URL was present.

## Accessibility

The rendered mobile referral section passed an axe-core `4.11.4` WCAG 2 A/AA
and WCAG 2.1 A/AA scan with **0 violations**, 16 passing rule groups, and 0
incomplete checks. The controls are native `type=button` elements, the full URL
has a persistent label, and status changes use an atomic polite status region.

This automated scan and keyboard acceptance reduce risk but do not claim full
conformance or replace human assistive-technology review.

## Security and truth boundary

- Shared content comes only from constants and a closed surface registry.
- No user-controlled string reaches a URL, share packet, HTML sink, or event
  property.
- Share resolution is recorded only as an OS/browser handoff, never as
  delivery, publication, recipient, click, referral, or lead proof.
- Chooser cancellation and Clipboard-denied manual selection record no success.
- A genuine lead remains canonical only after the existing durable public form
  submission path succeeds.
- Production, WordPress, Vercel Production, Neon Production, email/BCC, SMS,
  Push, DNS, publication, spend, and NellySelly remain unchanged.

## Pending refreshed exact-head evidence

After commit and push, seal the Draft PR's immutable head, CI release gate,
Vercel Preview deployment identity, protected no-write hosted browser pass,
Preview runtime logs, and fresh exact-head visual/accessibility evidence.
Production stays on `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`;
PR #209's consumed historical approval cannot authorize this Draft.
