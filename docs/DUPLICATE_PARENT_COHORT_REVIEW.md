# Prospective duplicate-parent QA isolation — review record, November 9, 2026

This is one separately reviewable database correction after accepted PR325,
not live release authority. Resolve serving Production with the authenticated
resolver. No Production migration, historical repair, send or ownership change
is authorized by publishing this branch.

## Demonstrated boundary

The accepted `capture_public_lead_v1` parent selector can choose an older
`is_test=true` inquiry for a new ordinary request sharing normalized email or
phone. A new request key is not an exact retry. The existing isolated SQL test
reproduces this before applying the proposed successor. Human identity and
commercial intent cannot be established from a shared contact value.

## Small correction

The proposed migration retains the accepted v1 signature, invoker/search-path,
session/identity/capacity locks, normalization, identity-conflict refusal,
capture audit, assignment and outbox code. One selector condition requires
`COALESCE(l.is_test, false) = v_is_qa`. `v_is_qa` remains the existing server
classification, not a new browser-controlled flag. Public-role execution stays
denied. The static regression compares the entire function after removing this
one added predicate, and compares the original role-safe grant footer.

Ordinary and QA inquiries retain canonical contact identity, but cannot become
each other's duplicate parent. Ordinary suppressed/NO FOLLOW-UP parents remain
eligible duplicate parents; this is not a general suppression bypass. Same-class
repeats retain the existing email-first/created-at/id order. Exact-key retries
return before parent selection with the original identity/fingerprint fencing.

The file is a complete versioned function replacement because PostgreSQL does
not have a one-line stored-function body patch operation. Earlier migrations are
unchanged. Existing lookup expressions/order/indexes are retained; no query-speed
or production-scale cost improvement is claimed. No roles/default grants,
tables, index, application UI, provider or runtime flag are added/changed.

## Evidence and compatibility

Use the required isolated PostgreSQL stage and
`tests/persistence/duplicate-parent-cohort-postgres.test.ts`. It includes the
accepted-selector negative control, prospective email/phone separation, same
contact identity, unchanged historical rows/privileges/defaults, same-class
terminal holds/ownership, concurrent exact retries and distinct requests,
identity conflicts, denied consent, disabled outbox and actual browser-role
refusal. Fresh/upgrade convergence and historical predecessor omissions remain
asserted rather than skipped. No provider transport is used.

Local PostgreSQL17 is not hosted PostgreSQL18 acceptance. Before any future
canonical application, separately authorize the exact source/checksum/effects,
reconcile ledger/current function and prerequisites, use the existing guarded
transaction and establish required actual-runtime-role/PG18 acceptance under a
new explicitly admitted venue, if required. No consumed PR325 QA allowance is
reused. The ordinary app remains compatible with the unchanged RPC signature;
application rollback does not remove this database behavior.

## Explicit exclusions

No historical duplicate is unheld or relinked. No contacts are split, consent
granted, suppression cleared, assignment changed, task created or alert replayed.
No existing customer is made contactable by this migration alone. Future ordinary
captures that no longer match a QA parent enter the existing normal capture path;
its ordinary ownership/alert behavior must be included in the future effect
disposition, not represented as a read-only runtime change. Existing allocation
offer/dispatch gates remain OFF and are not this legacy duplicate selector.

Historical correction of any held inquiry is a separate protected operator
decision. WordPress convergence, reserve publication, allocation and marketing
remain outside this branch. Private customer evidence stays in existing custody.
