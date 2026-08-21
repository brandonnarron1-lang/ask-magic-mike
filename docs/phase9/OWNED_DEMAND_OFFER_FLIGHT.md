# Phase 9 owned-demand three-offer flight

Date: 2026-08-21

Status: exact Preview-verified release candidate; Production and external
channels unchanged

Base: canonical `origin/main` commit `5335697edf31eed0b8a38cd0295a4f5e7d501a3e`

## Reuse-first decision

The protected root-router `/admin/distribution` command, canonical Neon Growth
view, public seller/buyer/renter funnels, UTM builder, and retained Black Diamond
visual library already existed. This change organizes and hardens those assets;
it does not create a second campaign dashboard, lead database, tracking scheme,
or publishing engine.

The repository audit also found checked-in legacy campaign libraries with
unverified production-volume, tenure, response-time, valuation-error,
buyer-demand, school-proxy, and direct-phone claims. Those retained libraries
were rewritten to factual, conditional copy and placed behind a regression scan.
The live public office number remains `252-243-7700`. Private notification
destinations are not promoted into public marketing copy.

## Offer flight

| Offer | Existing route | Purpose | Required boundary |
|---|---|---|---|
| Seller value + readiness review | `/home-value` | Broker-reviewed property and timing intake | Not an appraisal, automated valuation, guaranteed value, or guaranteed offer |
| Buyer property-match review | `/buy` | Human review of target area, needs, and timing | Availability, financing, and appointments require confirmation |
| Rental-to-homeownership review | `/rent` | Human review of current rental situation and goals | Not a lending decision or promise of eligibility, affordability, or financing |

Each offer is prepared for the six existing owned channels:

- Google Business Profile;
- Facebook;
- Instagram;
- LinkedIn;
- approved email signatures; and
- QR/print placements.

This produces 18 exact offer placements while preserving the six existing
general-question placements. All links use canonical
`https://www.askmagicmike.com` destinations and the stable campaign
`amm_owned_demand_2026`.

Example placement identity:

```text
utm_source=facebook
utm_medium=social_organic
utm_campaign=amm_owned_demand_2026
utm_content=facebook_local_question_seller_review
```

Attribution remains deterministic. A signal counts only when normalized source
alias, medium, campaign, and complete placement content match. Generic and
offer-specific signals are summed once at the channel and command levels.

## Measurement truth contract

The command now evaluates the canonical Growth loader before interpreting any
count. It distinguishes four states: ready, database not configured, schema
pending, and query failed. Only the ready state may render numeric demand
metrics, a measured bottleneck, or a data-backed first-channel recommendation.

When measurement is unavailable:

- the three metric cards render an em dash rather than a synthetic zero;
- the page explicitly states that unavailable is not zero live demand;
- channel and offer badges say `Measurement unavailable`;
- the prepared five-day sequence remains visible as review material; and
- the first-move panel directs the operator to restore measurement instead of
  presenting the first prepared channel as evidence-backed.

This preserves the reusable campaign assets during an outage without turning a
database/configuration failure into false business intelligence.

## Visual decision

The flight reuses retained, local Ask Magic Mike assets:

- `/brand/black-diamond/hero-social-4x5.jpg` for the seller offer;
- `/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.webp` for the buyer offer; and
- `/images/ask-magic-mike/mike-eatmon-headshot.webp` for the renter offer.

These assets contain no consumer PII. The command center displays them as
creative direction beside exact compliant copy; native-platform cropping,
identity, property facts, and final copy still require human review.
The buyer and renter cards deliberately use the higher-resolution retained
portraits instead of the earlier 150–175 px derivatives found during rendered
QA. No new likeness was generated.

The stacked asset-studio candidate preserves those efficient WebP files for the
operator cards and derives server exports from the retained JPEG originals. The
renter export uses a mechanically derived JPEG of the same approved 515×720
portrait because executable `ImageResponse` QA rejected the PNG/WebP encodings.
It adds no new likeness or parallel visual library. See
`OWNED_DEMAND_ASSET_STUDIO.md`.

## Operator workflow

1. Sign in to the Lead Center and open `/admin/distribution`.
2. Review the measured bottleneck and eligible live-source signals.
3. Select an existing channel and expand its three offer placements.
4. Copy the prepared draft and exact tracked URL locally.
5. Review identity, facts, legal copy, crop, and destination in the native
   platform editor.
