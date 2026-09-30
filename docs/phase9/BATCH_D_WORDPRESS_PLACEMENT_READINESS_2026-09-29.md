# Batch D — WordPress, open-house, and rental placement readiness

Status: `READY_FOR_OWNER_APPROVAL`

Date: 2026-09-29

This release candidate consolidates the still-useful WordPress and placement
capabilities from Draft PRs #253–#257 and #259 and is now reconciled onto the
accepted PR #278 Production base. It does not replay their stacked ancestry, replace the
canonical lead system, or claim that a dated authenticated observation is
current Production truth.

## Executive result

The candidate now provides one reviewable application tree for:

- read-only reconciliation of existing Our Town Properties forms and Ask Magic
  Mike placements;
- a signed, raw-body HMAC boundary for the existing Canonical Lead Bridge;
- exact Form 7 consent-contract validation that fails closed on field, copy,
  timestamp, channel, or identity drift;
- exact-source and rollback-hash verification for page 3952 and page 3631;
- a reviewable seller-intent decision artifact that prevents technical
  readiness from bypassing owner/BIC decisions;
- protected, deterministic open-house registration packets and QR downloads;
- additive rental-to-homeownership placement readiness without inventing a
  page insertion point; and
- the already-proven dependency security floors from Batch A.

No second lead store, queue, CRM, WordPress plugin family, notification engine,
short-link provider, QR service, dashboard, or publishing system was created.

## Source consolidation decisions

| Source | Preserved capability | Deliberately excluded |
| --- | --- | --- |
| PR #253 | WordPress surface audit states and tests | merge-only PR252 refresh and stale cumulative totals |
| PR #254 | Form 7 contract, signed bridge, consent evidence, package | merge-only stack refresh and dated QA totals |
| PR #255 | exact page 3952/3631 source and rollback contracts | deleted connector documentation whose install assets remain in separate PR #248 |
| PR #256 | seller decision artifact and evidence binding | generic release-authority rewrites |
| PR #257 | open-house packet builder, protected downloads, short route | obsolete stacked release-order claims |
| PR #259 | additive rental readiness and fail-closed status | PR248/current-Production authority rewrites and generic runbook churn |

Merge commits `56b1db8` and `a347bea` were not replayed. The docs-only exact-
total commit `2a462b1` was not replayed. Current `main` versions of
`CURRENT_RELEASE_AUTHORITY`, `CANONICAL_PRODUCTION_STACK`, the release
authority JSON, QA evidence, rollback, owner queue, and general runbooks were
preserved.

The dated Phase 9 source documents remain evidence of the decisions and
snapshots recorded on 2026-09-01. They are not a substitute for a fresh
authenticated preflight and do not override
`config/current-release-authority.json`.

## Functional boundaries

### Signed WordPress bridge and Form 7

The existing Canonical Lead Bridge remains the only forwarding bridge. Version
1.3.0:

- accepts only the exact canonical HTTPS lead endpoint;
- reads its 32+ character secret only from `wp-config.php` or the hosting
  environment;
- signs timestamp, Gravity entry ID, and the exact JSON bytes with HMAC-SHA256;
- uses `gf:{form}:{entry}` idempotency;
- retries only bounded transient failures;
- keeps Gravity Forms as the local audit copy;
- stores only safe health metadata;
- gives Form 7 email permission only when the live native Consent field,
  required state, exact normalized-copy SHA-256, checked state, and entry
  timestamp match the approved contract; and
- denies email, call, and SMS permission on missing or malformed evidence.

The application reads at most 65,536 bytes, verifies the raw body before JSON
parsing, enforces five-minute timestamp skew, constant-time signature
comparison, signed-entry/payload identity binding, exact form IDs 1–7, runtime
field bounds, rate limiting, durable persistence, and idempotent replay.

### Page cutover readiness

Page 3952 and page 3631 scripts require exact source, revision, postmeta backup,
shortcode, page ID, connector marker, and SHA-256 preconditions. Page 3631 also
requires a verified owner/BIC seller decision. None of these tools writes to
WordPress or makes its approval phrase self-authorizing.

PR #248 remains the separate Connector 1.1.0 candidate. Batch D does not merge,
deploy, install, or claim its assets. Until that candidate is independently
accepted and publicly verified, page readiness correctly remains
`connector_upgrade_required`.

### Open-house packet

The protected Distribution Command now prepares an event-specific public route,
tracked URL, short URL, JSON review packet, and high-error-correction QR SVG.
The reference is a 4–72 character canonical slug with reserved-name,
control-character, URL, query, fragment, slash, backslash, percent, and
consumer-contact rejection. The public short route cannot select another
destination and redirects only to the constant Ask Magic Mike origin.

JSON and SVG downloads require server-side `report:view`, use private/no-store
headers, same-origin resource policy, `nosniff`, no-referrer, noindex, and a
sandbox CSP. Preparing a packet is not publication proof.

### Rental placement

The existing rentals page is represented as an additive, fail-closed candidate.
With no exact authenticated insertion point and rollback evidence it returns
`authenticated_source_required`, exposes no page-publication gate, and cannot
become activation-eligible. The short-term-rental page and Gravity Form 6
remain explicitly excluded from any consent or CTA inference.

## Security review

Framework scope: Next.js 15.5.26, React 19, TypeScript 5, Node 24, and the
bounded WordPress PHP bridge.

No new Critical, High, or Medium security finding was identified in the Batch D
diff. The review verified:

- server-side RBAC on protected QR/packet downloads;
- fixed-origin URL construction and strict path-reference validation;
- no arbitrary server fetch, open redirect, raw HTML sink, wildcard CORS,
  wildcard `postMessage`, browser secret, or client-side authorization
  boundary in the new surfaces;
