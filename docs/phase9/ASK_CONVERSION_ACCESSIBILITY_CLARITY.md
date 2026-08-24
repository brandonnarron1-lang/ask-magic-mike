# Phase 9 Ask conversion clarity and keyboard access

Date: 2026-08-23

Status: isolated stacked candidate; Production unchanged

## Decision

Reuse the active Black Diamond Ask surface and shared header. Correct the
proven consumer-language and keyboard-navigation gaps without adding another
funnel, form, AI route, lead command, design system, or data field.

## Evidence

A current no-submit Production inspection of `/ask` found:

- one main landmark and one implicitly labeled question input;
- no skip link before the repeated public navigation;
- the heading `A focused local real estate advisor interface.` and a matching
  panel heading, both describing the product instead of the consumer action;
- a blank Send action that returned without feedback because the input had no
  native required contract; and
- a server-side maximum of 2,000 characters that the browser did not expose.

The active `app/` router contains the shared Black Diamond header. The older
ignored `src/app/` tree already contained a skip-link pattern, but it is not
the deployable router. This candidate promotes the useful pattern into the
canonical component instead of creating a parallel layout.

Primary guidance:

- W3C WCAG 2.2 Technique G1:
  <https://www.w3.org/WAI/WCAG22/Techniques/general/G1>
- WAI forms tutorial:
  <https://www.w3.org/WAI/tutorials/forms/>
- WAI required-input validation:
  <https://www.w3.org/WAI/tutorials/forms/validation/>

## Implementation

### Shared public navigation

`BlackDiamondHeader` now begins with a focus-visible `Skip to main content`
link. Its ordinary href preserves a no-script anchor fallback. When client
JavaScript is available, activation explicitly focuses the target so keyboard
position is deterministic.

Every surface that renders this shared header provides exactly one
`id="page-content"` destination with `tabIndex={-1}` after the repeated header:

- homepage hero;
- Ask;
- home value;
- seller;
- buyer;
- renter;
- open house;
- review planner;
- shared information pages;
- not found;
- Our Town integration; and
- social preview.

The link reuses existing cream, gold, cyan, and black palette values. It is
visually hidden until keyboard focus and does not alter the established layout.

### Ask conversion clarity

The `/ask` H1 is now:

`Ask Mike. Get a practical local next step.`

The chat card heading is now:

`Start with the real estate question on your mind.`

The existing question control has a visible `Your real estate question
(required)` label, native required semantics, the existing API's 2,000-
character limit, a stable name/type, contextual description, and a mobile Send
keyboard hint. The payload, API route, AI guardrails, lead-preparation command,
analytics, attribution, and provider state are unchanged.

## Expected impact

- Fewer blank no-op submissions.
- Faster task comprehension for consumers arriving from the new tracked
  WordPress homepage placement.
- A direct repeated-navigation bypass for keyboard users on every canonical
  public-header surface.
- No added form step, field, storage, or operator work.

Confidence: high for the interaction and semantic correction; conversion
uplift remains an experiment hypothesis until eligible live traffic exists.

## Risk and assumptions

- Assumes the existing Black Diamond header remains the canonical repeated
  navigation component.
- Copy improvement is intentionally narrow and makes no response-time,
  valuation, offer, availability, or outcome promise.
- Current screenshot capture was unavailable; exact-head responsive visual QA
  remains required before release.

## Authority and rollback

Action class: application code and Preview preparation are autonomous;
Production merge/deployment is owner-gated.

No migration, secret, provider, consumer send, WordPress, DNS, spend, or
NellySelly action is part of this candidate.

Rollback is one application revert. No data or external system needs reversal.

Future exact gate, only after exact-head CI and Preview acceptance:

`APPROVE PHASE 9 ASK CONVERSION ACCESSIBILITY MERGE AND PRODUCTION DEPLOYMENT`
