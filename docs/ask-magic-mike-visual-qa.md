# Ask Magic Mike — Visual QA

Post-rebuild QA checklist. Use this against the Vercel preview URL, then
re-run after each visual change before promoting to production.

## Local URLs

```
http://localhost:3000/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike
http://localhost:3000/value?utm_source=ourtown_wp&utm_medium=mike_profile&utm_campaign=ask_magic_mike
http://localhost:3000/value?utm_source=ourtown_wp&utm_medium=seller_page_cta&utm_campaign=ask_magic_mike
http://localhost:3000/ask?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike
http://localhost:3000/embed/ask?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike
```

Boot dev server:

```
./node_modules/.bin/next dev
```

## /value checklist

Desktop (≥ 1024px):

- [ ] Two-column hero: copy + address form on the left, `MikeTrustCard` on the right.
- [ ] Eyebrow reads `ASK MAGIC MIKE BY OUR TOWN PROPERTIES` (gold).
- [ ] H1 reads `Start with your address.` / `Get a local read on your home.` with the second line in `text-gold-shimmer`.
- [ ] Primary CTA reads `Start With Your Address`.
- [ ] Micro line under the input: `AI-assisted intake. Local human follow-up.`
- [ ] AI-assist pill chip directly under the form.
- [ ] `MikeTrustCard` shows: real Mike Eatmon headshot (portrait crop), eyebrow + `Verified` badge, `Mike Eatmon`, `Our Town Properties, Inc.`, `Selling real estate since 1993`, `Licensed in North Carolina`, `Wilson, NC · Eastern North Carolina`, click-to-call phone, and the AI-assist card.
- [ ] `ProofStrip` shows the four proof cards.
- [ ] `Choose your path` heading + three `OptionCard`s: `Compare selling options`, `Request direct-purchase review` (with the "New" gold ribbon), `Ask Mike a question`.
- [ ] Each option card hovers with a subtle lift + gold border.
- [ ] `What happens next` block shows three numbered steps.
- [ ] Final trust block: headline `A licensed broker on the other end.` + `Call Mike directly` secondary button.
- [ ] `ComplianceFooter` visible above the footer fade.

Mobile (≤ 480px):

- [ ] Address input + gold submit stack vertically.
- [ ] Trust card collapses below the copy.
- [ ] All three OptionCards stack vertically.
- [ ] No horizontal scroll.
- [ ] Phone CTA in nav reads "Call Mike" below `xs`.

Attribution:

- [ ] DevTools → Application → Session Storage → `amm_attribution` contains `utmSource = "ourtown_wp"` and the right `utmMedium`.
- [ ] Click `Start With Your Address` → `/ask?…` URL contains the same UTMs.
- [ ] Click any option card → `/ask?…` URL contains UTMs.

Console:

- [ ] No red errors.
- [ ] No hydration warnings.

## /ask intake checklist

- [ ] Header: `BrandHeader compact` with the Our Town logo + tap-to-call.
- [ ] Compact `MikeTrustCard` sits above the step card (headshot, "Mike Eatmon · Our Town Properties", "Licensed in NC · Selling real estate since 1993").
- [ ] Progress bar + step label render in gold uppercase.
- [ ] Step card has the gold-bordered, dark navy surface treatment.
- [ ] `Back` button only shows on steps 2–4 (with chevron + word).
- [ ] Step 1 form labels read `Your question`, `Property address (optional)` in uppercase tracked gold.
- [ ] Step 4 still shows the full TCPA paragraph.
- [ ] AI-assist inline pill sits under the step card.
- [ ] Submit hits `/api/intake/submit` with `utmSource/Medium/Campaign`, `sourceUrl`, `landingPath`, `referrerUrl`, `sessionId` (verify in Network → request payload).

## Confirmation checklist

- [ ] Eyebrow chip `Your request is in` with gold check.
- [ ] H2 `Thanks, {firstName}.` (or `Thanks for reaching out.` when no name).
- [ ] Assignment card shows the WebP headshot + `Your local contact` eyebrow + `Mike Eatmon` + `Our Town Properties · Wilson, NC` + response time line.
- [ ] Primary CTA `Call Mike` (gold, full-width on mobile).
- [ ] Secondary `Visit Our Town Properties` link with external icon.
- [ ] `ComplianceFooter` visible at bottom.
- [ ] No `appraisal` except `not an appraisal`.
- [ ] No `guaranteed`, `binding`, or `instant cash offer` anywhere.

## /embed/ask checklist

- [ ] Renders inside a WordPress iframe without horizontal scroll.
- [ ] `BrandHeader compact` shows the logo + Ask Magic Mike lockup + tap-to-call.
- [ ] Compact `MikeTrustCard` is present above the step card on steps 1–4.
- [ ] Same intake step components — same copy and behaviour.
- [ ] AI-assist inline pill at the bottom on steps 1–4.

## Compliance & forbidden language

Automated check (always green if codebase is healthy):

```
./node_modules/.bin/vitest run tests/compliance
```

Manual spot check:

```
grep -nEi "(\bappraisal\b|guaranteed|binding offer|instant cash offer|rub the lamp)" \
  src/components/campaign/value-hero.tsx \
  src/components/intake/step-confirmation.tsx \
  src/components/amm/*.tsx \
| grep -vi "not an appraisal"
```

Expected: no output.

## Full local verification commands

```
./node_modules/.bin/vitest run         # 126 tests passing
./node_modules/.bin/tsc --noEmit       # clean
./node_modules/.bin/next lint          # clean
./node_modules/.bin/next build         # /value 4.96 kB / 124 kB first load
```

Bundle status:

- `/value` 4.96 kB (124 kB first-load JS)
- `/ask`   2.10 kB (131 kB)
- `/embed/ask` 1.50 kB (130 kB)

## Headless screenshot QA

A scripted Playwright smoke test lives at `scripts/qa/visual-smoke.mjs`. It
captures `/value`, `/ask` step 1, and `/embed/ask` at desktop + mobile sizes
into `artifacts/ask-magic-mike-visual-upgrade/` and asserts:

- HTTP 200 for each page
- no horizontal overflow at the chosen viewport
- all required strings present
- zero forbidden phrases
- zero bare "appraisal" outside the allowed negation
- zero console errors

Run after booting `next dev`:

```
./node_modules/.bin/next dev -p 4101 &
BASE_URL=http://localhost:4101 node scripts/qa/visual-smoke.mjs
```

Saved screenshots:

- `value-desktop-1440x1000.png`
- `value-mobile-390x844.png`
- `ask-first-step-desktop-1440x1000.png`
- `ask-first-step-mobile-390x844.png`
- `embed-ask-desktop-1024x900.png`
- `embed-ask-mobile-390x844.png`
- `smoke-report.json`

## Preview deploy

```
./node_modules/.bin/vercel deploy --scope eyes-up-industries
```

Production promotion is a separate, explicit step — see
`docs/ask-magic-mike-funnel-qa.md`.

DNS stays unchanged. `askmagicmike.com` migration is **not** part of this
phase. WordPress edits are tracked separately in
`docs/ask-magic-mike-wordpress-visual-brief.md`.
