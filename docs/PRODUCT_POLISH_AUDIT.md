# Ask Magic Mike — Product Polish Audit

**Date:** 2026-06-30  
**Branch:** `polish/unforgettable-product-finalization`  
**Auditor:** Autonomous Product Audit (Sonnet 4.6)  
**Baseline:** 2054 tests passing, TypeScript clean, production live at askmagicmike.com

---

## Executive Summary

The core infrastructure (lead capture, scoring, routing, analytics, rate limiting, admin) is production-grade. The surface-level product — what a user actually sees and feels — had several high-impact conversion gaps that this branch closes. The visual system (Titan VI-VIII) is strong. The AI demo is premium but needs a clearer disclaimer. Distribution infrastructure exists but has attribution fragmentation and missing embed generator UI.

---

## Section 1: Public Pages

### Homepage (`/`)

**Strong:**
- JSON-LD `@graph` with `RealEstateAgent`, `LocalBusiness`, `WebSite` + `SearchAction`
- HeroSection with cycling conversation preview and full CTA chip system
- AiDemoSection — premium animated typewriter showcase with IntersectionObserver analytics

**Issues Found + Fixed in this branch:**

| Issue | Severity | Fix Applied |
|-------|----------|-------------|
| `WhyMike`, `MikeCard`, `FaqStrip` components existed but were never rendered — homepage had no "why Mike", no "Meet Mike" section, no FAQ | P0 | Added all three to `page.tsx` between `AiDemoSection` and `MarketPulse`, and `FaqStrip` before `Footer` |
| No mobile navigation — center nav links (`/value`, phone, location) hidden on mobile with no hamburger | P0 | Added hamburger + slide-down drawer in `hero-section.tsx` with links to `/value`, call, and `/ask` CTA |

**Remaining items (not in scope this sprint):**
- `how-it-works.tsx` (landing version) still not rendered — the value page uses the `/amm/` version. Landing version is a duplicate. Recommend deleting or merging.
- `why-mike.tsx` client component heavy on imagery; consider SSR-able variant for LCP

### Ask Page (`/ask`)

**Strong:**
- Layout (`ask/layout.tsx`) already exports full `metadata` with OG and Twitter cards — no gap
- `captureAttribution()` → `useMemo` pattern prevents session re-creation on re-renders
- Double-submit guard (`submittingRef`) prevents duplicate lead creation

**Issues Found + Fixed:**

| Issue | Severity | Fix Applied |
|-------|----------|-------------|
| `<Suspense>` wrapper had no `fallback` — blank screen during client hydration | P0 | Added `AskLoadingSkeleton` component as Suspense fallback |

### Value Page (`/value`)

**Strong:**
- Full JSON-LD with `hasOfferCatalog` and service area markup
- `MagicMikeWidgetFloating` as persistent secondary conversion path
- `lg:sticky` trust card stays in view while scrolling
- Three `OptionCard` paths pre-fill `/ask` with intent context

**Issues Found (not fixed — requires data):**
- `ConversionPanel` address input error handling not audited — confirm graceful error display
- No A/B test markers distinguishing `/value` → `/ask` traffic beyond UTM

---

## Section 2: Embed / Widget

**Strong:**
- `amm-loader.js` is dependency-free, idempotent, dual-selector (`[data-amm-embed]` + `.amm-embed`)
- Embed page fires `page_view` analytics event on session establishment
- `EmbedShell` correctly separated from `IntakeShell`

**Issues Found + Fixed:**

| Issue | Severity | Fix Applied |
|-------|----------|-------------|
| `amm-loader.js` silently dropped `utm_content` and `utm_term` — any campaign using ad creative IDs or keyword attribution lost those params from embedded leads | P1 | Added `data-utm-content` and `data-utm-term` attribute forwarding in `buildEmbedUrl()` |

**Issues Found (not fixed — requires decision or data):**
- No `postMessage` auto-resize bridge — iframe clips if form grows taller than `data-height` (580px default)
- No admin UI for generating embed snippets with UTM presets — admin must hand-construct snippets from docs
- OTP Mike profile page and Seller page embed placements still not installed (external WordPress action)
- UTM source inconsistency: `ourtownproperties` vs `ourtown_wp` vs `wordpress` for same traffic source — needs normalization decision from Mike/Brandon

---

## Section 3: Admin Surfaces

**Strong:**
- 30+ admin pages covering leads, analytics, intelligence, automation, distribution, revenue, routing
- All admin pages use `force-dynamic` + `revalidate = 0`
- Graceful degradation when Supabase not configured

**Issues Found (not fixed — requires investigation):**
- Admin auth: `src/lib/admin/auth.ts` exists but middleware route guard for `/admin/**` was not confirmed. Verify `src/middleware.ts` protects all admin routes.
- Agent portal (`/agent/**`) exists but does not appear in admin nav — may be undiscoverable

---

## Section 4: AI Demo / Skills

**Strong:**
- `AiDemoSection` is a premium, fully-animated showcase: typing indicator, tool-call terminal, word-by-word stream, confidence bar, source tags
- `aria-live="polite"` on response area
- Progress dots are interactive `role="tab"` buttons
- Fires analytics `ai_demo_viewed` via `IntersectionObserver`

**Issues Found (not fixed — design decision required):**
- Demo is 100% hardcoded — `DEMO_EXCHANGES` are static `as const`. This is intentional for reliability, but the "Illustrative examples" disclaimer is `text-xs text-slate-600` and nearly invisible.
- The tool-call display shows `search({ market: "Wilson-NC" })` as decorative — no live AI call occurs in the intake flow. If real AI responses are ever shipped, this component must be clearly distinguished.
- `ENABLE_AI_GENERATION=false` — Anthropic SDK installed but AI generation for marketing assets disabled by default; no live AI question-answering endpoint exists in the current intake flow.

