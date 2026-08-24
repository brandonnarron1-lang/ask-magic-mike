# Phase 9 — Canonical Alias Consolidation

Date: 2026-08-23

Status: stacked candidate refreshed onto sealed PR #209; no Production change

Stack base: exact PR #209 candidate
`1d1d8d4f8e0970f3f6a1b80ab9ff2bebcd40216d`

## Decision

Finish the existing search-authority repair without creating a new content system. The established compatibility paths remain accepted, but they now issue query-preserving permanent redirects to the canonical conversion routes:

| Compatibility path | Canonical destination | Response |
|---|---|---|
| `/value` | `/home-value` | `308 Permanent Redirect` |
| `/we-buy-houses` | `/sell` | `308 Permanent Redirect` |

The only live public internal link that still pointed at `/value` is changed to `/home-value`.

## Why this is the smallest correct change

- The Phase 9.5 search-authority implementation already supplies route-specific metadata, canonicals, sitemap policy, crawl controls, and restrained structured data.
- Production read-only evidence on 2026-08-23 showed both compatibility paths still served duplicate `200` documents.
- Google documents redirects as a stronger canonicalization signal than sitemap inclusion and recommends linking internally to canonical URLs.
- Next.js documents that `next.config.ts` redirects run before filesystem routes, use `308` when permanent, and pass incoming query parameters through to the destination.
- Query preservation keeps UTMs and click IDs available to the existing first/last-touch attribution system.

This candidate deliberately does not add FAQ markup, `llms.txt`, generated location pages, market claims, reviews, ratings, or unverified LocalBusiness facts. Google removed FAQ rich results in 2026 and says no special AI-search markup is required. OurTownProperties.com remains the authoritative brokerage and local-content surface.

## Scope

Changed:

- `next.config.ts`: two permanent, query-preserving redirects;
- `app/contact/page.tsx`: canonical home-value internal link;
- `scripts/monitor-production.mjs` and its shared contract: canonical-document
  availability plus exact status/destination checks for both compatibility
  redirects;
- focused redirect/attribution tests; and
- this decision record.

Unchanged:

- forms, API contracts, database, scoring, routing, notifications, authentication, analytics storage, WordPress, DNS, Vercel Production settings, NellySelly, and all lead data;
- existing compatibility page source files, retained for history and simple rollback; and
- accepted Production commit/deployment and sealed PR #209 behavior.

## Verification contract

The focused test executes the real Next.js redirect configuration and proves, for both aliases:

1. response status is `308`;
2. origin remains `https://www.askmagicmike.com`;
3. path resolves to the intended canonical route; and
4. `utm_source`, `utm_medium`, `utm_campaign`, and `gclid` survive exactly.

The Production monitor must also check `/home-value` as the canonical `200`
document and require each compatibility path to return its exact `308`
destination. This prevents the release from making its own synthetic monitor
fail merely because canonicalization is working as designed.

Full typecheck, lint, tests, optimized build, route-manifest, release-safety, isolation, dependency, and secret-scan evidence must pass before this candidate is eligible for review.

## Rollback

Revert this candidate commit and redeploy the prior accepted tree. No database or external-system rollback is required. Existing compatibility page files remain in the repository and resume serving their previous canonicalized `200` documents when the redirect configuration is removed.

## Production authority

No Production action is authorized by this document or by any earlier approval.
This stacked candidate remains separate from sealed PR #209. It is synchronized
with PR #209's exact reviewed candidate, but PR #209 must still be merged and
accepted first. PR #210 must then be retargeted/refreshed onto that exact
released `main` and repeat exact-head CI and Preview proof before release.

Only the following later phrase may authorize the exact reviewed PR #210
code-only merge and matching Vercel Production deployment:

`APPROVE PHASE 9 CANONICAL ALIAS CONSOLIDATION MERGE AND PRODUCTION DEPLOYMENT`

That phrase does not authorize PR #209's durability secret, a database or
environment change, a lead or message, WordPress/DNS/Search Console mutation,
publication, spend, deletion, or any NellySelly action.
