# Paid Traffic — Launch Copy Pack (Ask Magic Mike)

Compliant Meta / Google / video copy for the next paid push. Every
asset must clear the **approval checklist** at the bottom before any
budget runs.

## UTM convention

Every paid placement appends:

```
utm_source=<facebook|google|tiktok|youtube|email|sms>
utm_medium=<paid_social|paid_search|paid_video|email|sms>
utm_campaign=<campaign_slug>
utm_content=<creative_slug>
utm_term=<keyword|audience_slug>
```

Campaign slug template:

```
<lead_type>_<area>_<year>_<quarter>_<variant>
```

Example: `seller_options_wilson_2026_q3_a`.

## Campaign 1 — Ask Magic Mike (general / local expert)

Lead type: `general_question` → routed by intent picker.

**Primary text (Meta feed):**

> Wilson-area homeowners: ask Mike Eatmon's team about your home value,
> selling options, or a Wilson listing. Local guidance from Our Town
> Properties — preliminary home value range, not an appraisal.

**Headline:** `Ask Magic Mike`
**Description:** `Local, licensed, real follow-up.`
**CTA:** `Learn more`

UTMs:
`utm_source=facebook&utm_medium=paid_social&utm_campaign=amm_general_wilson_2026_q3_a&utm_content=feed_static_a`

## Campaign 2 — Home value

Lead type: `home_value`.

**Primary text:**

> What could your Wilson-area home sell for in today's market? Get a
> preliminary home value range from Mike Eatmon's Our Town Properties
> team. Not an appraisal. Local guidance only.

**Headline:** `Find out what your home could sell for`
**Description:** `Local read, no obligation.`
**CTA:** `Get my home value range`

UTMs:
`utm_source=facebook&utm_medium=paid_social&utm_campaign=home_value_wilson_2026_q3_a&utm_content=feed_video_a`

## Campaign 3 — Seller options / compare

Lead type: `seller_cash_offer` for the chip; the funnel routes to
`compare_both_consult` when the seller asks to compare.

**Primary text:**

> Need to sell a Wilson-area home? Compare a preliminary direct-purchase
> review side by side with a listing scenario. Subject to review — not
> an instant offer. Mike Eatmon, Our Town Properties.

**Headline:** `Compare your selling options`
**Description:** `Cash review vs listing — no commitment.`
**CTA:** `Request a property review`

UTMs:
`utm_source=facebook&utm_medium=paid_social&utm_campaign=seller_options_wilson_2026_q3_a&utm_content=feed_carousel_a`

## Campaign 4 — Listing inquiry

Lead type: `listing_inquiry`. Used to retarget viewers of specific
listing pages.

**Primary text:**

> Question about this Wilson-area home? Get details, schedule a
> showing, or see similar listings. Mike Eatmon's Our Town Properties
> team replies the same day.

**Headline:** `Ask about this listing`
**Description:** `Same-day reply from a local team.`
**CTA:** `Send your question`

UTMs:
`utm_source=facebook&utm_medium=paid_social&utm_campaign=listing_inquiry_wilson_2026_q3_a&utm_content=feed_dpa_a`

## Campaign 5 — Buyer match

Lead type: `buyer`. Used for retargeting buyers who interacted with
multiple listings.

**Primary text:**

> Tired of scrolling listings that don't fit? Tell Mike Eatmon's team
> your area, budget, and timeline. We'll match you with homes that
> actually fit. Local, licensed, no spam.

**Headline:** `Find homes that fit`
**Description:** `Local match, not an algorithm.`
**CTA:** `See my matches`

UTMs:
`utm_source=facebook&utm_medium=paid_social&utm_campaign=buyer_match_wilson_2026_q3_a&utm_content=feed_static_a`

## Short video script (15s, vertical, no captions baked)

```
[0:00] Wide of a Wilson home. Voiceover: "Thinking about selling
       in Wilson?"
[0:03] Mike on camera. "I'm Mike Eatmon at Our Town Properties. Local,
       licensed since 1993."
[0:08] Cut to phone screen showing /value. "Ask Magic Mike."
[0:11] Mike. "Preliminary home value range — not an appraisal."
[0:13] CTA card. "Start with your address."
```

Captions live as overlaid text rendered by the social platform, not
baked into the video file.

## Reel script (30s)

```
[0:00] Mike entrance. "Selling a home in Wilson? Three quick rules."
[0:04] Rule 1: "It's a range, not a guess."
[0:09] Rule 2: "Direct-purchase review is a review, not a binding offer."
[0:14] Rule 3: "Local follow-up. From a real person. Not a chatbot."
[0:20] CTA. "Ask Magic Mike. Our Town Properties."
[0:25] Logo + URL.
```

## Landing-page CTA copy (already shipped on `/value`)

- Headline: `Start with your address. Get a local read on your home.`
- Sub: `Mike Eatmon's Our Town Properties team will follow up. AI-assisted intake, local human follow-up.`
- Primary CTA: `Start With Your Address`
- Secondary chips: `Compare selling options`, `Request direct-purchase review`, `Ask Mike a question`.

## Approval checklist (every asset, every time)

- [ ] No `guaranteed value`, `guaranteed offer`, `binding offer`,
      `instant cash offer`, `cash offer` framing on public UI.
- [ ] No protected-class targeting or signaling. Describe property +
      service area, never "ideal people".
- [ ] No fake scarcity / urgency.
- [ ] No fake reviews, fake stats, fake awards.
- [ ] Includes `Mike Eatmon`, `Our Town Properties, Inc.`, and
      `Licensed in NC` somewhere in the asset.
- [ ] `appraisal` only appears inside `not an appraisal`.
- [ ] Direct-purchase framing always paired with
      `subject to review, not an instant offer`.
- [ ] Service area is `Wilson, NC and nearby areas`.
- [ ] UTM follows the convention above.
- [ ] Two-person review before publish.

## Forbidden phrase list

- `Rub the lamp`
- `lamp` / `genie` (anywhere customer-facing)
- `guaranteed value`
- `guaranteed offer`
- `binding offer`
- `instant cash offer`
- `cash offer` (customer-facing)
- `we buy any house no matter what`
- `MLS comps`
- `appraisal` (except inside `not an appraisal`)

These are also enforced by `tests/compliance/value-copy.test.ts` for the
funnel surfaces. Paid creative is a human responsibility.
