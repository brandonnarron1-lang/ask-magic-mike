# Ask Magic Mike — Visual QA

This is the post-redesign QA pass. Use it after pulling `main` to verify the
`/value` and `/ask` surfaces still hit the brand bar and the funnel is intact.

## Local URLs

```
http://localhost:3000/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike
http://localhost:3000/value?utm_source=ourtown_wp&utm_medium=mike_profile&utm_campaign=ask_magic_mike
http://localhost:3000/value?utm_source=ourtown_wp&utm_medium=seller_page_cta&utm_campaign=ask_magic_mike
```

Boot dev server:

```
./node_modules/.bin/next dev
```

## /value checklist

Desktop (≥ 1024px):

- [ ] Two-column layout: copy + form left, lamp visual right.
- [ ] Lamp glyph renders with gold body + cyan flame halo.
- [ ] Headline reads "Rub the lamp." across multiple lines.
- [ ] Primary CTA reads "Start With Your Address".
- [ ] Trust bullets row shows: Local guidance · Preliminary home value range
      · Mike follows up.
- [ ] Secondary chips: "Thinking of selling", "Just curious", "Need local
      guidance" (last one ruby tint).
- [ ] Compliance disclosure paragraph visible under the trust line (small
      slate text, never as a modal).
- [ ] Phone link in the nav strip renders the masked phone number.

Mobile (≤ 480px):

- [ ] Address input and gold submit button stack vertically.
- [ ] Submit button is full-width and tappable above the iOS keyboard.
- [ ] Lamp visual is hidden (single column layout).
- [ ] Trust bullets stack into a single column.
- [ ] No horizontal scroll.

Attribution:

- [ ] DevTools → Application → Session Storage → `amm_attribution` contains
      `utmSource = "ourtown_wp"` plus the right `utmMedium`.
- [ ] Click "Start With Your Address" → `/ask?…` URL contains the same
      `utm_source` / `utm_medium` / `utm_campaign`.
- [ ] Click any quick chip → `/ask?…` URL also contains UTMs.

Console:

- [ ] No red errors.
- [ ] No hydration warnings.

## /ask intake checklist

- [ ] Page header shows the AMM lockup (small) + "Step N of 5" + active step
      label in gold uppercase.
- [ ] Progress bar present and animates between steps.
- [ ] Each step renders inside a gold-bordered card with the new card glow.
- [ ] Step transitions still use the slide-up animation.
- [ ] Back button only appears on steps 2–4.
- [ ] Consent step still shows the full TCPA paragraph.
- [ ] Submit hits `/api/intake/submit` with `utmSource/Medium/Campaign`,
      `sourceUrl`, `landingPath`, `referrerUrl`, `sessionId` (verify in
      Network → request payload).

## Confirmation checklist

- [ ] Eyebrow "Your request is in" above the headline.
- [ ] Gold CheckCircle with cyan halo above the headline.
- [ ] Assignment card shows lamp glyph + "Assigned to Mike Eatmon".
- [ ] Primary CTA reads "Call Mike now" and points at the env phone number.
- [ ] Secondary link: "Visit ourtownproperties.com".
- [ ] ComplianceFooter visible at bottom of card.
- [ ] No "appraisal" except in "not an appraisal".
- [ ] No "guaranteed", "binding", or "instant cash offer" anywhere.

## Compliance & forbidden language

Run automated check (always green if the codebase is healthy):

```
./node_modules/.bin/vitest run tests/compliance
```

Manual spot check:

```
grep -nEi "(\bappraisal\b|guaranteed|binding offer|instant cash offer)" \
  src/components/campaign/value-hero.tsx \
  src/components/intake/step-confirmation.tsx \
  src/components/amm/compliance-footer.tsx \
| grep -vi "not an appraisal"
```

Expected: no output.

## Full local verification commands

```
./node_modules/.bin/vitest run         # 110 tests passing
./node_modules/.bin/tsc --noEmit       # clean
./node_modules/.bin/next lint          # clean
./node_modules/.bin/next build         # /value 6.36 kB / 115 kB first load
```

## Preview deploy

```
./node_modules/.bin/vercel deploy
```

After preview confirms in a real browser:

```
./node_modules/.bin/vercel --prod
```

DNS stays unchanged.
askmagicmike.com migration is **not** part of this phase.
WordPress source URLs are **not** part of this phase.
