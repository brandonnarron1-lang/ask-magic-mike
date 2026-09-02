# Phase 9 WordPress seller-intent approval artifact

Date: 2026-09-01

Mode: offline, content-addressed decision validation

External mutation: none

## Outcome

The page-3631 cutover verifier no longer accepts a standalone 64-character
digest plus independently supplied decision flags. Those values could describe
different decisions or be satisfied by a placeholder digest.

The verifier now requires one complete JSON artifact. It validates the exact
schema, decision status, reviewed-evidence digest, source/duplicate page pair,
WordPress page IDs, canonical capture owner, duplicate-page disposition,
placement key, canonical `/sell` funnel, the evidence packet's exact generation
time and whole-packet digest, three non-secret review references, and bounded
rationale codes. It then computes one deterministic SHA-256 digest over
normalized semantic content.

No decision is made by the application. The checked-in template remains
`decisionStatus=draft` with empty fields and fails validation by design.

## Files

- `config/wordpress-seller-intent-decision-template.json` — intentionally
  incomplete, non-approved starting template;
- `scripts/amm/wordpress-seller-intent-decision-artifact-lib.mjs` — pure strict
  validator and canonical digest builder;
- `scripts/amm/wordpress-seller-intent-decision-artifact.mjs` — read-only CLI;
- `scripts/amm/wordpress-page-source-cutover-lib.mjs` — consumes validated
  artifact evidence and ignores the retired independent decision fields; and
- `tests/adminops/wordpress-seller-intent-decision-artifact.test.ts` —
  adversarial contract coverage.

## Exact decision vocabulary

Canonical source page:

- `https://www.ourtownproperties.com/we-buy-homes/` (page 3631); or
- `https://www.ourtownproperties.com/we-buy-houses/` (page 4364).

Capture owner:

- `ask_magic_mike`; or
- `canonical_bridge`.

Duplicate-page disposition:

- `redirect_to_canonical`;
- `canonicalize_to_canonical`;
- `noindex_and_preserve`; or
- `preserve_both_single_capture_owner`.

The page-3631 contract further requires the canonical page to be page 3631,
capture owner `ask_magic_mike`, and placement key
`wordpress_we_buy_homes`. A valid generic seller decision that selects the
other page therefore cannot authorize the page-3631 candidate.

## Controlled operator workflow

1. Download a fresh protected
   `wordpress_seller_intent_decision` evidence packet from Distribution
   Command. Do not treat an old packet as current evidence.
2. Review Search Console, indexed URLs, inbound links, Regency ownership,
   duplicate capture, consent, and surrounding seller copy.
3. Copy the draft template to an access-restricted file outside Git and record
   the approved owner, SEO, and BIC references without credentials, contact
   data, or secrets.
4. Set `decisionStatus=approved` only after those reviews actually occurred.
5. Validate the artifact:

   ```bash
   pnpm run amm:wordpress:seller-decision:verify -- \
     --artifact <mode-0600-approved-decision.json> \
     --evidence <downloaded-protected-seller-evidence.json> \
     --contract config/wordpress-page3631-cutover-contract.json
   ```

6. Require `status=ready`. The validator recomputes both the protected packet's
   structural evidence digest and a canonical digest of the complete packet,
   requires the artifact to reference both plus the exact packet timestamp,
   rejects approval before evidence, and limits the review window to seven
   days. Retain both exact files privately and use them in the page-3631
   readiness command. The readiness manifest records the artifact/packet
   digests and hashes of the three approval references; it never emits the raw
   references or either file body.
7. Any changed field changes the artifact digest and requires the full verifier
   to run again. A digest by itself is not accepted.

## Fail-closed behavior

Validation remains blocked for a missing or draft artifact, unknown or extra
field, missing/drifted/non-read-only/stale evidence packet, invalid
schema/time/evidence hash, approval before evidence, mismatched page IDs,
reversed page pair, unsupported capture owner or duplicate disposition,
placement drift, wrong canonical funnel, missing review reference, secret-like
reference, empty or unknown rationale code, or page-contract mismatch.

The validator performs no network request or file write. It cannot edit
WordPress, change a canonical tag, redirect a page, submit a lead, send a
notification, mutate Neon, deploy an application, publish content, or consume
an approval.

## Verification

Exact Node 24 focused coverage passes 5 files / 41 tests across the seller
artifact, page 3631, page 3952, activation-change-set, and live-evidence packet
suites. The full repository passes 289 files / 3,506 tests, strict typecheck,
full lint, an optimized build with 60/60 static pages, and route proof at 100
active / 22 acknowledged duplicates. The adversarial cases prove that a
standalone digest and duplicate decision flags no longer make page 3631
requestable.
