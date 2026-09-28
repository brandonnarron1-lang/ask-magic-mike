# Draft PR #249–#274 consolidation plan

Status: `PREPARED`

The 26 open Draft PRs form one historical stack. They must not be merged in
sequence. The machine-readable source inventory is
`docs/DRAFT_249_274_CONSOLIDATION_MANIFEST.json`.

## Batch A — release truth and ingress hardening

Source PRs: #249, #250, #251, #252, #265, #266, #268, #269, #270, #271.

Port only current fail-closed release authority, exact consent/contactability,
appointment/chat/session/event/lead/experiment ingress, privacy filtering,
origin checks, rate-limit behavior, and focused tests. Regenerate dated
authority evidence. Re-audit dependency overrides against the current lockfile.

## Batch B — durable notification operations

Source PRs: #258, #260, #261, #262, #263, #264, #272.

Port Action Queue coverage, SLA truth, bounded cron retry, stale pending
recovery, atomic internal alert intent, and Resend webhook lifecycle as one
coherent outbox/recovery model. The atomic consumer-ack candidate in Draft PR
#275 is a separate review delta and must be rebased/ported into this batch only
after its migration/application ordering is approved.

## Batch C — SMS consent/status foundation

Source PRs: #273 and #274.

Port signed provider callbacks, idempotent status transitions, STOP/HELP,
suppression, and recipient lifecycle. SMS provider/carrier delivery remains
disabled. This batch cannot activate sending or purchase a provider.

## Batch D — WordPress/open-house/rental readiness

Source PRs: #253–#257 and #259.

Port one canonical read-only WordPress auditor, exact source/hash contracts,
open-house mapping, rental attribution, placement manifests, and rollback
packets. PR #254 remains `SEPARATE_GATE`: do not install a second bridge or cut
over Form 7 without deciding its relationship to connector 1.1.0.

## Build sequence

1. Accept or supersede PR #248.
2. Fetch the new accepted main and create four fresh `codex/` branches.
3. Port unique code by capability, not by merging old branch tips.
4. Regenerate current docs and evidence; discard stale authority claims from
   the replacement diffs while retaining history in the old Drafts.
5. Give each batch a migration manifest, test plan, exact Preview, rollback,
   and its own approval phrase.
6. Preserve PRs #249–#274 until replacement batches are accepted and a
   separate archival action is approved.

No replacement branch may mix a Production migration, environment change,
WordPress publication, provider activation, or message send into its
application merge gate.
