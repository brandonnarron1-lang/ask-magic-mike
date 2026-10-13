# Home Value address entry — review candidate, not activation

This increment follows accepted PR297. It does not resubmit the saved owner
request, fix its unproven email history, change a contact, or execute an email.
Exact source, executed gates and Preview status belong in the PR review seal.

## Implemented boundary

- Root `HomeValueFunnel` uses reusable `AddressEntry`: native/uncontrolled text,
  editable street/unit/locality/region/postal/country, visible manual fallback.
- Suggestions are manual-selection only; You entered / Suggested with Use,
  Keep or Edit. Unit fields and explicit typed unit markers are retained.
- Final address/email review uses the same native snapshot as the POST. A
  changed-before-click/eventless value updates the review without submitting;
  an explicit subsequent activation is needed. Frozen retries retain bytes/key.
- Version-one `address_entry` retains original entered text, accepted text and
  components. Manual, user-confirmed suggestion and user-edited are distinct;
  validation remains `not_performed`. Browser claims cannot establish validation.
- Authorized operational profile shows original versus accepted inquiry data.
  Existing server scopes, disclosure tiers and contact permissions remain intact.
- Contact dedupe is unchanged. One person / different units retains separate
  inquiry rows; different people / same building remain separate contacts.

## Provider candidate — disabled

Google Places REST **New** autocomplete/details is the selected optional adapter,
not Address Validation, a parcel match, a valuation or ownership verification.
The endpoint accepts address/query/session only, bounds streams/time/results,
binds short-lived signed candidates to query/session, applies a shared durable
Production limiter and refuses all Preview/non-test local outbound lookup.
Fixture results are not live search. Third-party attribution it cannot correctly
display fails closed. No raw response/suggestion list is retained.

Activation requires separate approval of account billing/API eligibility,
server key restrictions and quotas, signing configuration, privacy/terms and
transaction-specific retention, plus reviewed Google Maps attribution. Compact
text attribution is included for the small combobox/correction containers;
larger surfaces require a fresh logo/attribution review. Public legal copy and
provider configuration have not been published or changed.

Server-only optional names: `ADDRESS_LOOKUP_ENABLED`,
`ADDRESS_GOOGLE_CONTENT_USE_APPROVED`, `GOOGLE_PLACES_API_KEY`,
`ADDRESS_LOOKUP_SIGNING_SECRET`. All must remain absent/false until approved.
No browser key, SDK, model call, new dependency or provider account is needed.
Official references: [Autocomplete](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete),
[Details](https://developers.google.com/maps/documentation/places/web-service/place-details),
[sessions](https://developers.google.com/maps/documentation/places/web-service/place-session-tokens),
[policy](https://developers.google.com/maps/documentation/places/web-service/policies).

## Schema and release/rollback

One local additive migration:
`20261013140000_structured_address_capture.sql`. Nullable `leads.address_entry`;
server-only invoker `capture_public_lead_v3` wraps unchanged v2 inside the same
transaction. Matching key/session locks include structured replay comparisons.
Enrichment failure rolls back lead/contact/consent/assignment/audit/outbox.
Legacy v1/v2 callers, fingerprints and queued render versions remain intact.
No old-row backfill or applied migration modification.

Review publication does not authorize a Production migration or deployment.
Apply the approved migration before a future matching app deployment. A
compatible rollback returns generation to the accepted legacy v2 app while
retaining nullable column, v3 reader/function, captured evidence and old queues.
Do not drop data, re-key a saved request, rewrite rows, resend or unsend mail.
Lookup remains off throughout this review and any manual-only release.

## Verification scope

Supported gate: `pnpm run release:gate` under Node24/pnpm10.30.3.
Real local SQL: `AMM_QA_POSTGRES_TEST=1 AMM_QA_NATIVE_POSTGRES_TEST=1 pnpm exec vitest run tests/persistence/address-capture-postgres.test.ts tests/persistence/home-value-intake-fidelity-postgres.test.ts --maxWorkers=1 --no-file-parallelism`.
Built UI: `AMM_QA_NATIVE_POSTGRES_TEST=1 AMM_SESSION_ARTIFACT_DIR=.amm-run/address-entry-built pnpm run test:home-value:sessions`.
The latter uses intercepted synthetic intake/provider receipts; root HTTP
Request/Response-to-PG tests separately prove real transactions. Do not merge
these scopes into a fictitious browser-to-Production/SQL proof or Mail result.
Existing real Better Auth/session/SQL suites stay enabled. Physical iPhone,
Safari, Apple Mail and VoiceOver acceptance require genuine device evidence.

Next boundary: exact-source hosted review and a proven synthetic-only Preview
schema/data venue if required. Provider activation and contact correction remain
separate decisions; no new acquisition, CRM, messaging or analytics store.
