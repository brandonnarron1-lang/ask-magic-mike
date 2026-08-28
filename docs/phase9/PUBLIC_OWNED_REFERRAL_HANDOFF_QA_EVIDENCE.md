# Phase 9 public owned-referral handoff QA evidence

Captured: 2026-08-28 18:32 EDT

Branch: `codex/phase9-owned-referral-handoff-20260828`

Parent: exact Draft PR #227 head
`10b1a43720c67b8218c110db488e5513a8d6c566`

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

Result: **3 files / 32 tests passed**. Coverage includes the fixed packet,
closed surface registry, active-homepage substitution, native handoff,
cancelled chooser, Clipboard fallback, denied-Clipboard manual selection,
registered attribution, and PII-property rejection.

The complete local release gate passed:

- Ask Magic Mike / NellySelly deployable-source isolation: PASS;
- release safety: 14/14 PASS;
- Vitest: **266 files / 3,311 tests passed**;
- strict TypeScript: PASS;
- full ESLint: PASS;
- optimized Next.js build: PASS, 59 static pages generated;
- route manifest: PASS, 95 active routes / 17 acknowledged duplicates;
- Production dependency audit: no known vulnerability;
- redacted full-history gitleaks: 640 commits / approximately 16.02 MB / no
  leak; and
- exact staged-candidate gitleaks: approximately 26.92 KB / no leak; and
- `git diff --check`: PASS.

Release doctor reported `HEALTHY`. Its sole non-blocking failed check was the
expected dirty worktree before the candidate commit; all 42 substantive checks
passed. After commit, the clean-tree rerun passed **43/43** with no failure or
skip.

## No-write browser acceptance

Playwright drove the optimized local build at desktop `1440 × 1000` and mobile
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

## Pending exact-head evidence

After commit and push, seal the Draft PR's immutable head, CI release gate,
Vercel Preview deployment identity, protected no-write hosted browser pass,
Preview runtime logs, and clean-tree release doctor. The candidate remains
stacked after PR #227 and cannot bypass PR #209 or the ordered release train.
