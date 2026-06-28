# Design System Omega — Ask Magic Mike

The permanent visual operating system for Ask Magic Mike. All components,
pages, and surfaces inherit from this specification.

---

## Overview

Design System Omega is a token-first visual language that makes AMM feel
expensive before a user notices color, motion, or imagery. Typography carries
the weight. If it is weak, everything else is theater makeup on bad structure.

**Three layers:**
1. **Primitive tokens** — raw values in `tailwind.config.ts` and `:root` CSS vars
2. **Semantic tokens** — named roles exported from `src/lib/brand/visual-system.ts`
3. **Utility classes** — composable Tailwind utilities in `src/app/globals.css`

---

## Phase 1 — Visual System Foundation (PR #54, merged 2026-06-27)

### Token Architecture

**`tailwind.config.ts`** — 400+ new tokens:
- `ink` scale (100–950): dark surface neutrals
- `warm` scale (50–900): creamy warm neutrals
- Extended `gold` (800, 900) and `ruby` (800, 900) deep scales
- `cyan` with dim/soft variants; `offwhite: "#F4F4F4"`
- Named elevation shadows: `z0`–`z6` + card family + glow families (gold, ruby, cyan)
- Luxury easing: `luxury`, `spring`, `swift`, `cinematic`, `entrance`, `exit`, `emphasis`, `snap`
- Backdrop blur: `xs` (4px) through `3xl` (80px)
- Semantic z-index: `below` (-1) through `supreme` (9999)
- Transition durations: 0ms–1200ms
- Named line heights: `hero` (0.90) through `loose` (1.85)
- Named letter spacing: `tighter` (-0.04em) through `spaced` (0.30em)
  - `label` = 0.18em, `kicker` = 0.22em
- 20 named animations + 17 keyframes

**`src/app/globals.css`** — 200+ CSS custom properties in `:root`:
- Color opacity ladders (gold, ruby, white, black, cyan)
- Shadow/elevation vars
- Easing curve vars
- Duration scale vars
- Glass surface tokens
- Lighting primitives (ambient, rim, bloom)
- Fluid type scale (`clamp()` based)
- Layout tokens
- Border vars
- Grain/texture opacity tokens
- Z-index semantic vars

**`src/app/layout.tsx`**:
- Migrated from render-blocking Google Fonts `@import` to `next/font/google`
- Playfair Display + Inter preloaded, Bebas Neue deferred
- Zero render-blocking font requests

---

## Phase 2 — Typography System (PR #55, this branch)

### Approved Font Roles

| Role | Font | Variable | Tailwind Class | Use For |
|------|------|----------|----------------|---------|
| Display / Hero | Playfair Display | `--font-playfair` | `font-display` | All h1–h3 headings, section titles, hero text |
| Body / UI | Inter | `--font-inter` | `font-body` | All body copy, labels, inputs, nav, footer |
| Metrics / Numbers | Bebas Neue | `--font-bebas` | `font-bebas` or `font-metric` | Stat values, scores, counters ONLY |

**Rule**: Never use `font-display` for body text. Never use `font-bebas` for running copy.

---

### Heading Hierarchy

Every page must have a clear h1→h2→h3 structure. Screen readers and search engines depend on it.

| Level | Class composition | Use |
|-------|-------------------|-----|
| h1 (hero) | `font-display text-6xl sm:text-7xl lg:text-8xl font-black leading-[0.9]` | Page hero only |
| h1 (intake) | `font-display text-2xl sm:text-3xl font-semibold text-cream leading-snug` | Step headings |
| h2 (section) | `font-display text-5xl sm:text-6xl font-bold text-cream leading-tight` | Landing section headers |
| h2 (section md) | `font-display text-4xl sm:text-5xl font-semibold text-cream leading-tight` | Smaller section headers |
| h3 (card) | `text-base font-semibold text-cream` | Card/pillar titles |
| h4 (admin) | `text-xs font-semibold tracking-label uppercase text-cream` | Admin section labels |

---

### Body Copy Rules

- Standard body: `text-base leading-relaxed text-slate-400`
- Lead paragraph: `text-lg leading-relaxed text-slate-300 font-light` (hero/section intros only)
- Body small: `text-sm leading-relaxed text-slate-400`
- Muted: `text-sm leading-relaxed text-slate-500`
- Caption / legal: `text-xs leading-relaxed text-slate-600`

