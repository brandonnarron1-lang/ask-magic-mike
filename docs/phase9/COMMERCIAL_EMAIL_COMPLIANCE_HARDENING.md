# Phase 9 — Commercial Email Compliance Hardening

## Decision

Reuse the existing branded email renderer and messaging registry. Do not create a
second provider, campaign engine, or notification path.

Every branded HTML and plain-text email now includes:

- `Ask Magic Mike` and `Our Town Properties, Inc.` identity;
- the brokerage postal address verified against the owned WordPress site:
  `3301 Nash St. NW Suite E, Wilson, NC 27896`; and
- a versioned content hash whose manifest includes the address and any marketing
  disclosures.

When `marketing=true`, rendering fails closed unless the caller supplies a valid
HTTPS unsubscribe URL without embedded credentials. Both formats include that
link, a clear marketing-message label, and the approved link-based unsubscribe
instruction. The renderer deliberately does not promise reply-based opt-out
processing because that inbound-email workflow is not yet operationally
verified. Transactional and QA renders keep the physical address and firm
identity without being mislabeled as advertising.

## Authority boundary

This change renders content only. It does not enable consumer acknowledgment,
marketing, sequence scheduling, auto-send, SMTP, Resend, SMS, or any provider
delivery. Existing permission, suppression, approval, idempotency, and deployment
gates remain unchanged.

## Primary-source basis

- FTC CAN-SPAM business guidance requires a valid physical postal address and a
  clear opt-out method for commercial email.
- NCREC Rule A.0105 guidance requires real-estate advertising to identify the
  broker or firm; Ask Magic Mike renders identify Our Town Properties, Inc.
- The owned Our Town Properties website publishes the brokerage address used by
  this renderer.

Technical controls support compliance but do not replace owner/BIC or legal
review of message purpose, consent, audience, or final copy.

## Verification and rollback

Required proof is targeted renderer and QA-route tests, strict typecheck, lint,
full test suite, production build, release-safety scan, and Preview deployment.
Rollback is a code revert or promotion of the prior verified deployment. No data
or provider-state rollback is required because this change performs no mutation
or send.
