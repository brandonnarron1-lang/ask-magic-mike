# Phase 9.3 — Database Revival Command

## Decision

Build the revival layer as a protected, read-only composition of canonical Neon
lead, permission, task, assignment, and sequence facts. Do not create a second
campaign database, a parallel CRM, or an autonomous nurture engine.

The command answers one operational question: **which existing first-party
relationships deserve human review now, and what must be resolved before any
consumer draft could be considered?**

## Cohorts

The deterministic engine uses cohort-specific minimum dormancy windows:

| Cohort | Minimum dormancy | Internal value angle |
| --- | ---: | --- |
| Seller plan refresh | 45 days | Ask whether timing or the property question changed; no valuation or offer claim |
| Buyer search refresh | 30 days | Ask whether area, timing, or priorities changed; no inventory claim |
| Renter-to-owner review | 60 days | Offer a planning conversation; no lending or affordability advice |
| Relationship check-in | 90 days | Ask whether the prior real-estate question remains active without assuming intent |

Activity age uses the latest valid value among creation, last contact, and last
response. A newer response resets dormancy even if the lead was created long ago.
Draft eligibility also requires an explicit owner/BIC-approved record-retention
window in `REVIVAL_RETENTION_MAX_AGE_DAYS`. The application has no legal default:
an unset, zero, negative, fractional, or invalid value fails closed and keeps every
candidate in operator review. Records older than the configured maximum are also
blocked. This setting is an operational control, not legal advice.

## Hard exclusions and conflicts

The canonical SQL excludes:

- test records;
- communication-suppressed records;
- duplicates and duplicate children;
- dead, converted, spam, closed, closed-won, closed-lost, disqualified, and
  test/spam terminal stages; and
- more than 1,000 rows in one request.

The engine then blocks draft eligibility when it finds:

- no explicit purpose-specific `marketing_nurture` or applicable
  `property_alert_subscription` permission;
- an opted-out/suppressed or missing destination;
- an active, scheduled, paused, approval-pending, draft, or test sequence;
- an open task;
- a future scheduled follow-up;
- an appointment workflow; or
- no approved current owner;
- an assigned owner whose canonical `agents.is_active` state is false; or
- a missing retention policy or a record outside the approved retention window.

Generic contact presence and legacy consent flags never become ongoing marketing
permission. The current permission ledger must contain an explicit allowed state.
Property-alert permission is relevant only to the buyer-search cohort and creates
only a property-alert-preference draft; it never becomes general marketing
permission. SMS-only permission produces SMS-shaped copy with STOP/HELP language,
not an email draft. Records without a relevant permitted destination receive an
internal permission-review note, never consumer-shaped copy.

## Explainable ranking

Priority is deterministic and bounded from 0–100. Positive factors include the
existing deterministic lead score, originally stated timeline, relevance window,
explicit permission, owner, and minimized context. Penalties identify missing
permission, destination, active ownership, retention review, and active-work conflicts. Every point and
explanation is rendered to the operator.

Confidence describes confidence in the review recommendation—not confidence in a
person's present intent. It is bounded at 0.95 and increases only when current
canonical evidence such as permission, activity, source, score, and geography is
available.

## Data minimization and RBAC

The cohort query does not select names, contact values, raw questions, street
addresses, consent text, message bodies, or provider payloads. It uses destination
presence booleans and explicit permission states.

- Administrators can review all candidate identifiers.
- Primary lead owners are SQL-scoped to their assigned agent ID.
- Read-only analysts receive aggregate cohort totals but no candidate IDs.
- Candidate detail links return to the already-protected canonical Lead Center.

## Draft boundary

Drafts are deterministic, generic internal review aids labeled:

`INTERNAL DRAFT — NOT APPROVED FOR SEND`

They include factual checks and prohibited-claim reminders. This phase creates no
message template version, sequence, campaign, enrollment, notification row,
provider request, contact attempt, consent decision, or audit mutation.

## Verification

Required evidence:

- pure cohort, exclusion, permission, conflict, score, and confidence tests;
- bounded/minimized Neon query tests;
- administrator, assigned-owner, and analyst role tests;
- read-only route source guard;
- route manifest and middleware coverage;
- strict typecheck, lint, full tests, Production build, and release-safety scan;
- protected Preview behavior and responsive visual QA.

## Deployment and rollback

No database migration is required. Deployment adds one server-rendered route,
one navigation link, and one optional server-only policy variable. Production
must leave `REVIVAL_RETENTION_MAX_AGE_DAYS` unset until the owner/BIC approves a
specific value; that state is safe because every candidate remains operator review.
Rollback is promotion of the prior verified Production
deployment or reverting the feature commit. No lead, permission, sequence, task,
or provider state requires data rollback.

## Exact approval gates

Merge and deployment:

`APPROVE PHASE 9.3 DATABASE REVIVAL COMMAND MERGE AND PRODUCTION DEPLOYMENT`

That phrase does not authorize enrollment or communication. Any future live pilot
must name the exact cohort, channel, template version, recipient cap, permission
rule, sender, monitoring window, stop conditions, and rollback in a separate
approval.
