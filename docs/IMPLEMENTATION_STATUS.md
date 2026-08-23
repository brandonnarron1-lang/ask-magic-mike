# Implementation Status

Updated 2026-08-23.

## Phase 9 durable rate-limit readiness — 2026-08-23

- Authenticated Vercel evidence found 17 paired error occurrences on the two
  public event routes: Production had a canonical database but no suitable
  server-only HMAC secret and therefore used the availability-first per-instance
  memory limiter. The existing public readiness endpoint still returned HTTP
  200 and the status-only monitor passed 9/9.
- The candidate reuses the existing Neon `rate_limit_buckets` table and HMAC
  implementation. It adds no provider, database, migration, route, dashboard,
  lead store, or public form.
- Production readiness now requires the exact table schema/upsert target,
  schema and CRUD privileges, effective RLS access, and the dedicated
  `RATE_LIMIT_HASH_SECRET`; it returns only boolean dependency state. Vercel
  Preview remains read-only and is not made dependent on a Production secret.
- The synthetic monitor now validates the body contract rather than accepting
  HTTP 200 alone. Against unchanged Production it truthfully reports 8/9,
  proving the prior false-green path is closed by the candidate.
- A final security pass replaced the raw Neon driver error object with one of
  four bounded operational codes. The privacy regression test injects a
  synthetic private failure marker and proves it never reaches `console.error`.
- The exact read-only capability query passed on canonical Neon Production in
  35 ms with all four store booleans true. This proves the database object and
  SQL-editor role; deployed health must still prove the exact Vercel role.
- Exact local Node 24.18.0 verification passes 6 focused files / 59 tests, the
  complete 218-file / 2,983-test suite, strict typecheck, ESLint, the optimized
  Next.js 15.5.21 build, 52 static pages, 82 active routes, 14/14 release
  safety, 43/43 release doctor, system isolation, a no-vulnerability Production
  dependency audit, and a redacted 548-commit secret scan. The diff contains no
  migration.
- No Production secret, deployment, request write, lead, event, notification,
  email, SMS, Push, WordPress edit, publication, DNS change, spend, deletion,
  or NellySelly action occurred.
- Decision and evidence:
  `docs/phase9/DURABLE_RATE_LIMIT_READINESS.md` and
  `docs/phase9/DURABLE_RATE_LIMIT_READINESS_QA_EVIDENCE.md`.
- Draft PR #202 application head
  `abd2269b77496024a20d172e83a5404f013c5a43` passes GitHub run
  `32659072474`, READY Preview `dpl_FvHmNSQLKq9EGp24LPijSfPAW3Me`, deployed
  runtime capability health, and protected run `32659271882`. Acceptance is 17
  pass / 6 write skips / 0 fail, Widget 2/2, doctor 43/43, release candidate GO,
  `PREVIEW_READY`, and 0 warning/error/fatal logs. Earlier head `6067512...` and
  its evidence are retained but superseded.
- Overlaying this hardening on the existing synthetic PR #197–#201 stack caused
  no executable conflict; only the cumulative go-live runbook conflicted.
- Protected CLI verification created one empty, zero-deployment helper project
  and immediately relinked the worktree to canonical Ask Magic Mike. The helper
  is recorded in the asset manifest and preserved for separately approved
  cleanup.
- Exact future gate:
  `APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`.

## Phase 9 conversion identity polish — 2026-08-22

- A fresh Production no-submit audit found that the canonical home-value path
  omitted consumer name while the buyer path already captured it. The existing
  Contact step now collects required name and email and sends name through the
  canonical `/api/leads` payload; no new form or backend was created.
- Validation now moves focus to the invalid address, name, email, or phone and
  associates the live error only with that field. The four-stage funnel and
  Black Diamond visual system remain intact.
- Consumer footer navigation no longer promotes internal Widget Preview,
  OurTown Integration, or Social Preview surfaces. Those routes remain
  non-indexable and available for their existing operational purpose.
- Screenshot QA now intercepts lead creation, durable analytics, and public
  experiment events and uses unmistakable synthetic identity, eliminating all
  page-triggered application write paths observed in the full capture matrix.
- Released-main refresh evidence passes exact Node 24.18.0, 215 test files /
  2,950 tests, strict typecheck, ESLint, optimized build, 82 active routes,
  14/14 safety, 43/43 doctor, system isolation, eight Chromium homepage/widget
  checks, dependency audit, candidate secret scan, diff check, and empty
  migration scan. The final no-write-harness head still requires exact-head
  GitHub Node 24 CI and canonical protected Preview proof after push.
- The branch is refreshed onto released PR #194 merge
  `5a3c5c7f2463ea399c21b616ff249f6c67e156b6`; its prior stacked head is
  preserved at `rescue/amm-pr195-pre-released-pr194-refresh-20260822-1959`.
  The only automatic conflict was the cumulative QA evidence document; the
  application merge was clean.
- Detailed decision and QA:
  `docs/phase9/CONVERSION_IDENTITY_POLISH.md` and
  `docs/phase9/CONVERSION_IDENTITY_POLISH_QA_EVIDENCE.md`.
- PR #195 was approved and merged as
  `b450b41c66c6740bd20571cdbe7d8caf82e92d5e`, then accepted on Production
  deployment `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`. Its gate is exhausted.

## Phase 9 iOS phone handoff consolidation — 2026-08-22

- Historical PR #179 was audited rather than merged wholesale. Its unique
  iPhone Home Screen credential-context repair is consolidated once on released
  PR #193 merge `9b82afb609674bb0209b73f8ac9622ab02733e2a`; its obsolete
  router/docs stack remains excluded.
- The existing Web Push, VAPID, Neon subscription/outbox, service worker, and
  protected phone APIs are reused. No carrier SMS, second PWA, second provider,
  second database, phone takeover, migration, device enrollment, or send was
  added.
- The restricted Brandon invite now opens a private token-scoped install page
  and `/phone-alerts/`-scoped manifest. The installed app exchanges the signed
  invite for a different server-minted Secure, HttpOnly, SameSite=Strict
  session credential, then continues on a token-free URL. A raw invite pasted
  into the cookie slot is rejected.
- A canonical Neon-backed, HMAC-pseudonymized one-time nonce guard denies
  cross-browser replay. Production fails closed when durable claim enforcement
  is unavailable on Vercel or owned/self-hosted Production; an existing
  installed app may reopen only with its matching HttpOnly session cookie.
- Exact Ask Magic Mike origin binding excludes Our Town, NellySelly, and
  arbitrary Vercel hostnames from this privileged handoff. Private/no-store,
  no-referrer, noindex, CSP, and robots controls cover every phone-alert route.
- The scoped copy repository cannot relabel an existing Mike/primary endpoint.
  With Lead Center RBAC enabled, the legacy secret-header invite endpoint is
  disabled so only an operator holding `notification:manage` can create the
  link. The optional QA Push is durably limited to one attempt per setup session
  and copy subscription in Production.
- Final released-base verification passes exact Node 24.18.0, 214 files / 2,949
  tests, strict typecheck, ESLint, optimized build, 82 active routes, 14/14
  safety, and 43/43 doctor checks. Production dependency audit,
  patch-integrity, candidate secret, and migration scans pass; PR #194 contains
  no database migration.
- PR #194 final reviewed head
  `851ebe530ac6a91a4e410f26538d29c1bf43f1c6` was refreshed onto released PR
  #196 base `c08abe1168840b99ccba07866bbec8cf7a6752fb`; its prior state is preserved
  at `rescue/amm-pr194-pre-pr196-refresh-20260822-1945`. Exact Node 24 run
  `32606142473`, Ready Preview deployment
  `dpl_7nhaV5tpS4YArtgKVV9PfVBRHq4H`, and protected Preview QA run
  `32606286620` pass.
