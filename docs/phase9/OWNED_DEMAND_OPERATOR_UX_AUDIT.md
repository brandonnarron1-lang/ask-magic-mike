# Phase 9 owned-demand operator UX audit

Date: 2026-08-21

Scope: protected root-router `/admin/distribution` at desktop and mobile
Production-render dimensions, using synthetic local-only Basic authentication
and no database configuration.

## User goal and accessibility target

The operator should be able to understand the current demand constraint, find
the safest next owned channel, obtain all approved drafts and tracked links for
that channel, and preserve the separate publication-approval boundary without
guessing or opening a second campaign system.

The visible path should remain usable at 1440 × 1000 and 390 × 844, expose a
logical heading order, use native links, buttons, and details disclosure, and
avoid horizontal overflow.

## Current-run steps

| Step | Surface | Health after remediation |
|---|---|---|
| 1 | Read command state, live-lead totals, attribution, and measured bottleneck | Healthy |
| 2 | Review the three retained seller, buyer, and renter offers | Healthy |
| 3 | Follow the recommended first move to Google Business Profile | Healthy |
| 4 | Copy one complete channel flight containing the general placement, three offer placements, tracked URLs, and review boundaries | Healthy |
| 5 | Expand individual offer placements when a single draft or URL is needed | Healthy |

## Confirmed strengths

- The Black Diamond hierarchy clearly separates state, metrics, offer imagery,
  channel drafts, tracking URLs, and approval boundaries.
- Retained high-resolution Mike imagery is legible and consistent with the
  existing brand; no synthetic likeness was introduced.
- The zero-live-lead state is truthful and does not infer publication,
  impressions, demand, or success from prepared UTMs.
- Native headings, links, buttons, details/summary controls, and visible focus
  treatments provide a sound semantic base.
- The channel cards reflow without horizontal document overflow at the tested
  mobile viewport.

## Audit finding and remediation

The activation state named the constraint but did not connect it to the first
recommended action. An operator also needed four separate copy actions to move
one channel's general and three offer placements into a native platform review.

The remediation adds:

- a visible `Recommended first move` panel driven by the existing five-day
  plan, not a second recommendation engine;
- a same-page jump to the exact first channel packet; and
- one local-only `Copy full channel flight` control per channel, generated from
  the same canonical draft, URL, and review-boundary objects already rendered
  on the page.

The packet does not publish, upload, send, write to Neon, create an audit event,
or imply external approval. Individual copy controls remain available.

## Remaining visible risk

The shared Lead Center command navigation wraps to several rows at 390 px. It
remains usable and does not overflow, but it consumes substantial first-viewport
height. This PR intentionally does not redesign the global navigation because
that would affect every protected operator route and requires a separate
cross-route audit.

## Evidence limits

Screenshots prove visible hierarchy and reflow, not complete WCAG conformance.
The current run also inspected the rendered DOM, exercised the anchor jump and
copy-button state, checked document overflow, and reviewed browser console
warnings/errors. Screen-reader announcements, zoom above 200%, forced colors,
and every global-navigation keyboard sequence still require dedicated checks.

## Local evidence

Accepted screenshots are retained outside Git in:

`/private/tmp/amm-phase9-product-audit-20260821/`

- `01-command-overview-desktop.png`
- `02-channel-expanded-desktop.png`
- `03-command-overview-mobile.png`
- `04-recommended-first-move-desktop.png`
- `05-first-channel-packet-desktop.png`
- `06-recommended-first-move-mobile.png`
- `07-first-channel-packet-mobile.png`

No production page, lead, database row, external account, message, or
publication changed during this audit.
