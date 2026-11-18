# Draft PR #249–#274 consolidation plan

Status: `DRAFT_REPLACEMENTS_BUILT_AND_VERIFIED`

The 26 open Draft PRs form one historical stack. They must not be merged in
sequence. Their unique capabilities have now been consolidated into four
current-main replacement candidates. The machine-readable source inventory is
`docs/DRAFT_249_274_CONSOLIDATION_MANIFEST.json`.

| Batch | Replacement | Exact head | Current state |
| --- | --- | --- | --- |
| A | Draft PR #278 | `65a09dc0137b97bda407ee24b0914e8f9bffd9c0` | exact-head CI, protected no-write Preview QA, browser E2E, and runtime-log scan pass |
| B | Draft PR #279 | `131072e619eff72882c91931b60b8e93080d1280` | exact-head CI and Preview pass; one unapplied additive migration remains separately gated |
| C | Draft PR #277 | `a2b5acf01006e3105d746cf8d8ca4da653d75cec` | exact-head CI and Preview pass; carrier/provider activation remains disabled |
| D | Draft PR #280 | `d1b2aa4219eb6176b6e0607d38f4fd822e0dcbf6` | exact-head CI, protected no-write Preview QA, browser E2E, and runtime-log scan pass |

Connector PR #248 and atomic consumer-acknowledgment PR #275 remain separate
review deltas. Neither is silently absorbed or authorized by this plan.

PR #267 is the one deliberate non-port disposition. Its dated release-ledger
documentation is retained as provenance (`EVIDENCE_ONLY` in the manifest), but
its obsolete authority claims are not copied into a replacement batch. This
accounts for all 26 source Drafts: 25 assigned to A/B/C/D and one evidence-only.

## Batch A — release truth and ingress hardening

Source PRs: #249, #250, #251, #252, #265, #266, #268, #269, #270, #271.

Port only current fail-closed release authority, exact consent/contactability,
appointment/chat/session/event/lead/experiment ingress, privacy filtering,
origin checks, rate-limit behavior, and focused tests. Regenerate dated
authority evidence. Re-audit dependency overrides against the current lockfile.

Delivered as Draft PR #278. This is the next application decision.

## Batch B — durable notification operations

Source PRs: #258, #260, #261, #262, #263, #264, #272.

Port Action Queue coverage, SLA truth, bounded cron retry, stale pending
recovery, atomic internal alert intent, and Resend webhook lifecycle as one
coherent outbox/recovery model. The atomic consumer-ack candidate in Draft PR
#275 is a separate review delta and must be rebased/ported into this batch only
after its migration/application ordering is approved.

Delivered as Draft PR #279. Its migration and eligible-email retry activation
remain separate gates after the application sequence is reconciled.

## Batch C — SMS consent/status foundation

Source PRs: #273 and #274.

Port signed provider callbacks, idempotent status transitions, STOP/HELP,
suppression, and recipient lifecycle. SMS provider/carrier delivery remains
disabled. This batch cannot activate sending or purchase a provider.

Delivered as Draft PR #277. No carrier registration, recipient activation,
provider send, or environment change is included.

## Batch D — WordPress/open-house/rental readiness

Source PRs: #253–#257 and #259.

Port one canonical read-only WordPress auditor, exact source/hash contracts,
the signed Canonical Lead Bridge 1.3.0 boundary, fail-closed Form 7 consent
contract, open-house mapping, rental attribution, placement manifests, and
rollback packets. Delivered as Draft PR #280. Connector 1.1.0 remains separate
PR #248; no plugin install, Form 7 cutover, page save, or QR publication is
authorized by the application candidate.

## Build sequence

1. Decide Batch A / Draft PR #278 through its exact application-only gate.
2. If Batch A is accepted, reconcile Batch D onto its exact accepted tree,
   resolve the known lead-route/consent-test conflicts deliberately, and rerun
   every local and hosted gate.
3. Accept reconciled Batch D before Batch B, or reconcile Batch B onto the
   exact accepted Batch D tree. Both modify `POST /api/leads` and cannot be
   merged independently from their present PR247 bases.
4. Reconcile Batch C after the accepted application sequence. A merge-tree
   rehearsal shows A+C is clean; B+C has a package-manifest conflict that must
   be resolved without enabling a carrier.
5. Refresh Connector PR #248 onto the then-current accepted tree, preserving
   only its connector capability and current authority records. Its present
   branch conflicts with Batch A mainly in stale release-authority files.
6. Rebase or port consumer-acknowledgment PR #275 only after the notification
   and SMS ordering is settled; keep consumer delivery disabled until its own
   approval and consent proof.
7. Preserve PRs #249–#274 until their replacement batches are accepted and a
   separate archival action is approved.

No replacement branch may mix a Production migration, environment change,
WordPress publication, provider activation, or message send into its
application merge gate.
