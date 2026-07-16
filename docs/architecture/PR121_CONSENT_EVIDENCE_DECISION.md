# PR121 Consent Evidence Decision

Status: release-readiness decision record. This is product/audit evidence
analysis, not legal advice.

## Question

Does a public submission in accepted PR #121 create a durable row in
`public.consents`?

## Finding

No. A public submission currently persists consent-related fields on the
`public.leads` row, but `capture_public_lead_v1` does not insert into
`public.consents`.

Evidence:

- `app/api/leads/route.ts` builds lead persistence fields:
  `consent_sms`, `consent_call`, `consent_email`, `consent_timestamp`, and
  `consent_language_version`.
- `supabase/migrations/20260716043829_infra_02_atomic_lifecycle.sql` inserts
  those fields into `public.leads` inside `capture_public_lead_v1`.
- The same function inserts `sessions`, `contacts`, `contact_identities`,
  `leads`, `source_attribution`, `audit_logs`, assignment records, routing, and
  notification outbox rows, but contains no `insert into public.consents`.
- `app/lib/persistence/contracts.ts` and
  `app/lib/persistence/supabasePostgrestAdapter.ts` expose the lead lifecycle
  result, not a consent-row result.

## Existing Durable Fields

The durable lead row stores:

- `leads.consent_sms`
- `leads.consent_call`
- `leads.consent_email`
- `leads.consent_timestamp`
- `leads.consent_language_version`

The unpublished migration also hard-fails update/delete attempts on
`public.consents`, but that protects consent rows only when they exist.

## Absent Product/Audit Evidence

The current public capture path does not create append-only consent evidence
with:

- one row per consent type;
- verbatim consent language text;
- consent source surface as a consent-row field;
- consent collection IP/user-agent on the `public.consents` row;
- replay-protected consent-row idempotency.

## Release Classification

This is an accepted-defer issue for PR #121, not a newly discovered application
source blocker. The accepted PR #121 scope does not claim durable immutable
consent-row evidence, and this offline mission is not authorized to change
application behavior or migrations.

## Smallest Future Patch

A future patch should add consent-row persistence to the same atomic public
capture transaction:

1. Extend the lead capture input contract with explicit consent evidence fields,
   including consent text and source surface.
2. Insert one `public.consents` row per granted consent type from
   `capture_public_lead_v1`.
3. Make replay idempotent so an identical replay creates no duplicate consent
   rows.
4. Preserve rollback behavior so consent rows disappear with the rest of the
   lead lifecycle if the transaction fails.
5. Keep `public.consents` immutable.

## Required Future Tests

- Route mapping test proving consent evidence fields reach the persistence
  contract.
- PostgreSQL transaction test proving public capture creates the expected
  `public.consents` rows.
- Replay test proving no duplicate consent rows on idempotent replay.
- Failure rollback test proving no orphan consent rows remain after a failed
  lifecycle transaction.
- Immutability test proving update/delete attempts on `public.consents` fail.
- Public response test proving consent internals are not exposed to clients.

## Disposition

ACCEPT_EXPLICIT_DEFERRAL

Owner decision sentence:

Approve PR #121 with durable immutable consent-row evidence explicitly deferred;
do not claim consent-row audit durability until a separate schema and
application patch is authorized and verified.