**Rules:**
- Never go below `text-xs` for user-readable content
- Never use arbitrary pixel sizes like `text-[13.5px]` — use `text-sm` (14px)
- `text-xs` = 12px and is the floor for all readable text
- Very small decorative labels (`text-[10px]`, `text-[10.5px]`) are acceptable for micro-labels where space is tight, but must have sufficient contrast

---

### Section Eyebrow / Kicker Pattern

All section kickers use one canonical pattern:

```tsx
<p className="text-xs font-semibold tracking-kicker uppercase text-gold-400 mb-4">
  Section Title
</p>
```

- `tracking-kicker` = 0.22em (defined in tailwind.config.ts)
- Always uppercase
- Always gold-400
- No variation across sections

For slate kickers (admin/secondary): `tracking-label` (0.18em) + `text-slate-400`

---

### Label / Form Field Pattern

For all form labels and field descriptors:

```tsx
<label className="block text-[10.5px] font-semibold text-slate-400 mb-2 uppercase tracking-label">
  Field Name
</label>
```

- `tracking-label` = 0.18em
- `text-[10.5px]` is acceptable here as it's a fixed-layout form element, not running copy
- Always uppercase

---

### Metric / Number Pattern (Bebas Neue)

Only for quantitative values:

| Token | Class | Size | Use |
|-------|-------|------|-----|
| `type.metricXl` | `font-bebas text-5xl leading-none tracking-wider` | 48px | Hero stats ($750M+) |
| `type.metricLg` | `font-bebas text-4xl leading-none` | 36px | Dashboard tiles (2,500+) |
| `type.metricMd` | `font-bebas text-3xl leading-none` | 30px | Card metrics |
| `type.metricSm` | `font-bebas text-2xl leading-none` | 24px | Small inline values |

---

### Mobile Typography Rules

- Hero h1: `text-6xl` → `sm:text-7xl` → `lg:text-8xl` (fluid enough via viewport)
- Section h2: `text-5xl` → `sm:text-6xl` minimum
- Intake step heading: `text-2xl` → `sm:text-3xl`
- Never use fixed viewport units (vw) for user-facing text — fluid type vars use `clamp()` instead
- Body text minimum: `text-sm` on mobile, `text-base` on desktop is fine as-is

---

### Dashboard Typography Rules

Admin pages are command centers, not landing pages. They get denser, more utilitarian typography.

| Element | Class |
|---------|-------|
| Page/section label | `text-[10.5px] font-semibold uppercase tracking-label text-slate-400` |
| Table header | `text-xs font-semibold uppercase tracking-label text-slate-400` |
| Metric value | `font-bebas text-4xl leading-none` |
| Metric label | `text-xs uppercase tracking-widest text-slate-500 mt-1` |
| Alert header | `text-xs font-bold uppercase tracking-label` |
| Cell primary | `text-sm font-medium text-cream` |
| Cell secondary | `text-xs text-slate-500` |
| Status badge | `text-[10px] font-bold uppercase` |

---

### Accessibility Notes

- All text must maintain at minimum a 4.5:1 contrast ratio for normal text, 3:1 for large text
- `text-slate-600` on black backgrounds may be very low contrast — use only for legal/compliance text where reduced emphasis is intentional
- `text-slate-500` is acceptable for secondary/tertiary text
- Never remove `leading-relaxed` from body paragraphs — tight line heights fail WCAG at body sizes
- Focus rings use `outline: 2px solid var(--gold-400)` — never remove focus visibility
- All animations respect `prefers-reduced-motion: reduce` (handled in globals.css)

---

## Semantic Token API (`visual-system.ts`)

