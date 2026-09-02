# Phase 9 Current Release Ledger Reconciliation

Date: 2026-09-02
Status: isolated successor to stacked Draft PR #266; Production unchanged

## Decision

Reconcile the current limitations register with the existing release authority
instead of creating another release system. `CURRENT_RELEASE_AUTHORITY.md`,
`config/current-release-authority.json`, and their typed adapter remain the
single application authority.

The audit found one operationally dangerous contradiction:
`KNOWN_LIMITATIONS.md` still described PR #246 as Production, PR #247 as the
reviewed candidate, and PR #247 approval as the next action. PR #247 is already
accepted Production and its exact approval is consumed. Following the stale
text could replay an exhausted gate or bypass the reviewed PR #248 order.

## Reconciled contract

- Accepted Production is PR #247 merge
  `a2f3de834830f600df106dbf5836ae4bbde4eb4a`, tree
  `0065f829fc94f87ab5e0faf596c8e56733be3972`, deployment
  `dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U`.
- PR #248 head `f6134b71f258003aa5dc201cf5ef7cdb6eb61ee7`, tree
  `832be2750355391f9198fcaaaa6f46bb3beb8b3f`, is the sole active reviewed
  application candidate.
- PRs #249 through #266 remain ordered Draft review work with no independent
  Production authority.
- The PR #247 gate is consumed; only the machine-bound PR #248 gate can be
  requested now.
- Static documentation does not freeze mutable lead counts. Authenticated Lead
  Center and Growth aggregates are point-in-time demand authority.
- Preview remains no-write unless protected endpoint attestation and every
  established mutation gate agree.

## Drift guard

The existing current-authority test now includes `KNOWN_LIMITATIONS.md` in its
front-loaded current-truth check and separately requires Production commit,
tree, deployment, candidate head/tree, and exact candidate gate. It rejects the
three stale release/approval phrases that caused the contradiction.

## Safety and rollback

This change edits documentation and its regression test only. It does not merge
or deploy PR #248, update the authority manifest, alter a runtime route, or
perform a database/provider/WordPress action.

Rollback is application-source-only: revert this documentation/test commit.
No lead, notification, deployment, WordPress revision, database row, or
provider record requires restoration.
