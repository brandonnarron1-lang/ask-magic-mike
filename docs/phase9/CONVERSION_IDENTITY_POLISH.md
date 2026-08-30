# Phase 9 conversion identity polish

Date: 2026-08-22

Status: released on Production through PR #195

## Reuse-first decision

The canonical `HomeValueFunnel`, `/api/leads` command, Neon lead lifecycle,
scoring, routing, notification outbox, widget, and Lead Center remain the only
lead system. This candidate does not add another form, API, database, CRM,
notification provider, or visual system.

## Evidence-led findings

A fresh no-submit audit of the live seller, buyer, and Ask Mike paths found:

1. The home-value funnel collected address, email, phone, timeline, and consent
   but omitted the consumer's name. The buyer form already collected identity.
   Nameless seller records weaken human follow-up, internal subject lines, and
   duplicate review.
2. The shared public footer linked consumers to internal implementation
   surfaces: Widget Preview, OurTown Integration, and Social Preview. Those
   routes remain available and non-indexable for authorized review, but they
   are not consumer navigation.
3. Inline validation announced an error but left keyboard focus on the submit
   button. After adding name and email to one step, a shared error association
   would also have described both fields instead of only the invalid field.
4. The historical screenshot helper could POST to `/api/leads` if run with a
   configured database. Visual QA must never create a lead.

## Implementation

- Added required `Your name` capture to the existing Contact step without
  increasing the four-stage funnel length.
- Normalizes and sends the name through the existing canonical lead payload.
- Added step-transition and validation focus for name/phone and invalid-field
  focus for address, name, email, and phone.
- Associates the inline error only with the invalid input while retaining the
  live `role="alert"` message.
- Replaced internal-preview footer links with consumer paths for Home Value,
  Sell, Buy, Ask Mike, Review Planner, and Contact; retained legal and
  accessibility links inside a named footer navigation landmark.
- Made the screenshot helper intercept `/api/leads`, `/api/events`, and
  `/api/experiments/event`. It returns unmistakable local QA responses, never
  reaches a configured lead/event store, and uses the synthetic identity
  `INTERNAL QA DO NOT CONTACT`.
- Kept the shared footer outside the page `<main>` so browsers and assistive
  technology expose a real top-level `contentinfo` landmark.
- Intercepts `/api/events` in homepage browser QA so that test cannot depend on
  or mutate a configured database.

## Boundaries

- No database migration or Production data write.
- No lead submission, email/BCC, SMS, Push, consumer acknowledgment, provider
  call, WordPress edit, DNS change, spend, publication, or NellySelly action.
- No generated identity imagery or visual redesign. Existing Black Diamond
  tokens, components, spacing, typography, and public routes are preserved.
- Internal preview routes are not deleted; only their consumer-facing footer
  promotion is removed.

## Stack and rollback

The candidate is refreshed onto released PR #194 merge
`5a3c5c7f2463ea399c21b616ff249f6c67e156b6`, which already contains released
PR #196 verifier hardening. The prior stacked head is preserved at
`rescue/amm-pr195-pre-released-pr194-refresh-20260822-1959`. The integration
merge is `401e9e3ce57e9c466d132ef091c221ecf5e54d4e`; its only automatic conflict
was this repository's cumulative QA-evidence document. Rollback is an
application revert; there is no candidate migration or external state to
reverse.

Historical exact gate, consumed on 2026-08-23:

`APPROVE PHASE 9 CONVERSION IDENTITY POLISH MERGE AND PRODUCTION DEPLOYMENT`

PR #195 head `db13953fc5f6d24a684f66c9a1c10c6b929b72b3` merged as
`b450b41c66c6740bd20571cdbe7d8caf82e92d5e` and is live on Vercel deployment
`dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`. This phrase is exhausted and does not
authorize a second deployment or a different candidate.
