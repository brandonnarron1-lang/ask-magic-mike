# Ask Magic Mike — Visual Direction (Next Pass)

Phase status: attribution + compliance hardened **and first visual pass
shipped** (lamp lockup, magic backdrop, redesigned `/value` hero, polished
intake step cards, polished confirmation, shared compliance footer). This doc
captures what is in place and what is still queued for the follow-on visual
sweep.

## Shipped in the current visual pass

- `src/components/amm/tokens.ts` — small visual constants module reused across
  /value, /ask, and confirmation (page shell, card surface, input shell, gold
  buttons, eyebrow, compliance text).
- `src/components/amm/amm-lockup.tsx` — `AmmLockup` brand mark + `LampGlyph`
  SVG (cyan flame is the only cyan accent in the system).
- `src/components/amm/magic-backdrop.tsx` — atmospheric layer (gold + cyan
  radial gradients) and an optional `Sparkles` field used on the hero.
- `src/components/amm/compliance-footer.tsx` — single source of disclosure
  copy. Used on `/value` and the confirmation screen.
- `/value` redesigned: lamp visual, "Rub the lamp." headline, "Start With Your
  Address" primary CTA, three secondary chips ("Thinking of selling", "Just
  curious", "Need local guidance" → mapped to existing CTA enum values),
  trust bullets row, mobile-first stacked address form.
- `/ask` intake shell now renders steps inside a gold-bordered step card with
  the AMM lockup and the active step label.
- Confirmation: "Your request is in" eyebrow, lamp-on-check success mark,
  assignment card with lamp glyph, gold "Call Mike now" CTA, shared
  compliance footer underneath.

Behavior preserved:

- UTM capture + persistence in `sessionStorage` and forwarding into `/ask`
  unchanged.
- Lead submit payload schema unchanged.
- API contracts, scoring, routing, CRM tags unchanged.
- All TCPA / consent flow unchanged.

## 1. Current state

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

## 3. Next components (still queued after this pass)

Done in this pass:

- [x] Premium landing hero on `/value` with lamp visual
- [x] Mobile-first stacked address form
- [x] Branded step cards on `/ask`
- [x] Shared compliance footer
- [x] Confirmation success state with a direct phone CTA

Still queued:

1. **Animated lamp/genie entrance** — Lottie or pure SVG entrance animation.
   The current lamp is a static SVG with a float idle. Add a one-shot
   entrance that respects `prefers-reduced-motion`.
2. **Address autosuggest** — autosuggest under the input (Wilson, NC first)
   once we wire a geocoder/places provider that's safe for production.
3. **Real appointment scheduling** — confirmation currently leads with "Call
   Mike now" (`tel:` link) because no scheduling integration is wired. Swap
   to a calendar embed when the integration is approved.
4. **Step micro-illustrations** — small lamp/sparkle motif on each step
   header to reinforce the brand without crowding form fields.
5. **Social ad visual consistency** — extract the hero motif into 1080×1080
   and 1080×1920 ad templates so paid social uses the same lamp + headline.

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
