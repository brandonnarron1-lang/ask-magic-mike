# Design QA — Ask Magic Mike Wide Social Card

- Source visual truth:
  - `public/brand/black-diamond/hero-home-desktop.jpg`
  - `public/brand/black-diamond/our-town-logo.png`
- Implementation:
  - `public/brand/black-diamond/og-card-1200x630.jpg`
  - `app/social-preview/page.tsx`
- Full-view comparison:
  - `artifacts/phase9/social-preview-wide-card/source-vs-final.jpg`
- Focused identity comparison:
  - `artifacts/phase9/social-preview-wide-card/identity-source-vs-final.jpg`
- Browser-rendered evidence:
  - `artifacts/phase9/social-preview-wide-card/desktop-full.png`
  - `artifacts/phase9/social-preview-wide-card/desktop-card.png`
  - `artifacts/phase9/social-preview-wide-card/mobile-full.png`
  - `artifacts/phase9/social-preview-wide-card/mobile-card.png`
- State: static, non-indexed Social Preview review surface.

## Normalization

- Source pixels: 2880x1620.
- Source normalization: resize to 1200x675, top-align, crop to 1200x630.
- Final card: 1200x630 JPEG at density 1.
- Desktop browser: 1440x1000 viewport; rendered card container
  1230x645.75 CSS pixels with the 1200:630 ratio preserved.
- Mobile browser: 390x844 viewport, 375 CSS-pixel document width; rendered card
  301x158.015625 CSS pixels with document `scrollWidth=clientWidth=375`.
- The browser and source comparisons use matching 1.9048:1 framing. No device
  frame or browser chrome is part of the focused card evidence.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the condensed display face, narrow uppercase location
  line, supporting sans serif, and domain line preserve the selected hierarchy
  and remain crisp in the committed raster. Headline and domain retain priority
  when the card is reduced to mobile preview width.
- Spacing and layout rhythm: logo, rules, headline, supporting copy, and domain
  stay inside the left safe zone. Mike remains isolated on the right with no
  collision at desktop or mobile rendering.
- Colors and visual tokens: `#050505`, `#d5aa36`, `#b91f2e`, and
  `#f5f0e6` match the existing Black Diamond black/gold/red/cream system.
- Image quality and asset fidelity: the final card composites the approved hero
  and exact logo. The focused comparison shows the Mike crop and background are
  source-faithful. Output is a 160 KB, quality-90 JPEG with no transparency or
  crawler-incompatible format.
- Copy and content: all four strings are spelled correctly. No valuation,
  offer, response-time, availability, phone, MLS, lead, or synthetic-prospect
  claim appears.
- Accessibility: the metadata alt text identifies Mike, Our Town Properties,
  Wilson, and the purpose of the image without repeating promotional copy.
- Responsive behavior: the review route has no horizontal overflow at the
  tested mobile width. The exact asset uses `object-cover` inside a matching
  aspect ratio, so no focal content is clipped.

Residual P3: the longest supporting sentence is intentionally secondary at
very small thumbnail sizes. The primary title, brokerage mark, location, and
domain remain readable, so no change is required.

## Comparison history

1. An AI-assisted hierarchy concept was generated from the approved sources.
   It established the left-copy/right-subject composition but subtly changed
   Mike's face. That was treated as a P1 identity-fidelity failure and rejected
   as a runtime asset.
2. The card was rebuilt deterministically from the untouched hero and exact
   logo. The post-fix full and focused comparisons show the approved identity,
   crop, background, logo, copy, and visual hierarchy.
3. Browser QA initially emitted one LCP warning for the existing story asset.
   The existing review-only feed/story images were marked priority; subsequent
   reloads produced no new warning. No browser error was observed.

## Primary interaction and console check

The new surface is intentionally static. Existing primary navigation and footer
links remained present in the rendered DOM. Desktop and mobile loads completed,
the exact card image rendered, and no new console error or warning followed the
post-fix reloads.

## Final result

final result: passed
