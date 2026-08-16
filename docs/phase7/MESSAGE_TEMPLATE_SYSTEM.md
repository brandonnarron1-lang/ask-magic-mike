# Message template and versioning system

The code registry is canonical for release-candidate copy. Every template has ID, version, lead group, channel, purpose, timing, approval state, stop conditions, optional subject, and body. Phase 7 exposes an authenticated list/history/test-render API at `/api/admin/message-templates`.

`renderMessageTemplate` allowlists required variables, rejects missing values, and substitutes only named tokens. Branded HTML escapes all user content. Unknown templates fail closed. The template-management API renders only; it has no delivery adapter.

The database migration adds `message_template_versions`, an immutable release ledger with content hash, status, change note, approval metadata, and unique `(template_id, version)`. Current templates are `phase7-v1`; `phase6-v1` remains the rollback reference. Template approval never bypasses communication permission or human review.

## Completion addendum — 2026-08-16

The registry now covers every required Phase 7 family, including the complete general, home-value, seller, buyer, seller-options, rental, short-term-rental, property-alert, out-of-area, coastal-review, appointment, follow-up, close, opt-out, internal-failure, SLA, QA, push, and call-script families. The four source-library directories re-export the canonical registry rather than maintaining conflicting copies.

Rendering rejects both missing and unknown variables. Every render returns a SHA-256 content hash. The branded email renderer returns responsive HTML and plain text, escapes untrusted content and CTA values, includes dark-mode metadata, exposes a visible QA banner when applicable, and records template version plus content-hash prefix in both formats.
