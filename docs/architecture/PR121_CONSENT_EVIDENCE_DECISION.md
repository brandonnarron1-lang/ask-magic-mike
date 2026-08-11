# PR121 Consent Evidence Decision

Status: release-readiness decision record. This is product/audit evidence
analysis, not legal advice.

## Technical Fact

Accepted PR #121 does not create durable rows in `public.consents` for public
lead submissions.

Evidence:

- `app/api/leads/route.ts` maps consent-related lead fields:
  `consent_sms`, `consent_call`, `consent_email`, `consent_timestamp`, and
  `consent_language_version`.
- `supabase/migrations/20260716043829_infra_02_atomic_lifecycle.sql` inserts
  those fields into `public.leads` inside `capture_public_lead_v1`.
- `capture_public_lead_v1` inserts `sessions`, `contacts`,
  `contact_identities`, `leads`, `source_attribution`, `audit_logs`, routing,
  assignment history, and notification outbox rows, but does not insert into
  `public.consents`.
- `app/lib/persistence/contracts.ts` and
  `app/lib/persistence/supabasePostgrestAdapter.ts` expose lead lifecycle
  identifiers and statuses, not consent-row identifiers.

The durable lead row stores:

- `leads.consent_sms`
- `leads.consent_call`
- `leads.consent_email`
- `leads.consent_timestamp`
- `leads.consent_language_version`

The unpublished migration hard-fails update/delete attempts on
`public.consents`, but that protection applies only to consent rows that exist.

## Missing Product/Audit Evidence

The current public capture path does not create append-only consent evidence
with:

- one row per consent type;
- verbatim consent language text;
- consent source surface as a consent-row field;
- consent collection IP/user-agent on the `public.consents` row;
- replay-protected consent-row idempotency.

## Technical Recommendation

ACCEPT_EXPLICIT_DEFERRAL is the current technical recommendation for PR #121.

This recommendation is based on scope: accepted PR #121 does not claim durable
immutable consent-row evidence, and this offline package is not authorized to
change application behavior or the PR #121 migration.

## Owner Decision Status

OWNER_DECISION_PENDING

Owner must explicitly choose either to accept durable consent-row evidence as a
documented post-PR121 deferral or to block release pending a separate atomic
consent-evidence patch.

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