```typescript
import { type, section, intake, prose, dash, elevation, easing, lighting, glass } from "@/lib/brand/visual-system";

// Section structure
section.eyebrow      // "text-xs font-semibold tracking-kicker uppercase text-gold-400"
section.heading      // "font-display text-5xl sm:text-6xl font-bold text-cream leading-tight"
section.lead         // "text-lg leading-relaxed text-slate-400"
section.cardTitle    // "text-base font-semibold text-cream"
section.cardBody     // "text-sm leading-relaxed text-slate-400"

// Intake funnel
intake.heading       // "font-display text-2xl sm:text-3xl font-semibold text-cream leading-snug"
intake.subhead       // "text-sm text-slate-400 leading-relaxed"
intake.fieldLabel    // "block text-[10.5px] font-semibold text-slate-400 mb-2 uppercase tracking-label"
intake.helperText    // "text-xs text-slate-500 leading-relaxed"

// Prose hierarchy
prose.lead           // "text-lg leading-relaxed text-slate-300 font-light"
prose.body           // "text-base leading-relaxed text-slate-400"
prose.bodySm         // "text-sm leading-relaxed text-slate-400"
prose.caption        // "text-xs leading-relaxed text-slate-500"
prose.legal          // "text-xs leading-relaxed text-slate-600 italic"

// Dashboard
dash.metricValue     // "font-bebas text-4xl leading-none"
dash.metricLabel     // "text-xs uppercase tracking-widest text-slate-500 mt-1"
dash.cellPrimary     // "text-sm font-medium text-cream"
dash.sectionLabel    // "text-[10.5px] font-semibold tracking-label uppercase text-slate-400"

// Motion system
motion.reveal["fade-up"]          // "animate-fade-up"
motion.hover.lift                 // "transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg"
motion.hover.glow                 // "transition-shadow duration-300 hover:shadow-[0_0_24px_-4px_rgba(212,160,23,0.25)]"
motion.press.sm                   // "active:scale-[0.97] motion-reduce:active:scale-100"
motion.transition.base            // "transition-all duration-200 ease-out"
motion.transition.color           // "transition-colors duration-200 ease-out"
```

---

## Phase 4 — Motion System (PR #57)

### Philosophy

Motion reinforces information hierarchy — it does not decorate it. Every
entrance animation has a purpose: directing attention, communicating sequence,
or rewarding scroll. Gratuitous motion is prohibited.

All animations respect `prefers-reduced-motion` via the `motion-safe:` Tailwind
prefix. Users who opt out of motion see instant opacity transitions only.

### Architecture

**`src/hooks/use-reveal.ts`** — `useReveal` hook powering all scroll-triggered
entrances. Returns `animationClass` (with `motion-safe:` prefix) and `style`
(inline `animationDelay`). Observes the element via `IntersectionObserver`
with configurable `threshold` and `once` options.

**`src/components/ui/reveal.tsx`** — Two components:
- `<Reveal>` — polymorphic wrapper. Any element becomes scroll-aware. `as` prop
  controls the rendered tag (default: `div`). Accepts all standard HTML attributes.
- `<Stagger>` — maps children to ascending stagger delays. `base` + `interval`
  control the delay ladder. Renders each child inside a `<Reveal>`.

### Reveal Variants

| Variant | Animation | Use Case |
|---------|-----------|----------|
| `fade-up` | Opacity + translateY up | Default, universal |
| `fade-down` | Opacity + translateY down | Dropdowns, expanded content |
| `fade-in` | Opacity only | Overlays, ambient content |
| `scale-in` | Opacity + scale from 0.95 | Cards, modals, badges |
| `slide-left` | Opacity + translateX from right | Panels, drawers |
| `slide-right` | Opacity + translateX from left | Back navigation |
| `blur-in` | Opacity + blur from 8px | Hero text, premium moments |

### Stagger Pattern

```tsx
// Auto-stagger a list — 80ms between each child
<Stagger variant="fade-up" base={0} interval={80}>
  <FeatureCard ... />
  <FeatureCard ... />
  <FeatureCard ... />
</Stagger>

// Direct hook usage for full control
const { ref, animationClass, style } = useReveal({ variant: "blur-in", delay: 200 });
<h1 ref={ref} className={cn(animationClass, "font-display text-5xl")} style={style}>
  Wilson's Local Expert
</h1>
```

### Motion Token API

All motion constants live in `src/lib/brand/visual-system.ts` under the `motion`
export group, keeping them co-located with all other semantic tokens:

```ts
// Hover interactions
motion.hover.lift   // card hover lift + shadow
motion.hover.scale  // 2% scale on hover
motion.hover.glow   // gold ambient glow on hover
motion.hover.dim    // opacity fade on hover

// Press states
motion.press.sm     // active:scale-[0.97] — for buttons
motion.press.md     // active:scale-[0.96] — for larger targets

// Transitions
motion.transition.fast    // 150ms ease-out
motion.transition.base    // 200ms ease-out (default)
motion.transition.slow    // 300ms ease-out
motion.transition.color   // transition-colors only
motion.transition.shadow  // transition-shadow only
```

