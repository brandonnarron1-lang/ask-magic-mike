# Phase 8 public visual acceptance

Date: 2026-08-18. Production: `https://www.askmagicmike.com` at deployment `dpl_2vgceZpCb4PSuoYffvwi7QAxYnrX`.

Routes inspected: `/`, `/sell`, `/buy`, `/value`, `/ask`, `/widget/v1`, `/thank-you`, and an intentional 404 state.

Viewports inspected: 320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920 CSS pixels. Result: 72 route/viewport checks, zero horizontal-overflow failures, and zero unexpected browser console errors or warnings. The deliberate 404 route produced its expected 404 resource message. Viewport evidence was captured at 390 and 1440 pixels. The `/value` empty-address action produced an accessible alert without creating a lead.

Acceptance notes:

- Mobile and desktop content remains readable and unclipped.
- Public paths retain truthful human-review language.
- The widget renders within every tested width without document overflow.
- Thank-you and intentional error states render as standalone states.
- No production lead was submitted during Phase 8 visual acceptance.
- Reduced-motion/high-zoom behavior remains covered by existing release tests; no current browser regression was detected.
- QA harness note: full-page capture in the in-app browser was rejected after it was proven to reflow responsive pages to their minimum content width during capture. Fresh viewport-only Playwright evidence matched the live computed layout (`1280px` content grid at a `1440px` viewport), so no production UI change was warranted.
- The automated visual pass stubs only `/api/events` and `/api/widget/events` with local `204` responses so its 72 rapid page views do not pollute production analytics or trigger telemetry rate limits. Lead and form endpoints are never called.

Evidence: `output/phase8/screenshots/public/`, `output/phase8/data/public-visual-metrics.json`, and the generated mobile/desktop montages.
