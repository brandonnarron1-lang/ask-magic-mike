# Phase 9 Public Experiment Ingress Boundary

Date: 2026-09-02
Status: isolated successor to stacked Draft PR #270; Production unchanged

## Decision

Keep the existing Home Value experiment, `POST /api/experiments/event`,
canonical Neon growth tables, and deterministic variant engine. Do not add a
second experiment service, analytics ledger, lead store, route, database
migration, provider, or client-side conversion authority.

The public endpoint is now exposure-only. A browser may request a bounded,
pseudonymous exposure and receive the server-selected variant, but it may not
claim that a lead was created or attach an arbitrary existing lead UUID. The
canonical `POST /api/leads` route becomes the sole author of a public-experiment
`lead_created` conversion after the lead transaction has committed.

## End-to-end authority

```text
Home Value browser
  -> SHA-256 pseudonymous session subject
  -> POST /api/experiments/event (exposure only)
       exact Origin + Preview no-write + durable Production limiter
       strict 4 KB JSON/object/schema/surface contract
       code registry + Production switch + approved/running Neon row
       deterministic assignment + idempotent exposure event
  <- active server-selected variant, or inert control experience

Home Value durable submit
  -> four bounded experiment-context fields accompany POST /api/leads
  -> server recomputes exact registry variant and surface eligibility
  -> capture_public_lead_v2 commits the canonical lead lifecycle
  -> non-test, non-replay post-commit server conversion
       requires the prior stored assignment
       requires the same deterministic variant
       requires the exact newly stored eligible lead UUID
       writes one idempotent growth_experiment_events row
```

No experiment context is required when the experiment is disabled, inactive,
unavailable, or not approved. The existing control experience and lead funnel
continue to work in those states.

## Public exposure contract

- An explicit exact origin from the existing Ask Magic Mike / Our Town
  Properties allowlist is required. Origin-less and foreign-origin requests
  fail before limiter or repository access.
- Automated-browser requests are acknowledged but excluded before shared
  state access so visual QA does not pollute the experiment ledger.
- Read-only Preview refuses before the shared limiter can write a Neon bucket.
- Production persistence requires an allowed durable limiter result. The
  existing exact `RATE_LIMIT_EMERGENCY_MEMORY=1` break-glass control is the
  only non-durable Production exception.
- Only `application/json` is accepted. Declared and streamed bodies are capped
  at 4,096 bytes, the root must be an object, and unknown fields are rejected.
- The only accepted fields are `experiment_key`, `subject_key`, `event_name`,
  and `surface`; the sole public event is `exposure` on the definition's exact
  static surface.
- Public `lead_created` requests return `server_event_required`. A supplied
  lead ID cannot be forwarded to the repository.
- Every response is private/no-store and carries the same random correlation
  identifier in the body and `X-AMM-Correlation-Id`. Throttling returns a
  positive `Retry-After` bounded by the one-minute analytics window.
- Repository unavailability returns a truthful safe 503. Disabled or
  unapproved experiments remain inert and do not alter the public funnel.

## Lead conversion contract

The browser carries only four bounded, non-contact fields returned by the
active exposure flow: experiment key, SHA-256 subject key, deterministic
variant key, and static surface. `POST /api/leads` treats them as one all-or-
nothing context. Partial context, malformed subject, unknown experiment,
variant substitution, wrong surface, wrong funnel, and cross-placement reuse
fail before lead persistence.

After `capture_public_lead_v2` returns a new durable lead, the server submits
the exact canonical lead UUID to the existing experiment repository. The
repository never creates an assignment during conversion: a prior stored
exposure must exist. It reloads that assignment, recomputes the deterministic
variant, verifies the browser-carried variant, and confirms that the lead
exists with `is_test=false` and `communication_suppressed=false` before writing
the idempotent conversion event.

Idempotent lead replay returns before post-commit conversion work, preventing
conversion inflation. Internal QA leads are excluded before repository access.
Experiment event failure is isolated after lead commit and cannot reverse a
truthfully stored lead or its notification intent; the safe failure reason and
lead correlation ID are available in application logs without contact data,
subject keys, provider secrets, or recipient addresses.

## Compatibility and consolidation

The active Home Value experiment experience already waited for a successful
exposure response before rendering an active variant. This change reuses that
context in the existing lead request and removes only the browser-authored
conversion call. Other funnels, the WordPress bridge, widget placements, the
general analytics ledger, scoring, routing, notifications, and Lead Center are
unchanged.

Score and routing are now computed once and passed into both the canonical lead
row and notification metadata. This removes duplicate deterministic work and
keeps stored score/routing evidence aligned without changing the algorithm.

## Scope, release order, and rollback

This is an application-only Draft candidate stacked from exact PR #270 head
`9257c7ed720495a82370a2821d4f63a9900d8e9f`. PR #248 remains the sole currently
requestable application merge/deployment gate. Accepted Production remains PR
#247 merge `a2f3de834830f600df106dbf5836ae4bbde4eb4a`, exact tree
`0065f829fc94f87ab5e0faf596c8e56733be3972`.

No Production environment value, experiment status, database row, migration,
deployment, WordPress placement, lead, analytics event, notification, provider,
DNS, publication, spend, deletion, or NellySelly state is changed by this
candidate.

Rollback is application-only: remove this stacked Draft branch, revert its one
code/documentation commit after any later approved release, or restore the
immediately preceding accepted Ready deployment. No database rollback or data
deletion is required because this candidate adds no schema change.
