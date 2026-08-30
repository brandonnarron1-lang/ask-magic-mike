# Phase 9 responsive conversion-identity polish

Date: 2026-08-24

Status: Draft PR #213, stacked after Draft PR #211; Production unchanged

## Reuse-first decision

The Black Diamond public experience already has the correct Our Town
Properties identity, Mike imagery, premium dark/gold visual system, canonical
Home Value, seller, buyer, Plan, and Ask paths, durable lead command, consent,
attribution, analytics, notification, and Lead Center boundaries. This change
does not create another funnel, header system, route, form, visual language,
image, API, database, or provider.

It extends the shared `BlackDiamondHeader` that every public conversion
surface already uses. The existing Ask CTA and PR #211 skip-link behavior stay
intact.

## Evidence-led audit

A fresh screenshot-first audit of the exact PR #209 Preview covered the public
homepage, Home Value, Sell, Buy, and Ask surfaces on desktop and mobile. The
visual identity, trust language, form labels, hierarchy, and responsive form
composition were healthy. The same source-level gap remained on the exact PR
#211 parent: below the desktop breakpoint the complete intent navigation is
hidden and only the Ask CTA remains.

That forced a mobile consumer who entered Buyer, Seller, Home Value, Plan, or
Ask to use the logo as an implicit back action or scroll to the footer before
switching intent. The desktop header also gave no semantic or visible signal
for the current route.

## Implementation

- Reuses the shared public header and existing Home Value, Sell, Buy, Plan,
  and Ask destinations.
- Keeps `Ask Mike` visible as the high-value direct CTA.
- Adds one compact mobile menu with a 44-pixel trigger, readable two-column
  intent grid, full-width Ask destination, existing gold/cyan intent accents,
  and current-route treatment.
- Adds labeled primary-navigation landmarks and `aria-current="page"` to the
  current destination on desktop and mobile.
- Supports button toggling, Escape dismissal with focus returned to the menu
  trigger, outside-pointer dismissal, and automatic close on path selection.
- Preserves the PR #211 skip link as the first header control.
- Uses a narrower logo at the 320-pixel breakpoint and non-wrapping Ask CTA so
  the header has no horizontal overflow.
- Declares the existing global smooth-scroll behavior on `<html>` using
  `data-scroll-behavior="smooth"`, preventing Next.js route-transition warning
  noise without changing motion behavior.

## Accessibility and trust boundary

The menu is ordinary navigation, not a dialog, and does not trap focus. Its
trigger exposes `aria-expanded` and `aria-controls`; the open/close icons are
decorative; every destination retains visible text. Current-route styling is
supplementary to `aria-current`, not the only state signal. Existing
reduced-motion scroll behavior remains unchanged.

No consumer claim, brokerage identity, consent copy, protected-class logic,
lead score, routing rule, contact field, or legal disclaimer changed.

## Dependency and release order

Draft PR #213 is synchronized with exact sealed Draft PR #211 head
`c5700eda5e32ff6ead9a985c86b811a3c46e1e66`. Its immediately prior head is
preserved at
`rescue/amm-pr213-pre-pr211-exact-seal-20260828-215231`. Its order is:

1. accepted PR #209 durability release;
2. PR #210 canonical alias consolidation;
3. PR #211 Ask conversion accessibility; and
4. PR #213 responsive conversion-identity polish.

PR #213 has no current merge or Production authority. After every predecessor
is accepted, refresh it onto exact `main`, rerun exact-head Node 24, immutable
Preview, protected no-write, 320/390/desktop, keyboard, console, security, and
isolation acceptance, then request only:

`APPROVE PHASE 9 RESPONSIVE CONVERSION IDENTITY POLISH MERGE AND PRODUCTION DEPLOYMENT`

The historical shorter “conversion identity polish” phrase released PR #195
and is exhausted. It cannot authorize PR #213.

## Rollback

Revert the PR #213 application commit or restore the immediately preceding
verified Vercel deployment. There is no schema, environment, provider,
WordPress, analytics, lead-data, consent, assignment, or notification rollback.

No Production deployment, environment change, database write/migration,
lead/event submission, email/BCC, SMS, Push, WordPress/GTM/GA4 change, DNS
action, publication, spend, deletion, or NellySelly action occurred.