- Protected Preview acceptance records 17 passes, six intentional write skips,
  zero failures, two expected browser tests, 43/43 doctor checks, and strict
  `PREVIEW_READY`. The automated phone probe uses only an invalid synthetic
  token and performs no invite, claim, limiter persistence, device
  registration, or send.
- PR #194 was approved and merged as
  `5a3c5c7f2463ea399c21b616ff249f6c67e156b6`, then accepted on Production
  deployment `dpl_3FWSKSu9jXvC2FTPuojVpt8mgm8J`. Read-only acceptance passed
  conversion 15/15, smoke 19 pass / two intentional skips / zero failures,
  canonical Neon/RBAC/Push readiness, private invalid-install behavior, apex
  redirect, and zero deployment error logs.
- Detailed decision: `docs/phase9/PHONE_INSTALL_HANDOFF_CONSOLIDATION.md`.
- The PR #194 application gate is exhausted. Physical device enrollment and a
  `[TEST]` Push remain separate actions.

## Phase 9 privacy and KPI-trust consolidation — 2026-08-22

- Audited PRs #190-#192, then refreshed the consolidation onto released PR #185
  merge `44a7483400bdb9b4a10ecdf0883edc4bf96d4ab8` and consolidated their unique
  independent work once. Source commits, exclusions, rescue ref, and rollback
  are recorded in `docs/PHASE9_PRIVACY_KPI_TRUST_CONSOLIDATION.md`.
- Durable Neon rate limiting now stores only versioned HMAC-SHA-256 bucket
  identifiers, updates bucket freshness, and removes stale records after 24
  hours. Protected health reports only whether a suitable server secret exists.
- Public analytics now uses an event/property allowlist, bounded JSON bodies,
  exact public-origin checks, coarse browser/device classes, and registered UTM
  dimensions. Public callers cannot bind events to canonical lead or agent IDs;
  the persistence repository re-applies the privacy boundary. Slug shape alone
  is insufficient: unregistered single-token names and address slugs are
  discarded, and open-house identifiers are reduced to a generic placement
  class. Full attribution remains in the protected canonical lead record.
- Both public analytics routes now await the canonical Neon write, return HTTP
  202 only for a durable event, and return HTTP 503 when persistence is
  unavailable. All JSON-LD script surfaces share an escaping serializer rather
  than inserting raw `JSON.stringify` output.
- The protected Growth Command Center adds aggregate-only outcome and delivery
  evidence for eligible non-test, non-suppressed leads. Optional-table or query
  failure renders unavailable instead of fabricating zero. A post-refresh audit
  closed a normalization defect that previously left `configured=true` beside
  an aggregate query error and could render misleading zero values.
- PR #187's KPI target register and migration remain deferred. This candidate
  contains no migration, publisher, provider send, second data store, or live
  data action.
- The released-main refresh gate passed system isolation, 14/14 release-safety
  checks, 211 test files / 2,911 tests, strict typecheck, ESLint, the optimized
  Next.js 15.5.21 build, and 80
  active routes. Production dependencies have no known vulnerability; a
  fresh redacted 511-commit full-history scan reports no leak; diff and
  migration checks are clean. The prior Node 24 CI, canonical Vercel Preview,
  authorization, privacy, and responsive 390/1440 rendering evidence remains a
  historical checkpoint. Exact-head GitHub/Vercel and protected Preview
  evidence after the final registered-attribution patch is tracked on PR #193
  and remains mandatory before release readiness.
- PR #193 was approved, merged as
  `9b82afb609674bb0209b73f8ac9622ab02733e2a`, and accepted on Production
  deployment `dpl_HkKHY5nF8DeF5azY1CuHAbHGNp3a`. Its application gate is
  exhausted and cannot authorize another action.

## Phase 9 consolidated owned-demand command — 2026-08-22

- PR #185 was the single application consolidation vehicle on released PR #184
  merge `f5f82f1bfaadea0ed20da50738ebc1f83e8dab97`. It preserves the unique
  Buyer/current-router safety work from PR #185 and the useful asset,
  WordPress-audit, and lifecycle work from PRs #186, #188, and #189.
- The protected `/admin/distribution` page remains the sole operator command.
  It now derives 35 exact general, offer, and named WordPress placements from
  one allowlisted catalog and joins current native proof to eligible
  first-party attribution without treating either stream as proof of the other.
- Missing Growth measurement now produces `measurement_unavailable`, hides
  lead-dependent totals, and suppresses the recommended placement. Missing
  publication-proof evidence separately produces `evidence_unavailable`.
- Protected feed/story/QR exports require `report:view`; public short codes
  resolve only to fixed canonical UTM destinations. The WordPress auditor is
  read-only, host-allowlisted to the apex and `www` Our Town HTTPS hosts, and
  revalidates every redirect hop.
- Final release review found that the renter export referenced a branch-only
  JPEG even though protected Preview rendering resolves approved source art
  from the released canonical host. Code-bearing fix
  `9a8baf935a7a68cda528ec4aee90b7cfcf5e87fc` now reuses the equivalent retained
  Production PNG and corrects the executable test's PNG MIME type. The former
  URL returned HTTP 404 on Production; all three current export sources return
  HTTP 200 with image content.
- The latest public WordPress audit at `2026-08-22T14:10:43.297Z` fetched 42 of
  42 sitemap pages and made no form submission or WordPress change. Current
  aggregate Production truth remains six test/suppressed records and zero
  eligible live demand, outcomes, first-response samples, spend, or proofs.
- Before the schema repair, the post-hardening application matrix passed 5
  files / 46 tests and the full Node 24 gate passed 206 files / 2,869 tests.
  Those results remain useful regression history but are not final release
  authority for the migration-bearing head. Fresh exact-head Node 24 CI,
  canonical Preview, protected flow, rendered acceptance, dependency, secret,
  migration, and diff evidence is tracked on PR #185 after push so this
  document does not create self-referential evidence churn. PR #185 is now
  released as merge `44a7483400bdb9b4a10ecdf0883edc4bf96d4ab8` on Production deployment
  `dpl_41AZkLvufuAC92h6QJeqhiyjkBcM`; the constraint-only migration was applied
  and verified on canonical Neon before the exact reviewed application merge.
- Protected Preview workflows now run release doctor before generating launch
  authority and must assert exact `PREVIEW_READY` afterward. This closes a
  false-green path where endpoint/browser checks passed but a missing doctor
  report left launch authority `BLOCKED`.
- Final UI-to-Neon tracing found that the application already accepted
  `ourtown_wordpress` and seven named placements while the released ledger
  constraints did not. A valid operator action would pass runtime validation
  and fail durable storage. PR #185 now includes one additive constraint-only
  migration, `20260822195000_owned_demand_wordpress_proof_scope.sql`, to repair
  that existing-system mismatch instead of introducing a second ledger.
- Isolated PostgreSQL 17.11 proof passes all 11 WordPress placement tuples,
  `live`/`configured`/`removed` state contracts, replay idempotency, foreign-host
  rejection, cross-channel placement rejection, immutable audit creation,
  browser-role denial, and rollback of all synthetic rows. A legacy Facebook
  proof survived the migration unchanged.
  The pinned production cutover runner verified a backup, advisory/table locks,
  one transaction, six validated v2 constraints, and unchanged lead, audit,
  proof, function, RLS, trigger, and grant state. No lead or proof row changed.
