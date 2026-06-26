# Launch Candidate 1 — Visual Audit

**Branch:** `launch-candidate-1-premium-visual-system`  
**Audited:** 2026-06-26  
**Auditor:** Claude Code (LC-1 sprint)

---

## Surface Inventory

| Surface | Route | Mobile? | Public? | Funnel? |
|---|---|---|---|---|
| Homepage | `/` | Yes | Yes | Entry |
| Value funnel | `/value` | Yes | Yes | Primary |
| Intake flow | `/ask` | Yes | Yes | Conversion |
| Embed (iframe) | `/embed/ask` | Yes | External | Conversion |
| Widget preview | `/widget-preview` | Yes | No (noindex) | Internal |

---

## Visual Audit Table

| Area | Finding | Evidence | Risk | Fix Now? | Action |
|---|---|---|---|---|---|
| Hero background | Good ambient gradient but no texture — feels flat at scale | hero-section.tsx L148-159 | Low | Yes | Add `grain-overlay` CSS class for film grain |
| Hero accent elements | Accent SVGs from brand-pack-v2 exist but unused in hero | `brandPackAssets.accents.*` untouched | Low | Yes | Add `accent-sparkle.svg` near h1 heading |
| Hero portrait ambient | Portrait has glow but `accent-smoke-glow.svg` not used | hero-section.tsx L43-61 | Low | Yes | Add smoke-glow SVG behind portrait |
| HowItWorks steps | Uses only Lucide icons — no Mike portrait imagery | how-it-works.tsx L11-32 | Medium | Yes | Add Mike ambient portrait to section; use expressions on step cards |
| HowItWorks connector | Gold connector thread is desktop-only and subtle | how-it-works.tsx L77-82 | Low | No | Acceptable, document |
| WhyMike pillars | Pillar cards have hover borders but no gradient border treatment | why-mike.tsx L55-92 | Low | Yes | Add sparkle accent to heading; add glow hover upgrade |
| SoldSection | Premium split layout, real images (mike-sold-sign.png, sold-rider.png) | sold-section.tsx L41-82 | None | No | Already cinematic — no change |
| MikeCard OTP badge | Inline hand-drawn SVG house icon used instead of real logo asset | mike-card.tsx L79-88, OurTownIcon fn | Low | Yes | Replace with `brandPackAssets.logo.primary` WebP |
| Footer brand icon | Hand-drawn SVG house instead of real OTP logo | footer.tsx L37-42 | Low | Yes | Replace with `brandPackAssets.logo.primary` WebP |
| MarketPulse ticker | Working, gold OTP tag, fade masks | market-pulse.tsx L24-35 | None | No | Already good |
| FaqStrip | Premium accordion with `text-gold-shimmer`, gold rule | faq-strip.tsx | None | No | Already premium |
| Value funnel hero | AMM component system (BrandShell + MikeTrustCard) solid | value-hero.tsx | Low | Yes | Add ambient portrait image to hero column |
| Value funnel trust block | Good copy but could use visual accent | value-hero.tsx L148-184 | Low | Yes | Add accent styling to trust section |
| Embed surface | Functional intake flow, EmbedShell | embed/ask/page.tsx | None | No | Preserve behavior — no visual change |
| Widget preview | Internal page (noindex), uses BrandKitShowcase | widget-preview/page.tsx | None | No | Internal surface only |
| OG / Social preview | `mike-headshot-source.webp` (1024×1024) used for OG/Twitter | layout.tsx L56, value/page.tsx L83-92 | None | No | Already correct and canonical |
| SEO metadata | Title, description, OG, Twitter, canonical, robots all set | layout.tsx L23-70 | None | No | Comprehensive — no change |
| Seller / we-buy path | No `/we-buy-houses` route exists | `find src/app` scan | N/A | No | Document as future roadmap item |

---

## Brand Asset Usage Audit

| Asset | Status | Used Where |
|---|---|---|
| `mike-hero-closeup.webp` | ✅ Production | Hero portrait (mikePlatformAssets.feedAd) |
| `mike-headshot-source.webp` | ✅ Production | MikeTrustCard, OG/Twitter image |
| `mike-avatar-circle-128.webp` | ✅ Production | Hero trust badge, MikeTrustCard compact |
| `mike-avatar-circle-256.webp` | ✅ Available | Used as ambient element in HowItWorks (LC-1) |
| `our-town-logo-clean.webp` | ✅ Production | BrandHeader, nav logo |
| `mike-expression-*.webp` (clean variants) | ✅ Available | HowItWorks step cards (LC-1) — ambient only |
| `mike-action-explaining-clean.webp` | ✅ Available | HowItWorks step 2 ambient (LC-1) |
| `accent-sparkle.svg` | ✅ Available | Hero, WhyMike heading (LC-1) |
| `accent-smoke-glow.svg` | ✅ Available | Hero portrait ambient (LC-1) |
| `accent-gold-arrow.svg` | ✅ Available | Future CTA accents |
| `accent-ruby.svg` | ✅ Available | Future urgency badges |

---

## Design System Completeness

| System | Status | Gap |
|---|---|---|
| Color tokens (gold/ruby/cream/midnight/charcoal) | ✅ Complete | None |
| Typography (Playfair/Inter/Bebas) | ✅ Complete | None |
| Animation keyframes (12 total) | ✅ Complete | Add `delay-250` for smoother sequencing |
| CSS utilities (glass, grain, noise, card-border) | ✅ Complete | None |
| Motion safety (`prefers-reduced-motion`) | ✅ Complete | None |
| Visual system tokens (visual-system.ts v1.0.0) | ✅ Complete | None |
| AMM token system (tokens.ts) | ✅ Complete | None |

---

## Prohibited Token Check

No uses of forbidden `text-red-*` or `bg-red-*` Tailwind tokens found in landing or funnel components. All urgency/error surfaces use `ruby-*` tokens correctly.

---

## SEO Audit

| Check | Status |
|---|---|
| `metadataBase` set to canonical URL | ✅ `siteConfig.canonicalSiteUrl` |
| Title + description on homepage | ✅ |
| OG image (1200×630 or 1024×1024) | ✅ `mike-headshot-source.webp` (1024×1024) |
| Twitter card | ✅ `summary_large_image` |
| Canonical URL | ✅ Set |
| Robots | ✅ `index: true, follow: true` on public routes |
| Sitemap | ✅ `robots.ts`, `sitemap.ts` exist |
| JSON-LD structured data | ✅ `RealEstateAgent` schema on `/value` |

---

## Seller Path Assessment

No `/we-buy-houses` or `/seller-cash-offer` route exists. The seller path is handled via:
- `chip: "should_sell_now"` CTA on homepage → `/ask?chip=should_sell_now`
- `/value` Option Card: "Compare selling options" + "Request direct-purchase review"
- Intake flow `StepIntent` handles `seller` / `seller_cash_offer` lead types

**No Phase 5 work required.** Document as future: a dedicated `/we-buy-houses` landing page could be a future initiative.

---

## Priority Implementation List (Phase 3-6)

1. `how-it-works.tsx` — Add Mike expression/portrait images per step *(highest impact)*
2. `hero-section.tsx` — Add grain texture + accent SVG elements
3. `footer.tsx` — Replace hand-drawn SVG with real OTP logo
4. `mike-card.tsx` — Replace OurTownIcon with real logo asset
5. `value-hero.tsx` — Add ambient visual element to trust column
6. `globals.css` — Add `delay-250` utility class
7. `why-mike.tsx` — Add sparkle accent near heading
