# Phase 9 owned-traffic activation fast-track

Date: 2026-08-23

Status: Draft PR #205 ordered stack refreshed; exact-head remote proof pending

External mutation: none

## Production decision evidence

An aggregate-only read of the canonical Neon `production` branch at
2026-08-23 20:23 UTC reported:

- 6 lead records, all 6 marked as tests;
- 0 live or contactable leads;
- 0 unsafe test leads;
- 0 live notification rows, outcomes, attributed revenue, or first-response
  samples;
- 0 marketing-spend rows, clicks, or platform leads;
- 0 active experiments; and
- 0 non-test owned-demand publication-proof rows.

No lead PII or database credential was read into this repository. The audit
used existing read-only aggregate queries in the authenticated Neon SQL editor.

The measured constraint is owned traffic, not another form, lead store,
dashboard, scoring model, AI feature, or visual redesign.

## Canonical stack

- Repository: `brandonnarron1-lang/ask-magic-mike`
- Base: refreshed PR #204 exact head
  `bd16a115af9f4b17dccab0bb7dad41682816be5d`, included through clean ordered
  merge `52a9b31cbab8da2e2ac251fe483bbbbd9a3f34e8`
- Pre-consolidation rescue branch:
  `rescue/amm-pre-owned-traffic-fast-track-20260823-1625`
- Pre-refresh sealed-head rescue branch:
  `rescue/amm-pr205-pre-pr204-refresh-20260823-173028`
- Database: existing Neon Production branch; no migration is part of this
  fast-track
- Public app: existing Ask Magic Mike Next.js application
- Brokerage surface: existing Our Town Properties WordPress pages
- Lead Center: existing protected Distribution Command and RBAC boundary

## Reuse decision

Import only the unique, already-reviewed application work from:

1. PR #197, commit
   `8d9d7895fe1c5f251a08dcfd8cb9713fc060e83a`: separate narrowly audited
   legacy Our Town WordPress attribution from exact owned-demand KPI evidence.
2. PR #198 application commits
   `e2dae5e023bf472fe06a13729c6c1f0972fb39f3`,
   `31d301178eb1ad91bcddbb159e55a2f8f631a94b`, and
   `808021468e1910e1d88f071575fd5e73c991d085`: add and harden protected,
   read-only, rollback-ready WordPress CTA manifests and their route contract.
3. PR #198 polish from
   `0af92e8d9c39304355c80189cf0e8b19ff1e4777` only where it remains relevant
   after current-stack reconciliation.

Do not merge the historical branch topology or duplicate cumulative release
documentation. Reconcile conflicts against the current #204 stack and retain
its conversion, rate-limit, privacy, visual, and deployment evidence.

## Included behavior

- exact UTM evidence remains the only input to owned-demand KPIs;
- a narrow compatibility map may display historical Our Town placement
  evidence separately and never rewrite stored attribution;
- three existing WordPress placements receive downloadable readiness
  manifests: homepage, home-value, and We Buy Homes;
- every manifest is authenticated, private, no-store, GET-only, allowlisted,
  deterministic, and non-mutating;
- a manifest records the exact current href, proposed href, rollback href,
  WordPress page ID, page modification time, occurrence counts, blockers, and
  precondition digest; and
- the homepage CTA remains the only recommended first publication candidate.

## Explicit non-goals

- no WordPress publication, form replacement, page redesign, menu edit, plugin
  activation, cache purge, or sitewide widget injection;
- no new lead API, database, notification provider, AI model, image, video, or
  dashboard;
- no database migration or Production data write;
- no email, SMS, Push, social, Google Business Profile, or consumer send;
- no DNS, domain, Vercel Production, SMTP, or provider change;
- no paid traffic; and
- no NellySelly code, data, environment, domain, or deployment interaction.

## Platform and measurement basis

WordPress documents that saved drafts and published updates create restorable
revisions, and exposes page revisions through a dedicated read API. Google
Analytics documents stable, case-sensitive campaign tagging and recommends
`utm_source`, `utm_medium`, and `utm_campaign`; `utm_content` distinguishes a
specific placement or creative. The existing canonical UTM registry supplies
all proposed links.

- https://wordpress.org/documentation/article/revisions/
- https://developer.wordpress.org/rest-api/reference/page-revisions/
- https://support.google.com/analytics/answer/10917952?hl=en

## Verification plan

