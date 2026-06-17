# Brand Source Notes — Ask Magic Mike

Provenance and usage rules for brand assets currently in this repo. Keep this file updated when new assets are added or rejected.

---

## Our Town Properties logo

**Registry key:** `brandPackAssets.logo.primary`  
**Path:** `/images/ask-magic-mike/brand-pack-v2/ourtown-logo-white.png`  
**Source:** Official Our Town Properties corporate branding, supplied via brand-pack v2 ZIP  
**SHA-256 in evidence report:** see `docs/ask-magic-mike-brand-kit-v2-evidence-report.md`

**Allowed uses:**
- Landing page nav (`hero-section.tsx`) — links to `ourtownproperties.com`
- Brand header component (`brand-header.tsx`)
- Value page brand header

**Not allowed:**
- Do not modify the logo (no color overlays, no cropping, no recoloring)
- Do not use as a favicon or app icon (use `public/icon.svg` instead)
- Do not substitute a self-drawn SVG in public-facing surfaces (the inline SVG `OurTownIcon` was replaced by this asset in PR `brand/ourtown-domain-integration-20260617`)

---

## Mike Eatmon — platform-ready crops

**Registry:** `src/lib/mikePlatformAssets.ts`  
**Public path base:** `/images/mike/platform-crops/`  
**Source:** Cropped from master photography supplied by Our Town Properties; no third-party listing photography, no MLS source, no face regeneration  
**Provenance doc:** `docs/ask-magic-mike-asset-manifest.md`

| Key | File | Use |
|-----|------|-----|
| `websiteHeroPlate` | `01_website_hero_plate_2400x1350.jpg` | Fallback desktop hero plate (not primary UI — use `MikeHeroPortrait` instead) |
| `openGraphCard` | `/ask-magic-mike-og.png` | Open Graph / Twitter `summary_large_image` |
| `feedAd` | `03_facebook_instagram_feed_ad_1080x1350.jpg` | Campaign export — paid social feed creative |
| `storyAd` | `04_instagram_story_ad_1080x1920.jpg` | Campaign export — paid social story creative |
| `mobileHero` | `05_mobile_hero_crop_1080x1920.jpg` | Mobile hero fallback (not primary UI) |
| `circularAvatar` | `06_circular_avatar_crop_1024x1024.jpg` | Avatar / profile crop — widget header, circular badge |

**Compliance rules (enforced by `tests/compliance/value-copy.test.ts`):**
- Never use `websiteHeroPlate.src` or `mobileHero.src` directly in the hero — use the `MikeHeroPortrait` component abstraction so the crop can be swapped without touching the hero layout
- `feedAd` and `storyAd` are not rendered by the app at runtime; they are creative exports only
- No MLS / FlexMLS source for any crop (verified by test)

---

## Mike Eatmon — brand-pack v2 headshots and avatars

**Registry:** `src/components/amm/brand-pack-assets.ts` → `brandPackAssets.mike.*`  
**Public path base:** `/images/ask-magic-mike/brand-pack-v2/`

| Key | Use |
|-----|-----|
| `mike.headshot` | Full headshot for MikeTrustCard (1024×1024 source) |
| `mike.avatar128` | 128×128 avatar for compact trust card, widget header |
| `mike.avatar256` | 256×256 avatar for step-confirmation assignment card |

---

## v8 visual assets — NOT in public-facing surfaces

The following files are committed to `/public/ask-magic-mike/v8/` and sourced from the v8 brand pack. They are currently **only used by the `ask-magic-mike-v8-experience` campaign component** which is not rendered on any public route. Do not wire them to the main funnel without explicit authorization.

- `mike-stage-portrait.webp`
- `mike-widget-avatar.webp`
- `ourtown-logo-gold.webp`
- `answer-reveal-action.webp`
- `brand-elements.webp`
- `chat-widget-states.webp`
- `environment-rail.webp`
- `interactive-action-cards.webp`
- `pose-expression-rail.webp`

---

## Canonical domain

**Production:** `https://www.askmagicmike.com` (set via `NEXT_PUBLIC_SITE_URL`)  
**Vercel alias (internal):** `https://ask-magic-mike.vercel.app` — not presented as the public brand  
**Parent brand:** `https://www.ourtownproperties.com`  
**Agent profile:** `https://www.ourtownproperties.com/agents/mike-eatmon/`

All metadata, sitemap, robots, and OG URL construction imports from `src/lib/site-config.ts`.

---

## Rejected / do not use

- **Genie / lamp imagery** — this identity was explicitly rejected; any "rub the lamp" copy or lamp-icon graphic is banned (enforced by compliance test)
- **MLS listing photography** — no FlexMLS or third-party property photos in primary UI
- **Baked text/logo in hero images** — use the clean plate versions without overlaid text so copy can be updated independently
- **"Appraisal" language** — the product does not perform appraisals; use "broker-reviewed guidance", "preliminary home value range", or "local guidance" (context-dependent)
