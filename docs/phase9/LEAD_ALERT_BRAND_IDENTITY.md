# Phase 9 lead-alert brand identity

Date: 2026-08-24
Status: downstream Draft candidate; no Production authority

## Decision

Reuse the existing deterministic lead-alert renderer, urgency selector,
approved privacy-safe backgrounds, canonical Mike portrait, and Our Town logo.
Do not recreate the notification engine, put lead facts into generated images,
or change scoring, routing, consent, recipients, providers, or release flags.

The current email card is operationally strong but its decorative header uses
only an anonymous luxury-property backdrop. That weakens identity recognition
at the first-response moment. The v3 renderer adds approved brokerage and Mike
identity while preserving every lead fact as accessible HTML/plain text.

## Implementation

- `lead_alert_email_v3` composes the existing urgency background, unchanged Our
  Town logo, unchanged Mike avatar, text brand label, and urgency eyebrow using
  email-safe presentation tables and inline styles.
- The logo and portrait have meaningful alternative text. The background stays
  decorative and contains no lead, contact, source, score, or consent data.
- The full alert body, secure Lead Center link, plain-text fallback, BCC,
  Reply-To, outbox, provider ID, retry, and idempotency paths remain canonical.
- `renderLeadAlertForTemplateVersion` preserves stored v1/v2 rendering on retry
  and fails closed for unknown versions. This keeps the delivery ledger honest
  after the v3 template becomes current.
- The protected Message Review Studio now shows HOT, ACTIVE, and NEW synthetic
  v3 renders. Each is `[TEST]`, says no lead exists, omits contact details, and
  cannot queue or send.

## Design and privacy boundary

The user-supplied poster examples remain references, not runtime records. Their
invented names, IDs, times, buttons, and property facts never enter outbound
media. A built-in image-generation compositing attempt was rejected by the
provider safety system; no alternate model, API fallback, or generated likeness
was used. The implementation instead uses the exact approved project assets,
which is both more accurate and easier to audit.

## Expected impact

- faster recognition of a trusted Mike / Our Town alert in a busy inbox;
- consistent identity across HOT, ACTIVE, NEW, and QA delivery states;
- no loss of accessibility, selectability, suppression, or privacy; and
- a protected review surface that lets operators approve the actual HTML before
  any future send gate.

Confidence is high for identity consistency and privacy because the sources and
renderer are deterministic. Conversion or response-time uplift remains an
untested hypothesis until eligible live observations exist.

## Release boundary

This candidate is based on exact Draft PR #213 head
`d666289f91962cd836e87aec6cb3d809e93e72a7` and follows PR #209 → PR #210 →
PR #211 → PR #213. It must be refreshed onto accepted `main` after those
predecessors release and fully re-proven before any merge.

The later application-only gate is:

`APPROVE PHASE 9 LEAD-ALERT BRAND IDENTITY V3 MERGE AND PRODUCTION DEPLOYMENT`

That gate does not authorize a lead submission, email/BCC, consumer
acknowledgment, SMS/MMS, Push, provider test, WordPress/GTM/GA4 change, DNS
action, publication, spend, migration, data deletion, or NellySelly action.

## Rollback

Restore the immediately preceding accepted Vercel deployment. New leads then
use the preceding current template again. Existing outbox rows remain intact;
v1/v2 rows continue to render through their pinned compatibility path and v3
rows remain preserved for audit. Do not delete notification records or provider
events.
