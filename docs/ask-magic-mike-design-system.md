# Ask Magic Mike — Design System

A small, opinionated system for the Ask Magic Mike funnel. Built on Tailwind +
`lucide-react` + `next/image`. No new runtime dependencies.

## Tokens

Reusable class fragments live in `src/components/amm/tokens.ts`.

### Colors

| Role | Value | Used as |
| --- | --- | --- |
| Page base | `#05070A` | `BrandShell` background |
| Card surface | `#0F131A` | `MikeTrustCard`, `OptionCard`, step card |
| Input surface | `#0B0E14` | `ConversionPanel` input, intake textareas |
| Warm text | `#F7F1E8` | Headlines, primary body |
| Slate text | `slate-300/400/500` | Secondary/microcopy |
| Gold accent | `gold-400` (`#D4A017`) | CTA, eyebrows, focus rings, dividers |
| Gold light | `gold-200/300` | Hover/active states |
| Cyan accent | `cyan-200/300/400` | AI-assist badge **only** — < 5 % visual weight |
| Ruby | `ruby-300/400` | Reserved for warnings / urgency only |

### Typography

| Class | Use |
| --- | --- |
| `font-display` | Page headlines and section headers |
| `font-body` | Body and form controls |
| `text-gold-shimmer` | One accent phrase per hero |

Heading sizes are clamped:

```ts
fontSize: "clamp(2.2rem, 5.4vw, 3.7rem)" // /value hero h1
```

### Buttons

`ammTokens.buttonGold`, `buttonGoldLg`, `buttonSecondary`. Compose with
`motion.focusGold`. Avoid bespoke button styles in new components.

### Cards

`ammTokens.trustCard`, `panel`, `stepCard`. Use `VisualFrame` to host any
image so aspect ratios stay locked and CLS stays at zero.

## Components

| Component | Purpose |
| --- | --- |
| `BrandShell` | Page root; owns dark base, ambient gradient, font color |
| `BrandHeader` | Logo + lockup + click-to-call; `compact` for `/ask` and `/embed/ask` |
| `MikeTrustCard` | Trust anchor — headshot + credentials + AI badge. `compact` for intake header |
| `ConversionPanel` | Reusable address input → `/ask` handoff with UTM forwarding |
| `OptionCard` | Path card that forwards a CTA chip + UTM-aware navigation. `ribbonTone: "ruby"` for the direct-purchase path |
| `HowItWorks` | Three-step reassurance band |
| `ProofStrip` | Four icon + text proof cards |
| `AiAssistBadge` | `default` (card), `subtle`, `inline` (pill) |
| `ComplianceFooter` | Single source of disclosure copy. Do not duplicate. |
| `VisualFrame` | Fixed-aspect, rounded media container |
| `MagicBackdrop` | Single warm radial behind hero/card |
| `AmmLockup` | Text + dot brand mark for sub-locations |
| `MagicMikeAvatar` | Mike circular trust anchor with `state` cues (idle/listening/thinking/cta/success) |
| `MagicMikeWidgetLauncher` | Floating bottom-right launcher with accessible "Ask Magic Mike" label |
| `MagicMikeAnswerReveal` | CSS-only gold smoke wash for answer cards |

### Asset registry

`src/components/amm/brand-pack-assets.ts` is the single source for every
public-facing image. Components import from the registry instead of
hard-coding `/images/...` paths so the tests can statically verify nothing
references MLS / flexmls sources.

## Motion

`src/components/amm/motion.ts` exports class fragments:

- `motion.fadeUp`, `fadeUpDelay100/200/300/500` — entrance fades
- `motion.hoverLift` — 2 px lift with gold shadow on hover
- `motion.hoverGold` — gold border/bg shift on hover
- `motion.focusGold` — gold focus ring
- `motion.scaleIn`, `reveal` — for orchestrated reveals

All entrance animations are wrapped in `motion-safe:` so reduced-motion users
see a still page. There is no JS-driven animation runtime in this funnel.

## Mobile rules

- Form controls stack vertically below `sm` (640 px).
- The hero address input becomes full-width with a full-width gold submit.
- `MikeTrustCard` collapses below the copy column at `lg` and below.
- Phone CTA shows `(252) 245-4337` on `xs+` (≥ 420 px), "Call Mike" below
  `xs`. The `xs: 420px` breakpoint is set in `tailwind.config.ts`.

### Readability minimums

After Atlas QA, the funnel now enforces these floors:

| Surface | Minimum | Was |
| --- | --- | --- |
| `ComplianceFooter` | 12 px / `slate-400` | 10–11 px / `slate-500/600` |
| `ProofStrip` labels | 13.5 px / `[#F7F1E8]/92` | 12.5 px / `slate-200` |
| `MikeTrustCard` body | 13 px / `slate-200` | 12.5 px / `slate-300` |
| `OptionCard` body | 13.5 px / `slate-200` | 13 px / `slate-300` |
| `HowItWorks` body | 13 px / `slate-200` | 12.5 px / `slate-300` |
| AiAssistBadge inline | 11.5 px / `cyan-100` | 10.5 px / `cyan-200/85` |
| Confirmation labels | 11 px / `gold-300` | 10.5 px / `gold-300/80` |

Anything smaller is reserved for non-essential decoration and explicitly
avoided for copy a real user might need to read.

## Image rules

- All public images: `next/image` with explicit `width`/`height` or
  `fill` + a fixed-aspect parent.
- Prefer the WebP source (`mike-eatmon-headshot.webp`,
  `our-town-properties-logo.webp`). PNG fallbacks remain in the repo for
  email and external tools.
- The only `priority` image is the trust-card headshot on `/value`.
- No new image source goes public without an entry in
  `docs/ask-magic-mike-asset-manifest.md`.

## Compliance language (reference)

Allowed:

- preliminary home value range
- local guidance
- AI-assisted intake / Local human follow-up
- Mike Eatmon · Our Town Properties, Inc. · Licensed in North Carolina ·
  Selling real estate since 1993
- not an appraisal · no agency relationship unless a written brokerage
  agreement is signed
- preliminary direct-purchase review · subject to review

Forbidden in public UI:

- Rub the lamp
- appraisal (except in "not an appraisal")
- guaranteed value · guaranteed offer
- binding offer · binding cash offer
- instant cash offer
- MLS comps

Enforced by `tests/compliance/value-copy.test.ts`.
