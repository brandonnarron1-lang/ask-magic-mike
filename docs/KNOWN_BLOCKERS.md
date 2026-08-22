# Known Operating Constraints

Updated 2026-08-22. The public funnel, canonical Neon capture, Lead Center, and
internal authenticated email delivery are operational. These constraints limit
specific expansions; they do not invalidate the live lead pipe.

## Current release constraint

- PR #183 is merged and live. PR #184's backup-first Neon migration is applied
  and independently verified; its application release evidence is tracked on
  the PR.
- PRs #182 and #179 are deferred candidates requiring a new merge-base and
  overlap audit. PRs #92 and #119–#121 are archive candidates.
- Historical gates for already merged PRs #170, #172, #173, #177, #178, #180,
  and #181 must not be requested again.

## Human and BIC decisions

- Form 7 entry 1550 has unclear purpose/consent and remains preserved without
  contact, marketing enrollment, alerting, or canonical forwarding.
- Forms 1, 2, and 4–7 require approved requested-response consent and separately
  optional marketing consent before allowlist expansion.
- Seller-options, guaranteed-value, cash-offer, territory, response-time, and
  other material claims require brokerage/BIC approval before publication.
- The public brokerage number remains `252-243-7700`. Historical/internal
  numbers must not enter public copy without explicit owner confirmation.

## Operator activation

- Brandon's administrator acceptance is complete. Mike's provisioned
  `primary_lead_owner` account remains dormant until Mike chooses a password and
  completes assigned-lead-only acceptance.
- Web Push infrastructure is ready, but each device owner must grant browser
  permission and complete a controlled `[TEST]` receipt. Brandon cannot enroll
  a device as Mike.
- `hub.ourtownproperties.com` is not attached. DNS and Vercel domain mapping
  remain separately gated; canonical `/admin` remains the private entry point.

## Channel constraints

- Internal Resend email and hidden audit BCC have controlled delivery proof.
  Consumer acknowledgments, nurture, and sequence sends remain
  purpose/permission/template/approval gated.
- Carrier SMS/MMS remains disabled until an approved registered sender and paid
  provider exist. Web Push and authenticated email remain the free-first staff
  alert paths.
- CRM remains the null adapter until an existing CRM account and secure
  credentials are explicitly approved. Neon remains the lead source of truth.
- No GBP, social, email-signature, or QR placement may be recorded as live until
  an authorized operator actually publishes/configures/distributes it and
  supplies valid native-platform evidence.

## External platform constraint

The Our Town hosting WAF blocks FacebookExternalHit on selected WordPress URLs.
Use AskMagicMike.com links as the approved fallback. Apply only a documented,
path/method-specific exception after the host identifies the exact managed rule.

## Truthful demand constraint

Current aggregate Production evidence contains only suppressed/test leads and
no contactable live prospect. A working funnel can be guaranteed; genuine demand
cannot be fabricated. Test leads remain labeled, suppressed, and excluded from
KPIs.
