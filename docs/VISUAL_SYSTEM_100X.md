# Visual System 100x — Ask Magic Mike

Ask Magic Mike · Our Town Properties · Wilson, NC

---

## Purpose

This document is the canonical design reference for the Ask Magic Mike visual system. Every public surface — the funnel, embeds, landing page, admin dashboards — must conform to these principles.

The goal is a dark-luxury aesthetic that communicates trust, expertise, and urgency without feeling aggressive. Premium real estate, not casino.

---

## Brand Principles

1. **Dark authority** — Midnight backgrounds (#080806, #0A0A0A). Light text on dark panels. Never white backgrounds on public surfaces.
2. **Gold = trust and quality** — Gold (#D4A017) signals premium expertise. Use it for primary actions, headings, and micro-accents.
3. **Ruby = urgency** — Ruby (#C1272D) is reserved for time-sensitive actions and critical status. Do not use for decorative purposes.
4. **Cream = warmth** — Body text and headings use cream (#F5F0E8, #F7F1E8) to feel warm rather than cold-white.
5. **Texture without noise** — Subtle radial mesh gradients, glass morphism with low backdrop-blur, grain overlays at very low opacity. Never heavy gloss or bevel.
6. **Motion serves information** — Animations communicate state changes and draw attention to primary actions. No decorative animations that distract from the CTA.

---

## Color Tokens

All raw values live in `src/lib/brand/visual-system.ts` → `colors`.

| Token | Hex | Use |
|---|---|---|
| `black` | `#050505` | Page base (lowest layer) |
| `charcoal` | `#0B0B0B` | Ambient strata surface |
| `panel` | `#111111` | Primary card surface |
| `panel2` | `#0D0B07` | Secondary / alternate card |
| `panelDark` | `#0A0A0A` | Admin headers, footers |
| `pageBg` | `#080806` | Root page background |
| `gold` | `#D4A017` | Primary accent (= Tailwind `gold-400`) |
| `goldSoft` | `#FFD566` | Hover highlight (= Tailwind `gold-200`) |
| `goldDeep` | `#9A720F` | Edge shadows, deep tints (= Tailwind `gold-600`) |
| `ruby` | `#C1272D` | Urgency / direct action (= Tailwind `ruby-400`) |
| `rubyDeep` | `#8B0000` | Ruby shadow |
| `cyan` | `#00CFEA` | AI status indicators only — use sparingly |
| `offWhite` | `#F4F4F4` | Primary body text |
| `cream` | `#F5F0E8` | Warm heading text (= Tailwind `cream`) |
| `bodyText` | `#F7F1E8` | Slightly warmer alternate body text |

**Tailwind equivalents** (defined in `tailwind.config.ts`):
- `text-gold-400` = `#D4A017`, `text-gold-300` = `#FFD566`, `text-gold-600` = `#9A720F`
- `text-ruby-400` = `#C1272D`
- `text-cream` = `#F5F0E8`
- `bg-midnight` = `#0A0A0A`
- `bg-charcoal` = `#1A1A2E`

---

## Typography Scale

All class compositions live in `src/lib/brand/visual-system.ts` → `type`.

### Display — Playfair Display (`font-display`)

| Token | Classes | When to use |
|---|---|---|
| `displayXl` | `font-display text-6xl sm:text-7xl lg:text-8xl font-bold leading-[0.95]` | Hero headlines |
| `displayLg` | `font-display text-5xl sm:text-6xl font-bold leading-tight` | Section heroes |
| `displayMd` | `font-display text-4xl sm:text-5xl font-semibold leading-tight` | Sub-section headers |
| `displaySm` | `font-display text-3xl font-semibold leading-snug` | Card headlines |

### Metric Numbers — Bebas Neue (`font-bebas`)

| Token | Classes | When to use |
|---|---|---|
| `metricXl` | `font-bebas text-5xl leading-none tracking-wider` | Primary KPIs (sold price, days, count) |
| `metricLg` | `font-bebas text-4xl leading-none` | Dashboard counters |
| `metricMd` | `font-bebas text-3xl leading-none` | Secondary metrics |
| `metricSm` | `font-bebas text-2xl leading-none` | Compact stats |

### Body — Inter (default)

| Token | Classes | When to use |
|---|---|---|
| `bodyLg` | `text-lg leading-relaxed font-light` | Hero subheadlines |
| `bodyBase` | `text-base leading-relaxed` | Standard body copy |
| `bodySm` | `text-sm leading-relaxed` | Supporting copy |
| `bodyXs` | `text-xs leading-relaxed` | Fine print, metadata |

### Labels / Kickers

| Token | Classes | When to use |
|---|---|---|
| `label` | `text-[10.5px] font-semibold tracking-[0.18em] uppercase` | Neutral form labels |
| `labelGold` | same + `text-gold-400` | Gold eyebrow labels |
| `kicker` | `text-xs font-semibold tracking-[0.22em] uppercase text-gold-400` | Section kickers above headlines |
| `kickerSlate` | `text-[11px] tracking-[0.16em] uppercase text-slate-400` | Subdued section labels |
| `mono` | `font-mono text-[11px] tabular-nums` | IDs, codes, dates in tables |

---

## Surface / Card Tokens

All compositions live in `src/lib/brand/visual-system.ts` → `surface`.

| Token | Use |
|---|---|
| `card` | Standard dark glass card (`rounded-xl`, subtle border) |
| `cardLg` | Larger variant of `card` |
| `cardGold` | Gold-tinted card (featured items, CTAs) |
| `panel` | Deep dark panel with `backdrop-blur-sm` |
| `stepCard` | Intake / embed step card (opaque dark, heavy shadow) |
| `glass` | Frosted glass morphism overlay |
| `glassGold` | Gold-tinted glass (modal borders, overlays) |
| `commandCard` | Admin section card (same as `card`) |
| `commandWarn` | Amber warning card for admin alerts |
| `commandOk` | Emerald success card for admin status |
| `commandRuby` | Ruby alert card for admin critical items |

---

## Button Tokens

All compositions live in `src/lib/brand/visual-system.ts` → `btn`.

| Token | Use |
|---|---|
| `gold` | Primary CTA — dark text on gold background |
| `goldLg` | Large primary CTA (hero buttons, funnel continue) |
| `secondary` | Secondary action — ghost with subtle border |
| `ghost` | Tertiary / nav action |
| `ruby` | Destructive or urgent action |

---

## Badge / Pill Tokens

All compositions live in `src/lib/brand/visual-system.ts` → `badge`.

| Token | Use |
|---|---|
| `gold` | Primary status badge (active, featured) |
| `goldDot` | Dot indicator for gold status |
| `ruby` | Urgent / alert badge |
| `emerald` | Success / complete badge |
| `slate` | Neutral / inactive badge |
| `cyan` | AI-status only badge |

---

## Gradient Tokens

All values live in `src/lib/brand/visual-system.ts` → `gradients` (for `style=` use).

| Token | Use |
|---|---|
| `heroMesh` | Hero section radial mesh — gold glow at corners |
| `goldMesh` | Section-level gold ambient mesh |
| `sectionFade` | Bottom-of-section dark fade |
| `goldShimmer` | Gold shimmer overlay for accent elements |
| `pageBg` | Page background radial gradient |
| `cardBorder` | Gradient border for featured cards |

---

## Motion Tokens

| Token | Value | Use |
|---|---|---|
| `animDelay.none` | `0ms` | Immediate |
| `animDelay.xs` | `80ms` | Fast stagger |
| `animDelay.sm` | `150ms` | Default stagger |
| `animDelay.md` | `300ms` | Section entrance |
| `animDelay.lg` | `450ms` | Delayed hero element |
| `animDelay.xl` | `600ms` | Final stagger item |
| `animDelay["2xl"]` | `750ms` | Long delay |

Always add `motionSafe` (`motion-reduce:animate-none motion-reduce:transition-none`) to animated elements. Users who set `prefers-reduced-motion: reduce` must not see animations.

---

## URL Safety Rules

```ts
import { isSocialSafeUrl, isCanonicalAmmUrl } from "@/lib/brand/visual-system";

// Canonical domain only — use for all social sharing URLs
isSocialSafeUrl("https://askmagicmike.com/ask")  // → true
isSocialSafeUrl("https://ourtownproperties.com")  // → false (host WAF blocks facebookexternalhit)
isSocialSafeUrl("https://ask-magic-mike.vercel.app")  // → false (preview URL)

// Confirm a URL is the canonical AMM domain before using in OG/social meta
isCanonicalAmmUrl("https://askmagicmike.com")  // → true
```

**Rule:** All social share links and OG `og:url` tags MUST use `askmagicmike.com`. Never use `ourtownproperties.com` in social meta — Regency/host WAF returns HTTP 403 to `facebookexternalhit`. This is a permanent external constraint, not fixable in code.

---

## Page-by-Page Rules

### Public Landing (`/`)
- Hero: `displayXl` headline, `bodyLg` subhead, `btn.goldLg` CTA
- Sections: `kicker` above each headline, `displayMd` section headline
- Cards: `surface.card` or `surface.cardGold` for featured
- Footer: `Footer` component — never use emoji; use SVG for icons

### Funnel / Intake (`/ask`, `/value`, embed)
- Step cards: `surface.stepCard`
- Step headlines: `font-display text-[26px] sm:text-3xl font-semibold`
- Intent buttons: Lucide icons (no emoji), gold-tinted on selection
- Timeline pills: `rounded-full border` pattern
- CTA: `btn.goldLg` (full width on mobile)

### Embed (`/embed/ask`, `/embed/value`)
- Same rules as funnel
- Background: transparent or `#0A0A0A` (host page determines outer shell)
- No footer in embed context

### Admin (`/admin/**`)
- All pages: `bg-[#080806]`, `text-cream` root
- Headers: `border-b border-gold-400/10 bg-[#0D0B07]`
- Section cards: `surface.commandCard`
- Status indicators: `badge.emerald`, `badge.ruby`, `badge.gold`, `badge.slate`
- Metrics: `font-bebas text-4xl` for primary KPIs
- Section headers: `sectionHeaderClasses()` helper or `text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500`

---

## What NOT to do

- No emoji in UI components — use Lucide icons or SVG
- No white backgrounds on any public surface
- No `text-white` — use `text-cream`, `text-[#F4F4F4]`, or `text-slate-*`
- No animated elements without `motionSafe` class
- No `ourtownproperties.com` in social OG tags
- No Vercel preview URLs in any meta tags
- No mock data shown in production admin
- No client-side Supabase in admin pages — use `createAdminClient()` server-side only

---

## Files

| File | Role |
|---|---|
| `src/lib/brand/visual-system.ts` | Canonical token source — all raw values and helpers |
| `tailwind.config.ts` | Tailwind extensions (color palettes, fonts, animations) |
| `src/app/globals.css` | Global keyframe animations and utility classes |
| `src/components/amm/tokens.ts` | Legacy `ammTokens` object — prefer `visual-system.ts` for new work |
| `src/components/landing/footer.tsx` | Footer (SVG icons, no emoji) |
| `src/components/intake/step-intent.tsx` | Intent step (Lucide icons, no emoji) |
| `tests/brand/visual-system.test.ts` | Token export tests |

---

*Ask Magic Mike · Our Town Properties, Inc. · Wilson, NC*
