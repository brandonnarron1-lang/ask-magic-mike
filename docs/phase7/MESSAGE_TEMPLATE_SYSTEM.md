# Message template and versioning system

The code registry is canonical for release-candidate copy. Every template has ID, version, lead group, channel, purpose, timing, approval state, stop conditions, optional subject, and body. Phase 7 exposes an authenticated list/history/test-render API at `/api/admin/message-templates`.

`renderMessageTemplate` allowlists required variables, rejects missing values, and substitutes only named tokens. Branded HTML escapes all user content. Unknown templates fail closed. The template-management API renders only; it has no delivery adapter.

The database migration adds `message_template_versions`, an immutable release ledger with content hash, status, change note, approval metadata, and unique `(template_id, version)`. Current templates are `phase7-v1`; `phase6-v1` remains the rollback reference. Template approval never bypasses communication permission or human review.