- Fresh exact-tree Node 24.18.0 verification passes system isolation, 14/14
  release-safety controls, 207 test files / 2,879 tests, strict typecheck,
  ESLint, the optimized Next.js 15.5.21 build, and 80 active routes. Focused
  WordPress proof/cutover coverage passes 5 files / 55 tests. Exact remote CI,
  canonical Preview, protected flow, and rendered evidence remain required
  after the repaired head is pushed.
- The released PR did not publish, send, spend, submit a lead, mutate
  WordPress, modify DNS, contact a consumer, or act on NellySelly.
- Its migration/application gate is exhausted and must not be reused. External
  WordPress, GBP, social, email-signature, or QR publication remains a separate
  exact action and approval.

The source-branch sections below preserve implementation history. Their old
stack order and standalone approval phrases are superseded by the consolidated
PR #185 decision above; they are not independent release authority.

## Phase 9 exact owned-demand activation loop — 2026-08-21

- Reused the existing protected `/admin/distribution` page, seven canonical
  channel definitions, 35 exact placements, UTM builder, Neon Growth signals,
  append-only native publication-proof ledger, Lead Center RBAC, and Preview
  fail-closed controls. No parallel system was added.
- Added a pure deterministic join that shows the exact lifecycle relationship
  between current native proof and eligible first-party attribution. It never
  infers publication from a lead signal or a lead from publication evidence.
- Added channel-specific active-state handling, stable newest-proof selection,
  exact proof-attribution identity validation, evidence-unavailable fail-closed
  state, reconciliation priority for signals without active proof, and one
  evidence-backed next operator decision.
- The existing page now exposes compact lifecycle totals, the current priority,
  and a collapsed audit of all exact placements while preserving separate
  publication-proof history and channel packets.
- Current Production aggregate truth remains six test/suppressed lead rows and
  zero genuine live/contactable leads, owned-source signals, outcomes, spend,
  experiments, or first-response samples. All relevant canonical schemas are
  healthy.
- Focused verification passes 3 files / 39 tests. The full local release gate
  passes system isolation, 14/14 release-safety checks, 209 test files / 2,909
  tests, strict typecheck, ESLint, optimized Next.js 15.5.21 build, and the
  81-route manifest. Production dependencies have no known vulnerability, and
  a redacted gitleaks history scan covered 478 commits with no finding.
- Local protected visual QA passes 12/12 desktop/mobile checks across the reused
  public funnels, widget surfaces, Distribution Command, and KPI target register
  with no overflow, missing required copy, forbidden copy, or browser console
  error. Local Node 26.5.1 is newer than the declared Node 24.x engine; exact
  Node 24 CI and canonical Vercel Preview proof remain pending before the Draft
  PR is release-ready.
- No Production deployment, database migration/write, proof record, lead,
  WordPress edit, external publication, email/SMS/Push, provider action, spend,
  DNS change, or NellySelly action occurred.
- This source-branch work is incorporated into consolidated PR #185. Its former
  standalone stack and gate are historical and no longer authorize a release.

## Phase 9 WordPress owned-traffic consolidation — 2026-08-21

- Reused the live Our Town Properties pages, Gravity Forms, Canonical Lead
  Bridge 1.1.0, existing isolated iframe loader, canonical Ask Magic Mike
  funnels, protected Distribution Command, UTM builder, publication-proof
  ledger, and Neon lead backend. No parallel frontend, form service, CRM,
  database, notification engine, publisher, or analytics store was introduced.
- A read-only live sitemap audit checked 42/42 pages successfully. It found
  Gravity Form 7 on 39 pages, while authenticated prior evidence proves only
  Gravity Form 3 is enabled for signed canonical forwarding. This candidate
  deliberately does not widen that allowlist.
- The audit identified three self-canonical seller-value routes, two
  direct-purchase routes, two Ask Mike routes, four legacy native-capture
  pages, five pages with multiple capture systems, three direct canonical-app
  links lacking complete placement UTMs, and two embeds lacking placement
  `utm_content`. These are controlled consolidation candidates, not permission
  to redirect, noindex, deactivate a plugin, or replace a form.
- Added `pnpm amm:audit:wordpress` and a reusable parser that stores only
  structural public evidence. It excludes WordPress nonces, cookies, form
  values, lead data, credentials, private configuration, and arbitrary page
  text.
- Added the `ourtown_wordpress` owned-demand channel and seven exact named
  placements to the existing authenticated `/admin/distribution` surface:
  homepage Ask Mike, established home value, We Buy Homes, Mike's agent page,
  listing/buyer, rental-to-homeownership, and the existing Ask Magic Mike
  embed. Exact links retain canonical-host and UTM allowlists.
- Named placements use the existing append-only publication-proof workflow;
  WordPress proof URLs are restricted to `ourtownproperties.com`. The existing
  QR/creative catalog now derives four WordPress general/offer assets in
  addition to the prior 24 assets.
- Preserved the live sitewide and page-specific telephone targets. The
  conflicting unverified number was not added to any campaign or interface.
- Mobile 390 x 844 visual inspection confirmed that existing black/gold
  sections should be preserved while reducing each intent page to one durable
  capture path. No form was submitted during visual QA.
- Focused verification passes 5 files / 85 tests. The full release gate passes
  208 test files / 2,901 tests, strict typecheck, ESLint, optimized Next.js
  15.5.21 build, 81-route verification, 14/14 release-safety checks, and system
  isolation. `pnpm audit --prod` reports no known vulnerability; redacted
  gitleaks history inspection covered 477 commits with no finding.
- Local Node 26.5.1 is newer than the repository's Node 24.x engine. The build
  nevertheless completed. A webpack cache write also reported local `ENOSPC`
  after compilation; all pages and the route manifest completed successfully,
  and only disposable `.next` output was removed afterward.
- No Production deployment, WordPress mutation, form or notification change,
  database query/write, lead, external message, publication, redirect, DNS
  change, spend, or NellySelly action occurred.
- This source-branch work is incorporated into consolidated PR #185 without
  PR #187's KPI-target migration. Its former stack and gate are historical.

## Phase 9 protected owned-demand asset studio — 2026-08-21

- Reused the existing six-channel/four-placement owned-demand command, exact UTM
  builder, approved Mike imagery, public funnels, and Lead Center RBAC. No
  second campaign dashboard, publisher, provider, lead store, database schema,
  or CRM was introduced.
- Added three protected exports for each of 24 canonical placements: 1080×1350
  feed PNG, 1080×1920 story PNG, and raw high-error-correction QR SVG. The 72
  combinations are derived from the same definitions used for operator copy and
  attribution.
- Added 24 allowlisted `/go/[code]` 307 redirects to exact full UTM destinations.
  Unknown/malformed codes fail closed; there is no arbitrary destination or
  open redirect. The route is no-store/noindex and robots-disallowed.
- Asset downloads require a real `report:view` session, accept only exact
  channel/placement/format tuples, use approved local imagery, and return
  private/no-store, CSP-sandboxed, noindex attachments. They make no provider or
  database call and accept no consumer data.
- Executable QA found and closed unsupported renderer CSS, full-UTM QR density,
  story footer overlap, and WebP decoder/MIME failures. The ordinary UI preserves
  WebP assets; exports use retained canonical JPEG/PNG sources that already
  exist on the released host.
- Final local verification passes system isolation, 14/14 release-safety checks,
  203 test files / 2,846 tests, strict typecheck, ESLint, optimized Next.js
  15.5.21 build, and 80 active routes / 17 acknowledged root–`src` duplicates.
  Production dependencies have no known vulnerability; 471 Git commits have no
  detected secret leak. Independent OpenCV scans pass for the compressed feed,
  story, and Chromium-rendered raw SVG exemplars.
