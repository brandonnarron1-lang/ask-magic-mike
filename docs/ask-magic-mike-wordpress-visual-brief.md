# WordPress Visual & Copy Brief — Ask Magic Mike CTA Blocks

This brief covers the **manual WordPress edits** needed after the funnel
visual upgrade ships. Do not edit themes or plugins. All edits are in
Beaver Builder.

## v2 update notes (post brand-kit-v2 + canonical platform)

- Funnel landing host is `ask-magic-mike.vercel.app` until the
  `askmagicmike.com` domain migration runs (see
  `docs/askmagicmike-domain-migration.md`). After migration, replace
  the host in every CTA URL but **keep the UTM params unchanged**.
- The canonical `POST /api/leads` endpoint is now live. Future
  Beaver Builder Gravity-Forms-style inline forms can submit directly
  to it instead of routing through `/value`.
- CTA variants below are aligned with Brand Kit v2 + the
  trust-first copy floor.

## CTA variants (use any matching pair)

| Variant | Headline | Sub | CTA label | Target |
| --- | --- | --- | --- | --- |
| Ask Magic Mike | Start with your address. Get a local read on your home. | Mike Eatmon's Our Town Properties team will follow up. | Ask Magic Mike | `/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike` |
| Home value | What could your Wilson-area home sell for? | Get a preliminary home value range — not an appraisal. | Find out what your home could sell for | `/value?utm_source=ourtown_wp&utm_medium=home_value_cta&utm_campaign=ask_magic_mike` |
| Seller fast | Need to sell quickly? | Compare a preliminary direct-purchase review and a listing scenario. | See my selling options | `/value?utm_source=ourtown_wp&utm_medium=seller_page_cta&utm_campaign=ask_magic_mike` |
| Listing inquiry | Question about a listing? | Get details, schedule a showing, or see similar homes. | Ask about this listing | `/value?utm_source=ourtown_wp&utm_medium=listing_cta&utm_campaign=ask_magic_mike` |
| Talk to Mike | Want a real conversation? | Mike Eatmon, Our Town Properties · Licensed in NC. | Talk to Mike | `/value?utm_source=ourtown_wp&utm_medium=talk_to_mike&utm_campaign=ask_magic_mike` |

## Scope

Three CTA blocks already routing to `/value` with UTMs:

| Location | utm_medium | Status |
| --- | --- | --- |
| Homepage hero CTA | `homepage_cta` | Live |
| Mike Eatmon profile page CTA | `mike_profile` | Live |
| We Buy Homes / Seller page CTA | `seller_page_cta` | Live |

There is also one remaining compliance fix on the We Buy Homes page (see §3).

## 1. Visual updates to all three CTA blocks

Match the new app aesthetic. Beaver Builder settings (rough mapping):

- Background: solid `#05070A` (or a near-black image overlay)
- Headline color: `#F7F1E8` (warm off-white)
- Body color: `slate-300` equivalent (`#94A3B8`)
- Accent / button color: `#D4A017` (gold)
- Button text color: `#0A0A0A`
- Button radius: 10 px
- Button hover: lighter gold (`#F5C842`)
- Card max-width: 720 px
- Spacing: 24 px vertical padding on mobile, 48 px on desktop

Each CTA block should contain, in order:

1. **Eyebrow** — `ASK MAGIC MIKE BY OUR TOWN PROPERTIES` (uppercase, gold, letter-spacing 0.18em)
2. **Headline** — see per-page copy in §2
3. **Subhead** — see per-page copy in §2
4. **Primary button** — `Start With Your Address` linking to the page's UTM URL
5. **Microcopy** — `AI-assisted intake. Local human follow-up.`
6. **Disclosure line** — see §4

## 2. Copy snippets

### A. Homepage CTA block

```
Eyebrow:    ASK MAGIC MIKE BY OUR TOWN PROPERTIES
Headline:   Start with your address. Get a local read on your home.
Subhead:    Mike Eatmon's Our Town Properties team follows up with local
            guidance. AI-assisted intake. Local human follow-up.
Button:     Start With Your Address
Button URL: https://ask-magic-mike.vercel.app/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike
```

### B. Mike profile page CTA block

```
Eyebrow:    ASK MAGIC MIKE BY OUR TOWN PROPERTIES
Headline:   See a local read on your home from Mike.
Subhead:    Selling real estate in Wilson and Eastern NC since 1993.
            Share your address and Mike's team will follow up with local
            guidance.
Button:     Start With Your Address
Button URL: https://ask-magic-mike.vercel.app/value?utm_source=ourtown_wp&utm_medium=mike_profile&utm_campaign=ask_magic_mike
```

### C. We Buy Homes / Seller page CTA block

```
Eyebrow:    ASK MAGIC MIKE BY OUR TOWN PROPERTIES
Headline:   Compare your selling options — including a preliminary
            direct-purchase review.
Subhead:    Share your address and timeline. Our Town Properties will review
            and follow up with local guidance. Preliminary only — not an
            appraisal.
Button:     Request Direct-Purchase Review
Button URL: https://ask-magic-mike.vercel.app/value?utm_source=ourtown_wp&utm_medium=seller_page_cta&utm_campaign=ask_magic_mike
```

## 3. Remaining We Buy Homes page copy fix

The We Buy Homes page currently contains:

> Super competitive offers on all homes

Replace with:

> Competitive options for qualified homes

Also scan the page for any of the following and remove:

- "guaranteed offer"
- "instant cash offer"
- "binding offer"
- "guaranteed value"
- "no obligation cash offer"
- "we buy any home, any condition" (drop "any home, any condition")

Replace with safe language from the allowed list:

- "preliminary direct-purchase review"
- "subject to review"
- "preliminary home value range"
- "local guidance"
- "Mike Eatmon or the Our Town Properties team will follow up"

## 4. Required disclosure (every CTA block)

Add this small disclosure under each CTA block (slate-500, 11 px):

> Ask Magic Mike by Our Town Properties, Inc. provides local guidance and a
> preliminary home value range. This is not an appraisal and does not create
> an agency relationship unless a written brokerage agreement is signed.

## 5. What NOT to change in WordPress

- Theme files
- Plugin code
- IDX/MLS surfaces
- Listing detail pages
- DNS or domain settings
- Existing UTM parameters on the three CTA URLs — Atlas verified those and
  attribution depends on them

## 6. Edit / publish workflow

1. Edit one CTA block at a time in Beaver Builder.
2. Save → Publish.
3. Clear caches.
4. Open the public page in an incognito browser.
5. Click the CTA → confirm the destination URL still includes the right
   `utm_source` / `utm_medium` / `utm_campaign`.
6. Confirm the destination page loads and shows the new "Start with your
   address. Get a local read on your home." headline.
