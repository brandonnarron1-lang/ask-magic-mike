# Communication Permission Engine

Canonical implementation: `src/lib/messaging/permission-engine.ts`.

## Request-contact evidence (solo-operator correction)

`request-contact-permission.ts` interprets only immutable, inquiry-specific
`public.consents` evidence matching the exact `amm_contact_v2` request-contact
wording, selected email/call channel and collection timestamp. The lead's flags
alone are insufficient. Missing, conflicting, future-dated or changed evidence
fails closed; another inquiry's consent is never inherited. Existing explicit
manual-purpose rows always win, including ambiguous, denied, held and opted-out.
The projection is read-only: no permission row is granted, amended or backfilled.

This basis supports deliberate `manual_one_to_one` email/phone review only—not
SMS, marketing, automatic acknowledgments, sequences or subscriptions. Global
suppression, lifecycle, fresh role/direct-assignment checks and exact-target
validation remain in force. A valid administrator can operate a Mike-owned lead
without becoming Mike or changing ownership. Lead ownership is not QA duty.

The current permission API includes the retained wording/version/time and the
evaluated basis separately from actual stored permission rows. “Save evaluation
to audit” records the current decision, not an amendment or send. A generic held
code alone does not establish a legal finding or a new broker-review requirement.
Real explicit restrictions remain blocked pending their actual factual authority.
Check accepted source before treating this candidate behavior as live.

The engine evaluates purpose, channel, requested-service/transactional/marketing basis, email/SMS/call permissions, test and suppression state, opt-out, legal/BIC hold, recipient isolation, and human approval. It returns an auditable allow/block decision with explicit reasons. Ambiguous consent fails closed.

Purposes are separated: internal alert, requested-service response, transactional acknowledgment, appointment coordination, property-alert subscription, marketing nurture, manual one-to-one, and QA test. Property-alert consent does not become general marketing consent. Test/suppressed records cannot receive consumer messaging. See `MESSAGING_SYSTEM_PHASE6.md` and `MESSAGING_COMPLIANCE_REVIEW_PHASE6.md`.
