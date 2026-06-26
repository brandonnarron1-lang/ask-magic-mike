# Visual Asset Requirements — Ask Magic Mike

**Status:** LC-1 baseline — current assets registered in `brand-pack-v2`  
**Owner:** Brandon Narron / Our Town Properties  
**Updated:** 2026-06-26

---

## Current Asset Inventory (`brand-pack-v2`)

All assets live in `public/images/ask-magic-mike/brand-pack-v2/`. The registry is `src/components/amm/brand-pack-assets.ts`.

### Mike Eatmon Portrait / Headshot

| Asset | Path | Dims | Use |
|---|---|---|---|
| Primary headshot | `mike-headshot-source.webp` | 1024×1024 | MikeTrustCard, OG/Twitter image |
| Headshot fallback | `mike-headshot-source.jpg` | 1024×1024 | Social tools that reject WebP |
| Hero close-up | `mike-hero-closeup.webp` | 360×440 | Hero portrait column |

### Circle Avatars

| Asset | Path | Dims | Use |
|---|---|---|---|
| 64px avatar | `mike-avatar-circle-64.png` | 64×64 | Tiny trust strips |
| 128px avatar | `mike-avatar-circle-128.webp` | 128×128 | Widget trust badge, compact card |
| 128px avatar (PNG fallback) | `mike-avatar-circle-128.png` | 128×128 | Non-WebP contexts |
| 256px avatar | `mike-avatar-circle-256.webp` | 256×256 | Ambient ambient elements |
| 256px avatar (PNG fallback) | `mike-avatar-circle-256.png` | 256×256 | Non-WebP contexts |

### Expression Variants (ambient use only — see QC notes)

| Asset | Path | Status | Use |
|---|---|---|---|
| Welcome | `mike-expression-welcome-clean.webp` | Clean | HowItWorks step ambient |
| Thinking chin | `mike-expression-thinking-chin-clean.webp` | Clean | HowItWorks step 1 ambient |
| Explaining | `mike-expression-explaining-clean.webp` | Clean | HowItWorks step 2 ambient |
| Confident | `mike-expression-confident-clean.webp` | Clean | HowItWorks step 3 ambient |
| Friendly | `mike-expression-friendly-clean.webp` | Clean | Future CTA sections |
| Looking side | `mike-expression-looking-side-clean.webp` | Clean | Future sidebar |
| Rubbing hands | `mike-expression-rubbing-hands-thinking-clean.webp` | **Concept** — baked label | `/widget-preview` BrandKitShowcase only |

**QC Rule for expressions:** "Clean" variants that are NOT tagged concept may be used as ambient background elements at low opacity (≤ 0.15). They must NOT be primary UI elements. The two concept-tagged variants (`thinkingHandsConcept`, `answerAppearsConcept`) are restricted to `/widget-preview` only.

### Action Shots

| Asset | Path | Status | Use |
|---|---|---|---|
| Mike explaining | `mike-action-explaining-clean.webp` | Production | HowItWorks step ambient |
| Answer smoke sequence | `mike-action-answer-smoke-clean.webp` | **Concept** — baked label | `/widget-preview` only |

### Brand Logo

| Asset | Path | Dims | Use |
|---|---|---|---|
| OTP logo (WebP) | `our-town-logo-clean.webp` | Variable | Nav, footer, card badges |
| OTP logo (PNG fallback) | `our-town-logo-clean.png` | Variable | Non-WebP contexts |
| OTP logo (web JPG) | `our-town-logo-web.jpg` | Variable | Old WordPress assets |

### Accent SVGs

| Asset | Path | Use |
|---|---|---|
| Gold arrow | `accent-gold-arrow.svg` | CTA directional accents |
| Ruby diamond | `accent-ruby.svg` | Urgency / direct-purchase badges |
| Smoke glow | `accent-smoke-glow.svg` | Hero portrait ambient atmosphere |
| Sparkle | `accent-sparkle.svg` | Section heading decorations |

### Social Proof / Ad Templates

| Asset | Path | Use Restriction |
|---|---|---|
| Home value feed | `social-home-value-feed.jpg` | Reference only — copy must be rewritten before paid use |
| Cash offer feed | `social-cash-offer-feed.jpg` | Reference only — copy must be rewritten before paid use |
| Chat story | `social-chat-story.jpg` | Reference only |
| Seller story | `social-seller-story.jpg` | Reference only |

### Background / Environment

| Asset | Path | Use |
|---|---|---|
| Brand board v2 | `brand-board-v2-web.jpg` | Reference doc, `/widget-preview` |
| Elements strip | `brand-elements-strip.webp` | Reference doc, `/widget-preview` |
| Widget concept | `chat-widget-concept.webp` | `/widget-preview` BrandKitShowcase |
| Answer smoke seq | `answer-smoke-sequence.webp` | `/widget-preview` BrandKitShowcase |
| Wordmark lockup | `wordmark-lockup-concept.webp` | Reference, future hero header |

### Motion Assets

| Asset | Path | Use |
|---|---|---|
| Widget state GIF | `widget-state-sequence-preview.gif` | `/widget-preview` only |
| Walk cycle sprite | `mike-walk-cycle-sprite.png` | Not yet wired — future animation |

---

## What's Missing / Future Needs

### Priority 1 — For Paid Campaigns

| Asset | Spec | Purpose |
|---|---|---|
| Hero video (8-15s) | MP4/WebM, 1920×1080 or 9:16 | Hero background loop — currently using still portrait |
| Testimonial photos | 3-5 homeowner headshots (permission required) | Social proof section (future) |
| Property listing hero | 1200×800 Wilson area home exterior | Above-fold hero variant for listing campaigns |

### Priority 2 — Visual System Completeness

| Asset | Spec | Purpose |
|---|---|---|
| Mike expression — welcoming arms | Full-body or 3/4, no text labels | Prominent CTA section portrait |
| Wilson NC aerial / skyline | Drone or stock, 1920×1080 | "Your Market" section background |
| Sold sign action shot | Mike or rider at a real sold listing | SoldSection upgrade |

### Priority 3 — Marketing

| Asset | Spec | Purpose |
|---|---|---|
| Social proof video testimonials | 15-30s vertical (9:16) | Social ads, embed social proof |
| Animated logo lockup | Lottie JSON, <100KB | Widget loading state |
| OG image (1200×630) | Mike centered, AMM branding | Optimal social share card (current: 1024×1024) |

---

## Prohibited Assets

Per brand QC (`likeness_and_brand_qc_checklist.md`):

- **No genie, lamp, or magic lamp imagery** — brand is "Magic Mike" the broker, not a genie
- **No baked text labels in primary UI** — assets with labels like "RUBBING HANDS" or "ANSWER APPEARS" are concept-only
- **No MLS/FlexMLS listing photos** — real estate photography requires MLS license compliance
- **No fake testimonials or invented statistics** — all performance claims must source from Mike Eatmon's verified bio

---

## Asset Registry

**Single source of truth:** `src/components/amm/brand-pack-assets.ts`  
**Secondary registry (platform-specific):** `src/lib/mikePlatformAssets.ts`

All components should import from one of these registries rather than hardcoding `/images/...` paths.
