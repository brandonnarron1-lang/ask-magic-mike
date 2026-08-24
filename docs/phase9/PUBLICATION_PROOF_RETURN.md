# Phase 9 Publication-Proof Return

## Purpose

Connect the existing mobile native share-sheet handoff to the existing append-only publication-proof ledger without adding a publisher, a second proof store, or a second admin workflow.

## Product-flow audit

1. Opened the existing protected Distribution Command in its current mobile-native handoff state.
2. Inspected the current two-tap handoff, protected image downloads, copy controls, channel cards, and the separate publication-proof ledger at desktop and mobile widths.
3. Confirmed that preparation and proof were truthfully separate, but several thousand vertical pixels apart. After an OS share handoff, the operator had to find the ledger, reopen the channel, and reselect the placement manually.
4. Selected a narrow enhancement: return to the existing proof ledger with only the exact canonical channel and placement in an allowlisted relative URL.
5. Compared the current and updated screens at matching desktop and mobile viewports. Existing handoff layout, typography, controls, responsive stacking, and horizontal overflow behavior were preserved. The selected proof card now uses the established gold focus treatment and a concise non-authoritative notice.

Strengths retained:

- premium black, gold, and teal design language;
- explicit two-gesture operator control;
- download and copy fallbacks;
- mobile stacking without horizontal overflow; and
- clear separation between prepared content and observed publication evidence.

Accessibility observations are limited to visible and automated behavior, not a WCAG certification. The new link and selected-card treatment preserve keyboard focus styling and a minimum 44-pixel control height. Existing dense page length and some 10-pixel uppercase metadata remain broader design-system follow-up items.

## Operator flow

1. An authorized operator prepares the approved image.
2. A second explicit gesture opens the operating-system share sheet.
3. Only after the share promise resolves, the interface offers **Review matching proof requirements**.
4. The link returns to the exact allowlisted channel card and preselects the exact allowlisted placement.
5. The operator must still inspect the native platform, provide evidence and approval context, accept the existing confirmation, and submit the existing authenticated server action.

## Trust boundary

- Query values are untrusted and resolve only through the existing canonical native channel and creative definitions.
- The browser independently accepts only the four native channels, four canonical placements, exact relative `/admin/distribution` path, exact query shape, and channel-matched fragment.
- No final copy, evidence, approval reference, contact data, credential, or secret crosses the URL.
- No query parameter reaches the mutation layer.
- The existing `growth:manage` server authorization, Preview read-only guard, validation, deduplication, append-only Neon repository, and audit event remain unchanged.
- A share-sheet handoff is not publication proof. The return link appears only after the operating system resolves the share request and still makes no claim that a post exists.

## Rollback

Revert the single stacked commit for this capability. The underlying native handoff, protected assets, proof form, publication ledger, database schema, and server action continue to operate independently. No data migration or production secret is required.
