# Batch C — SMS consent/status foundation

Status: `VERIFIED_NOT_PRODUCTION`

This current-main port replaces the unique application work from historical
Draft PRs #273 and #274. It does not merge their stacked branch ancestry.

## Scope

- signed Twilio status callback validation;
- atomic provider receipt, notification status, and audit/event transitions;
- idempotent replay and payload-conflict detection;
- out-of-order/corrected status handling without terminal-state regression;
- atomic inbound STOP/START/HELP classification and permission transitions;
- all-record phone suppression for STOP;
- late-match healing and minimized unmatched receipts;
- PostgreSQL 17 contract verifiers for both routes.

## Explicit exclusions

- no SMS provider or sender activation;
- no carrier registration or purchase;
- no recipient change;
- no environment value or secret change;
- no database migration;
- no Production callback or message;
- no consumer or internal SMS send;
- no WordPress, DNS, or NellySelly change.

The routes remain useless to an attacker without a valid provider signature and
the configured server-only secret. Shipping this batch does not make SMS live.

## Verification

- 4 focused files / 45 tests passed.
- strict TypeScript passed.
- PostgreSQL 17.11 Twilio status contract passed processed, replay,
  out-of-order, correction, non-regression, rollback, retry, unmatched, and
  late-match-healing cases.
- PostgreSQL 17.11 inbound contract passed STOP, permission, HELP, replay,
  payload conflict, rollback, retry, unmatched, late-match healing, and
  minimized-receipt cases.
- secret scan found no candidate credential.

The complete release gate, protected no-send Preview, and immutable rollback
receipt must pass before this Draft can be considered for release.

## Rollback

No schema change exists. Re-alias the immediately prior Vercel Production
deployment and confirm both callback routes return the previous behavior.

## Future release gate

`APPROVE PHASE 9 BATCH C SMS CONSENT STATUS FOUNDATION MERGE AND SAME-TREE PRODUCTION DEPLOYMENT`

That phrase will authorize only the reviewed application release. It will not
authorize provider activation, secret entry, carrier registration, or any SMS
send.
