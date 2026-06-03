# Ask Magic Mike — Visual Direction (Next Pass)

Phase status: attribution + compliance hardened. **Visual redesign has not
started yet.** This doc captures the direction for the next pass so we don't
lose the thread between phases.

## 1. Current state (do not change yet)

- Funnel entry: `/value` (Wilson/Eastern NC value lookup)
- Intake: `/ask` — 5-step flow (question → intent → contact → consent →
  confirmation)
- Embed shell: `/embed/ask` (CSP-only WordPress iframe)
- WordPress entry CTAs (live):
  - homepage CTA → `/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike`
  - Mike profile → `…&utm_medium=mike_profile&…`
  - We Buy Homes / Seller page → `…&utm_medium=seller_page_cta&…`
- Palette: black `#0A0A0A`, gold `#D4A017` / `gold-400`, cream text, ruby
  accent for "Talk to Mike" chip
- Type: display font + system serif fallback (see `tailwind.config.ts`)

## 2. Visual direction

Premium black / gold / cream with a cyan accent reserved for AI / "Magic"
moments. The visual language should read **boutique brokerage + concierge AI**,
not generic real-estate widget.

| Token | Use |
| ----- | --- |
| `bg-[#0A0A0A]` | All hero backgrounds |
| `gold-400` `#D4A017` | Primary CTA, accent lines, eyebrow chips |
| `cream` | Headlines, body |
| `slate-300/500/600/700` | Secondary text + dividers |
| `ruby-300/400` (existing) | "Talk to Mike" override / urgency |
| New: cyan-300/400 | Magic Mike / AI flourishes only |

Reserved: the genie/lamp visual language is the next hero motif. Treat the
lamp as a one-time entrance animation, not a recurring element.

## 3. Next components (priority order)

1. **Premium landing hero on `/value`** — replace the current address bar
   block with a centered lamp/genie hero that animates in on first paint.
   Address field stays primary; trust line and disclosure stay visible above
   the fold on mobile.
2. **Animated lamp/genie entrance** — Lottie or pure SVG. Plays once per
   session; respect `prefers-reduced-motion`.
3. **Mobile-first address form** — single full-width address input with a
   gold submit button. Place city autosuggest below the input (Wilson, NC
   first). Form must remain visible above the keyboard on iOS Safari.
4. **Step cards on `/ask`** — replace the flat progress bar with a stack of
   3–4 step "cards" that scale into the active card. Carry the lamp accent
   as a small idle animation at the top of each card.
5. **Trust / compliance footer** — house the existing disclosure copy in a
   collapsed footer card so it is consistent across `/value`, `/ask`, and the
   embed shell.
6. **Confirmation appointment CTA** — after submit, lead the user into a
   calendar embed or "Mike will text you within Xm" card with a temperature
   badge and a single secondary CTA (back to ourtownproperties.com).
7. **Social ad visual consistency** — extract the hero motif into a 1080×1080
   and 1080×1920 ad template so paid social uses the same lamp + headline.

## 4. Content inputs available for the next design pass

Use only what is publicly safe — no MLS comps, no confidential listing data:

- existing 30-day content series (Mike's videos, social posts) — pull stills
  and topical hooks
- Our Town Properties homepage tone and color palette
- recorded videos from Mike (genuine voice, conversational)
- Wilson-specific neighborhood photography (Our Town Properties' own assets
  only)

Do NOT use:

- uploaded MLS data, comps, or active listings in the public UI
- third-party listing photography
- guaranteed-valuation language anywhere in copy

## 5. Hard constraints carried forward into the visual pass

- WordPress CTA UTMs must still flow through to `/api/intake/submit` after
  any redesign — keep `captureAttribution()` on the hero mount.
- Compliance disclosure must be visible on `/value` and confirmation; do not
  hide it behind a tooltip or modal.
- Phone CTA remains `+1 (252) 245-4337` (env-driven).
- "Mike Eatmon, licensed North Carolina real estate broker/BIC" and "Our Town
  Properties, Inc." must appear in the footer/trust strip of every public
  route.
- Embed route (`/embed/ask`) must keep the CSP-only iframe policy.

## 6. What to ship in the next phase (suggested scope cap)

One PR. Scope:

- New `<ValueHero>` with lamp entrance + mobile-first form
- Updated `<IntakeShell>` step-card layout
- Updated `<StepConfirmation>` appointment CTA
- New shared `<ComplianceFooter>` component used on `/value`, `/ask`, and
  `/embed/ask`
- Zero changes to API routes, scoring, attribution, schemas, or DB.

Out of scope:

- askmagicmike.com migration / DNS
- new WordPress edits
- IDX or MLS surfaces
- CRM integration changes
- paid-ads launch
