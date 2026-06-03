# Ask Magic Mike — Visual Direction (Next Pass)

Phase status: attribution + compliance hardened, first visual pass shipped,
and **the first visual pass has been replaced by a professional trust-first
rebuild** on branch `visual/professional-mike-trust-funnel`. The earlier
"Rub the lamp" / lamp-as-identity treatment was retired before reaching
production. See `docs/ask-magic-mike-professional-visual-strategy.md` for the
full rationale.

## Shipped in the professional rebuild

- New brand primitives under `src/components/amm/`:
  `tokens.ts` (palette + token classes), `brand-header.tsx` (Our Town wordmark
  + nav + tap-to-call), `mike-trust-card.tsx` (real Mike Eatmon headshot +
  credentials + phone), `proof-strip.tsx` (four proof cards), and
  `ai-assist-badge.tsx` (single small AI/human-follow-up tag).
- `amm-lockup.tsx` trimmed to text + gold dot — no lamp glyph as identity.
- `magic-backdrop.tsx` reduced to a single restrained gold radial; the cyan
  sparkle field was removed from `/value`.
- `compliance-footer.tsx` continues to be the single source of disclosure
  copy. Used on `/value` and confirmation.
- `/value` rebuilt around `BrandHeader` + `MikeTrustCard` + `ProofStrip` with
  the trust-first headline, sub, and CTA copy. Three secondary chips:
  "Compare selling options", "Request direct-purchase review", "Ask Mike a
  question" (mapped to the existing CTA enum).
- `/ask` intake shell now renders the `BrandHeader` (compact), a small "Mike's
  team reviews the details" trust cue with Mike's headshot, a clean step
  card, and the AI-assist badge below the card.
- Confirmation: "Your request is in" eyebrow + check, Mike headshot in the
  assignment card, gold "Call Mike" CTA, secondary "Visit Our Town
  Properties" link, compliance footer at the bottom.

Behavior preserved:

- UTM capture + persistence in `sessionStorage` and forwarding into `/ask`
  unchanged.
- Lead submit payload schema unchanged.
- API contracts, scoring, routing, CRM tags unchanged.
- All TCPA / consent flow unchanged.

Replaced / removed from public UI:

- The "Rub the lamp." headline.
- The genie lamp glyph as primary identity.
- The cyan sparkle field on `/value`.
- The cartoon lamp success mark on confirmation.

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

## 3. Next components (queued after the professional rebuild)

Done in the rebuild:

- [x] Premium landing hero on `/value` (trust-first, no cartoon lamp)
- [x] Mobile-first stacked address form
- [x] Brand-headered, professional step card on `/ask`
- [x] Shared compliance footer
- [x] Confirmation success state with Mike's headshot + Call Mike CTA
- [x] AI-assist badge in place of any genie / lamp identity

Still queued:

1. **Address autosuggest** — autosuggest under the input (Wilson, NC first)
   once we wire a geocoder/places provider that's safe for production.
2. **Real appointment scheduling** — confirmation currently leads with
   `tel:` because no scheduling integration is wired. Swap to a calendar
   embed when the integration is approved.
3. **Social / video ad templates** — the lamp/genie creative continues to
   have a home in paid social and video. Build 1080×1080 and 1080×1920
   templates that lean into Magic Mike personality while preserving the
   trust-first hierarchy.
4. **`askmagicmike.com` migration** — DNS, Vercel domain attach, redirect
   plan, sitemap, OG image set. Out of scope until production approval.
5. **Per-step micro-illustrations** — small gold accents per intake step to
   reinforce brand without crowding form fields. Optional polish.

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