- This source-branch work is incorporated into consolidated PR #185; exact-head
  Preview evidence is required on that consolidated head.
- No Production deployment, Neon migration/write, lead submission, email/SMS/
  Push send, WordPress/DNS change, external publication, QR distribution,
  spend, or NellySelly mutation occurred.
- Its former standalone gate is superseded by the consolidated PR #185
  application gate. External publication remains separately approval-gated.

## Phase 9 current-router safety consolidation — 2026-08-21

- Audited PRs #179 and #182 against the exact PR #183/#184 stack before writing
  new code. Both PRs are now Draft with explicit out-of-order merge warnings;
  neither branch nor its evidence was deleted.
- Reused PR #182's unique work once: the existing `/buy` funnel is now visible
  in the Black Diamond desktop navigation and homepage path grid; Preview CORS
  accepts only the exact Vercel deployment/branch origins supplied by the
  platform; Production remains restricted to owned origins.
- Modernized the release-safety scanner to inspect all 535 deployable files in
  canonical root `app/` and delegated `src/`, current widget/listing/health
  routes, and current Neon/Better Auth/Resend/Web Push/provider secrets.
- Replaced the retired-router CTA authority with 24 checks against the active
  public routes, real Black Diamond components, both deployable trees, and the
  current owner approval/runbook documents.
- Node 24.18 verification passes: 14/14 release-safety checks, 202 test files /
  2,837 tests, strict typecheck, ESLint, Next.js 15.5.21 Production build, and
  78 active routes / 17 acknowledged root–`src` duplicates. Production
  dependencies have no known vulnerabilities; 469 Git commits have no detected
  secret leak.
- Desktop 1440px and mobile 390px Playwright inspection passes for the homepage
  and Buyer funnel. The five path cards remain balanced/stacked, consent stays
  readable, and the existing black/gold/cyan visual system remains intact.
- Draft PR #185 is stacked on PR #184. Code-bearing head
  `4b92d286caae09114b2aa0f84eb7b084ad26cb2a` passed Node 24 GitHub run
  `32516288876` and Ready Preview
  `dpl_BByVkaLDwDKnkScV4R4f5v3vbNwf`. Public/health routes return 200,
  anonymous Distribution Command returns 401 with private headers, an exact
  Preview origin reaches non-persisting request validation, a foreign origin is
  rejected, and the render contains no NellySelly marker.
- The first protected-Preview probe from the unlinked worktree created empty
  helper project `amm-phase9-current-router-safety-20260821`
  (`prj_iGynowHru4TBNwWgvoiSIG193Ukf`). It has zero deployments, domains, and
  application effect. The worktree was relinked to the canonical Vercel project;
  the helper is preserved pending separately approved cleanup.
- No Production deployment, Neon migration/write, lead submission, email/SMS/
  push send, WordPress/DNS change, external publication, spend, or NellySelly
  mutation occurred.

## Phase 9 owned-demand publication proof ledger — 2026-08-21

- Production aggregate truth is zero live demand: six test/suppressed leads,
  zero contactable live leads, zero first-response samples, zero live delivery
  failures, zero outcomes, zero spend, and zero overdue routing at the recorded
  read-only observation. No PII was queried or retained.
- Reused the protected Distribution Command, canonical Neon database, Lead
  Center RBAC, immutable audit log, UTM builder, public funnels, and retained
  campaign assets. No publisher, provider integration, second CRM, Supabase
  runtime, or parallel campaign database was added.
- Added one append-only, RLS-enabled publication-proof ledger and one idempotent
  server-only RPC. A successful first insert creates exactly one immutable
  `growth.publication_proof_recorded` audit event; replay creates neither a
  duplicate proof nor duplicate audit.
- Raw final post copy is validated and SHA-256 hashed in memory, then discarded.
  Public evidence URLs are channel/HTTPS/host/query allowlisted both on write
  and again on read. PII, credentials, placeholders, unsupported guarantees,
  and known Fair Housing risk phrases fail closed.
- Added `growth:manage` only to administrators and the primary lead owner. The
  Server Action rechecks that permission, requires an explicit observation
  confirmation, refuses legacy Basic-auth-only mutation sessions, uses
  parameterized SQL, and is blocked by the existing Preview mutation guard.
- Added a hash-pinned, backup-first Production cutover runner with exact
  approval, canonical Neon identity and prerequisite checks, advisory locks,
  one transaction, migration-ledger insertion, privilege/immutability/audit
  postconditions, and lead/audit no-change digests.
- Added an executable PostgreSQL 17 publication-proof contract to the existing
  isolated local staging verifier. It proves service/browser role boundaries,
  one-proof/one-audit idempotency, unsafe-host rejection, append-only behavior,
  synthetic rollback, and zero external calls.
- The contract found and fixed two pre-Production defects: postflight now reads
  trigger event bits instead of depending on PostgreSQL display order, and the
  migration now revokes inherited `service_role` privileges before granting
  only SELECT and INSERT. The reviewed migration hash is
  `c60c1a6e692d487e0adfd98d0eb3a9cff89ad77a3233b53075a4c8b63bde3ede`.
- PR #183 is merged and live at Production commit
  `b8b31fb20223ad0f0ad311fee1ee3de20d0f7ae9`. PR #184 was refreshed onto that
  exact `main` before migration and application release.
- The full local release gate passes system isolation, 14/14 safety checks,
  200 test files / 2,831 tests, strict typecheck, ESLint, the Next.js 15.5.21
  Production build, and the 78-route manifest. Production dependencies report
  no known vulnerabilities; a redacted full-history scan reports no secret
  leaks. Production-render Playwright checks pass 10/10 desktop/mobile routes
  with no overflow, missing required copy, prohibited claim, bare-appraisal
  wording, or console error. The migration hash/plan gate passes. A disposable
  local reset applied all 33 migrations through the new SQL, and
  `staging:local:verify` passes the real PostgreSQL 17.6 role, idempotency,
  audit, host, RLS, and immutability contract with all synthetic changes rolled
  back.
- PR #184's canonical exact-head Node 24 CI, Preview, merge, and Production
  deployment identifiers are kept in PR metadata rather than frozen into this
  self-referential release file. The protected Preview serves expected
  public/health routes and rejects anonymous `/admin/distribution` access.
- Vercel CLI verification created empty helper project
  `amm-phase9-publication-ledger-20260821`
  (`prj_QcHch6KY1m2g0BKtOoVVFregRhho`) before the worktree was relinked to the
  canonical project. It has zero deployments and no application/domain effect;
  it remains preserved pending a separate exact cleanup approval.
- Reconciled the current operating authority, asset manifest, consolidation
  plan, release queue, limitations, daily Lead Center guide, architecture,
  release log, and final report without deleting historical evidence. The
  launch doctor/authority scanners now check PR #181, canonical
  Neon/Better-Auth/Resend/Web-Push variable names, both deployable app trees,
  and MLS-contextual MATRIX usage instead of falsely rejecting the ordinary
  phrase `form-readiness matrix`. Focused scanner coverage passes 82/82.
- The exact ledger migration/release gate was received on 2026-08-22. The
  unchanged hash-pinned migration committed once after one fail-closed rollback
  exposed and corrected a PostgreSQL 18 verifier-only catalog-render mismatch.
  Two validated 351,600-byte backups were retained. Independent postflight
  proves zero seeded proofs and unchanged lead/audit counts and digests.
