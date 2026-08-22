# Privacy and Data Handling

## Collection boundary

Collect only contact, intent, property/target area, timeline, financing context,
message, attribution, consent evidence, operational status, and delivery/audit
metadata required for brokerage follow-up. Do not collect protected-class data
for scoring, routing, or targeting.

## Storage and use

- Neon PostgreSQL is the canonical store. WordPress entries are a temporary
  source/fallback copy, not a competing CRM.
- Lead storage completes before notifications. Provider failure never deletes a
  lead.
- Exact consent text/version, timestamp, source, allowed channels, first/last
  touch, UTMs, click IDs, and test status travel with the record.
- Consent IP evidence is minimized or hashed with `CONSENT_IP_HASH_SALT`.
  Durable abuse-control buckets use a separate domain-separated HMAC and retain
  no raw IP or staff principal. Raw PII must not be placed in URLs, analytics
  properties, logs, screenshots, reports, or source control.
- `is_test=true` records are excluded from KPIs and must say `INTERNAL QA — DO
  NOT CONTACT`.

## Access and disclosure

Only approved staff may access Lead Center records. Agent visibility must be
restricted to assigned leads before multi-agent use. Internal email recipients,
the audit BCC, phone destinations, exports, and provider message IDs are protected
operational data. Every export, assignment, suppression, stage change, and note
change should create an actor/time/reason audit event.

## Communication controls

Internal alerts and consumer acknowledgments are separate messages. Suppression,
unsubscribe, and channel consent are checked before consumer contact. Carrier
SMS remains disabled until a compliant paid sender and brokerage-approved copy
exist. Web Push is for enrolled staff devices only.

## Retention and requests

Production retention/deletion periods require brokerage/legal approval. Until
approved: minimize collection, preserve consent/audit/delivery evidence, suppress
rather than silently erase active records, and require an authenticated admin
workflow for access/correction/deletion requests. Do not delete production data
under a support request without identity verification and an audit record.
