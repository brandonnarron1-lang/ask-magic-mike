# Ask Magic Mike — Asset Manifest

Records the brand assets that ship with the public `/value` and `/ask`
surfaces, where they came from, and what is explicitly NOT being used.

Current source: **brand pack v2** (see
`docs/ask-magic-mike-brand-pack-v2-integration.md`). All registry entries
live in `src/components/amm/brand-pack-assets.ts`.

## Brand pack v2 (current primary)

| Public path | Size / dims | Use |
| --- | --- | --- |
| `brand-pack-v2/mike-headshot-source.webp` | 1024×1024 · **33 KB** | `MikeTrustCard` headshot, OG/Twitter image |
| `brand-pack-v2/mike-headshot-source.jpg` | 1024×1024 · 132 KB | JPG fallback |
| `brand-pack-v2/mike-avatar-circle-64.png` | 64×64 · 6.6 KB | Future micro avatar |
| `brand-pack-v2/mike-avatar-circle-128.webp` / `.png` | 128×128 · 4.9 / 21 KB | Compact `MikeTrustCard`, widget launcher |
| `brand-pack-v2/mike-avatar-circle-256.webp` / `.png` | 256×256 · 12 / 69 KB | Confirmation assignment card, larger widget states |
| `brand-pack-v2/our-town-logo-clean.webp` / `.png` | 343×180 · 9.4 / 41 KB | `BrandHeader` |
| `brand-pack-v2/our-town-logo-web.jpg` | 343×180 · 14 KB | Web preview fallback |
| `brand-pack-v2/accent-gold-arrow.svg` | — · 604 B | Inline CTA accent |
| `brand-pack-v2/accent-ruby.svg` | — · 437 B | Ruby accent |
| `brand-pack-v2/accent-smoke-glow.svg` | — · 564 B | Atmosphere accent |
| `brand-pack-v2/accent-sparkle.svg` | — · 383 B | Sparkle accent |
| `brand-pack-v2/chat-widget-concept.webp` | 390×430 · 22 KB | **Reference only** — design comp |
| `brand-pack-v2/answer-smoke-sequence.webp` | 390×105 · 9.6 KB | **Reference only** — `MagicMikeAnswerReveal` is CSS-only |
| `brand-pack-v2/social-home-value-feed.jpg` | 1080×1350 · 187 KB | **Reference only** — social/ad template |
| `brand-pack-v2/social-cash-offer-feed.jpg` | 1080×1350 · 174 KB | **Reference only** — copy must be replaced before paid use |
| `brand-pack-v2/social-chat-story.jpg` | 1080×1920 · 246 KB | **Reference only** — social/ad template |
| `brand-pack-v2/social-seller-story.jpg` | 1080×1920 · 243 KB | **Reference only** — social/ad template |

## Brand pack v1 (legacy, kept for parity)

| Path (public-facing) | Size / dims | Use | Source | Notes |
| --- | --- | --- | --- | --- |
| `public/images/ask-magic-mike/mike-eatmon-headshot.webp` | 515×720 · **35 KB** | (no longer used in `/value` after v2 swap) | derived from `mike-eatmon-headshot.png` via `cwebp -q 82 -m 6` | Kept for backwards-compat / external tools. |
| `public/images/ask-magic-mike/mike-eatmon-headshot.png` | 515×720 · 435 KB | (no longer used in `/value` after v2 swap) | `~/Documents/4729 Country Club /promo_assets_pack/mike_cutout.png` (1024×1430 · 1.3 MB) | Real, on-brand headshot of Mike Eatmon. Resized to 720px tall. |
| `public/images/ask-magic-mike/our-town-properties-logo.webp` | 343×180 · **9.4 KB** | (no longer used in `/value` after v2 swap) | derived from the PNG via `cwebp -q 90 -m 6` | 4× smaller than PNG. |
| `public/images/ask-magic-mike/our-town-properties-logo.png` | 343×180 · 41 KB | (no longer used in `/value` after v2 swap) | `~/Documents/4729 Country Club /promo_assets_pack/ourtown_logo_black.png` | Official Our Town Properties, Inc. wordmark on black background. |

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
