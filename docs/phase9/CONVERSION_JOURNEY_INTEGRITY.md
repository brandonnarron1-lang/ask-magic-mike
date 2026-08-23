# Phase 9 conversion-journey integrity

Date: 2026-08-23

Status: isolated fast-track candidate after PR #202; Production unchanged

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
  repeatable recoverable error focus, and alert semantics without changing the
  form, consent language, route, visual tokens, or lead payload.

## Boundaries

- No database migration or Production data change.
- No Production deployment, form submission, lead, email/BCC, SMS, Push,
  consumer acknowledgment, provider call, WordPress edit, publication, DNS
  change, spend, deletion, or NellySelly action.
- No new visual asset or redesign. Existing Black Diamond typography, spacing,
  colors, controls, photography, and mobile composition remain authoritative.
- The local validation exercise stopped before any `/api/leads` request.

## Dependency, reuse, and rollback

The fast-track branch starts from exact final PR #202 head
`26047176b78006230ce6064a5ee53f9c0561ef2a`. It reuses the unique PR #200
implementation commit `91e05c06a7adfceba22d35c36cb7a2105da9a36b` without
merging PRs #197–#199. Every application and test file applied cleanly; only
the five cumulative operating documents required reconciliation with current
Production authority. The original Draft PR #200 branch remains unchanged.

This candidate cannot release before PR #202. After PR #202 releases, preserve
this branch, refresh it onto the exact resulting `main`, and repeat exact-head
Node 24, Preview, protected no-write, and visual proof before requesting its
own gate.

Rollback is an application revert. There is no schema, provider, WordPress, or
Production-data rollback in this candidate.

Future exact gate, eligible only after PR #202 releases and this candidate is
refreshed and re-proven:

`APPROVE PHASE 9 CONVERSION JOURNEY INTEGRITY MERGE AND PRODUCTION DEPLOYMENT`
