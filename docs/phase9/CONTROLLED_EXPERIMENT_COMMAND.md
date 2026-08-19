# Phase 9.6 — Controlled Experiment Command

Date: 2026-08-19

Owner: Mike Eatmon / Our Town Properties

Status: dormant release candidate

## Decision

Phase 9.6 extends the existing growth-experiment schema and evaluator. It does not create a second analytics store, lead database, or feature-flag vendor. The first reviewed candidate is `home_value_trust_promise_v1` on `/home-value`.

The deployed default remains the current control copy. An experiment is eligible only when all three independent controls agree:

1. `PUBLIC_EXPERIMENTS_ENABLED=true` in the approved Production environment.
2. The canonical Neon row is `approval_status=approved` and `status=running`.
3. Database variant keys and weights exactly match the reviewed code registry.

Merge and deployment do not activate an experiment.

## Candidate

Hypothesis: a more explicit broker-review promise can improve qualified appointment rate without weakening completion quality, accessibility, performance, or consumer trust.

- Control: current trust promise.
- Candidate: explicit broker-reviewed local next step.
- Allocation: deterministic 50/50.
- Minimum sample: 100 exposures per variant.
- Minimum practical uplift: 10%.
- Primary metric: appointment conversions divided by exposures.
- Diagnostic metric: durable live leads divided by exposures.
- Test and suppressed leads: excluded.

No variant promises an automated valuation, offer, inventory, appointment, response time, or outcome.

## Data and privacy boundary

- The browser creates a random session-scoped identifier and sends only its SHA-256 digest.
- Server assignment is deterministic and authoritative.
- Assignments and events use the existing canonical Neon experiment tables.
- Exposure and conversion writes are idempotent.
- A conversion is accepted only for a durable lead that is neither a QA test nor communication-suppressed.
- The protected command view returns aggregate counts only; it does not query or render contact PII.
- Browser code receives no database secret, operator secret, raw lead identity, or internal notes.

## Operational surface

`/admin/experiments` requires server-side `report:view` permission and shows:

- the reviewed code candidate;
- validation and deterministic allocation rehearsal;
- master-switch, schema, approval, and runtime state;
- aggregate assignments, exposures, durable leads, qualified leads, appointments, rates, and guardrail counts;
- the evaluator decision and minimum-sample status.

The page has no mutation controls. Registration, approval, activation, pausing, promotion, or rollback cannot be performed from this release.

## Release gates

Code merge and deployment:

`APPROVE PHASE 9.6 EXPERIMENT COMMAND MERGE AND PRODUCTION DEPLOYMENT`

Draft registry migration, separately:

`APPROVE PHASE 9.6 EXPERIMENT DRAFT REGISTRATION MIGRATION`

Controlled Production activation, separately and only after visual/performance acceptance:

`APPROVE HOME VALUE TRUST PROMISE V1 CONTROLLED PRODUCTION EXPERIMENT`

## Rollback

1. Set `PUBLIC_EXPERIMENTS_ENABLED=false` for an immediate fail-closed stop.
2. Set the canonical experiment row to `paused` if it has been activated.
3. Redeploy the prior known-good commit if the code surface itself must be removed.
4. Keep historical aggregate evidence; archive the registry row later instead of deleting it.

The public `/home-value` route continues to render the control experience when any gate is absent or an experiment service call fails.

## Primary implementation references

- Google Search Central, website testing guidance: <https://developers.google.com/search/docs/crawling-indexing/website-testing>
- Vercel Flags overview: <https://vercel.com/docs/flags>
- Next.js cookies API: <https://nextjs.org/docs/app/api-reference/functions/cookies>

The implementation follows the same-URL, limited-scope, reversible testing pattern. It does not require Vercel Flags or a new paid dependency.