### Rules

- Always use `motion-safe:` prefix on entrance animations — never raw `animate-*`
- Never animate layout properties (width, height, display) — only transform and opacity
- Stagger intervals: 60–100ms. Never exceed 150ms between siblings
- Maximum total stagger sequence duration: 600ms (6–7 items at 80ms)
- Blur animations only on hero moments — overuse destroys the premium signal
- All `<Reveal>` instances set `once={true}` by default — elements animate once on first view

---

## Prohibited Patterns

| Pattern | Reason | Use Instead |
|---------|--------|-------------|
| `text-red-*`, `bg-red-*` | Red is not in the brand palette | `ruby-*` |
| `text-[13.5px]` | Arbitrary pixel bypasses scale | `text-sm` (14px) |
| `text-[14.5px]` | Arbitrary pixel bypasses scale | `text-sm` (14px) |
| `tracking-[0.25em]` | Non-standard kicker | `tracking-kicker` (0.22em) |
| `tracking-[0.2em]` | Non-standard kicker | `tracking-kicker` (0.22em) |
| `tracking-[0.15em]` | Non-standard label | `tracking-label` (0.18em) |
| `text-[#F7F1E8]` | Hardcoded hex instead of token | `text-cream` |
| `text-[#F4F4F4]` | Hardcoded hex instead of token | `text-offwhite` or `text-cream` |
| `font-display text-[26px]` | Arbitrary size in display font | `text-2xl` or `text-3xl` |
| Genie / lamp / magic lamp copy | Brand identity rule | "Mike Eatmon" / "local guidance" |
| MLS markers in public source | Legal/confidentiality | Keep in admin-only gated routes |

---

## Phase 6 — Dashboard Command Center (PR #59)

### Philosophy

The authenticated admin is a mission-control cockpit for broker operations —
not a CMS panel. Every surface communicates urgency hierarchy, lead intelligence,
and SLA status at a glance. Complexity is hidden; relevance is surfaced.

### Architecture

**`src/components/admin/admin-shell.tsx`** — Shared chrome for all admin pages:
- `<AdminShell>` — Gold top accent bar, glassmorphic header, eyebrow/title/back-link.
  `devMode` prop triggers an amber "Sample Data" chip.
- `<AdminCard>` — Section card with optional gold eyebrow title.
- `<AdminSectionHeading>` — 10.5px uppercase tracking-label section labels.

**`src/app/(admin)/admin/page.tsx`** — Command center dashboard:
- Parallel data load: `getLeadsForAdmin()` + `loadDashboardMetrics()`
- `LockedState` component for unconfigured Supabase (production safety)
- Lead Intelligence grid: Total / Urgent / Hot / SLA Breached
- Funnel Health grid: New Today / Contacted / Appt. Req. / Unassigned (behind `metrics.configured` guard)
- Attention strip: urgent + SLA-breached leads with direct row links (limited to 5, overflow count shown)
- Today's Operations panel: Follow-ups Due + Never Contacted clickable tiles
- Source Attribution pill cloud
- Command center nav cards → all 5 admin sections
- Recent Leads table (existing `<LeadTable>`)
- Dev mode warning banner (never shown in production)

### Token Cleanup — All Admin Surfaces

All admin pages and components cleaned of prohibited patterns:
- `text-[#F4F4F4]` → `text-cream` (all occurrences across 7 files)
- `text-[#050505]` → `text-midnight` (`admin-lead-actions.tsx` SubmitBtn)
- `tracking-[0.18em]` → `tracking-label` (all occurrences)
- `tracking-[0.16em]` → `tracking-label` (all occurrences)
- `tracking-[0.14em]` → `tracking-label` (all occurrences)
- `text-[12.5px]` → `text-sm` (all occurrences in actions + detail pages)
- `text-[11.5px]` → `text-xs` (all occurrences)
- `rounded-md` → `rounded-xl` for inputs, selects, buttons in `admin-lead-actions.tsx`

### Static Guards (tests/brand/admin-components.test.ts)

