# Form 3 Production Reconciliation

Completed 2026-08-14 against Neon project `bitter-star-20214385`, database
`neondb`, branch `br-round-base-auh6h2wd` (`production`). The similarly named
branch `br-morning-paper-aun3378r` was verified as the isolated Preview child
and was not used for this production audit.

## Canonical Form 3 record

- Gravity Forms entry: `1549`
- Canonical lead: `70f63f35-2478-4738-b84c-bc1a89b8482c`
- Idempotency key: `gf:3:1549`
- Test and suppression flags: all enabled
- Duplicate master: `a1a7e899-9b2e-4ffe-968f-1e10728d60e8`
- Consent rows: call, email, and SMS all explicitly denied under
  `amm_contact_v2`; lead consent source is `gravity_forms_3`
- Attribution: internal QA source, medium, campaign, content, placement, landing
  page, referrer, and first/last touch are present
- Notification: one `lead_alert_email_v2`, status `sent`, attempt 1 of 3,
  provider `resend`, provider message ID
  `bf31a582-e4a3-45cb-a7f1-5cb89121626f`
- Gmail receipt independently confirms delivery to Mike and the hidden audit
  copy. The private BCC value is intentionally not recorded.

The historical QA URL contained `gclid=INTERNAL_QA`, but the stored click-ID
object contains nulls because the bridge sent a nested compatibility shape
before PR #140. PR #140 now accepts that shape for future WordPress submissions;
the historical synthetic record was not backfilled.

## Pre-fix replay row

The timestamp-bounded audit found exactly the predicted incomplete row:

- Lead: `a7b1cf10-e546-48c4-85b1-2dee424ab156`
- Created: `2026-08-14 20:05:22.853554+00`
- Cause: controlled replay before the idempotency hotfix
- Before reconciliation: `is_test=false`; communication, email, and SMS
  suppression all false
- Side effects before reconciliation: one source-attribution row, zero consent
  rows, zero notification rows, zero analytics rows, one `lead.created` audit row

An exact, transaction-protected update set `is_test`,
`communication_suppressed`, `email_suppressed`, and `sms_suppressed` to true.
The update required the exact ID, timestamp, fingerprint, duplicate state,
missing idempotency key, and absence of notifications. It inserted one
`lead.qa_suppressed` audit row with minimal before/after flags and the reason
`controlled_pre_fix_idempotency_replay`.

Post-update verification found one suppression audit row and still zero
notifications and zero analytics events. No lead, attribution, consent,
notification, or audit record was deleted.

The final production aggregate contains six test leads, zero live-prospect
records, and zero unsuppressed test leads. This is a point-in-time QA/KPI
isolation result, not a claim that a genuine prospect has submitted.

## Acceptance

Form 3 is accepted as the only enabled WordPress bridge form. Further forms
remain blocked pending their own field mapping, consent, routing, and controlled
activation review. The public lead path remains live; no additional QA message
was sent during reconciliation.