- No lead mutation, WordPress change, provider call, email, SMS, social/GBP
  publication, print distribution, spend, DNS change, or NellySelly mutation
  occurred.
- External publication remains a separate final-copy/identity/visual/URL/removal
  approval and is not authorized by the ledger gate.

## Phase 9 campaign safety + three-offer owned-demand flight — 2026-08-21

- Reused the canonical protected `/admin/distribution` command, Neon Growth
  ledger, public funnels, UTM builder, and retained Black Diamond imagery. No
  parallel campaign dashboard, lead store, publisher, or migration was added.
- Added seller `/home-value`, buyer `/buy`, and renter `/rent` briefs across all
  six existing owned channels: 18 exact channel/offer placements plus the six
  existing general-question placements.
- Attribution requires an exact normalized source alias, medium, campaign, and
  complete `utm_content` match. Generic and offer-specific results are counted
  exactly once.
- Added accessible local clipboard controls. They make no network request and do
  not publish, send, mutate a lead, or write to the database.
- A current-run desktop/mobile operator audit found and closed the remaining
  activation-path friction: the measured bottleneck now points to the first
  recommended channel, and each channel exposes one deterministic local-only
  packet containing its general placement, three offer placements, exact URLs,
  and review boundaries. The shared mobile Lead Center navigation remains a
  separately scoped cross-route polish item.
- Closed a degraded-state truth gap without adding another data layer. The
  route now distinguishes ready, not-configured, schema-pending, and
  query-failed Growth measurement. Unavailable measurement renders em dashes,
  recovery guidance, and no data-backed channel recommendation; prepared copy
  remains reviewable without being misrepresented as observed demand.
- Audited and rewrote retained legacy campaign libraries containing unverified
  volume, tenure, valuation-error, demand, school-proxy, response-time,
  superlative, and direct-phone claims. Public copy preserves the current live
  office number `252-243-7700`; private routing numbers remain private.
- Hardened the active `/ask` interface and prompt set so it uses consumer-stated
  objective criteria instead of neighborhood, school-proxy, or unverified
  buyer-demand guidance.
- Replaced two soft, undersized legacy offer portraits with higher-resolution
  approved local Mike assets already in the canonical repository.
- Focused verification passes 6 files / 337 tests. The full local release gate
  passes system isolation, 14/14 release-safety controls, 196 test files / 2,797
  tests, strict typecheck, ESLint, the Next.js 15.5.21 Production build, and the
  78-route manifest. Production dependencies report no known vulnerabilities;
  the redacted 482-commit history scan reports no secret leaks. Local
  Production-render visual QA passes 10/10 desktop/mobile route checks with no
  overflow, missing copy, prohibited claim, bare appraisal language, or console
  error.
- A separate no-database Production-render acceptance passes at desktop and
  mobile sizes with three unavailable metrics, no false-zero inference, no
  measured recommendation, no overflow, and no console/page error.
- Code-bearing commit `a0c80eaa9b429ed48871fc221d93af5e7d6fdfa1`
  produced Ready Preview deployment `dpl_5UQL8LDfMvFvvi4YZ8UhLdyDFbWF` at
  `https://ask-magic-mike-ihjwzl8rw-eyes-up-industries.vercel.app`. GitHub's
  release gate and both Vercel checks pass. Read-only exact-Preview proof passes
  ten public/health/listing checks and eight desktop/mobile renders with no
  NellySelly identity, private listing field, overflow, missing required copy,
  prohibited claim, or console error. Anonymous `/admin/distribution` access is
  denied with 401, Basic challenge, `no-store`, and `SAMEORIGIN`; authenticated
  Preview inspection was not bypassed.
- During protected-Preview setup, Vercel CLI created empty helper project
  `amm-phase9-campaign-compliance-20260821`
  (`prj_JUyx03Rh8iABqAFepNNuPI2jJqut`). It has zero deployments and no effect on
  the canonical project. It remains intact pending the separate exact cleanup
  gate documented in the Phase 9 runbook.
- Production, WordPress, Neon, email, SMS, Push, social accounts, GBP, DNS, and
  NellySelly are unchanged by this candidate.
- This historical candidate was released through PR #183. Its approval gate is
  exhausted and is not authority for any current action.

## Phase 9 first-human-response intelligence — 2026-08-20

- Reuse-first audit proved that mutable `last_contacted_at` cannot support the
  required median/P75/P90 first-human-response KPI.
- Candidate branch `codex/phase9-first-response-intelligence-20260820`
  adds one server-only, one-row-per-lead response milestone, immutable audit
  evidence, lifecycle v3 wrapper, and protected operator “record now” action.
- Growth reporting adds milestone coverage/sample size and P50/P75/P90 by
  source/campaign, lead type, and response owner. Response-owner attribution
  uses the server-resolved responder first, then the response-time assignment
  snapshot; it never credits today's mutable owner. Small samples are visibly
  labeled, and test/suppressed rows remain excluded.
- Historical backfill accepts only explicit `lead.lifecycle_changed` contact
  audits; mutable legacy contact timestamps are not promoted to evidence, and
  unavailable historical assignment is left unattributed rather than invented.
- PR #180 is complete in Production at merge commit
  `42f80b209d5d5adc984c1d8b439c7fa830d015e6`, Vercel deployment
  `dpl_2PQoDZLHc562SBEY7px91CAEUrin`, with its outcome migration, validated
  backup, postflight, canonical-host, health, and identity-isolation checks
  passed.
- PR #181 completed in Production at head
  `ed125cdfa09b7cc1a47b7c715bc15af7e6aeceea`, merge commit
  `5335697edf31eed0b8a38cd0295a4f5e7d501a3e`, and Vercel deployment
  `dpl_HVoqg1t4j2SJWPFMEEzpiHGQ6hmM`. Canonical public routes, health,
  authorization, and Ask Magic Mike/NellySelly isolation checks passed.
- A canonical-Neon role-shape replay then applied both stacked migrations twice
  with `anon` and `authenticated` absent. All three protected functions ran as
  `service_role`, public function/table access remained denied, both PostgreSQL
  contracts passed, and no synthetic rows escaped their rollback transactions.
- Added a dedicated fail-closed PR #181 cutover runner with immutable migration
  hash, exact approval interlock, canonical owner/endpoint checks, TLS/channel
  binding, required-schema and role checks, advisory and write-boundary locks,
  validated mode-600 backup, one transaction, migration-ledger insertion, and
  source/backfill/privilege postconditions. Focused runner/migration suites pass
  3 files / 23 tests.
- A real PostgreSQL 18.3 rehearsal applied all 30 prerequisites, removed the
  optional browser roles, applied PR #180 first, and then executed the new
  runner. One suppressed synthetic contact audit produced one exact milestone;
  every postcondition passed, the custom backup validated at 584 restore
  entries, the service-role contract passed, and disposable state was removed.
- The final hardened local release gate passes system isolation, 14/14 release
  safety checks, 195 test files / 2,783 tests, strict typecheck, full lint,
  the Next.js 15.5.21 production build, and the 78-route manifest. Production
  dependencies report no known vulnerabilities, and the full 454-commit Git
  history reports no secret leaks.
- Hardened implementation commit
  `21f0d127064393daf4029240fb45398c1f84b2fc` passes exact-head Node 24 CI run
  `32426414466`. Vercel Preview `dpl_F8u75ymqEJzpFVPfBvvyktWCRiDL` is Ready
  on Node 24 and passes health, public-route, anonymous-admin-denial,
  desktop/mobile rendering, console, and Ask Magic Mike/NellySelly isolation
  checks without a database write or external send.