**Recommendation:** Add a slightly more prominent disclaimer badge near the demo section header: "Demo using representative examples" in gold/cream at `text-xs` with a subtle border. Avoid changing the visual weight of the demo itself.

---

## Section 5: Widget Distribution

**Strong:**
- Admin Distribution Command Center is a complete editorial ops tool
- `docs/WORDPRESS_INSTALL_PACKET.md` has precise copy-paste HTML for 5 placement scenarios
- `amm-loader.js` deployed at `/embed/amm-loader.js` and production-ready

**Issues Found (not fixed):**
- No in-app embed snippet generator — admin must use docs manually
- OTP profile page and Seller page placements not installed

---

## Section 6: Marketing / Templates

**Strong:**
- `campaign-assets.ts` defines 6 campaigns with full copy blocks (social short/medium/full, email, flyer, hashtags)
- `viral-post-builder.ts` enforces platform character limits
- `utm-link-builder.ts` properly constructs tracked links
- All deterministic — safe in any server context

**Issues Found (not fixed):**
- `comment_lead` campaign references Facebook comment-capture but no webhook infrastructure exists for it
- No admin UI for direct copy-paste campaign copy beyond what the distribution page shows

---

## Section 7: Site Config and Metadata

**Strong:**
- `siteConfig` is the canonical source of truth for all domains, phone numbers, and URLs
- Root layout sets `<html lang="en">`, correct `metadataBase`, skip-to-content link
- Sitemap includes only `/` and `/value` — correct

**Issues Found (not fixed — requires env var action):**
- `NEXT_PUBLIC_AGENT_LICENSE` is placeholder — `TrustBar` conditionally shows license number; if env var unset, only "Licensed NC Broker" renders (no number). Needs to be set in Vercel production env to display Mike's actual NC broker license number.
- `siteConfig.agentProfileUrl` → `ourtownproperties.com/agents/mike-eatmon/` — verify this URL is live

---

## Section 8: Styles / Design Tokens

**Strong:**
- Comprehensive design system with 1400-line `globals.css`
- Fluid typography with `clamp()`, `xs: "420px"` custom breakpoint, 18 named animations
- `motion-safe:` prefix used throughout

**Issues Found + Fixed:**

| Issue | Severity | Fix Applied |
|-------|----------|-------------|
| `faq-strip.tsx` had inline `<style>` tag injecting `@keyframes faqBorderIn` on every render | P3 | Moved to `globals.css` |
| `step-confirmation.tsx` had inline `<style>` tag injecting `@keyframes confettiFly` and `.confetti-piece` rule | P3 | Moved both to `globals.css` |

---

## Section 9: Tests

**Baseline:** 2054 tests passing (Vitest unit + integration)

**Issues Found (not fixed — future sprint):**
- `verify` script excludes E2E tests — `pnpm verify` can pass while Playwright tests fail
- Playwright homepage spec tests JSON-LD schema but not the new landing sections (WhyMike, MikeCard, FaqStrip)
- No E2E tests for mobile nav
- Error page does not fire analytics — error frequency cannot be measured

---

## Section 10: Distribution / OTP Integration

**Strong:**
- `ourtownproperties.com/ask-mike/` confirmed live with iframe embed
- UTM source `"wordpress"` recognized in attribution rollup files
- `lead-source-reconciliation.ts` handles OTP source matching

**Issues Found (not fixed):**
- Three UTM source strings for the same traffic: `ourtownproperties`, `ourtown_wp`, `wordpress` — source reports will be fragmented. Recommend standardizing to `ourtownproperties` everywhere and updating the WordPress packet doc.
- Mike's OTP agent profile page and Seller page embeds remain uninstalled — highest-intent pages on the parent brand site

---

## Changes Applied in This Branch

| File | Change |
|------|--------|
| `src/app/page.tsx` | Wire `WhyMike`, `MikeCard`, `FaqStrip` into homepage render order |
| `src/app/(intake)/ask/page.tsx` | Add `AskLoadingSkeleton` as Suspense fallback |
| `src/components/landing/hero-section.tsx` | Add mobile hamburger nav + slide-down drawer |
| `public/embed/amm-loader.js` | Forward `utm_content` and `utm_term` from element attributes |
| `src/app/globals.css` | Add `@keyframes faqBorderIn`, `@keyframes confettiFly`, `.confetti-piece` rule |
| `src/components/landing/faq-strip.tsx` | Remove inline `<style>` block |
| `src/components/intake/step-confirmation.tsx` | Remove inline `<style>` block |
| `docs/PRODUCT_POLISH_AUDIT.md` | This document |

---

## Priority Backlog (Not In This Branch)

| Priority | Issue | Notes |
|----------|-------|-------|
| P0 | Set `NEXT_PUBLIC_AGENT_LICENSE` env var in Vercel | Mike's NC broker number; human step |
| P1 | Normalize UTM source to single value across all WordPress embeds | Requires WordPress packet update + QA |
| P1 | Install embed on OTP Mike profile page and Seller page | Requires OTP WordPress access |
| P1 | Admin embed snippet generator UI | Card in Distribution Command Center |
| P2 | `postMessage` iframe auto-resize bridge | Prevents clip on long intake flows |
| P2 | Verify admin middleware route guard on `/admin/**` | Security check |
| P2 | Confirm `siteConfig.agentProfileUrl` is live on OTP site | JSON-LD quality |
| P3 | E2E coverage for mobile nav and new landing sections | Playwright spec additions |
| P3 | AI demo disclaimer badge — slightly more prominent | Copy/design decision |
| P3 | Delete or merge duplicate `landing/how-it-works.tsx` | Dead code cleanup |
