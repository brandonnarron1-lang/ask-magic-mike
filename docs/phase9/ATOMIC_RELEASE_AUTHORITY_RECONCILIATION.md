# Phase 9 atomic release-authority reconciliation

Date: 2026-08-23  
Canonical repository: `brandonnarron1-lang/ask-magic-mike`  
Status: historical authority decision; superseded by accepted PR #209 release
Canonical Production at time of decision: PR #195 merge
`b450b41c66c6740bd20571cdbe7d8caf82e92d5e`, Vercel deployment
`dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`  
Canonical Draft candidate at time of decision: PR #209,
`codex/phase9-controlled-release-candidate-20260823`

## Accepted outcome — 2026-08-28

PR #209 reviewed head `b28b380f2cc3f9b63b2c0048b398e97a88dfee4b`
merged as `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` and passed
same-commit Production acceptance on deployment
`dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`. Its exact gate is consumed and exhausted.
PR #210 is now the next separate application candidate; this historical record
grants it no authority. See
`docs/phase9/DURABLE_RATE_LIMIT_PRODUCTION_ACCEPTANCE_2026-08-28.md`.

## Decision

At the time of this reconciliation, PR #209 was the sole current application
release vehicle. PRs #202 through #208
remain preserved as incremental review evidence but have no independent merge
or Production authority. This replaces the obsolete stacked release sequence
with one exact candidate, one matching deployment, and one rollback point.

The decision changes no application behavior and grants no new authority. It
prevents current operating documents from directing an operator toward a
superseded partial PR, a previously consumed gate, or seven intermediate
Production deployments.

## Fresh authoritative evidence

Observed on 2026-08-23 without a form submission, authenticated lead read, database write,
message, publication, or configuration change:

- GitHub `main` resolves to PR #195 merge
  `b450b41c66c6740bd20571cdbe7d8caf82e92d5e`.
- Vercel canonical Production deployment
  `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW` is `READY` and owns both Ask Magic Mike
  custom hostnames.
- Public conversion verification: 15 pass / 0 fail.
- Read-only Production smoke: 19 pass / 2 intentional skips / 0 fail.
- Candidate Production monitor: 8 pass / 1 fail. The failure is the intended
  durable-rate-limit body contract; HTTP 200 alone is no longer accepted.
- PR #209 pre-reconciliation application/security head
  `b4e76f795d74d6a7c0947b16150cdb9c6c63e23a` is Draft, open, cleanly
  mergeable, and had green GitHub/Vercel exact-head evidence.
- Ask Magic Mike/NellySelly isolation remained untouched and previously passed
  on that exact application/security head.

## Authority boundaries

At the time, optional isolated synthetic Preview mutation and deterministic
cleanup required:

`APPROVE PHASE 9 NEON-ATTESTED CONTROLLED PREVIEW MUTATION QA`

One encrypted Production-only durability secret, exact reviewed PR #209 merge,
and matching same-commit Production deployment required:

`APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`

Those historical gates were not interchangeable. The Production gate is now
consumed and exhausted. Neither authorized a lead, email, SMS, Push,
consumer acknowledgment, WordPress edit, public post, paid media, DNS change,
database migration, data deletion, or NellySelly action.

The first later WordPress action remains a separate one-href homepage gate:

`APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION`

It also requires a fresh matching manifest and verified page-149 backup before
use.

## Drift prevention

`tests/scripts/current-release-authority-docs.test.ts` now verifies that the
operating source-of-truth documents:

1. identify the accepted Production commit and deployment;
2. identify PR #209 as the sole atomic candidate;
3. keep Preview mutation and Production release as distinct exact gates;
4. reject known stale stacked-release claims; and
5. preserve PRs #202 through #208 as evidence without independent authority.

Future releases must update the operating documents and this executable
contract together. Historical implementation packets remain unchanged and may
still contain accurate dated references.

## No-action record

This reconciliation performed no merge, Production deployment, Preview or
Production database mutation, environment-secret change, lead submission,
analytics event, email, SMS, Push, consumer acknowledgment, WordPress edit,
external publication, DNS change, spend, data deletion, or NellySelly action.

## Rollback

- Documentation/code rollback: rescue ref
  `rescue/amm-pr209-pre-authority-reconciliation-20260823-2136` at
  `b4e76f795d74d6a7c0947b16150cdb9c6c63e23a`.
- Production rollback remains deployment
  `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`; Production was not changed.
- Do not reopen the stacked release sequence as rollback. Restore the last
  accurate authority documents or issue a new explicit candidate decision.