- The fail-closed read-only Production preflight passed against canonical Neon
  project `bitter-star-20214385`, Production branch
  `br-round-base-auh6h2wd`, unpooled owner endpoint
  `ep-proud-bonus-autwv60g`. All prerequisite, schema, role, privilege, source
  baseline, and target-absence checks were true; 6 leads and 9 audit rows had
  0 eligible historical response backfills.
- Migration `20260820013000` then applied once to canonical Neon Production
  branch `br-round-base-auh6h2wd` with the validated backup retained. Six
  suppressed QA leads, zero live prospects, and existing audit counts remained
  unchanged. No lead, message, WordPress, DNS, or NellySelly mutation occurred.

## Phase 9 operating-intelligence outcome seam — 2026-08-19

- Canonical Production is `main` commit
  `42f80b209d5d5adc984c1d8b439c7fa830d015e6`, Vercel deployment
  `dpl_2PQoDZLHc562SBEY7px91CAEUrin`; public, health, canonical-domain,
  anonymous-admin-denial, and system-isolation checks pass.
- Reuse-first audit found that the existing Growth command center reads
  `lead_outcomes`, but ordinary Lead Center lifecycle actions did not write
  canonical outcomes.
- Candidate branch `codex/phase9-operating-intelligence-20260819` adds one
  additive v2 lifecycle RPC that commits lead state, audit, and deterministic
  outcome together. Existing v1 remains the application rollback boundary.
- Optional closed revenue is restricted by the existing
  `lead:record_revenue` permission and explicitly means actual brokerage
  revenue—not sale price, list price, estimated value, or projected commission.
- The complete migration chain and executable outcome contract pass on
  disposable PostgreSQL 17. The final local release gate passes 193 test files
  / 2,763 tests, strict typecheck, lint, build, 14/14 safety checks, and
  78-route manifest verification. The prior candidate also has independent
  Node 24 CI proof at run `32321701327`; the hardened head requires a fresh run
  after push.
- A canonical-Neon-shape rehearsal found and fixed two pre-Production defects:
  optional `anon`/`authenticated` roles no longer gate migration success, and
  same-state revenue replay now preserves the original actor/audit evidence.
  The revised migration applied twice with those roles absent, executed v2 as
  `service_role`, kept backfill status invariant, prevented duplicates, and
  preserved v1 application rollback compatibility.
- Added a fail-closed Production cutover runner with immutable migration hash,
  exact approval interlock, canonical unpooled Neon identity, TLS/channel
  binding enforcement, required-schema and least-privilege checks, advisory
  and write-boundary locks, validated mode-600 custom backup, one transaction,
  migration-ledger write, and fail-closed postcondition verification. Eleven unit
  contracts and a real PostgreSQL 18 synthetic rehearsal pass. The rehearsal
  proved concurrent-run rejection, weakened-role rejection, complete rollback,
  deterministic backfill, and a rolled-back non-idempotent `service_role`
  transition that returned both audit and outcome IDs. Production was not
  contacted.
- PR #180 merged after exact-head CI and Preview proof. Its pinned migration ran
  against canonical Neon with a validated custom backup, one guarded
  transaction, and fail-closed postflight checks. The exact merge commit then
  deployed successfully, both Ask Magic Mike hostnames served only the correct
  identity, and the anonymous Growth boundary remained closed.

## Phase 9 Production operating checkpoint — 2026-08-19 (superseded)

- At this historical checkpoint, Production was `main` commit
  `f2aff2b802cda3fd9c49ab80b9e379eb9c152913` on Vercel deployment
  `dpl_FG54FQtKQqP8pqMmpe79BCUmdWJT`. It is superseded by the verified PR #180
  Production release documented above.
- Read-only Production smoke and funnel verification remain green. No email,
  SMS, push, call, database write, lead creation, or public publication was
  triggered by this checkpoint.
- PR `#177` is first in the remaining cumulative sequence. It contains the
  commercial-email compliance renderer hardening and retains its own exact
  Production approval gate.
- PR `#170` has been refreshed on the canonical Production baseline. It adds the
  protected, read-only `/admin/distribution` Owned Demand Command and counts only
  exact latest-touch source, medium, campaign, and placement matches. It does not
  authorize publication, messaging, spend, or a database mutation.
- PR `#179` remains a separate iOS phone-alert installation handoff. Physical
  enrollment and a test alert remain separate state changes.
- PR `#173` remains separately staged for the device-private `/plan` Review
  Planner; PR `#172` must be refreshed later as a read-only Database Revival
  candidate.
- The approval phrase recorded at that checkpoint was:
  `APPROVE PHASE 9 COMMERCIAL EMAIL COMPLIANCE MERGE AND PRODUCTION DEPLOYMENT`.
  PR `#170` separately requires
  `APPROVE PHASE 9.1 OWNED DEMAND COMMAND MERGE AND PRODUCTION DEPLOYMENT` after
  the preceding Production release is verified.

## Phase 6 Production schema acceptance — 2026-08-15

- Applied `20260815193000_phase6_ai_messaging.sql` to canonical Neon Production
  branch `br-round-base-auh6h2wd` in one transaction after isolated Preview
  acceptance and PR 154 merge.
- Verified 7/7 new tables, 7/7 RLS, no grants to
  `PUBLIC`/`anon`/`authenticated`, and zero rows across the new structures.
- Pre/post aggregates matched: 6 suppressed QA leads, 0 live prospects, 0
  unsuppressed tests, 7 notifications, 0 pending notifications, and 0 live
  notification failures. No existing production row changed.
- Post-migration public smoke, 15-check funnel, 9-check monitor, 9-route
  lead-pipe health, and NellySelly isolation all pass; no Production Vercel
  errors or warnings were returned for the observed 30-minute window.
- Consumer acknowledgment, nurture, auto-send, carrier SMS, held WordPress
  forms, and Mike activation remain disabled and require their own gates.

## Full-access continuation — 2026-08-14

- Isolated Preview RBAC acceptance is complete on Vercel deployment
  `dpl_2Kpchet8VAee8oqoWi2PovznC8ct` and Neon branch
  `br-morning-paper-aun3378r`.
- A real path mismatch between the Better Auth server and browser client was
  found by live acceptance and fixed at commit `9c6ed47`.
- Administrator, primary-owner, approved-agent, analyst, disabled-user,
  object-level assignment isolation, logout/revocation, and Production-denial
  probes passed. Outbound notifications remained disabled.
- Cleanup verified five banned `example.test` users and zero active Preview
  sessions. The one-use bootstrap token and temporary bootstrap code were
  removed.
- Production RBAC is active after the additive migration, two-user provisioning,
  and administrator acceptance. Brandon passed the complete session matrix;
  Mike is linked to the canonical primary routing row but remains dormant.
- Added a secure per-user account activation/reset path at
  `/lead-center-password-help` and `/lead-center-set-password`. It uses the
  existing authenticated Resend adapter behind a dedicated server-only gate,
  validates the exact auth origin, issues one-use 60-minute links, avoids
  account enumeration and BCC, and revokes existing sessions after reset. No
  activation messages are delivery-verified; the newest unused owner link is
  reserved for Brandon's permanent password choice.

## Phase 3 staged operations release - 2026-08-14

- PR 143 closes active Production reporting and Lead Center mutations to Neon
  only and adds audited actor propagation, exact-host Lead Center subdomain
  handling, durable SLA-cron persistence, and human-readable Web Push device
  labels.
- The RBAC and Push device-label migrations passed on Preview, were applied in
  order on Production, and were followed by a verified deployment and rollback
  checkpoint.
