# Phase 9 funnel-event identity integrity

Date: 2026-08-24
Status: Draft PR #216 stacked after Draft PR #215; Production unchanged

## Decision

Reuse the existing browser submission UUID, public `POST /api/events` route,
Neon analytics ledger, atomic `POST /api/leads` lifecycle, and server-owned
`lead_created` event. Do not add another tracker, cookie, form, API, database,
CRM, provider, or notification path.

Attach the same pseudonymous UUID to the protected first-party funnel-event
ledger until a successful lead submission reuses it as canonical `sessions.id`.
Keep browser-visible conversion events available to GA/GTM/PostHog and widget
parents, but refuse browser-authored conversion rows in the canonical Neon
ledger. The server remains the sole authority for durable `lead_created`.

## Evidence-led reason

The bounded aggregate review supporting Draft PR #215 found historical funnel
events with `analytics_events.session_id IS NULL`. The source audit confirmed
that live forms already generate a cryptographically random submission UUID
and reuse it as their lead idempotency/session identity, but `trackEvent` did
not send that UUID to the first-party event endpoint. Address, contact, consent,
failure, and thank-you rows therefore could not be joined into a reliable
funnel or paired with a later durable lead.

The client also emitted `lead_created` to both browser analytics and the same
first-party endpoint even though `POST /api/leads` already writes the canonical
server event after durable storage. That created avoidable KPI inflation risk.

An initial implementation that inserted an early row into `public.sessions`
was rejected during verification. `capture_public_lead_v1` deliberately treats
an existing session with no lead as an idempotency conflict, so pre-creating the
row could block a genuine lead. The accepted design stores only the validated
pseudonymous identifier in the protected analytics JSON until lead capture.

Historical null-session rows are not backfilled or reclassified. They remain
unclassified evidence, and no historical conversion rate is claimed.

## Implementation

- `trackEvent` accepts an optional anonymous session UUID and sends it only as
  top-level first-party request context. It is not added to the browser
  `CustomEvent`, data layer, PostHog properties, or widget parent message.
- `/api/events` accepts only RFC 4122 UUIDs. Invalid values are omitted, and
  Web Vitals remain explicitly identity-free.
- The final Neon repository injects a validated UUID into protected
  `properties.funnel_session_id` only after applying the normal analytics
  property allowlist. A public caller cannot smuggle that field through the
  ordinary properties object.
- No `sessions` row is created by analytics. Successful lead capture later
  uses the same UUID for `sessions.id`, allowing an aggregate join on
  `COALESCE(session_id::text, properties->>'funnel_session_id')` without
  weakening the atomic lead contract.
- Browser `lead_created`, `widget_lead_created`, `lead_qualified`, and
  `appointment_requested` remain available to approved browser integrations
  when emitted after a successful response, but the client does not post them
  to `/api/events` and the route rejects direct browser-authored attempts.
  Notification lifecycle events receive the same protection. Canonical lead
  conversion truth is the one server event written after durable lead storage;
  qualification, appointment, and delivery truth remain server-owned records.
- Home Value, seller, buyer/renter/open-house, Ask chat preparation, and
  appointment CTA events reuse their existing submission/session UUIDs.
- Home Value creates or reuses that UUID synchronously before its first address
  interaction event. If secure browser UUID generation is unavailable, the
  funnel surfaces a truthful local failure instead of emitting an unlinked
  first-stage row.
- Seller and buyer channel permission payloads now record email/call consent
  only when that contact method was actually supplied, matching the existing
  API normalization boundary.
- Buyer success now records the same `thank_you_viewed` stage already used by
  the seller and Home Value funnels.
- Buyer, seller, Home Value, and Ask lead-preparation failures emit only the
  allowlisted funnel/surface/step dimensions with the same pseudonymous UUID.
  Contact data, addresses, raw errors, provider responses, and lead IDs remain
  excluded.
- Ask lead preparation now sends the existing chat UUID as both header and
  body idempotency evidence. A fresh durable Ask capture now emits the same
  browser-only `lead_created` signal as the other public funnels; an
  idempotent replay does not emit it, and the public event route still refuses
  it as canonical ledger input.
- The existing protected-Preview browser runner now includes Home Value,
  seller, buyer, Ask, and widget desktop/mobile acceptance. Both suites install
  one shared catch-all before navigation. It intercepts every first-party
  POST/PUT/PATCH/DELETE, synthetically fulfills approved mutation surfaces, and
  blocks plus records every unexpected mutation before it can reach Neon,
  Resend, the notification queue, OpenAI, or another provider.

## KPI and privacy interpretation

`funnel_session_id` is pseudonymous, not anonymous after a lead submits. It is
server-protected first-party operational data and follows the analytics
ledger's access, retention, export, and deletion controls. It is never a public
analytics dimension or legal identity proof.

A linked event sequence proves that one browser submission UUID traversed
recorded steps. It does not prove a unique human, a genuine prospect, consent,
delivery, appointment, closing, or revenue. Only server-owned lead, consent,
notification, and outcome records can prove those later states. Test and
registered QA traffic remain excluded from Production KPI queries.

## Release order and authority

This candidate starts from exact Draft PR #215 head
`2d020358da1d7f95ebf82c47c0f1c0e83d6216d2`. The immediately prior PR #216
head `253480326312d42a159323176d69e87f47262921` is preserved at
`rescue/amm-pr216-pre-final-pr215-cutover-hygiene-20260824-180325`. It follows:

1. PR #209 durability release;
2. PR #210 canonical alias consolidation;
3. PR #211 Ask conversion accessibility;
4. PR #213 responsive conversion identity;
5. PR #214 lead-alert brand identity v3;
6. PR #215 home-value completion integrity; and
7. this funnel-event identity candidate.

It has no current Production authority. After every predecessor is accepted,
refresh onto exact `main`, repeat Node 24, immutable Preview, protected
write-intercepted browser, security, isolation, and current Production proof,
then require only:

`APPROVE PHASE 9 FUNNEL EVENT IDENTITY INTEGRITY MERGE AND PRODUCTION DEPLOYMENT`

That gate does not authorize a real/test lead, analytics QA write, email/BCC,
consumer acknowledgment, SMS/MMS, Push, provider call, database migration,
WordPress, GTM/GA4, DNS, publication, spend, data deletion, or NellySelly
action.

## Rollback

Restore the immediately preceding accepted Vercel deployment or revert this
candidate. No schema, environment, data, provider, WordPress, or DNS rollback
is required. Events written while active remain privacy-minimized operational
evidence; they must not be deleted merely to roll back application code.
