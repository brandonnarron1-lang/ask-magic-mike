# Phase 9 conversion-journey integrity

Date: 2026-08-23

Status: stacked Draft candidate; Production unchanged

## Reuse-first decision

This candidate keeps the released Black Diamond public experience, canonical
`/api/leads` command, Neon lifecycle, deterministic scoring and routing,
notification outbox, Lead Center, and approved analytics vocabulary. It does
not add a form, API, database, CRM, provider, dashboard, route family, or visual
system.

The older `src/lib/attribution/client-storage.ts` implementation already
established the repository rule that a fresh tagged visit replaces current
campaign context. The active Black Diamond attribution adapter now applies the
same rule while retaining its richer immutable `first_touch` and mutable
`last_touch` snapshots.

## Evidence-led findings

A no-submit Production audit covered the homepage, Home Value, seller, buyer,
Ask Mike, and renter journeys on desktop and mobile before local code changed.
The visuals, responsive layout, public identity, and primary actions were
healthy. Four narrower integrity gaps remained:

1. Once Black Diamond attribution existed in session storage, a later URL with
   fresh UTMs updated only the current path. The original campaign therefore
   appeared in both first-touch and last-touch context.
2. `/rent` intentionally used the shared buyer-family component but identified
   its source surface as `buyer_page`, collapsing direct renter acquisition
   into buyer-page reporting.
3. Buyer, renter, and open-house idempotent replay responses rendered the
   correct success state but still emitted a fresh browser `lead_created`
   event. Home Value and seller already suppressed this KPI inflation.
4. The shared buyer-family form enforced “email or phone” only after submit.
   The requirement was not visible or associated with either contact field.

## Implementation

- Preserves the first touch once established and updates current and last-touch
  source, medium, campaign, content, term, page, title, referrer, placement, and
  click-ID context when a fresh tagged visit occurs.
- Retains the acquired campaign on an untagged internal navigation while
  updating the submission path and page title.
- Makes session-storage failure non-fatal so browser privacy mode cannot break
  a public form.
- Adds `renter_page` to the existing normalized lead-surface contract, active
  renter page, alert reconstruction, and privacy-safe analytics registry.
- Reuses the released replay header contract to suppress duplicate
  `lead_created` events for buyer, renter, and open-house replays.
- Adds one short contact-requirement hint, precise field description,
  recoverable error focus, and alert semantics without changing the form,
  consent language, route, visual tokens, or lead payload.

## Boundaries

- No database migration or Production data change.
- No Production deployment, form submission, lead, email/BCC, SMS, Push,
  consumer acknowledgment, provider call, WordPress edit, publication, DNS
  change, spend, deletion, or NellySelly action.
- No new visual asset or redesign. Existing Black Diamond typography, spacing,
  colors, controls, photography, and mobile composition remain authoritative.
- The local validation exercise stopped before any `/api/leads` request.

## Stack and rollback

The branch starts from exact sealed PR #199 head
`7690e54b3c1d225d09ab8838774c4ac9c6316cce`, preserved at
`rescue/amm-pr200-base-pr199-20260823-1204`. It follows PRs #197, #198, and #199
and cannot bypass their release order. After each predecessor release, this
candidate must refresh onto exact `main` and repeat exact-head verification.

Rollback is an application revert. There is no schema, provider, WordPress, or
Production-data rollback in this candidate.

Future exact gate, eligible only after the predecessor stack releases and this
candidate is refreshed and re-proven:

`APPROVE PHASE 9 CONVERSION JOURNEY INTEGRITY MERGE AND PRODUCTION DEPLOYMENT`
