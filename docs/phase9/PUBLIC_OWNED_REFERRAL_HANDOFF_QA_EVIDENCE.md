# Phase 9 public owned-referral handoff QA evidence

Refreshed: 2026-08-29 13:44 EDT

Branch: `codex/phase9-owned-referral-handoff-20260828`

Parent: exact sealed Draft PR #227 head
`ee1dd462665e423c17a69b6ab7d1c3a7a70a1409`

Former PR #228 head: `b1bd4b2012c037f4a71806b449541cdcfdd758b6`,
preserved at
`rescue/amm-pr228-pre-pr227-parent-refresh-20260829-133619`

Restack method: normal merge commit
`38a22f5627f2b8f7293d9f65bf3a4f27b7475044`; no rebase or force-push

Earlier source rescue:
`rescue/amm-pr228-pre-pr227-exact-seal-20260829-0636`

Final exact candidate head: recorded in the Draft PR body and immutable seal
comment after branch-bound CI and Preview verification. This file is itself
part of that candidate, so it does not embed a self-referential commit hash.

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

Result after exact-parent capability hardening: **3 files / 37 tests passed**.
Coverage includes the fixed packet, closed surface registry,
active-homepage substitution, native handoff only after a positive
`canShare` probe, missing/negative/inconsistent capability fallback,
cancelled/blocked chooser, Clipboard fallback, denied-Clipboard manual
selection, registered attribution, and PII-property rejection.

Current exact-parent local proof also passes:

- Ask Magic Mike / NellySelly deployable-source isolation;
- release safety: **14/14**;
- strict TypeScript;
- targeted ESLint for every changed runtime and test file;
- Production dependency audit with no known vulnerability; and
- `git diff --check`.

The prior code-bearing head passed the complete local gate at **266 files /
3,338 tests**, full lint, optimized Next.js 15.5.21 build with 59 static pages,
95 active routes / 17 acknowledged duplicates, clean-tree release doctor
43/43, and redacted full/delta Gitleaks scans. Those results are retained as
historical regression evidence only; the final pushed head requires fresh
branch-bound Release Gate, immutable Preview, protected no-write browser QA,
runtime-log inspection, and exact-head secret scans before seal.

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

## Historical pre-parent-refresh immutable evidence

GitHub Release Gate run
[`33248609881`](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33248609881)
completed successfully against exact code-bearing head
`0442abc1cf0d9a14c5ffd21d1673561aff575db5`. Artifact
`9713663618` has digest
`sha256:b88ccee766d35cdbdedae2b705a72ac5ae7b9477ef801044c7e55972db59410c`.

The immutable Vercel Preview was:

- deployment: `dpl_AwzuekRKTR4UkM41YohrZAzS8xFX`;
- URL:
  `https://ask-magic-mike-covvyfir2-eyes-up-industries.vercel.app`;
- target/status: `preview` / `READY`; and
- build commit: `0442abc1cf0d9a14c5ffd21d1673561aff575db5`.

Protected no-write acceptance run
[`33248758409`](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33248758409)
checked out that exact target commit while the bootstrap workflow remained on
`main`. Artifact `9713722051` has digest
`sha256:1ef8fea1569f6f42f7166d4c45d2a7cf4d1677784c09de8a9bd166769bde5893`.
Results:

- Preview QA: **18 pass / 6 safe write skips / 0 fail**;
- browser E2E: **4 expected / 0 unexpected / 0 flaky / 0 skipped**;
- release doctor: **43/43 pass**;
- release candidate: **GO**, no blocker; and
- launch authority: **PREVIEW_READY**.

The mutation gate stayed blocked because `SAFE_DB_WRITE` was false. Preview
health reported `database_env=preview`, `safe_for_preview_mutation=false`,
`live_sms_disabled=true`, and `live_email_disabled=true`. No lead,
notification, email, SMS, Push, appointment, publication, or database write
was authorized by this run.

Filtered runtime-log queries against the exact deployment returned **0 error**
and **0 warning** records. Two information-level 503 responses were expected
fail-closed Preview behavior:

- authenticated `GET /api/admin/sla/sweep` safely refused a Preview data
  write; and
- `POST /api/events` safely refused Preview event persistence while
  `safe_for_preview_mutation=false`.

Fresh in-app Browser inspection used the immutable Preview at desktop
`1440 x 1000` and mobile `390 x 844`. The reference and candidate captures
were reviewed together. The compatibility hardening changed no DOM, styling,
or asset source, and the comparison found no regression in image crop,
typography, spacing, borders, button hierarchy, URL field, status region,
responsive stacking, or horizontal overflow. The exact Preview's browser log
buffer was empty. No real native share chooser, Clipboard write, analytics
write, recipient, or external send was invoked during this refreshed visual
pass; behavior-level native/Clipboard cases remain covered by the automated
tests and mutation-free hosted browser suite above.

The documentation-only seal commit created by this refresh necessarily changes
the Draft PR head without changing runtime code. Its final CI and Preview
identities are recorded in the PR body and seal comment after rerunning the
same gates, avoiding a recursive sequence of evidence-only commits.

Production stays on `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`.
PR #209's consumed historical approval cannot authorize this Draft.
