# Phase 9.5 — Search Authority and Canonical Repair

Date: 2026-08-19

Status: isolated implementation candidate; no production publication

Action class: reversible public metadata and crawl-policy code

Production approval gate: `APPROVE PHASE 9.5 SEARCH AUTHORITY MERGE AND PRODUCTION DEPLOYMENT`

## Decision

Repair the search identity of the existing Ask Magic Mike conversion application without adding duplicate brokerage articles or competing with OurTownProperties.com.

Phase 9.5 gives each indexable conversion route a truthful title, description, self-referential canonical URL, Open Graph identity, Twitter identity, and explicit index/follow policy. Compatibility aliases point to the full canonical route. Operational, private, embedded, and post-conversion routes are explicitly `noindex`. The homepage receives restrained Organization, WebSite, and WebPage JSON-LD that describes only visible, verified brand facts.

## Authoritative live evidence

Observed on 2026-08-19 before implementation:

| Live URL | Emitted title | Emitted canonical |
|---|---|---|
| `https://www.askmagicmike.com/` | `Ask Magic Mike \| Wilson, NC Real Estate Guidance` | `https://www.askmagicmike.com` |
| `/home-value` | homepage title | `https://www.askmagicmike.com` |
| `/sell` | homepage title | `https://www.askmagicmike.com` |
| `/buy` | homepage title | `https://www.askmagicmike.com` |
| `/rent` | homepage title | `https://www.askmagicmike.com` |
| `/ask` | homepage title | `https://www.askmagicmike.com` |

The root layout supplied `alternates.canonical = "/"`, and the child pages did not override it. Production `robots.txt` also blocked `/ask`, while the canonical sitemap omitted it.

OurTownProperties.com already emits distinct canonicals for its homepage and live home-value page. The remedy therefore avoids creating new market articles or duplicate brokerage landing pages. It repairs only the existing Ask Magic Mike conversion surfaces.

## Current platform guidance

Google's current canonical guidance recommends a self-referential canonical on the canonical page and warns against using `robots.txt` for canonicalization because blocked URLs can still be indexed without their content: [Canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

Google's structured-data policy requires markup to represent visible page content, recommends JSON-LD, and warns against misleading or hidden facts: [General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).

Google recommends Organization structured data on the homepage or a single organization page and allows only properties that actually apply: [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization). It also identifies Organization logo and breadcrumb data as broadly useful business-identity signals: [Establish business details](https://developers.google.com/search/docs/appearance/establish-business-details?hl=en).

This implementation deliberately omits LocalBusiness rich-result markup, ratings, reviews, price ranges, telephone, address, social profiles, opening hours, and geographic claims that were not required and reverified for this specific surface.

## Implemented route policy

### Indexable, self-canonical pages

- `/`
- `/home-value`
- `/sell`
- `/buy`
- `/rent`
- `/ask`
- `/contact`
- `/privacy`
- `/terms`
- `/accessibility`

The pending Phase 9.4 `/plan` route already declares its own canonical metadata and remains outside this branch.

### Compatibility aliases

- `/value` canonicalizes to `/home-value`.
- `/we-buy-houses` canonicalizes to `/sell`.

### Explicit noindex pages

- request confirmation;
- social and widget previews;
- widget and compatibility embed routes;
- Our Town integration instructions;
- property-specific open-house registration;
- Lead Center authentication and password routes; and
- existing secure phone setup routes.

Protected `/admin` and `/api` routes remain disallowed in `robots.txt`. Search-visible `/ask` is no longer blocked and is added to the sitemap. No production route, redirect, form, API, database, environment variable, or content body is changed.

## Structured-data boundary

The homepage graph contains:

- `Organization`: Our Town Properties, Inc., its public URL, and the logo already visible in the header;
- `WebSite`: Ask Magic Mike, its canonical URL, visible purpose, language, and publisher; and
- `WebPage`: the homepage URL, visible title/description, website, and organization relationship.

JSON is escaped against an injected closing script tag. No lead data, dynamic database data, inferred review, market statistic, listing, agent production claim, telephone, or disputed address is included.

## Expected impact

- stop distinct conversion routes from signaling the homepage as their canonical;
- give search and link-preview systems route-specific intent and descriptions;
- make `/ask` crawlable as an owned local guidance surface;
- consolidate duplicate aliases deliberately;
- reduce accidental indexing of private and operational routes; and
- establish a minimal, visible-aligned machine-readable brand graph.

Confidence is high that the defect and remedy are technically correct. Search appearance and traffic impact remain algorithmic and cannot be guaranteed; Search Console should establish the post-deploy baseline.

## Risks and controls

| Risk | Control |
|---|---|
| Search engine chooses another canonical | Self-canonical metadata, sitemap alignment, unique visible content, and no conflicting canonical in the root layout. |
| Markup overstates the business | Minimal visible-aligned Organization/WebSite/WebPage properties only. |
| Ask Magic Mike duplicates WordPress SEO content | No new brokerage articles or location pages; only existing conversion routes are repaired. |
| Utility pages remain discoverable | Explicit `noindex, nofollow, noarchive`-equivalent metadata; robots allows crawling so the directive can be observed. |
| Link previews regress | Shared route-specific Open Graph and Twitter metadata with the existing production social image. |
| Future page forgets metadata | Central helper plus route-policy tests; root layout no longer silently supplies a homepage canonical. |

## Verification plan

- helper and route-policy unit tests;
- strict typecheck, lint, full tests, build, route verification, release safety, and system-isolation checks;
- local optimized-build HTML inspection for title, canonical, robots, Open Graph, and JSON-LD;
- Vercel Preview desktop/mobile visual smoke;
- Preview HTML metadata matrix verification; and
- final read-only production smoke proving Production remained unchanged.

## Rollback

Revert the Phase 9.5 commit and redeploy the previously verified production commit. No schema, provider, secret, queue, lead, analytics record, WordPress content, or external account requires rollback.

## Required approval

No production action is authorized by this document. After all Preview evidence is green, the only Phase 9.5 gate is:

`APPROVE PHASE 9.5 SEARCH AUTHORITY MERGE AND PRODUCTION DEPLOYMENT`
