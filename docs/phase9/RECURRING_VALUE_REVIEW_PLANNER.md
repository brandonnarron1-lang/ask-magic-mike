# Phase 9.4 — Recurring-Value Real Estate Review Planner

Date: 2026-08-19

Status: isolated implementation candidate; no production publication

Canonical route: `/plan`

Action class: reversible public application code; anonymous allowlisted analytics only

Production approval gate: `APPROVE PHASE 9.4 REVIEW PLANNER MERGE AND PRODUCTION DEPLOYMENT`

## Decision

Add one recurring-value layer to the existing Ask Magic Mike public application: a device-private Real Estate Review Planner for seller, buyer, homeowner, and relocation paths.

The planner does not create a second CRM, lead store, profile, search index, or messaging system. It hands a consumer into the canonical `/home-value`, `/buy`, or `/ask` funnel only when the consumer deliberately chooses human follow-up.

## Why this layer now

The repository already contains the canonical lead capture, explainable routing, messaging permissions, listing-match logic, protected Lead Center, and public funnels. It does not yet have an approved live listing provider or permission to activate recurring property-alert messaging. Public listing endpoints correctly fail to a public-safe empty response.

Building listing alerts now would either fabricate inventory or activate an unapproved provider and communication purpose. The planner instead delivers persistent usefulness from deterministic guidance while preserving those boundaries.

## Current product evidence

Current official product documentation supports four recurring-value patterns:

- RealScout documents persistent saved searches that clients can revisit or edit, with user-selected Daily or ASAP alerts: [How to Create a Client Search](https://support.realscout.com/en/articles/11954669-how-to-create-a-client-search).
- Zillow documents a notification center where consumers control listing, open-house, and market-update subscriptions and frequency: [Zillow Advanced Search](https://www.zillow.com/learn/zillow-advanced-search/?msockid=2414239960b16cdd268a35fd618f6d75).
- Homebot describes monthly homeowner and buyer experiences with value tracking, saved searches, and notifications: [Homebot for Agents](https://homebot.ai/pricing/agent).
- Homebot's recent product updates describe annual homeowner check-ins, explicit intent/timeline capture, partial/skipped states, opportunity ranking, outreach tracking, and snoozing to avoid repeated contacts: [Q4 2025 Product Update](https://homebot.ai/blog/q4-2025-product-update) and [Q1 2026 Product Releases](https://homebot.ai/blog/q1-2026-product-releases).

The safe transferable mechanisms are persistence, visible progress, freshness, explicit consumer intent, and a voluntary human handoff. Provider-backed inventory, automated value tracking, subscriptions, and outbound cadence are deliberately excluded.

## Consumer experience

1. Select one controlled goal: seller, buyer, annual homeowner review, or relocation.
2. Select a current horizon and planning focus.
3. Receive a deterministic plan grouped into `Now`, `Prepare`, and `Decide`.
4. Mark steps complete and return on the same device.
5. See progress and a 30-day freshness signal.
6. Choose a canonical secure intake only when human review is wanted.

## Data and privacy boundary

The versioned local record permits only:

- schema version;
- controlled goal, horizon, and focus enums;
- completed deterministic task IDs; and
- generated/updated timestamps.

It does not request or persist a name, email, phone, address, property ID, narrative, financial information, protected characteristic, or uploaded document. Unknown properties are stripped when stored state is parsed. Invalid, obsolete, or malformed state fails closed.

The planner itself creates no lead or profile. Four allowlisted analytics events may record only controlled enums, task IDs, and completion counts:

- `review_plan_started`
- `review_plan_saved`
- `review_plan_task_completed`
- `review_plan_handoff_clicked`

## Compliance boundary

- No automated valuation, appraisal, offer, availability, affordability, financing, condition, or outcome claim.
- No protected-class data, demographic ranking, neighborhood-quality ranking, school-quality ranking, or steering.
- Relocation criteria are explicitly consumer-selected and objective.
- Property, market, agency, legal, lending, financial, inspection, and survey questions require appropriate human verification.
- The planner starts no email, SMS, push, call, alert, sequence, or subscription.

## Architecture

- `app/plan/page.tsx` is the public App Router entry point.
- `app/components/black-diamond/RealEstateReviewPlanner.tsx` owns the accessible client interaction and device persistence.
- `app/lib/reviewPlanner.ts` owns the deterministic task catalog, state allowlist, parser, and freshness calculation.
- Existing Black Diamond header, footer, page tracker, visual tokens, and canonical funnels are reused.
- `/plan` is registered in the canonical route manifest and sitemap.

No database migration, environment variable, provider credential, new package, background job, webhook, authentication change, or infrastructure change is required.

## Expected impact and confidence

Expected impact: give seller, buyer, homeowner, and relocation visitors a useful owned reason to return before they are ready to submit, while creating clean engagement signals and a transparent path into the existing lead engine.

Confidence: high that the implementation preserves privacy and system boundaries; medium that it improves repeat engagement until production analytics establish a baseline.

Assumptions:

- browser local storage is available for most visitors;
- visitors understand that device-local state does not sync across devices;
- the current canonical funnels remain the only lead-creation paths; and
- anonymous public event storage remains approved under the existing analytics contract.

## Risks and controls

| Risk | Control |
|---|---|
| Device storage is blocked or cleared | Fall back to current-tab memory and show the storage state truthfully. |
| Planner becomes stale | Show a freshness signal after 30 days; do not infer intent. |
| Local state is tampered with | Strict version/enumeration/timestamp validation and task-ID filtering. |
| Planner is mistaken for professional advice | Persistent organizer-only and human-verification copy. |
| Relocation prompts drift into steering | Objective, consumer-selected criteria and explicit demographic-ranking prohibition. |
| A second conversion system emerges | Handoff only to the existing canonical funnels; no lead API call in the planner. |

## Rollback

Revert the Phase 9.4 commit and redeploy the previously verified production commit. This removes `/plan`, its navigation links, four event names, and its sitemap/manifest entries. No data migration or server-side cleanup is required. Existing device-local records become inert and contain no contact or property information.

## Required approval

No production action is authorized by this document. After Preview visual QA and all repository checks pass, the only required production approval is:

`APPROVE PHASE 9.4 REVIEW PLANNER MERGE AND PRODUCTION DEPLOYMENT`
