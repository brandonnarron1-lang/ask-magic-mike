# Phase 9.1 Owned Demand Command

Date: 2026-08-19
Status: feature-branch implementation; Production remains unchanged
Authority: internal observation, drafting, tracked-link preparation, and Preview QA only

## Decision

Activate the already-designed Distribution Command concept in the canonical root `app/` router as `/admin/distribution`, but replace its retired Supabase loader and unsupported publication inference.

The canonical implementation:

- reads the existing Phase 9 Neon Growth view;
- excludes test and communication-suppressed leads in the upstream SQL;
- reuses the existing approved AskMagicMike.com UTM builder;
- labels channel evidence as an observed lead signal, never proof that a post was published;
- prepares manual Google Business Profile, Facebook, Instagram, LinkedIn, email-signature, and QR placements;
- uses factual, broker-review-safe drafts without market-performance, valuation, response-time, or inventory claims;
- performs no post, send, campaign, audience, budget, provider, lead, or database mutation.

The legacy `src/app/(admin)/admin/distribution` route remains ignored. Its tested planning concepts were reused, while its Supabase dependency, misleading traffic terminology, and unverified copy were not promoted.

## Evidence and current mechanism refresh

Current official channel guidance reviewed on 2026-08-19:

- [Google Business Profile posts](https://support.google.com/business/answer/7342169?hl=en) support Update, Offer, and Event posts with photos, videos, and action-button links. Google reviews posts against its content policy and warns that phone numbers in descriptions may be rejected. The command therefore prepares a manual Update brief with a tracked link and no phone number in the body.
- [Google Analytics custom campaign URLs](https://support.google.com/analytics/answer/10917952?hl=en) recommend consistent lowercase `utm_source`, `utm_medium`, `utm_campaign`, and creative-specific `utm_content` values. The command emits all four for every placement and uses one stable campaign key.
- [LinkedIn posting guidance](https://www.linkedin.com/help/linkedin/answer/a527227) keeps Page/profile identity and final posting inside the native editor. The command prepares a draft and tracked link but does not choose an identity or publish.

These sources establish the operating mechanism. They do not constitute authorization to publish or a claim that any channel will produce leads.

## Measured bottleneck

At implementation start, Production Growth Intelligence contained:

- zero eligible live lead rows;
- zero spend rows;
- zero outcome rows;
- only test/suppressed legacy records outside business KPIs.

The immediate constraint is owned-demand activation and publication evidence, not another scoring, routing, or economics dashboard.

An attributed lead from an unrelated portal, referral source, older campaign, or
different creative does not make owned distribution “measured.” The command
reports a channel signal only when the latest recorded attribution touch matches
that placement's normalized source alias, medium, campaign, and `utm_content`.
Facebook and Instagram remain distinct in this raw placement view even though the
broader Growth economics view may roll both into a Meta channel family.

## Architecture

```text
Canonical Neon leads + latest source attribution touch
  -> neonGrowthIntelligenceView (test/suppressed excluded)
  -> exact source + medium + campaign + utm_content placement signals
  -> buildGrowthIntelligence
  -> buildOwnedDemandCommand
  -> protected /admin/distribution
  -> human review in native channel editor
```

At this command-only release boundary, no table or migration is required. The
later stacked publication-proof candidate is documented in
`OWNED_DEMAND_PUBLICATION_PROOF_LEDGER.md`; it is additive, append-only, and
separately approval-gated. Channel attribution is still never relabeled as
proof of publication.

## Current-main refresh evidence — 2026-08-19

- Reconciled the branch with canonical Production commit `f2aff2b` and retained
  the current cumulative Phase 9 release authority and fail-closed Preview QA.
- Consolidated the route with the already-deployed Experiments navigation and
  active-route manifest; both commands remain registered.
- Hardened measurement so only an exact latest-touch source alias, medium,
  campaign, and placement match is presented as an owned-demand signal.
- Preserved Facebook and Instagram as distinct raw placement signals instead of
  double-counting a broader Meta channel-family rollup.
- `pnpm release:gate`: passed on the merged current-main tree.
- Full suite: 186 files / 2,712 tests passed.
- Strict typecheck, ESLint, optimized Next.js build, and the 76-route manifest
  passed.
- Release safety passed 14/14; Ask Magic Mike/NellySelly isolation passed.
- `pnpm audit --prod`: no known vulnerabilities.
- Security review found no new client secret, raw-HTML, dynamic-code, storage,
  navigation, outbound-request, or mutation path in the feature delta.

## Safety and compliance

- Protected by global Lead Center authentication and `report:view` permission.
- Read-only server component: no form, server action, mutating HTTP call, provider SDK, or browser automation.
- Public publication, consumer messaging, paid promotion, targeting, spend, and mailbox changes remain approval-gated.
- Drafts avoid automatic appraisal, guaranteed offer, guaranteed response, unsupported market statistics, school-zone performance claims, and discriminatory targeting.
- Property-specific or event-specific copy requires current fact verification before publication.

## Release gate

Allowed now:

- local implementation and tests;
- feature branch and pull request;
- Vercel Preview deployment;
- authenticated read-only visual QA using non-sensitive data.

Not authorized by this work:

- merge or Production deployment;
- public post publication;
- email campaign or consumer acknowledgment;
- SMS, push, call, sequence, or paid promotion;
- provider credentials, API publishing, or external account mutation.

Exact Production approval phrase:

```text
APPROVE PHASE 9.1 OWNED DEMAND COMMAND MERGE AND PRODUCTION DEPLOYMENT
```

Any publication pilot must separately identify the exact channel, final copy, final visual, tracked URL, account identity, and rollback/delete procedure.

## Rollback

This source-branch command was read-only and had no migration. It is now
incorporated into consolidated PR #185, whose later WordPress proof-scope
migration, exact gate, and rollback boundary are authoritative. Before
Production, leave PR #185 unmerged. After an approved release, promote the
immediately preceding Ready Vercel deployment if the application fails, while
preserving the additive proof constraints and all proof/audit rows.
