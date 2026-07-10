# Public Design System

Ask Magic Mike public surfaces use one premium real-estate visual system: black structural base, warm gold action/emphasis, cream text, deep ruby urgency/error, and restrained cyan technology accents.

## Tokens

Core CSS tokens live in `app/globals.css`.

- `--bd-black`: structural page base
- `--bd-black-2`: secondary dark panel
- `--bd-charcoal`: elevated panel fill
- `--bd-cream`: primary readable text
- `--bd-muted-cream`: secondary text
- `--bd-gold`: primary action
- `--bd-gold-soft`: premium emphasis
- `--bd-ruby`: error, caution, high-intent urgency
- `--bd-cyan-restrained`: focus and technology accent
- `--bd-border-gold`: premium border
- `--bd-glass`: glass panel fill
- `--bd-shadow-lg`: large elevated panel shadow
- `--bd-focus`: visible keyboard focus ring

## Shared Utilities

- `.amm-page-surface`: layered black/gold/cyan page background.
- `.amm-section`: responsive section padding.
- `.amm-container`: constrained public content width.
- `.amm-eyebrow`: small uppercase route/section marker.
- `.amm-glass-card`: glassmorphism panel with border and shadow.
- `.amm-primary-button`: gold primary CTA.
- `.amm-secondary-button`: black/gold secondary CTA.
- `.amm-cyan-button`: restrained cyan action for chat/technology surfaces.
- `.amm-form-field`: consistent input/select/textarea treatment.

## Typography

- Geist Sans is used for interface text.
- Serif display type is reserved for hero, route, and section headlines.
- Hero-scale type should only appear in hero or route-intro contexts.
- Compact panels use smaller headings to prevent crowding.

## Buttons and CTAs

- Primary CTA: gold fill, black text, high contrast.
- Secondary CTA: black glass fill, cream text, gold border.
- Chat action: restrained cyan border, never neon-heavy.
- Buttons must remain at least 48px tall on mobile.
- Duplicate CTAs should be avoided within the same visual cluster.

## Forms

- Each field uses a visible label.
- Validation errors use ruby surfaces and `role="alert"` when immediate correction is needed.
- Success states explain what happens next.
- Busy states use disabled buttons and `aria-busy`.
- Appointment handoff appears after successful lead-intake actions.

## Chat

- User and Mike messages must be visually distinct.
- Starter prompts are useful local real-estate questions, not novelty prompts.
- Loading, error, retry, and contact-handoff states are required.
- The chat must not invent MLS facts, pricing, comps, tax details, or neighborhood claims.

## Widget and Embed

- Widget tabs use accessible tab semantics.
- The iframe launcher must preserve focus when opened and closed.
- Widget content must not overflow a 390px mobile viewport.
- The host page should remain visually dominant; the widget should feel premium but compact.

## Motion

- Motion should be subtle and never required for comprehension.
- `prefers-reduced-motion: reduce` disables transitions and animations globally.

## Imagery

- Mike imagery should remain real, locally credible, and non-cartoonish.
- Social/feed assets may use cinematic lighting but should keep text readable.
- Images should have stable dimensions or aspect ratios to avoid layout shift.

## OTP Trust Strip

Our Town Properties trust treatment should be calm and direct: logo, Wilson/NC context, license/local guidance copy, and clear disclaimers. Do not invent statistics, testimonials, MLS claims, conversion metrics, or sale-price guarantees.