6. Publish only under a separately approved external-publication action.
7. Preserve the external URL or screenshot as publication proof; attribution is
   not itself publication proof.

The command now converts the measured bottleneck into one visible recommended
first move and a same-page channel jump. Each channel also exposes one
local-only full-flight packet containing the general placement, all three offer
placements, tracked URLs, and review boundaries. Individual draft/link controls
remain available for narrow native-platform work.

The clipboard control performs no network request. The page has no form, server
action, provider SDK, publish call, email send, SMS send, lead mutation, or
database mutation.

## Verification contract

Automated coverage proves:

- three offer placements per existing channel;
- canonical `/home-value`, `/buy`, and `/rent` destinations;
- exact source, medium, campaign, and offer-specific content values;
- exact-once generic plus offer attribution;
- retained local visual paths;
- prohibited-claim, active Ask steering, and public-phone regression checks;
- client-local clipboard behavior with no network mutation; and
- deterministic full-channel packets with all four placements and the external
  publication approval boundary;
- continued test/suppressed-lead exclusion upstream.

The final local release gate passes 196 test files / 2,797 tests, strict
typecheck, ESLint, the optimized Next.js 15.5.21 Production build, 78-route
manifest verification, 14/14 release-safety controls, Ask Magic Mike/NellySelly
isolation, a Production dependency audit with no known vulnerabilities, and a
redacted 482-commit secret scan with no findings.

The fresh local Production-render run passes 10/10 desktop/mobile checks across
the active home-value, Ask, embed, widget-preview, and protected owned-demand
routes. It reports no overflow, missing required copy, prohibited claim, bare
appraisal language, or console error. Analytics endpoints are mocked only in the
visual harness to keep this acceptance read-only.

No database migration is required.

A separate no-database Production-render acceptance proves the unavailable
state at 1440 × 1000 and 390 × 844: three unavailable metrics, no false zero,
no measured bottleneck, no data-backed channel recommendation, no horizontal
overflow, and no browser console or page error.

## Exact Preview evidence

- Code-bearing commit:
  `a0c80eaa9b429ed48871fc221d93af5e7d6fdfa1`.
- Ready Vercel Preview: `dpl_5UQL8LDfMvFvvi4YZ8UhLdyDFbWF` at
  `https://ask-magic-mike-ihjwzl8rw-eyes-up-industries.vercel.app`.
- GitHub release gate and both Vercel checks: PASS.
- Read-only Preview HTTP/identity/listing matrix: 10/10 PASS.
- Preview public visual matrix: 8/8 PASS at desktop and mobile sizes.
- Anonymous protected-admin request: correctly denied with 401, Basic
  challenge, `no-store`, and `SAMEORIGIN`.
- No Preview lead, event, database row, email, SMS, Push notification, or
  external publication was created.

Vercel CLI created an unrelated empty helper project while establishing the
protected Preview session:
`amm-phase9-campaign-compliance-20260821`
(`prj_JUyx03Rh8iABqAFepNNuPI2jJqut`). Read-only inspection shows zero
deployments. It is not canonical and must not receive a domain, secret, or
deployment. Delete it only after this separate exact approval:

```text
APPROVE DELETE EMPTY VERCEL HELPER PROJECT amm-phase9-campaign-compliance-20260821
```

## Approval boundary

Allowed before the release gate:

- local code and documentation;
- automated tests, build, security scans, and visual QA;
- branch, pull request, and protected Vercel Preview;
- authenticated read-only Preview inspection.

Still not authorized by this candidate:

- Production merge or deployment;
- social/GBP publication;
- email campaign, consumer acknowledgment, SMS, Push, or call;
- paid promotion, audience targeting, or spend;
- WordPress, DNS, provider, or database mutation.

Exact Production approval phrase:

```text
APPROVE PHASE 9 CAMPAIGN SAFETY AND THREE-OFFER OWNED-DEMAND FLIGHT MERGE AND PRODUCTION DEPLOYMENT
```

Any external publication remains a separate action identifying the exact
channel, final copy, final visual, tracked link, account identity, and
delete/rollback procedure.

## Rollback

Before Production, close or leave the pull request unmerged. After an approved
release, revert its merge commit or promote the immediately preceding Ready
Vercel deployment. No database rollback is needed because the feature is
read-only and has no migration.