- Form 7 entry 1550 is preserved as `GENUINE - CONSENT RESTRICTED OR UNCLEAR`;
  it was not contacted, marketed, marked test, or forwarded to Neon.
- Form 1 and Form 6 audits stopped before activation because neither stores an
  approved consent choice/version or attribution. Form 3 remains the only
  canonical WordPress form.
- Production read-only evidence remains healthy: 0 live leads, 6 suppressed
  tests, 0 unsuppressed tests, 0 queue/failures, public funnel 15/15, monitor
  9/9, and no error-level Vercel logs in the inspected hour.
- Final staged validation passes 155 test files / 2,566 tests, strict typecheck,
  lint, 41-page build, 60-route manifest, 14/14 safety checks, 13/13 Chromium
  tests, dependency audit, 326-commit secret scan, and isolation.
- Seven redacted operations PDFs are complete. Compliant refreshed `.pptx` and
  `.xlsx` artifacts remain blocked because the required bundled artifact
  dependency loader is unavailable; stale workbooks were not relabeled.

## Brandon phone-registration repair — 2026-08-12

- Production logs isolated the failure to repeated HTTP 401 responses on the
  Basic Auth-protected phone setup route. The former manifest also reopened that
  same admin route from the iPhone Home Screen app.
- A reuse-first repair preserves the existing Web Push provider, VAPID keys,
  Neon subscription table, lead outbox, routing, and admin screen. It adds only
  a short-lived Brandon copy-registration session and does not create a second
  notification system.
- The signed setup session is role-fixed to `copy`, expires in 5–30 minutes,
  uses an HttpOnly Secure SameSite=Strict cookie, and cannot view leads, access
  admin APIs, register Mike's primary role, or change routing.
- Registration and test routes enforce exact same-origin requests, a dedicated
  CSRF header, durable rate limiting, strict runtime validation, and server-side
  role enforcement. The QA push is user-triggered, labeled `[TEST]`, and creates
  no lead or KPI event.
- Browser readiness is now computed independently of the admin device-list API,
  so a list failure no longer leaves the enable button incorrectly disabled.
- The protected admin screen now includes the missing operator workflow: generate,
  replace, copy, or invoke the native share sheet for a 20-minute Brandon-only
  setup link. The browser never reads or stores `ADMIN_SECRET`; the new admin
  route revalidates Basic Auth server-side in addition to middleware protection.
- Setup pages and claim redirects are no-index, no-referrer, and no-store. The
  former tokenless "copy setup link" dead-end was removed; Safari handoff points
  back to the original secure message so the claim token is preserved.
- Local verification: 144 test files / 2,525 tests pass; strict typecheck, lint,
  production build, 54-route manifest, 14/14 release-safety checks, and
  production dependency audit pass. The full development audit still reports
  18 advisories in test/lint tooling and is tracked separately from this repair.
- Preview deployment `dpl_8aKsdtP1zi3tS1J9C1uprRvNbW9P` is Ready and its
  branch-scoped Sensitive signing key is configured. The invite, claim, cookie,
  Brandon-only page, CSRF guard, malformed-payload guard, and readiness endpoint
  pass without creating a subscription or sending a notification.
- Enhanced operator-flow Preview `dpl_Bo8ojFMzf27bjqWX9Q2Qas11XxVy` is Ready.
  Protected invite, signed claim, scoped cookie/session, privacy headers, and
  fail-closed subscription validation pass without a write or external send.
- Authenticated Vercel project-domain inspection confirms the canonical project
  exclusively owns both Ask Magic Mike custom hostnames. Legacy Ask projects and
  NellySelly projects have no Ask Magic Mike custom-domain attachment.
- Production activation remains gated. Production needs a separately generated
  `PHONE_SETUP_SIGNING_SECRET` before this version can report ready.

## Complete locally or evidenced

- Canonical repo and Vercel project identified; rescue branch created.
- Both Ask hostnames serve the correct Ask Magic Mike project; no NellySelly marker
  found in live HTML.
- Our Town remains live WordPress/SEO surface; live phone evidence preserved.
- Canonical Neon lead capture, attribution, dedupe/fingerprint, routing, audit,
  AdminOps inbox/detail, and notification outbox exist in the production codebase.
- Existing release-rehearsal work is preserved.
- Production is deployed on Neon Free PostgreSQL. Public capture, durable rate
  limiting, attribution, scoring, routing, audit, consent, notification outbox,
  and the protected Admin Lead Center are live.
- The canonical `www` hostname is live and the apex redirects permanently.
- Production sender DNS and a restricted Resend sending key are configured and
  verified. The final public-form QA alert reached provider `delivered` state and
  the approved audit mailbox contains the hidden copy.
- Runtime declarations, CI, and Vercel are aligned on Node 24. Production
  readiness includes the enabled Web Push schema and provider configuration,
  without exposing VAPID key values.
- Canonical Vercel automatic Git deployments are restored. The stale
  `exit 0` Ignored Build Step was cleared after a forced, verified production
  release; rollback is the immediately preceding READY deployment.

## Same-day changes in this worktree

- Add required route aliases and public buyer/renter/open-house/general/widget surfaces.
- Add local privacy, terms, accessibility, and contact routes linked from the public footer.
- Add consent/test/attribution/click-ID fields and additive migration contract.
- Add internal Mike+BCC outbox delivery and consent-gated consumer acknowledgment
  using the existing provider/retry boundary.
- Add safe event capture, source-preserving widget origin checks, health script, and
  required operating documentation.
- Add deterministic internal visual-email template selection: `hot_priority`
  (80–100), `active_assignment` (60–79), `new_lead` (<60), and `qa_test`.
  The supplied cards are creative references only; their fictional sample lead
  details are never sent. The generated asset is decorative, and all lead facts
  remain accessible HTML/text.
- Wire internal live-lead SMS through the canonical outbox for primary and copy
  recipients, with separate idempotency/retry records and hard QA suppression.
  Twilio credentials and a registered sender remain required before production
  activation. Optional MMS uses static, PII-free urgency art. Video remains
  outside transactional notifications because it adds latency without routing
  value.
- Add the read-only `pnpm amm:health:lead-pipe` monitor and protected retry endpoint
  for `lead_alert` / `consumer_ack` outbox records.

## Neon preview recovery — 2026-08-11

- An isolated Neon Free preview branch, `amm-lead-pipe-preview`, was created in
  the owner-controlled project and received the full canonical migration chain.
  The production Neon branch remains untouched.
- The application now selects a direct, server-only Neon Postgres adapter when
  `DATABASE_URL` is configured. Public capture, appointment requests, the
  protected AdminOps read/mutation functions, reporting reads, and the lead
  notification outbox use that one adapter/database; no browser receives a
  database credential.
- The notification outbox has a Neon repository with idempotency-key conflict
  handling, claim-before-send status updates, bounded retries, provider message
  IDs, and protected recipient references. Email/SMS remain disabled.
- `DATABASE_URL` is stored as a Sensitive, Preview-only Vercel variable. The
  database role credential was rotated and transferred without being printed,
  committed, or written to a local artifact.
- Preview readiness, durable test capture, consent persistence, deterministic
  score/routing, skipped notification outbox records, test suppression, and
  UUID idempotent replay are proven on deployment
  `dpl_EwjyYzJmKCiq1LjzyiJX24zFS3dX`.

## Combined-system audit — 2026-08-11

- Authenticated WordPress inspection found seven active Gravity Forms with durable
  local entry history and one admin notification each. None has a native Consent
  field. Exact field mappings and entry counts are recorded in
  `COMBINED_SYSTEM_AUDIT_2026-08-11.md`.
