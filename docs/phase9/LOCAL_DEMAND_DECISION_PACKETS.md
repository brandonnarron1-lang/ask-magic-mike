# Phase 9 local-demand decision packets

Date: 2026-08-25

Status: stacked implementation candidate; Production and external accounts unchanged

Authority: read-only interpretation of approved, minimized, persisted evidence

## Decision

Improve the existing `/admin/growth` command center instead of building a new
dashboard, AI agent, CRM, provider connector, campaign studio, or database.
Persisted Search Console and Google Business Profile opportunities now become
bounded operator decision packets containing:

- deterministic score and confidence interpretation;
- geography and segment context already stored on the opportunity;
- evidence-window freshness;
- an allowlisted aggregate evidence summary;
- one type-specific next review decision;
- an explicit source-workbench handoff; and
- limitations that keep publishing, sending, profile mutation, assignment, and
  spend outside this read-only surface.

The packet builder does not call an AI provider. It never invents market facts,
rankings, valuations, inventory, property availability, consumer intent, ROI,
or a guaranteed outcome. It is deterministic and independently testable.

## Reused canonical assets

- authenticated Lead Center RBAC and the existing `report:view` boundary;
- `/admin/growth`, including its current opportunity queue and visual system;
- canonical Neon `market_signals` and `market_opportunities` ledgers;
- Search Console aggregate ingress and `/admin/growth/search-ingress`;
- Business Profile aggregate ingress and
  `/admin/growth/local-profile-ingress`; and
- existing action classes, review states, immutable audits, and Production
  release gates.

No route, form, lead API, lead database, notification service, WordPress bridge,
analytics container, or NellySelly asset was duplicated or replaced.

## Evidence allowlist

The loader reads the existing opportunity `evidence` JSON, bounds it to 64
top-level fields, and passes it to a type-specific allowlist. Arbitrary keys are
never rendered.

Organic-search packets may display only:

- impressions and clicks;
- click-through rate and the published review threshold;
- average position;
- aggregate data state and device; and
- evidence date window.

Local-profile packets may display only:

- Search/Maps impressions;
- reported interactions and aggregate interaction rate;
- website clicks, call clicks, direction requests, and bookings; and
- evidence date window.

Raw queries, raw CSV, page URLs, contact data, property addresses, provider
location IDs, row fingerprints, OAuth material, arbitrary metadata, and retired
conversation metrics are excluded from the rendered packet even if a legacy or
foreign row contains them.

## Freshness and confidence

Freshness is derived from the evidence end date, falling back to the persisted
detection timestamp:

- `current`: 0–14 days old;
- `recent`: 15–45 days old;
- `stale`: more than 45 days old; and
- `unknown`: missing, invalid, or materially future-dated evidence.

Confidence is clamped to 0–100% and labeled:

- `high`: at least 80%;
- `directional`: 60–79%; and
- `collecting`: below 60%.

These labels describe evidence quality, not the probability of a closing.

## Current source-truth correction

Google's current Search Analytics documentation describes aggregate clicks,
impressions, CTR, position, dimensions, result limits, and potentially omitted
rows. Search Console also omits anonymized queries. The UI therefore describes
these signals as review cues, not exhaustive demand or ranking promises.

Google documents current Business Profile performance metrics such as
impressions, website clicks, call clicks, direction requests, and bookings.
Google also documents that Business Profile chat/call history ended on July 31,
2024 and that `BUSINESS_CONVERSATIONS` is no longer available. The candidate:

1. removes `business_conversations` from the active CSV allowlist;
2. fixes the legacy summary field to zero for importer compatibility; and
3. adds a forward-only trigger at `market_signals` that rejects a new or revised
   canonical GBP signal claiming that metric.

Historical signal rows are not scanned, rewritten, or deleted.

Official references:

- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://support.google.com/webmasters/answer/17011259?hl=en
- https://support.google.com/webmasters/answer/17010961
- https://developers.google.com/my-business/reference/performance/rest/v1/DailyMetric
- https://developers.google.com/my-business/reference/performance/rest/v1/locations/fetchMultiDailyMetricsTimeSeries
- https://support.google.com/business/answer/9918094?hl=en-GB
- https://support.google.com/business/answer/14919056?hl=en

## Authorization and rollback

The command center remains a Server Component behind server-side Lead Center
authorization. It contains no form, Server Action, mutation method, provider
fetch, email/SMS/Push operation, or publication action.

Before Production, rollback is branch/PR abandonment. After a separately
approved release, application rollback is promotion of the last accepted Vercel
deployment or a forward revert. The additive database guard may be removed only
by a reviewed forward migration if Google restores and documents an equivalent
metric; historical evidence remains preserved.
