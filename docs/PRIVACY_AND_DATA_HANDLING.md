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
- IP data is minimized or hashed with `CONSENT_IP_HASH_SALT`; raw PII must not be
  placed in URLs, analytics properties, logs, screenshots, or source control.
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

## Phase 9 privacy consolidation — 2026-08-22

- Durable rate-limit rows now contain only route-scoped HMAC identifiers. Raw
  caller IP, staff, and session keys are never sent to Neon; stale pre-HMAC rows
  age out through a 24-hour cleanup.
- Browser analytics no longer publishes full attribution objects, referrers,
  query strings, click IDs, or full user agents to the data layer, PostHog hook,
  widget parent, or server ledger.
- Both public analytics APIs reject internal/delivery event fabrication and
  public lead-ID association. The durable writer independently minimizes every
  property, UTM dimension, path, and user-agent class.
- The Growth Center outcome/delivery proof ledger reads aggregate counts only,
  excludes test and suppressed leads, and never selects recipient references,
  names, emails, phones, message bodies, or provider secrets.