36 tests covering:
- AdminShell/AdminCard/AdminSectionHeading exports and token compliance
- Admin homepage: AdminShell wired, `loadDashboardMetrics` imported, no banned tokens,
  LockedState present, devMode guard, five command center links, no genie/lamp copy
- Token guards on `admin-lead-actions.tsx`, leads inbox, lead detail, all four supporting pages

---

## Phase 7 — Marketing System (PR #60)

### Philosophy

The Marketing Command Center is a read-only, asset-generation layer. It never posts
to social media, never calls external APIs, and never stores data. Everything is deterministic:
given a campaign slug, the same UTM links, copy blocks, and post templates are always produced.
The operator copies assets manually into native platforms.

### Architecture

**`src/lib/admin/campaign-assets.ts`** — Core marketing library:
- `CAMPAIGN_CATALOG` — 5 main campaigns + 1 comment-lead campaign (6 total)
- `BrandCopyBlock` — 6-channel copy per campaign (X/short, Threads/medium, Facebook/full, email subject, email body, flyer)
- `CampaignFlyerSpec` — Print-ready QR + CTA asset spec per campaign
- `buildCampaignUtmLinks(slug, landingPath)` — Parameterized UTM builder (extends Phase 3 UTM system)
- `buildCampaignAssets(slug)` — Full asset set builder
- `getAllCampaignAssets()` — All 6 campaigns

**`src/components/admin/campaign-card.tsx`** — Campaign status card + selector chip:
- `<CampaignCard>` — Name, tagline, status badge, targeting, CTA, landing path
- `<CampaignChip>` — Compact campaign selector for page header

**`src/components/admin/copy-block.tsx`** (client component) — Copy block with clipboard button:
- Shows label, sublabel, char count vs. limit (over-limit warning in ruby-400)
- "Copy" → "Copied ✓" feedback state

**`src/components/admin/platform-post-preview.tsx`** — Platform chrome preview:
- Four platforms: Facebook, LinkedIn, Threads, X
- Renders platform header bar, mock avatar + author, post body, hashtags, over-limit warning
- No interactive elements — display only

**`src/app/(admin)/admin/marketing/page.tsx`** — Marketing Command Center:
- Campaign selector chips (`?campaign=slug` URL param routing)
- Active campaign overview card
- UTM Link Bank (8 platforms per campaign, CopyBlock per link)
- Brand Copy Blocks (4 channel sizes, hashtag bank, comment-capture hook when relevant)
- Platform Post Templates (all 4 platforms with preview + copy)
- QR/Flyer Asset Spec (print-ready instructions + QR URL)
- Weekly Content Calendar (suggested publishing cadence)
- All Campaign Cards grid

### Campaign Catalog

| Slug | Name | Landing | Target Audience |
|------|------|---------|-----------------|
| `amm_launch` | AMM Launch | `/ask` | Broad awareness |
| `home_value` | Home Value | `/value` | Homeowners curious about selling |
| `we_buy_houses` | We Buy Houses | `/ask` | Cash offer recipients |
| `ask_mike` | Ask Mike Anything | `/ask` | Any Wilson real estate question |
| `wilson_authority` | Wilson Authority | `/ask` | Online searchers for Wilson RE info |
| `comment_lead` | Comment-to-Lead | `/ask` | Facebook/IG followers |

### Brand Copy Rules Enforced

- No genie / magic lamp / lamp / wish / mascot copy in any block
- No `ourtownproperties.com` or `vercel.app` in any UTM link or flyer URL
- Wilson NC mentioned in every social copy block
- socialShort ≤ 140 chars, socialMedium ≤ 500 chars, emailSubject ≤ 90 chars
- All 8 UTM platforms use `askmagicmike.com` only
- Facebook link safety: only `/ask` base URL marked `safeToPostOnFacebook: true`

### Static Guards (`tests/brand/marketing-system.test.ts`)

84 tests covering:
- Campaign catalog structure (6 campaigns, all required fields)
- Banned term detection (genie/lamp/mascot/chatbot) in all copy
- Wilson NC presence in every social copy block
- Character limit compliance per channel
- Flyer QR URL domain validation + UTM campaign slug
- UTM link count (8 per campaign), domain safety, parameter presence
- `buildCampaignAssets` for all 6 slugs
- Token guards on all 3 new components + the marketing page

---

## Phase 8 — Analytics Intelligence

**PR:** #61 · `design-system-omega-phase-8-analytics-intelligence`

