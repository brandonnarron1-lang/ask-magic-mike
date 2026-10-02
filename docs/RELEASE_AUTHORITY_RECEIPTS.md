# Release Authority Receipts

## Purpose

Ask Magic Mike separates release policy, review-time candidates, and accepted
Production facts. Tracked source no longer predicts the final merge, tree,
deployment, or verifier run that will result from merging that same source.

```text
policy -> candidate -> deployment -> verification -> acceptance receipt -> resolver
```

## Tracked policy

[`config/release-authority-policy.json`](../config/release-authority-policy.json)
defines the schema, canonical repository/project/environment, receipt store,
approval requirements, consumed gates, and historical receipts. The optional
candidate and review vehicle are source-local. Accepted Production is not.

## Generated receipt

After a successful GitHub `Production` deployment, the existing post-deploy
workflow verifies the exact canonical source and runs non-mutating monitor and
smoke checks. It then runs:

```bash
node scripts/release/generate-production-acceptance-receipt.mjs
node scripts/release/publish-production-acceptance-receipt.mjs
```

The generator derives repository, PR, merge, tree, GitHub deployment, Vercel
deployment/project/target, aliases, verifier runs, monitor/smoke/readiness,
change counts, rollback, timestamp, and acceptance state from authenticated
evidence. Canonical JSON carries a SHA-256 integrity value. Values resembling
credentials or customer contact data are rejected.

## Durable storage and retention

Each accepted deployment is stored as a non-latest GitHub Release under tag
`amm-production-acceptance/<deployment-id>` with:

- `ask-magic-mike-production-acceptance.json`;
- `ask-magic-mike-production-acceptance.sha256`; and
- concise release notes.

The Release persists with repository history until explicit owner deletion;
the workflow also retains a run-scoped artifact for 30 days. Publishing the
same exact receipt is a no-op. Conflicting content for the same deployment
fails closed and is never overwritten.

PR #282 predates this publisher. Its existing durable PR acceptance comment is
the authenticated bootstrap only while no generated receipt release exists.
Once any generated receipt exists, the resolver will not fall back to the
bootstrap if that newer receipt is missing or invalid.

## Resolver

Run from an authenticated operator checkout:

```bash
pnpm release:authority:resolve
```

The resolver selects the newest generated accepted receipt (or the PR #282
bootstrap during migration), verifies its integrity, and independently checks:

- GitHub commit/tree/PR/deployment and exact verifier runs;
- Vercel deployment ID, Ready state, Production target, project, repository,
  source SHA, generated URL, and canonical alias;
- current liveness/readiness; and
- the preserved Ready rollback deployment.

Any missing evidence, failed verifier, wrong project/environment, source/tree
mismatch, alias contradiction, unaccepted state, unavailable rollback, or
receipt integrity failure produces a non-zero exit with named failed checks.
The resolver performs no repair and no Production mutation.

For launch tooling, save the JSON outside the repository and pass it to either
doctor:

```bash
pnpm release:authority:resolve > /tmp/amm-production-authority.json
pnpm amm:launch:doctor -- --authority-resolution /tmp/amm-production-authority.json
pnpm amm:launch:authority -- --authority-resolution /tmp/amm-production-authority.json
```

## Runtime boundary

Public and Lead Center runtime code never depends on GitHub or Vercel API
availability. It consumes only source-local candidate policy. Health endpoints
expose non-sensitive Vercel build commit/URL/target headers so post-deployment
verification can prove which source the canonical alias serves.

## Rollback

Application rollback uses the deployment ID in the currently resolved receipt
and the repository's exact owner-gated release process. Reverting this tooling
restores the prior source behavior but does not delete already published
receipts. A receipt is evidence and must not automatically mutate aliases,
configuration, data, or external systems.
