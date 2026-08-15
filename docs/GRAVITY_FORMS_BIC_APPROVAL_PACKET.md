# Gravity Forms BIC Approval Packet — Editable Source

Prepared 2026-08-15. This packet requests business/legal approval; it does not
represent legal advice. No held form is activated by this document.

## Decision summary

| Form | Purpose | Entries | Current state | Decision requested |
| ---: | --- | ---: | --- | --- |
| 1 | General contact | 1,337 | Blocked; no explicit choice | Approve requested-response and separate optional-marketing wording |
| 2 | Seller options | 27 | Shadow; no verified placement | Approve purpose, placement, human-review language, consent, and Mike routing |
| 5 | Rental search | 0 | Shadow; no verified placement | Approve placement, territory, recipient, minimum data, and consent |
| 6 | Short-term rental inquiry | 18 | Blocked; no explicit choice | Approve requested-service consent, denied-consent handling, and Mike/admin routing |
| 7 | Property alerts | 153 | Deferred; marketing consent unclear | Approve explicit alert subscription, frequency, unsubscribe, and entry 1550 protection |

Form 3 remains the only canonical form. Form 4 remains a separate recruiting
workflow and is not proposed for consumer lead routing.

## Proposed common consent structure

Requested response checkbox, unselected:

> I agree that Our Town Properties, Inc. may contact me using the email or phone
> information I provided to respond to this request. Consent is not a condition
> of purchasing a property or service.

Optional future marketing checkbox, separate and unselected:

> I would also like occasional real-estate updates by email. I can unsubscribe
> at any time.

Exact wording, frequency disclosure, channels, retention, and legal sufficiency
require the owner/BIC's approval before publication. An optional marketing
choice must not be required for a requested transactional response.

## Form 1 — Contact Us

- Placement: `/contact-us/`.
- Data: required name/email; optional phone, subject, message.
- Current controls: CAPTCHA, honeypot, active native Admin Notification.
- Mapping: `general_question`; source label `OurTownProperties.com / Contact Us`;
  first/last touch, page, UTMs, click IDs, exact consent text/version.
- Routing: Mike until another recipient is approved.
- Duplicate plan: preserve native notification until one canonical QA delivery
  is proven, then disable only the exact duplicate.
- QA: one unmistakable suppressed QA entry; one Gravity entry; one signed
  forward; one Neon ID; no consumer message/SMS/audience inclusion; replay safe.
- Rollback: remove only Form 1 from allowlist, restore backed-up definition,
  preserve entries, re-enable only its prior notification if changed.

## Form 2 — Seller Options

- Placement: not found in rendered sitemap; must be approved before exposure.
- Required copy: traditional listing and as-is discussion are options reviewed
  by a human. No guaranteed offer, highest-offer, automated binding valuation,
  response-time, closing-time, or outcome claim.
- Mapping: `seller`; property address, timeline, motivation, source/attribution,
  exact consent, and normalized contact fields.
- Routing: Mike.
- QA and rollback: same controlled one-form sequence; preserve all 27 entries.

## Form 5 — Rental Search

- Placement: not found in rendered sitemap.
- Data: name, phone, email, current address, optional rental area. Confirm each
  field's minimum operational need before activation.
- Required decisions: public placement, Wilson/Eastern NC territory, approved
  operational recipient, lead type, and requested-response consent.
- Routing: Mike/admin review until a specialist is explicitly approved.
- QA and rollback: one-form sequence; preserve the current zero-entry baseline.

## Form 6 — Short-Term Rentals

- Placement: `/short-term-home-rentals/`; 18 retained entries.
- Add an unselected requested-service choice and a separate optional-marketing
  choice. Denied marketing consent must still allow a requested response when
  otherwise permitted.
- Map as rental inquiry with source, attribution, exact consent, and free-text
  minimization. Route to Mike/admin review.
- Preserve native notification until canonical delivery is proven; then disable
  only the exact duplicate. Preserve all existing entries on rollback.

## Form 7 — Property Alerts

- Placement: global/sitewide; 153 retained entries.
- Entry `1550` is protected as genuine, consent-restricted/unclear, WordPress
  only. Do not retroactively subscribe, forward, test, suppress, or delete it.
- Add an explicit unselected property-alert email subscription with approved
  frequency and unsubscribe method. Keep optional broader marketing separate.
- Denied consent: retain only the purpose-limited record allowed by policy; no
  alert subscription or audience inclusion.
- Routing: Mike/admin review until a recipient and automation purpose are
  approved.
- QA and rollback: controlled single test; preserve all entries and audience
  state; no retroactive import.

## Approval requested

For each form, record: approved wording/version, approved public placement,
approved recipient/territory, approved purpose/channels/frequency, whether the
native notification may be disabled after acceptance, approver, date, and any
conditions. Activation remains one form at a time with a backup and rollback.
