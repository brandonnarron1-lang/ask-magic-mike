# Ask Magic Mike — Asset Manifest

Records the brand assets that ship with the public `/value` and `/ask`
surfaces, where they came from, and what is explicitly NOT being used.

## In repo, safe for public UI

| Path (public-facing) | Size / dims | Use | Source | Notes |
| --- | --- | --- | --- | --- |
| `public/images/ask-magic-mike/mike-eatmon-headshot.png` | 515×720 · 435 KB | Mike trust card headshot | `~/Documents/4729 Country Club /promo_assets_pack/mike_cutout.png` (1024×1430 · 1.3 MB) | Real, on-brand headshot of Mike Eatmon. Resized to 720px tall; Next.js Image further optimizes per device. |
| `public/images/ask-magic-mike/our-town-properties-logo.png` | 343×180 · 41 KB | Brand header logo | `~/Documents/4729 Country Club /promo_assets_pack/ourtown_logo_black.png` | Official Our Town Properties, Inc. wordmark on black background — blends cleanly with `#05070A` page background. |

## Already in repo (pre-existing, untouched this pass)

| Path | Use |
| --- | --- |
| `public/images/our-town-sign.jpg` | Optional background accent (landing page only — not used in new /value hero) |
| `public/images/mike-sold-sign.png` | Used in existing landing components (out of scope for this rebuild) |
| `public/images/sold-rider.png` | Same |
| `src/app/icon.svg` | App favicon |

## Considered, rejected for this pass

These appeared in nearby filesystem locations during inventory but are **not**
used in `/value` or `/ask`:

- `~/Documents/4729 Country Club /promo_assets_pack/mike_cutout_shadow.png` —
  cosmetically similar to the headshot we picked; the shadow-less version
  composites more cleanly on our gradient backgrounds.
- `~/Documents/4729 Country Club /promo_assets_pack/ourtown_logo_transparent.png`
  — visually equivalent but had a residual black artifact bar at the bottom;
  preferred the black-background variant.
- `~/Documents/4729 Country Club /promo_assets_pack/stamp_mike_did_it_again.png`,
  `lower_third_call_mike.png`, `badge_*.png`, `stats_card.png` — listing-marketing
  ephemera, not appropriate for a campaign landing surface.
- Magic-mike workflow frames under `~/Documents/Playground/ask_magic_mike_workflow/`
  — AI-generated frames intended for social/video, not as primary trust
  imagery. Will be revisited for ad templates in a follow-up phase.

## Not present in the inventory (named in the brief but not found)

The brief listed several candidate filenames that did not match anything on
disk during this run:

- `IMG_0901.jpeg`, `IMG_1520.jpeg`
- `78F7496E-C0AE-4D6E-8A63-9C7E4E6CA85B.png`
- `magic_mike_poof_FINAL_2048x3072.jpeg`
- `magic_mike_genie_master_lamp_rubies_1080x1920_black.jpeg`
- `magic_mike_genie_master_lamp_rubies.jpeg`
- `magic_mike_lamp_startframe_1080x1920.jpeg`

This is not blocking: the real Mike Eatmon headshot and the official Our Town
logo were both located via the `4729 Country Club` promo asset pack and are
sufficient for the professional trust-first rebuild.

## Strictly NOT used in the public UI

- Any MLS / flexmls listing photos.
- Any MLS comp screenshots or data tables.
- Any seller, buyer, or other agent names tied to MLS sources.
- Any AI-stylized Mike (genie, lamp emergence, etc.) as primary trust imagery.
  These remain reserved for social and video creative only.

## Performance & delivery

- All public images are served via `next/image` with explicit `width` /
  `height` so layout is stable (no CLS) and lazy-loaded for non-critical
  positions.
- The headshot is the largest above-the-fold image. At 515×720 / 435 KB
  source, Next.js + Vercel image optimization will deliver a much smaller
  AVIF/WebP per device.
- The Our Town logo is 41 KB and renders at ≤ 160 px wide; effectively free.

## Human confirmation requested

- [ ] Confirm Mike's headshot in `mike-eatmon-headshot.png` is the version
      Mike + Our Town want representing the campaign landing surface.
- [ ] Confirm Our Town Properties is fine with the black-background logo
      variant on a near-black hero background.

If either is "no," swap the source file under
`public/images/ask-magic-mike/` and no code needs to change.