- The live AMM Connector is configured for the canonical Ask Magic Mike app; tracked
  CTAs are present on the homepage, home-value page, and seller page. Existing
  forms and legacy plugin records remain unchanged.
- The legacy WordPress AMM plugin remains a competing local lead/`wp_mail` silo and
  must be reconciled, not expanded.
- The hourly SLA cron and protected admin health route now use Neon directly.
  Preview mutation safety requires both `VERCEL_ENV=preview` and an explicit
  `DATABASE_ENV=preview`; stale Supabase project-ref variables no longer control
  this boundary. A live persisted cron breach remains a production QA gate.
- The server analytics ledger and public event endpoint now write through one
  privacy-minimized Neon repository. PII-shaped property keys and non-scalar
  payloads are dropped before insertion, and raw IP is not written.
- A signed Gravity Forms bridge package exists in disabled shadow-safe mode. It
  maps only approved form IDs 1–7, signs exact request bodies, uses deterministic
  idempotency, retries three times, and does not send a second WordPress email.
- Current `/admin` remains shared Basic Auth; per-user role-based Hub authentication
  is still required.
- No WordPress form/notification/plugin/page, DNS, database, environment, deployment,
  or external message was changed during this audit.

## Reuse-first hardening candidate — 2026-08-11

- Branch: `codex/amm-reuse-first-hardening-20260811`.
- Existing black-diamond public visuals were retained after rendered inspection of
  `/`, `/home-value`, and `/buy`; no redesign or synthetic replacement imagery was
  warranted. Evidence is under `output/product-design-audit/2026-08-11/`.
- Next.js was patched within 15.5, Node is pinned to 20.x, vulnerable transitive
  packages are overridden, and `pnpm audit --prod` reports zero known issues.
- Public chat now has exact-origin validation, bounded input/body size, a durable
  Neon limiter, provider timeout, no-store response policy, and safe correlation
  handling.
- Admin health no longer accepts query-string secrets; middleware Basic comparison
  is Edge-safe and digest-based. Shared Basic Auth remains the only unresolved
  high-traffic identity/RBAC limitation.
- Verification: 137 Vitest files / 2,488 tests pass; 13/13 browser E2E tests pass;
  lint, strict typecheck, production build, 43-route manifest, 14/14 release-safety
  checks, dependency audit, whitespace check, and 319-commit gitleaks scan pass.
- Non-production Vercel preview `dpl_C5Rt9Wssh4jGaqo3GHQyTs7a9R34` is READY at
  `ask-magic-mike-il5455ptk-eyes-up-industries.vercel.app`; core public routes and
  both health endpoints return 200 with delivery channels disabled.

## Database recovery decision

The owner reported that the Supabase project has outstanding invoices and no
funds are available to restore it. `FREE_DATABASE_RECOVERY_PLAN.md` selected
Neon Free PostgreSQL. Both preview and production Neon branches now have the
canonical schema; production health and public durable capture pass. No Supabase
historic-data mutation or copy was performed.

The current production deployment serves all required public routes, robots,
sitemap, health endpoints, widget, and legal pages. Prior WordPress inspection
identified the relevant form area, but the current connector configuration and
duplicate-notification behavior still require authenticated confirmation before
any bridge activation or shadow-mode test.

## Production cutover — 2026-08-11

- The reuse-first candidate was merged through PR `#122` and promoted as Vercel
  deployment `dpl_4yacS3NeepmZNp4AnamDF6oPA5GW` after production-environment
  route, authorization, database, migration, and health checks passed.
- A canonical-hostname QA form submission created one test lead, one internal
  alert, and no consumer acknowledgment. The Resend outbox row is sent on the
  first attempt; the hidden audit BCC remains configured and undisclosed.
- The Lead Center now selects Neon for inbox and detail reads when `DATABASE_URL`
  is present. Supabase remains a compatibility fallback only.
- The notification dashboard now displays the provider message ID needed for
  delivery reconciliation without exposing recipient addresses.

## Production follow-up — PR #123

- PR `#123` merged as `55dec0c95bf18cc056cb09955c44e8180a450466`.
- Production deployment `dpl_BGkVcCMFgeZQgnteRxRUomeJoyRv` is canonical and
  serves all required public, legal, widget, sitemap, and health routes.
- Authenticated Lead Center inbox and detail reads now show canonical Neon data;
  an anonymous request receives HTTP 401.
- Production health reports Neon reachable, lead schema ready, Resend enabled,
  provider delivery enabled, and hidden BCC configuration present.
- The approved audit mailbox contains the controlled QA lead ID and `[TEST]`
  alert. Provider message ID: `fe5ab262-6dd4-405b-839b-0da71ab996fa`.
- The Vercel automation bypass credential was rotated, the repository Actions
  secret was updated, and superseded bypass values were revoked.

## WordPress reuse-first status

- The existing Ask Magic Mike Connector is active, points to
  `https://www.askmagicmike.com`, uses `/value` and `/widget/v1`, and keeps the
  site-wide floating launcher disabled.
- The existing WordPress Ask Magic Mike system has six historical records, four
  marked uncontacted. They remain in place pending a reviewed dedupe/import plan.
- Ask Magic Mike Canonical Lead Bridge `1.1.0` is installed with matching HMAC
  configuration and only Home Value Form 3 allowlisted. Forms 1, 2, and 4–7
  remain blocked. Form 3 entry 1549 forwarded to canonical lead
  `70f63f35-2478-4738-b84c-bc1a89b8482c`; one canonical `[TEST]` alert reached
  Mike and the hidden audit inbox while consumer email and SMS were suppressed.
- The exact duplicate Form 3 Gravity `Admin Notification` is Inactive. Other
  forms and notifications were not changed.
- PR #139 / merge `2a9ee23` corrected Neon idempotency for WordPress-style keys;
  production replay returns the original lead without a second canonical email.
  Additional form activation remains held for final Neon QA-row reconciliation.
- The follow-up release candidate normalizes nested WordPress click IDs and
  restores `/api/listings/search` plus `/api/listings/[id]` in the active App
  Router as public-safe degraded compatibility surfaces. Our Town
  Properties/FlexMLS remains the authoritative live listing source.
- PR #140 merged as `178bdefd` and deployed Ready as
  `dpl_3AVXKtKCuiqytNqNQXvSKF4YBPCL`. Production reconciliation on Neon branch
  `br-round-base-auh6h2wd` found the one incomplete pre-fix QA replay row,
  marked it test/suppressed, and recorded a `lead.qa_suppressed` audit event.
  The row has no notification or analytics side effects; no data was deleted.
  Form 3 is accepted as the only allowlisted WordPress form.

## 2026-08-14 security polish

- Admin Web Push subscription list/register/remove and test-delivery handlers
  now enforce route-level Basic Auth as defense in depth behind middleware.
- Public appointment follow-up requests now use a dedicated canonical Neon rate
  limiter before parsing or persistence.
- The complete privileged route inventory found no unprotected `/api/admin`
  handler and no remaining middleware-only `/admin/api` handler.
- Full local release verification is green: 2,539 tests, strict typecheck, lint,
  production build/54-route manifest, 14/14 safety checks, 13/13 browser tests,
  zero known dependency vulnerabilities, and no gitleaks findings.
- PR #137 merged and is production on deployment
  `dpl_GJkS5dRAtzakPdtVJRiNAUWbWSKp`; post-release smoke, funnel, health,
  authorization, isolation, and error-log checks passed.
- Vitest/coverage upgraded to 3.2.6, Vite to 6.4.3, and vulnerable development
  dependency paths pinned to compatible patched versions.