- raw-body bridge signature verification before parsing;
- exact endpoint allowlisting and zero redirects in WordPress;
- no secret value in source, package, docs, generated archive, or test fixture;
- archive/source hash equality for the Canonical Bridge PHP file; and
- zero known production dependency vulnerabilities.

A redacted whole-tree Gitleaks scan reports three pre-existing matches in
untouched QA/test files. None is in the Batch D diff. They remain an explicit
baseline-review item rather than being suppressed or mislabeled as newly
introduced leakage.

## Verification

Counted local runtime:

- Node.js 24.18.0;
- pnpm 10.30.3;
- Vitest 4.1.11;
- Next.js 15.5.26.

Results after reconciliation onto accepted PR #278:

- 19 focused files / 216 tests pass;
- 292 total files / 3,591 tests pass;
- strict TypeScript passes;
- full ESLint passes;
- optimized Production build passes with 60 static pages;
- route manifest passes with 102 active routes and 22 acknowledged root/source
  duplicates;
- system-isolation verification passes;
- release safety passes 14/14;
- `pnpm audit --prod --audit-level=high` reports zero known vulnerabilities;
- `git diff --check` passes;
- Canonical Bridge ZIP SHA-256 is
  `a04b5bcf4e0e45e264260b3daeaf8158085e129b8deaf1c8b8f797e0aa31d2df`;
- the packaged PHP file SHA-256 exactly matches the source-controlled PHP file;
  and
- no remote endpoint, database, provider, WordPress admin, or Production
  credential was used by these proofs.

Exact implementation-head release verification is complete:

- reviewed head `7baff2dcafd65e666c7846165be8c2d6ab3d9ab0` and tree
  `69b76a5f8ced4261d57facc201fc0cb45e467e71`;
- hosted Node 24 Release Gate run
  [36651493066](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/36651493066)
  passed;
- immutable Vercel Preview `dpl_Hy6aAoNytqGmCwhoj3KRQoVRB1o3` is Ready at
  `https://ask-magic-mike-cysr1qz8z-eyes-up-industries.vercel.app`;
- protected Preview QA run
  [36651730308](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/36651730308)
  passed 18 read-only checks with seven deliberate mutation skips and zero
  failures while `SAFE_DB_WRITE=false`;
- all 15 mutation-intercepted browser tests passed with zero unexpected or
  flaky results;
- eight local desktop/mobile visual-smoke views passed with no overflow,
  forbidden copy, missing required content, or browser console error; and
- the exact Preview runtime window contained zero 5xx, error/fatal, or
  NellySelly crossover entries.

The Preview health contract confirmed that provider delivery and database
mutation were both disabled. No lead, note, task, webhook, notification, or
external publication was created by this evidence run.

## Release ordering

Batch A was accepted as PR #278. Batch D is reconciled onto its exact accepted
tree and sealed at reviewed implementation checkpoint
`7baff2dcafd65e666c7846165be8c2d6ab3d9ab0`. The combined route preserves
Batch A's bounded parsing, protected-field rejection, deterministic
idempotency, test-marker checks, experiments, durable rate limiting, and public
channel gating while adding Batch D's raw-body HMAC, signed-entry identity, and
fail-closed source-specific consent evidence.

Preferred order:

1. use only the exact Batch D gate below for the reviewed PR #280 candidate;
2. accept Batch D before Batch B, or reconcile Batch B onto the exact accepted
   Batch D tree, because both touch `POST /api/leads`; and
3. keep PR #248 independent and reconcile/reverify it after Batch D before any
   new connector gate is sealed.

No branch may infer acceptance from this ordering note.

## Explicit exclusions

This work performed no:

- Production deployment or alias change; one isolated immutable Preview was
  created solely for read-only and mutation-intercepted QA;
- GitHub merge or branch-protection change;
- Neon migration, query against live lead data, or production-data mutation;
- Vercel environment or secret change;
- WordPress plugin install/upgrade/activation, form edit, page edit, menu/CTA
  publication, Gravity notification change, cache purge, or backup mutation;
- QR print, placement, publication, post, or send;
- email, BCC, SMS, push, consumer acknowledgment, provider send, or webhook
  creation;
- DNS/domain, analytics-container, Search Console, paid-spend, purchase,
  deletion, or NellySelly action.

## Rollback

For the application candidate, restore Vercel deployment
`dpl_aepoH5pzDwPMkerbrp9YekzVrdKD`. No database rollback is required because
Batch D contains no migration.

The application release gate does not authorize WordPress. Any later
WordPress action must first capture its own exact backup and rollback evidence,
then use its own action-time approval. The plugin rollback is the preserved
prior package/config; page rollback is the exact source/revision/postmeta
snapshot; Form 7 rollback removes only Form 7 from the allowlist and restores
only its proven prior notification/configuration. Lead and audit records are
preserved.

## Current application gate

The local, hosted, immutable-Preview, browser, visual, and runtime-log evidence
is complete. The following gate is now requestable for reviewed PR #280:

`APPROVE PHASE 9 BATCH D WORDPRESS, OPEN-HOUSE, AND RENTAL PLACEMENT READINESS MERGE AND SAME-TREE PRODUCTION DEPLOYMENT`

That phrase authorizes only the reviewed application merge and same-tree
Production deployment. It does not authorize PR #248, a WordPress save,
plugin/form/page/notification change, a QR publication, a message, a provider
or secret change, a database mutation, DNS, marketing publication, spend,
deletion, or NellySelly action.
