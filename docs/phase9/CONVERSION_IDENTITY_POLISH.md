# Phase 9 conversion identity polish

Date: 2026-08-22

Status: local candidate stacked after PR #194; Production unchanged

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
- Made the screenshot helper intercept `/api/leads` and return an unmistakable
  local QA response. Its synthetic identity says `INTERNAL QA DO NOT CONTACT`.

## Boundaries

- No database migration or Production data write.
- No lead submission, email/BCC, SMS, Push, consumer acknowledgment, provider
  call, WordPress edit, DNS change, spend, publication, or NellySelly action.
- No generated identity imagery or visual redesign. Existing Black Diamond
  tokens, components, spacing, typography, and public routes are preserved.
- Internal preview routes are not deleted; only their consumer-facing footer
  promotion is removed.

## Stack and rollback

The candidate starts from PR #194 exact head
`be566d7fb66501d7321eaf3367c3070408a47aff`, itself stacked on PR #193 and PR
#185. It must not merge out of order. Rollback is an application revert; there
is no migration or external state to reverse.

Future exact gate after all predecessors release and this branch is refreshed
and re-proven:

`APPROVE PHASE 9 CONVERSION IDENTITY POLISH MERGE AND PRODUCTION DEPLOYMENT`
