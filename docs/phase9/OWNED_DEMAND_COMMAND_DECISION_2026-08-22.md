# Phase 9 Owned-Demand Command Decision

Decision date: 2026-08-22

Canonical repository: `brandonnarron1-lang/ask-magic-mike`

Consolidation vehicle: PR #185

Production baseline: PR #184 merge `f5f82f1bfaadea0ed20da50738ebc1f83e8dab97`

## Outcome

Use PR #185 to consolidate the owned-demand work already built in PRs #185,
#186, #188, and #189. Do not create another application, campaign catalog,
publisher, lead store, analytics store, or approval queue. PR #187's KPI-target
migration and PRs #190–#192 remain separate candidates.

Final UI-to-Neon tracing superseded the initial application-only classification.
The consolidated release candidate includes one additive constraint-only
migration so the existing append-only proof ledger accepts the WordPress tuples
already reviewed in the application. It creates no second ledger and performs
no native publication, proof seeding, WordPress edit, email, SMS, Push, lead
creation, spend, DNS change, provider mutation, or NellySelly action.

## Why this is the next useful release

The canonical read-only Production observation at `2026-08-22T13:54:35Z`
contained six test/suppressed leads and zero eligible live leads, contactable
live leads, qualified leads, appointments, outcomes, owned-demand signals,
first-response samples, spend, or publication proofs. The immediate constraint
is genuine owned demand, not another KPI target table or dashboard.

The current read-only WordPress audit at `2026-08-22T14:10:43Z` fetched 42 of 42
public sitemap pages successfully. It found the existing signed Form 3 path,
sitewide Form 7 exposure, three indexable seller-value pages, two direct-purchase
pages, two Ask Mike pages, four legacy native-capture pages, five pages with
multiple capture systems, three incomplete canonical-app UTM links, and two
incomplete embed placements. These are consolidation findings, not permission
to replace or publish a WordPress surface.

## Reused components

- Existing seller, buyer, renter, and general public funnels.
- Existing canonical UTM builder and first-party Growth attribution view.
- Existing append-only publication-proof ledger and Lead Center RBAC.
- Existing approved Mike Eatmon imagery and black/gold/cream/cyan visual system.
- Existing Our Town WordPress pages, signed bridge, isolated embed, and Gravity
  Forms evidence.
- Existing Vercel project, Neon Production database, Resend path, and public/
  private route boundaries.

## Consolidated additions

- Buyer discovery in the active Black Diamond navigation and path grid.
- Exact Vercel Preview-origin handling without a wildcard.
- Protected 1080×1350 PNG, 1080×1920 PNG, and QR SVG exports derived from one
  canonical placement catalog.
- Public short codes that resolve only to allowlisted canonical UTM destinations.
- Seven exact WordPress placement definitions and a host-allowlisted, read-only
  public-surface audit.
- A deterministic placement lifecycle joining native proof to first-party
  attribution without treating either stream as proof of the other.
- Explicit failure closure when Growth measurement or the publication-proof
  ledger is unavailable.

## Channel mechanics verified from primary sources

- Google Business Profile supports update, offer, and event posts with media and
  action links, plus scheduling and recurrence. Posts older than six months are
  archived unless a date range applies, and phone numbers in descriptions may
  be rejected. See [Google Business Profile post guidance](https://support.google.com/business/answer/7342169).
- Facebook Page posts can be scheduled and managed in Meta Business Suite; the
  documented scheduling window is 20 minutes through 29 days. See
  [Facebook Page scheduling guidance](https://www.facebook.com/help/389849807718635).
- Organic Instagram Stories can use a link sticker to send viewers to the exact
  tracked destination. See [Instagram link-sticker guidance](https://www.facebook.com/help/instagram/192168966243613).
- GA4 manual campaign tagging should consistently include source, medium, and
  campaign; content distinguishes the creative or placement. See
  [GA4 URL campaign parameters](https://support.google.com/analytics/answer/10917952)
  and [GA4 traffic-source dimensions](https://support.google.com/analytics/answer/11242870).

## Recommended owned-demand sequence

1. Repair one approved, backed-up Our Town placement with its exact canonical
   UTM link; do not widen the Gravity Forms bridge allowlist.
2. Publish one reviewed Google Business Profile update through the native tool.
3. Reuse the approved 4:5 asset and exact link for one Facebook Page post.
4. Reuse the approved 9:16 asset and exact link sticker for one Instagram Story.
5. Add the passive email-signature link only after mailbox-owner approval.
6. Print or distribute a QR asset only after two-device scan verification.

Every native action above remains separately approval-gated. Preparation,
rendering, scheduling, and attribution are distinct states.

## Visual and AI decision

Use the already-approved real Mike imagery and deterministic renderer for launch
assets. Do not synthesize a new Mike identity, bake lead PII into images, or use
per-lead AI generation in alerts. AI may help create future reviewed campaign
concepts, but source identity, disclosure copy, QR destination, and lead facts
must remain deterministic and human-verifiable.

## Security decision

- Asset downloads require server-side `report:view` authorization.
- Channel, placement, format, image path, short code, and destination are exact
  allowlists; no request parameter can supply an arbitrary URL or file path.
- Generated assets are attachments with private/no-store, noindex, nosniff, and
  sandboxed SVG responses.
- Preview accepts only the exact Vercel deployment and branch origins supplied
  by the platform; Production remains restricted to owned origins.
- The WordPress audit accepts only HTTPS requests to the apex or `www` Our Town
  hostname and revalidates every redirect hop.
- Test and suppressed leads remain excluded from Growth decisions.
- Missing Growth measurement disables placement selection; missing proof-ledger
  evidence disables lifecycle inference.

## Rollback and approval

The migration replaces only six validation constraints in one transaction and
preserves the table, rows, RLS, trigger, RPC, grants, and audit behavior. A
failed preflight, validation, or postflight rolls back before commit. If the
application fails after commit, repoint the canonical aliases to Vercel
deployment `dpl_ANYodUJ7VcceRRDAfpX6APkSKUcW` and leave the broader constraints
installed. Do not narrow them after legitimate WordPress proof could exist.
Preserve all publication-proof and audit rows.

Exact future migration/application gate:

`APPROVE PHASE 9 OWNED-DEMAND WORDPRESS PROOF MIGRATION, PR 185 MERGE, AND PRODUCTION DEPLOYMENT`

That gate does not authorize any WordPress edit, social/GBP/email publication,
QR distribution, message, lead submission, spend, DNS change, or provider action.
