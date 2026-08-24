# Phase 9 home-value completion integrity

Date: 2026-08-24
Status: Draft PR #215, stacked after Draft PR #214; Production unchanged

## Decision

Reuse the released Black Diamond home-value funnel, canonical `POST /api/leads`
command, Neon lifecycle RPC, idempotency key, attribution, consent evidence,
scoring, routing, notification outbox, and truthful success state. Do not add a
form, endpoint, database, CRM, notification provider, or analytics system.

Move the durable lead write to the first valid contact step and remove the
separate required-phone screen. The public Home Value surface keeps email
required and makes phone optional; the server contract accepts either email or
phone for `home_value` and `widget` captures.

## Evidence-led reason

A bounded, read-only query of the canonical Production analytics ledger found
one unclassified sequence between 2026-08-22 19:04:50Z and 19:20:00Z:

| Canonical stage | Events |
|---|---:|
| `funnel_started` | 1 |
| `address_submitted` | 1 |
| `contact_submitted` | 1 |
| `lead_created` | 0 |

Registered QA/test UTM markers were excluded. Historical rows have no session
identifier or current funnel dimensions, so temporal adjacency is an inference,
not identity proof. The observation is not labeled a genuine lead, and no
conversion rate is calculated.

Source inspection independently confirmed the structural risk: the released
funnel emitted `contact_submitted`, advanced to a separate required-phone step,
and only then called `POST /api/leads`. A consumer could therefore provide a
valid address, name, and email without creating the canonical lead record.

The reviewed query, aggregate-only executed notebook, and report inputs are in
`docs/phase9/analysis/`. The Data Analytics report **Home-Value Completion
Integrity** passed artifact validation and rendered in the authenticated app.

## Implementation

- The funnel is three steps: Address, Contact, Thank you.
- Name and email remain required on the current Home Value UI; phone is clearly
  labeled optional and is validated only when supplied.
- The first valid Contact submission calls the existing `POST /api/leads` path.
- The existing browser submission UUID remains both the header and payload
  idempotency key.
- Durable success remains the only path to the Thank you state and
  `lead_created`; an idempotent replay remains visible without a duplicate
  creation event.
- Existing attribution, timeline, exact consent language/version, source
  surface, widget parent messaging, experiment event, assignment, score,
  notification, and Lead Center behavior remain intact.
- Email consent can be recorded when selected. Call consent is always false
  when the optional phone is blank, preventing a permission record for a
  channel the consumer did not provide.
- A failed durable write stays on Contact and emits `lead_submit_failed` with
  only registered funnel, surface, and step dimensions. Error text, contact
  data, address, provider responses, and lead identifiers cannot enter that
  analytics payload.
- The API accepts address plus email **or** phone for `home_value` and `widget`;
  seller, buyer, chat, and appointment contracts are unchanged.

## Trust and compliance boundary

This change does not infer a valuation, offer, appointment, availability,
protected characteristic, neighborhood recommendation, or response-time
guarantee. The existing broker-reviewed, not-an-appraisal, and `Not a survey.`
copy remains. No contact data is added to analytics, URLs, screenshots, report
datasets, or generated media.

## Release order and authority

This candidate starts from exact Draft PR #214 head
`8a0e951606829c954078bb6abfe4c13a6319d461` and follows:

1. PR #209 durability release;
2. PR #210 canonical alias consolidation;
3. PR #211 Ask conversion accessibility;
4. PR #213 responsive conversion identity;
5. PR #214 lead-alert brand identity v3; and
6. Draft PR #215, this home-value completion-integrity candidate.

It has no current Production authority. After every predecessor is accepted,
refresh onto exact `main`, repeat Node 24, immutable Preview, protected
write-intercepted browser, security, and isolation proof, then require only:

`APPROVE PHASE 9 HOME-VALUE COMPLETION INTEGRITY MERGE AND PRODUCTION DEPLOYMENT`

That gate does not authorize a real/test lead, email/BCC, consumer
acknowledgment, SMS/MMS, Push, provider call, database migration, WordPress,
GTM/GA4, DNS, publication, spend, data deletion, or NellySelly action.

## Rollback

Restore the immediately preceding accepted Vercel deployment or revert this
candidate. No schema, environment, data, provider, WordPress, or DNS rollback
is required. Leads stored while the candidate is active remain canonical and
must not be deleted during application rollback.
