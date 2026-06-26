# Launch-Ready Visual QA Checklist

Pre-launch checklist for Ask Magic Mike visual quality and system consistency.
Run after every wave of design changes.

---

## Color System

- [ ] Zero `red-500` / `red-400` / `red-300` in production UI — all urgent/error states use `ruby-400`
- [ ] Urgent/critical/blocked states: `bg-ruby-400/[0.12–0.14] text-ruby-300/400 border-ruby-400/30`
- [ ] Hot/warning/attention states: `bg-amber-400/[0.10–0.20] text-amber-300/400`
- [ ] Success/safe/positive states: `bg-emerald-500/[0.04–0.15] text-emerald-400`
- [ ] Page backgrounds: `bg-[#080806]` or `bg-[#0A0A0A]` or `bg-[#0D0B07]`
- [ ] Primary text: `text-[#F4F4F4]`
- [ ] Cream text: `text-cream` or `text-[#F5F0E8]` or `text-[#F7F1E8]`
- [ ] No hardcoded `text-white` in UI components

## Typography System

- [ ] Metric values (stats, KPIs, counts): `font-bebas text-3xl/4xl/5xl leading-none`
- [ ] Section headers: `text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500`
- [ ] Display headlines (public): `font-display text-4xl–7xl font-bold`
- [ ] Admin page titles: `font-display text-[22px] font-semibold`
- [ ] Eyebrow labels: `text-xs font-semibold tracking-[0.25em] uppercase text-gold-400`
- [ ] Body: `font-body` (Inter, inherited from html/body)

## Motion Safety

- [ ] `globals.css` `@media (prefers-reduced-motion: reduce)` block present and covering all entry animation classes
- [ ] No `motion-reduce:animation-none` (invalid Tailwind class) — use global CSS block instead
- [ ] `motion-reduce:transition-none` on interactive transitions (hover lifts, CTA buttons) — OK
- [ ] `animate-ticker` suppressed by `prefers-reduced-motion` global block
- [ ] `text-gold-shimmer` suppressed by `prefers-reduced-motion` global block
- [ ] No `duration-400` (invalid Tailwind scale) — use `duration-300`, `duration-500`, or `duration-[400ms]`

## Admin Screens

- [ ] All admin stats/KPI values: `font-bebas text-4xl leading-none`
- [ ] All admin locked states use `text-ruby-400` heading (not `text-red-400`)
- [ ] All table empty states have a premium empty-state design (not plain `text-slate-400` cell)
- [ ] All filter inputs have explicit `text-[#F4F4F4] placeholder:text-slate-600`
- [ ] `border-white/12` → `border-white/[0.12]` (arbitrary syntax for correctness)

## Intake Funnel

- [ ] Error banner: `border-ruby-400/30 bg-ruby-400/[0.08] text-ruby-300`
- [ ] Step progress indicator visible and accurate
- [ ] StepConsent TCPA block uses `card-gradient-border` + Lock icon
- [ ] StepConfirmation assignment card uses inset gold accent shadow
- [ ] `/ask` error state — ruby palette
- [ ] `/embed/ask` error state — ruby palette (matches `/ask`)

## Public Landing

- [ ] TrustBar is a glass card band (not a plain flex row)
- [ ] HeroSection stats use `font-bebas` in divided-cell layout
- [ ] SoldSection metric values use `font-bebas text-xl text-gold-400`
- [ ] MikeCard CTA uses static precision box-shadow (no `animate-pulse-gold`)
- [ ] MarketPulse OTP badge uses gradient fill
- [ ] WhyMike uses `duration-300` (not invalid `duration-400`)
- [ ] FaqStrip accordion open indicator: `bg-gold-400 text-midnight`
- [ ] No emoji in any UI element (text, icons, labels)

## Social Preview / Domain Safety

- [ ] All public/social links use `askmagicmike.com` as the canonical domain
- [ ] `ourtownproperties.com` NOT used in social share URLs (WAF blocks `facebookexternalhit`)
- [ ] OG image at `/og` renders `askmagicmike.com` branding
- [ ] `robots.txt` and `sitemap.xml` reference `askmagicmike.com`

## Validation Commands

```bash
# TypeScript
./node_modules/.bin/tsc --noEmit

# Tests (must be 1020/1020)
./node_modules/.bin/vitest run --reporter=dot

# Build (must complete with 0 errors)
./node_modules/.bin/next build

# Funnel verify (must be 15/15)
node scripts/amm/verify-live-conversion-funnel.mjs

# Production alias check (before any deploy)
node scripts/amm/verify-production-alias.mjs
```

## Pre-Deploy Gate

Before opening any PR:
1. All five validation commands pass
2. No `red-500` remaining in UI components (grep check)
3. Branch has been rebased on `main`
4. GitHub ruleset bypass is disabled (verify with GET /repos/*/rulesets/17291635)

```bash
# Quick red-500 grep check
grep -r "red-500\|red-400\|red-300" src/app src/components --include="*.tsx" | grep -v "node_modules"
```

## Completed Waves

| Wave | Branch | PR | Status |
|------|--------|----|--------|
| Wave 1 | product/renaissance-wave1 | — | Merged via PR #33 |
| Wave 2 | product/renaissance-wave2 | — | Merged via PR #33 |
| Wave 3 | product/renaissance-wave3 | — | Merged via PR #33 |
| Wave 4 | product/renaissance-wave4 | Pending | In progress |
