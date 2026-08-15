# Phase 6 Public UX, Accessibility, and Performance Report

## Audited routes

`/`, `/home-value`, `/value`, `/sell`, `/buy`, `/ask`, `/rent`, `/widget`, `/widget/v1`, and protected Lead Center additions.

## UX result

- Existing Black Diamond navigation, funnel components, Mike photography, and mobile-first path selection are preserved.
- Public success state now confirms storage without an unverified timing promise.
- Consent remains unchecked by default.
- AI facts, suggestions, test state, suppression state, and send-disabled state are visibly distinct.
- Message preview controls have no delivery action.

## Accessibility source review

- Form controls retain programmatic labels, `required`, autocomplete hints, error association, and `aria-invalid`/`role=alert` behavior.
- Widget navigation uses tab roles and `aria-selected`.
- Copilot control is keyboard-operable, exposes busy/disabled state, and returns errors through an alert region.
- Email HTML uses live text, semantic tables for layout, a visible test banner, and plain-text alternative. Critical facts are not embedded only in images.

Automated browser accessibility testing on the new protected screens remains pending authenticated Preview access. This source review is not represented as a complete WCAG conformance audit.

## Performance result

- Production build passes on Next.js 15.5.21.
- Public first-load JavaScript remains approximately 121-123 kB on core conversion routes; the widget remains approximately 118 kB.
- New copilot code is isolated to the protected lead-detail route; message previews are server-rendered.
- No new public image generation, video runtime, analytics vendor, autonomous agent loop, or client secret was added.

Lighthouse/mobile field metrics and same-viewport after screenshots remain Preview acceptance tasks; no unmeasured performance score is claimed.

