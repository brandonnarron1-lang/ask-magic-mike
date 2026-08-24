# Phase 9 — Canonical Alias Consolidation

Date: 2026-08-23

Status: isolated stacked candidate; no Production change

Base: exact PR #209 head `c04655cc04135f89cf9b401a631bc503c8c70057`

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
- accepted Production commit/deployment and sealed PR #209.

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

No Production action is authorized by this document or by any earlier approval. This stacked candidate remains separate from the sealed PR #209 and requires its own exact approval after Preview evidence is complete.
