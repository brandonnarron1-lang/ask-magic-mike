# Phase 9 owned-demand activation control loop

Date: 2026-08-21
Status: stacked feature candidate; Production remains unchanged
Authority: protected observation, deterministic reconciliation, and operator guidance only

## Executive decision

Extend the existing authenticated `/admin/distribution` command instead of
creating another dashboard, campaign catalog, CRM, database, or publisher.
The control loop joins two already-canonical evidence streams at the exact
channel + placement level:

1. append-only, non-test native-platform observation proof; and
2. exact first-party lead attribution after test and suppressed records are
   excluded upstream.

The join never treats a draft as publication, attribution as publication
proof, publication proof as a lead, or a lead as a qualified appointment or
closed outcome.

## Evidence-backed reason for the work

A fresh aggregate-only query of canonical Neon Production at
`2026-08-21T22:30:41.070845Z` found:

- six total lead rows, all six marked test and suppressed;
- zero genuine live/contactable leads in 30, 90, or 365 days;
- zero live source rows, notification activity, outcome events, revenue,
  spend, experiments, open opportunities, or first-response samples;
- all required Growth, outcomes, routing, permission, notification,
  opportunity, and first-response schemas present.

This means the immediate operating constraint remains measurable owned-demand
activation. It is not production health, database readiness, scoring, routing,
another AI summary, or another dashboard.

## Current official mechanism refresh

Current first-party channel guidance was rechecked on 2026-08-21:

- [Google Business Profile posts](https://support.google.com/business/answer/7342169?hl=en)
  can be Updates, Offers, or Events with action-button links. Google exposes
  Live, Pending, and Not approved states after review. The loop therefore keeps
  scheduled/pending/not-approved evidence distinct from a live observation.
- [Facebook Page scheduled posts](https://www.facebook.com/help/389849807718635)
  remain created and managed through Meta Business Suite by a person with Page
  or Task access. The loop observes an operator-recorded native state; it does
  not add an autonomous Meta publisher or choose a Page identity.

These sources establish current native mechanisms. They are not permission to
publish and do not establish reach, engagement, lead volume, or performance.

## Reused canonical system

```text
Existing owned-demand channel + placement definitions
  + existing canonical UTM links
  + existing Neon Growth exact-placement signals
  + existing append-only publication-proof ledger
  -> buildOwnedDemandActivationLoop (pure deterministic join)
  -> existing protected /admin/distribution page
  -> one evidence-backed next operator decision
```

The release adds no route, table, migration, provider SDK, browser publisher,
queue, autonomous agent, or second source of truth.

## Exact lifecycle states

| State | What is proven | Required interpretation |
|---|---|---|
| `evidence_unavailable` | The proof ledger cannot be read safely | Make no placement-state inference |
| `proof_attribution_mismatch` | A latest proof key exists but its canonical source/campaign/content/link identity no longer matches | Reconcile stale or inconsistent identity before using either evidence stream |
| `prepared_not_observed` | A canonical draft/link exists; no proof exists | Preparation is not publication |
| `native_pending` | Latest proof is scheduled, pending review, or a non-live WordPress configuration | Inspect the native state; do not call it live |
| `native_inactive` | Latest proof is removed or not approved | Correct or retire only through approved native workflow |
| `observed_unmeasured` | Latest proof is active for that channel; no exact lead signal exists | Verify destination and monitor; do not claim performance |
| `signal_without_active_proof` | Exact attribution exists without a current active proof | Reconcile UTM reuse and native history; do not infer publication |
| `measured_signal` | Current active proof and exact eligible lead attribution both exist | Compare downstream qualification, appointments, outcomes, and SLA before scaling |

Active proof is channel-specific:

- `live` for public WordPress, GBP, Facebook, Instagram, and LinkedIn
  placements;
- `configured` for a reviewed passive email-signature link;
- `distributed` for a QR/print placement with its required scan evidence.

A merely `configured` WordPress change is not treated as public. Latest proof
selection is deterministic by observed time, then created time, then proof ID,
so an older live record cannot override a newer rejection or removal.

## Deterministic next-decision order

The loop ranks proof-identity and signal/proof integrity exceptions first, then native pending or
inactive states, active-but-unmeasured placements, prepared/unobserved
placements, and measured placements. Within equal states, it starts with the
audited Our Town WordPress homepage and named pages, then GBP, Facebook,
Instagram, LinkedIn, email signature, and QR/print.

This is operating guidance, not assignment authority and not autonomous
publication. It does not use AI to silently change priority.

## Security, privacy, and compliance result

- The page retains Lead Center authentication and `report:view` authorization.
- Proof mutations retain separate server-side `growth:manage`, Preview
  fail-closed behavior, append-only audit, canonical allowlists, and existing
  PII/secret rejection.
- The lifecycle join is read-only and pure. It makes no network request and
  accepts no browser-supplied destination, attribution, score, consent, proof,
  or consumer data.
- Test publication proofs are excluded by the proof repository. Test and
  suppressed leads are excluded by the canonical Growth SQL before the join.
- No raw lead identity, phone, email, message, IP, user-agent, provider secret,
  or private BCC value appears in the lifecycle model.
- Public posting, WordPress publication, external email, consumer SMS/Push,
  provider activation, audience targeting, spend, and unverified real-estate
  claims remain separately approval-gated.

## Verification

Focused implementation verification:

```text
pnpm exec vitest run \
  tests/adminops/owned-demand-activation-loop.test.ts \
  tests/adminops/owned-demand-command.test.ts \
  tests/adminops/owned-demand-publication-proof.test.ts
```

Result at implementation checkpoint: 3 files, 39 tests, 0 failures.

The full local release gate passes system isolation, 14/14 release-safety
checks, 209 test files / 2,909 tests, strict typecheck, ESLint, the optimized
Next.js 15.5.21 build, and the 81-route manifest. Production dependencies have
no known vulnerability. A redacted full-history gitleaks scan covered 478
commits with no finding. Local protected desktop/mobile visual QA passes 12/12
checks across the reused public funnels, widget surfaces, Distribution Command,
and KPI target register with no overflow, missing required copy, forbidden copy,
or browser console error.

Local verification ran on Node 26.5.1, which is newer than the repository's
declared Node 24.x engine. Exact Node 24 CI and canonical Vercel Preview proof
must still be attached to the Draft PR before any Production request.

## Release authority and rollback

This candidate is stacked on exact PR #188 head
`bcc0e9e5263aa9b0f94ac0377a6d1781b0176a58`. The unchanged first Production
gate for the stack remains:

```text
APPROVE PHASE 9 CAMPAIGN SAFETY AND THREE-OFFER OWNED-DEMAND FLIGHT MERGE AND PRODUCTION DEPLOYMENT
```

After PRs #183 through #188 land sequentially and are re-proved, this
candidate's future exact gate is:

```text
APPROVE PHASE 9 OWNED-DEMAND ACTIVATION LOOP MERGE AND PRODUCTION DEPLOYMENT
```

Neither phrase authorizes a WordPress edit, GBP/social post, email-signature
change, QR distribution, email/SMS/Push send, provider change, paid promotion,
or consumer contact. Before Production, rollback is closing the Draft PR. After
an approved release, revert the merge commit or promote the prior Ready Vercel
deployment. No database rollback is required.