### Philosophy

The intelligence layer transforms AMM from a dashboard into the operating system for a modern real estate brokerage. Every surface answers: **"So what should I do next?"**

Priority → Urgency → Confidence → Opportunity → Trend → Conversion → Risk → Velocity

### Intelligence Engine (`src/lib/admin/intelligence-engine.ts`)

Pure, deterministic calculation utilities — no side effects, no API calls, fully unit-testable:

| Function | Purpose |
|---|---|
| `calculateConversion()` | Rate (0–100) from numerator/denominator |
| `calculateDropoff()` | Funnel stage dropoff with lost count |
| `calculateTrend()` | Direction + signed % change with display label |
| `calculateVelocity()` | Leads/day + leads/week with trend |
| `calculateMomentum()` | 5-tier: strong → growing → steady → slowing → stalled |
| `calculateHeat()` | Pipeline heat: critical → hot → warm → cool → cold |
| `calculatePipeline()` | Full pipeline with estimated commission + velocity days |
| `calculateOpportunity()` | 3-tier opportunity scoring |
| `calculateAgentRank()` | Agent tier vs avg conversion + response time |
| `calculateCampaignRank()` | Campaign tier vs avg conversion + momentum |
| `calculateSourceRank()` | Source tier by volume share + conversion |
| `calculatePriority()` | Operational priority: critical → high → medium → low |
| `calculateConfidence()` | Data confidence: sample + coverage + consistency |
| `calculateHealthScore()` | A–F health grade across 5 operational dimensions |
| `formatCurrency/Duration/Count()` | Display helpers co-located with domain logic |

### Recommendation Engine (`src/lib/admin/recommendation-engine.ts`)

Deterministic action cards — no LLM, no API, pure functions:

```
buildLeadRecommendations()        → SLA breach, urgent, never-contacted, volume drop
buildCampaignRecommendations()    → top performer, pause candidate, momentum spike
buildAgentRecommendations()       → SLA breach, slow response, top performer
buildSourceRecommendations()      → accelerating platform, underinvested high-converter
buildConversationRecommendations()→ high abandon, early exit, objection detected
buildRecommendationSummary()      → aggregated, priority-sorted, by-category
```

Every `Recommendation` contains: `priority`, `category`, `title`, `reason`, `action`, `impact`, `confidence`, `expectedGain`, `metric?`

### Component Library (`src/components/admin/analytics/`)

`AnalyticsCard` · `MetricGrid` · `MetricTile` · `ExecutiveMetric` · `TrendBadge` · `PerformanceBadge` · `Sparkline` · `ConversionFunnel` · `RecommendationCard` · `InsightCard` · `PipelineCard` · `EmptyState` · `LoadingState` · `NoDataState`

All components: no `red-*` tokens, no hardcoded hex, `motion-safe:` animations, ARIA roles.

### Admin Analytics Pages

| Route | Purpose |
|---|---|
| `/admin/analytics` | Executive Command Center — metrics, priority strip, funnel, health, heat, pipeline, recommendations |
| `/admin/analytics/sources` | Traffic Source Intelligence — platform breakdown, ranked sources, UTM guide |
| `/admin/analytics/campaigns` | Campaign Intelligence — scorecards for all 6 campaigns, momentum |
| `/admin/analytics/conversations` | Conversation Intelligence — intent breakdown, optimization checklist |
| `/admin/analytics/reports` | Executive Reports — Daily Brief, Health Report, copy-ready text blocks |

### Static Guards (`tests/brand/analytics-intelligence.test.ts`)

162 tests: intelligence engine unit coverage, recommendation engine coverage, banned term detection, no-API/no-write guards, component token guards, page-level guards.

---

## Remaining Phases

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Visual System Foundation | ✅ Done (PR #54) |
| 2 | Typography System | ✅ Done (PR #55) |
| 3 | Component Library | ✅ Done (PR #56) |
| 4 | Motion System | ✅ Done (PR #57) |
| 5 | Public Experience | ✅ Done (PR #58) |
| 6 | Dashboard Command Center | ✅ Done (PR #59) |
| 7 | Marketing System | ✅ Done (PR #60) |
| 8 | Analytics Intelligence | ✅ Done (PR #61) |
| 9 | Agent Portal & Assignments | 🔜 Next |
