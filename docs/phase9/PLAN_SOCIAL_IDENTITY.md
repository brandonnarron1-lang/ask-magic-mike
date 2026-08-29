# Phase 9 review planner social identity

Date: 2026-08-29

Status: stacked Draft candidate after exact sealed PR #232; Production remains
unchanged.

## Decision

The public review planner already had the correct route, canonical URL, copy,
social card, responsive Black Diamond UI, device-local persistence, privacy
boundary, and tests. The live crawl found one narrow identity mismatch:
`/plan` declared itself canonical while inheriting the homepage Open Graph URL.

The route now calls the existing `publicPageMetadata` helper with
`path: "/plan"`. This is the same metadata contract used by the other
indexable public routes. No second metadata registry, route, card generator,
page design, planner, or analytics path is justified.

## Resulting contract

- canonical: `https://www.askmagicmike.com/plan`;
- Open Graph URL: `https://www.askmagicmike.com/plan`;
- title: `Real Estate Review Planner | Ask Magic Mike`;
- robots: index and follow in the document, while Vercel Preview retains its
  deployment-level noindex boundary;
- Open Graph and Twitter image: the established canonical 1200x630 Ask Magic
  Mike card; and
- planner UI, local storage, privacy copy, route classification, and no-lead /
  no-send behavior remain unchanged.

## Release order and authority

PR #233 is stacked on exact PR #232 head
`2687f98a26cb05c309136cacc136890f16d15ea8`. PR #210 remains the first pending
application release. This candidate cannot leapfrog PR #210 through #232 and
cannot use a consumed or unrelated approval.

Only after every predecessor is accepted, this branch is refreshed onto the
new exact parent, and complete exact-head proof is repeated may it request:

```text
APPROVE PHASE 9 REVIEW PLANNER SOCIAL IDENTITY MERGE AND PRODUCTION DEPLOYMENT
```

That gate authorizes only the reviewed application merge and canonical Vercel
Production deployment. It does not authorize a database or environment
change, lead submission, email/SMS/Push, WordPress/DNS edit, publication,
provider call, spend, deletion, or NellySelly action.

## Rollback

Before Production, close the Draft and preserve its branch. After a separately
approved release, revert the application commit or promote the immediately
preceding Ready Vercel Production deployment. There is no migration, secret,
provider, or external-system state to unwind.