1. Apply the unique commits onto the #204 head and resolve against current code.
2. Run focused attribution, WordPress manifest, RBAC route, privacy, route, and
   safety tests.
3. Run the complete exact-Node test, typecheck, lint, build, route, release
   doctor, dependency, secret, and isolation checks.
4. Generate a fresh read-only manifest against each public WordPress page in a
   protected Preview and confirm no write endpoint is exercised.
5. Perform responsive Lead Center visual QA with every application write path
   intercepted.
6. Open a Draft stacked PR and record exact-head CI, immutable Preview, and
   protected no-write evidence.

## Local acceptance completed

- Consolidated only the reviewed, unique PR #197/#198 commits onto exact sealed
  PR #204 head; no historical branch merge or duplicate subsystem was used.
- Exact Node 24.18.0 passes the 3-file / 36-test focused matrix, complete
  223-file / 3,011-test suite, strict typecheck, ESLint, optimized Next.js
  15.5.21 build with 52 static pages, 83 active / 17 acknowledged route proof,
  14/14 release safety, 43/43 release doctor, system isolation, and a
  no-vulnerability Production dependency audit.
- At 2026-08-23 20:37:18 UTC, the same bundled server implementation fetched
  the exact public WordPress pages and page index through its HTTPS allowlist.
  All three placements returned `legacy_match_ready`, the reviewed page IDs,
  one unambiguous current href, one rollback href, one proposed canonical href,
  zero lookalike hrefs, `publicationAuthorized=false`, and
  `mutationPerformed=false`.
- WordPress returned HTTP 200 for the page index, page 149 record, and homepage.
  The index reported 42 published pages. No login, nonce, cookie, page revision,
  form submission, cache purge, or write method was used.
- Responsive protected-screen acceptance passed against the optimized local
  Production build at 1440×1000 and 390×844: one main, exact-width documents,
  three manifest links, zero writable forms in the read-only runtime, zero
  console warnings/errors, and a GET-only request ledger. The WordPress card
  and all three manifest controls remain legible and correctly stacked.
- The refreshed application/evidence head requires exact-head remote CI,
  immutable Preview, and protected no-write proof recorded in PR #205. Any
  later retarget to `main` must repeat that evidence before release eligibility
  is reconsidered.

## Superseded pre-refresh remote acceptance

- Draft PR #205 application/evidence head
  `a1e8a4940f8d9eefe21bc6f43514e2e4941e8e31` is cleanly mergeable on the exact
  PR #204 base.
- GitHub Node 24 release run `32665394864` passed the full release gate.
- Vercel Preview deployment `dpl_5AWNXqLf5k9Gc8UEqK2hA1AHiLFH` is READY on
  Node 24 at
  `https://ask-magic-mike-pv8mtuv39-eyes-up-industries.vercel.app` and records
  PR #205, the exact branch, and the exact head SHA.
- Protected run `32665666025` enforced `SAFE_DB_WRITE=false` and passed 17
  read-only checks with 6 intentional mutation skips and 0 failures, Widget
  browser E2E 2/2, doctor 43/43, safety 14/14, release candidate GO, and
  `PREVIEW_READY`. Artifact `9499989400` has digest
  `sha256:797352c0262fd03078a5ce9e5c4b422518bb052eece95bab4d908477c1e4e365`.
- Preview health identifies the exact head, Preview Neon, live email/SMS off,
  and mutation safety off. Deployment log queries returned zero fatal, error,
  or warning entries.
- Preview intentionally has Lead Center RBAC disabled. Direct anonymous Admin
  access fails with HTTP 401, and the manifest API fails closed with HTTP 409
  before any WordPress fetch. The authorized `report:view` execution contract
  passes isolated route tests. An authenticated runtime download remains a
  post-ordering acceptance item before any WordPress publication.

## Rollback

Application rollback is removal of the fast-track commit or redeployment of the
sealed #204 predecessor. It does not require a database rollback.

A later WordPress publication remains separately gated. Before any approved
edit, regenerate the manifest, verify its precondition digest, and create a
recoverable WordPress revision. If acceptance fails, restore the manifest's
`rollbackHref` or the verified prior revision.

## Approval boundaries

This fast-track can prepare and verify application code without changing
Production. Production release must remain ordered behind the existing durable
rate-limit readiness gate. A later one-link homepage publication requires the
separate exact phrase:

`APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION`

That later phrase authorizes only the reviewed homepage href replacement after
a fresh matching manifest and verified revision.
