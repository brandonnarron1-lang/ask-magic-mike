# Ask Magic Mike — Full-Funnel Visual Upgrade Plan

Branch: `visual/full-funnel-premium-upgrade`
Base: `df2b1f3 copy: polish confirmation contact label` (production)

## Funnel surfaces in scope

| Surface | Path | Status | Priority |
| --- | --- | --- | --- |
| Campaign hero | `/value` (`(campaign)/value/page.tsx`) | Live, professional, needs upper-funnel polish + below-fold sections | **High** |
| Intake flow | `/ask` (`(intake)/ask/page.tsx` + 5 steps) | Functional, visually flat | **High** |
| Confirmation | step 5 of intake | Polished last pass — keep + cohesion | High |
| Embed shell | `/embed/ask` (`(embed)/embed/ask`) | Old style ("✦ Ask Magic Mike") | **High** |
| Root metadata | `app/layout.tsx` | Generic ("Local Real Estate AI"); no OG image | Medium |
| Marketing landing | `/` (HeroSection, MarketPulse, etc.) | Pre-existing campaign visual; out of scope for this funnel pass | **Defer** |
| Admin | `(admin)/admin` | Internal; **excluded** | — |
| Chat UI | none found | Per brief, do not invent — log as future | — |

## Current visual weaknesses

1. `/value` is one screen — no proof loop, no "how it works", no objection
   reducer. Paid traffic gets one above-fold shot and then a footer.
2. `/ask` step content (the body of each step) still uses raw form styling
   (`bg-white/5`, `border-white/10`). It doesn't read as the same brand as
   the upgraded `IntakeShell` wrapper.
3. `/embed/ask` still ships the legacy "✦ Ask Magic Mike" lockup, not the
   `BrandHeader` / Mike trust cue.
4. Root metadata has the generic "Ask Magic Mike | Local Real Estate AI" —
   should re-anchor on Mike + Our Town + a usable OG image.
5. The MikeTrustCard renders a square crop and the headshot reaches above
   the eyebrow text, making the card top-heavy on desktop.
6. No reusable `OptionCard`, `ConversionPanel`, or `VisualFrame` —
   secondary chips on `/value` are inline; the path-choice information
   density is too low.
7. Headshot ships as a 435 KB PNG; a WebP source would let `next/image`
   serve a smaller artifact without round-tripping the optimizer.

## Full-funnel visual goals

- **Trust hierarchy:** Mike + Our Town first. AI badge restrained. Magic
  motif is atmosphere only.
- **Conversion shape:** above-fold hero → proof strip → path cards
  ("Compare selling options", "Request direct-purchase review", "Ask Mike a
  question") → "How it works" trio → final trust block → compliance.
- **Cohesion:** every surface ships through `BrandShell` + `BrandHeader`,
  so `/value`, `/ask`, `/embed/ask`, and confirmation read as one product.
- **Motion:** entrance fade-ups, focus glows, hover lifts — all CSS-only,
  all behind `motion-safe:`.
- **Performance:** WebP headshot, explicit dimensions everywhere, no new
  runtime dependencies, no above-fold video.

## Components to upgrade or add

Under `src/components/amm/`:

- **`tokens.ts`** — extend with surface/elevation/motion fragments.
- **`motion.ts`** — class-name fragments for fade-up, hover-lift, focus glow.
- **`brand-shell.tsx`** (new) — page wrapper that owns base palette,
  ambient gradient, and content max-width.
- **`brand-header.tsx`** — upgrade for new compact behavior + active-route
  awareness.
- **`mike-trust-card.tsx`** — wider crop, headshot in a `VisualFrame`, new
  "Local human follow-up" badge, optional `verified` badge.
- **`conversion-panel.tsx`** (new) — address input + primary CTA + AI line,
  reused on `/value` hero and `/embed/ask`.
- **`option-card.tsx`** (new) — used for the three secondary paths plus a
  "How it works" 3-step row.
- **`how-it-works.tsx`** (new amm-scoped) — three numbered step cards.
- **`proof-strip.tsx`** — keep, slim icons.
- **`ai-assist-badge.tsx`** — keep, support inline variant.
- **`compliance-footer.tsx`** — keep as single source of truth.
- **`visual-frame.tsx`** (new) — fixed aspect ratio wrapper for headshot /
  logo / future media.

## Components to preserve unchanged

- Attribution + tracking: `src/lib/attribution/client-storage.ts`,
  `src/hooks/use-session.ts`, `src/hooks/use-intake-flow.ts`,
  `src/app/api/**`, `src/schemas/**`, `src/lib/scoring/**`.
- TCPA copy in `step-consent.tsx`.
- The five intake step components' logic (form state, validation).
- `/admin` surfaces.

## Performance risks + mitigations

| Risk | Mitigation |
| --- | --- |
| Headshot PNG above the fold (435 KB) | Generate a WebP at 640w; `next/image` picks responsive variants. |
| Multiple `next/image` instances on one screen | All non-headshot images stay lazy; only the hero headshot has `priority`. |
| Below-fold sections growing the JS bundle | All new components stay client-component-free where possible. `OptionCard`, `ProofStrip`, `HowItWorks` are pure JSX, no `"use client"`. |
| CLS from images | Every Image has explicit `width`/`height` or sits in a `VisualFrame` with a fixed aspect ratio. |
| Animation cost | All entrance animations are CSS keyframes already declared in `globals.css`; we add a few class fragments, no JS runtime. |

## Compliance guardrails (kept enforced by tests)

- `ComplianceFooter` is the only place disclosure copy lives.
- Public source files may not contain `"Rub the lamp"`, `guaranteed value`,
  `guaranteed offer`, `binding offer`, `instant cash offer`, or `MLS comps`.
- `"appraisal"` may only appear inside `"not an appraisal"`.
- AI language stays in the allowed set: "AI-assisted intake", "Local human
  follow-up", "Reviewed by Our Town Properties", "Preliminary guidance".

## Rollout

1. Build the design system primitives (no UI rewrites yet).
2. Generate WebP headshot derivative; update manifest.
3. Rewrite `/value` to the new structure (BrandHeader, hero, proof strip,
   option cards, how-it-works, trust block, compliance footer).
4. Polish `IntakeShell` + each step's interior (typography + form styling)
   to match.
5. Polish `StepConfirmation` to the same surface vocabulary.
6. Align `EmbedShell` with `BrandHeader` mini.
7. Update root metadata + simple OG copy.
8. Update tests for new copy / new components.
9. Run vitest, tsc, lint, build. Commit. **Preview deploy only.**

## Screenshot QA plan

Playwright is configured (`playwright.config.ts`) but running headed
browsers in this environment is unreliable. The plan is:

- Use `curl` to confirm HTTP 200 + presence of required strings on
  `/value`, `/ask?…`, `/embed/ask` against the local dev server and the
  preview URL.
- Document the manual browser checklist in `docs/ask-magic-mike-visual-qa.md`
  so Atlas can run it against the preview URL.
- Save no screenshots in this branch — Vercel preview is the live artifact.

## Out of scope (logged as next phases)

- `/` marketing landing visual alignment (it has its own pre-existing
  campaign aesthetic — not a paid traffic surface yet).
- Address autosuggest.
- Calendar/scheduling integration.
- A real chat UI.
- `askmagicmike.com` domain attach.
- WordPress edits (separate brief at
  `docs/ask-magic-mike-wordpress-visual-brief.md`).
