# Phase 9 first-response work coverage invariant

Date: 2026-09-01

Status: stacked Draft application candidate; no Production, database,
WordPress, notification, or communication authority

## Decision

Extend the existing Daily Action Queue reconciliation with one aggregate,
explainable invariant:

```text
every current first-response risk is covered by either
1) a direct priority-1 first-response queue card, or
2) an existing priority-1/2 task or appointment for the same lead
```

This closes the remaining proof gap without adding another queue, task store,
workflow engine, provider, or CRM. The mechanism follows the same operational
pattern emphasized by current real-estate lead platforms: route promptly,
alert the accountable operator, expose performance, and keep follow-up in a
structured pipeline. Reference material:
[Zillow lead conversion guidance](https://www.zillow.com/pro/converting-your-leads-and-connections/),
[Realtor.com ReadyConnect](https://www.realtor.com/marketing/real-estate-managed-services/concierge/),
and [Realtor.com conversion-pipeline guidance](https://www.realtor.com/marketing/resources/do-you-have-a-real-estate-conversion-pipeline/).

## Canonical calculations

The pure queue builder returns its existing ordered items plus:

- `riskCount`: eligible 15-minute first-response risks from immutable response
  evidence;
- `directQueueCount`: risks represented by the deterministic
  `first_response_overdue` card;
- `coveredByExistingActionCount`: risks represented by an existing urgent task
  or appointment;
- `coveredCount`: direct plus existing-action coverage;
- `uncoveredCount`: risks with neither representation; and
- `evidenceAvailable`: whether the canonical immutable response ledger was
  actually readable.

Zero is never inferred when evidence is unavailable. The legacy Supabase
fallback therefore reports `evidenceAvailable=false`, even if its returned
item set is empty.

## Protected health contract

The authenticated admin health response gains an aggregate-only
`lead_operations` object containing queue depth, urgent count, the six coverage
measurements, a derived `first_response_coverage_complete` boolean, and an
explicit test/suppression exclusion marker.

The health reader:

- executes against canonical Neon only;
- selects no lead first name, last name, or address in aggregate-only mode;
- returns no lead ID, label, message, contact value, recipient, or source URL;
- remains behind existing administrator health authorization and no-store
  response controls; and
- performs no write or provider call.

## Lead Center presentation and RBAC

Administrators with `lead:view_all` receive one aggregate coverage card:

- `covered/risk` when immutable evidence is available;
- a visible attention state when any risk is uncovered; or
- `Held` when evidence is unavailable.

Assigned-only roles continue to receive only their filtered queue items. They
do not receive the global coverage card or cross-agent aggregate counts. The
card cannot send a message, place a call, assign a lead, or record a response;
operators must open the existing protected lead detail and record the real
human action there.

## Safety and scope

- Test, suppressed, terminal, already-contacted, already-responded, stale,
  future-dated, and unverifiable records remain excluded.
- AI does not determine the risk, priority, assignment, or coverage result.
- A queued action is not delivery evidence and is not a claim that contact
  occurred.
- No schema, migration, environment variable, secret, provider, public route,
  form, WordPress placement, notification template, or analytics event is
  added.
- No Production, database, lead, response, task, WordPress, email, SMS, Push,
  DNS, spend, deletion, or NellySelly mutation is authorized by this Draft.

## Acceptance and rollback

Acceptance requires focused contract tests, strict typecheck, full repository
release gate under Node 24, exact-head hosted CI, immutable no-write Preview QA,
protected-route failure behavior, and a clean runtime-log window.

This Draft remains stacked behind the current reviewed application train and
has no independent release phrase. Before release, rollback is closing the
Draft. After a separately approved same-tree application release, rollback is
reverting that merge or restoring the immediately preceding Ready Vercel
deployment. There is no schema or external data to unwind.
