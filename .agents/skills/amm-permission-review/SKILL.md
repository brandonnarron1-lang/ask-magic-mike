---
name: amm-permission-review
description: Diagnose and repair Ask Magic Mike contact readiness, explain retained consent and current role restrictions, and prepare the next permitted operator action without sending or inventing permission.
---

# Ask Magic Mike permission review

Brandon is the sole product operator/tester. Keep the assigned lead owner separate
from the signed-in operator. Do not ask Mike to test, enroll a device, inspect an
inbox or participate in a technical approval. Verify the actual account's current
role/scope; sole-operator status is not a role grant or consumer consent.

## Locate the controlling evidence

Start with current `docs/CURRENT_RELEASE_AUTHORITY.md`,
`config/release-authority-policy.json`, `docs/OWNER_APPROVAL_QUEUE.md` and the focused
`.amm-run/home-value-lead-loop-20261029/next-agent-handoff.md`. Dated receipts prove
their own source/venue/time only. Preserve them; do not reconstruct all history.
Accepted Production, a local candidate, hosted tests and human acceptance are
different states. Inspect the current resolver before using it.

For one inquiry, trace the protected detail → communication-permissions route →
`rbac-session.ts` → `neon-communication-repository.ts` → `permission-service.ts` /
`permission-engine.ts` → `manualContactReview.ts` → `LeadContactActions.tsx`.
Read current source; use the recorded private inquiry reference, not a public
search for a customer. Expand to other inquiries only to resolve a specific cause.

## Diagnose, do not infer a ceremony

Separate evidence missing, purpose denied, channel opt-out, suppression/test,
terminal lifecycle, current role/assignment, software mapping and explicit hold.
`held`/`legal_hold` labels alone do not establish a legal finding or a new BIC
review. Name the actual rule/record when one requires that authority.

`public.consents` retains inquiry-specific evidence; broad lead flags alone are
not enough. Inspect `request-contact-permission.ts` for the exact source's
read-only interpretation of canonical request consent. It requires matching
lead/channel, granted state, exact approved copy/version and collection time;
unknown/conflicting/other-inquiry evidence fails closed. An explicit purpose row
always wins. Never copy consent from a canonical/earlier inquiry, change an opt-out,
backfill unknown permission, or widen manual response to SMS, marketing,
acknowledgments, subscriptions, sequences or automation.

Confirm this mapping is present in the actual accepted source before claiming it
is live. A candidate implementation or matching timeline version alone does not
prove the Production reader has evaluated the complete stored wording/time.

## Evaluation is not amendment

The existing communication-permissions POST records an evaluation in
`communication_decisions`. It does not amend `communication_permissions`, grant
consent, create a task or send. Label it accordingly. Reuse the writer and its
current RBAC/origin/idempotency controls; do not create a second consent platform.
If a genuinely new amendment is needed, establish its precise approved semantics
and actor authority first. Isolate that decision; never manufacture a grant from
a checkbox, generic owner technical approval or guessed broker participation.

## Operator path

Use the existing lead overview's Contact readiness: request, supplied method,
current allowed/restricted reason, exact missing evidence and one primary action.
Keep codes/wording/version/time in expandable evidence. A permitted human review
opens the current operator's dialer/composer only after a fresh server read and
exact-target check. Do not sign as the assigned owner unless that person is the
actual operator. Basic drafts are deterministic, factual, unsent and optional.

Reuse the existing review task. Keep its real due/overdue state; do not create a
reminder or move its deadline to show progress. Close it only after an actual
review disposition is recorded. A launch/click is not a send, response,
appointment or outcome. Preserve unknown prior contact as unknown.

## Focused verification and hard stops

Public `Call Magic Mike` / visitor Text is a separate boundary from contacting a
prospect. Reuse `PublicMikeContact` and the public `siteConfig` direct/office
distinction in public shells, never the root layout or staff lead controls.
Number-only `tel:` / `sms:` anchors are visitor intent, not intake, consent,
delivery or human follow-through. Do not test them by calling/texting Mike.
Disclose contact-intent analytics rather than claiming that no data is saved.
Keep the office fallback and internal notification configuration unchanged.
The paper-form cascade can override a dark confirmation inset: check actual
success-state pixels and contrast, not only the initial step.

For mobile intake use the existing native FormData/address-entry tests and
`public-contact-mobile.spec.ts`. Keep synthetic UI interception separate from
real isolated SQL and physical return-from-app evidence. Remote Places remains
Production/configuration/rights/cost gated; a disabled categorical capability is
not a reason to purchase a provider or bypass Preview restrictions. Existing
profile edits do not authorize account recovery, carrier SMS or scheduler setup.

Review scripts before execution. Use `tests/support/qa-audit-postgres.ts` and
`scripts/amm/reference-session-acceptance.mjs` only with proven fresh local
synthetic PostgreSQL, stripped external credentials and outbound disabled.
Browser contexts alone do not isolate data. Do not restore retired hosted QA or
create resources/spend outside current authority.

Cover exact canonical evidence and known permissions; missing/altered/conflicting
evidence; denial/hold/opt-out/test/suppression; wrong role/agent; current session
revocation/reassignment; audit failure/replay; no unrelated writes; keyboard,
mobile and enlarged text. Keep old assertions; expose genuine failures. Use the
actual final-source release gates, protected venue and cost limits before any
publication/release. No skipped gate is accepted by this skill.

Keep customer details, raw messages, URLs, credentials and session identifiers in
protected task evidence only—not reusable skills, code fixtures or public PRs.
Do not store changing live counts, account credentials or customer IDs here.

## Closeout

Briefly report: actual change; contact ready/one precise decision/restricted with
reason; exact existing screen/action; real contact/outcome (none if none);
local/pushed/merged/deployed/accepted separately; source-bound tests/limits;
skill discovery/validation and smallest remaining action. Update the existing
handoff. No broad request for the owner or Mike to run QA.
