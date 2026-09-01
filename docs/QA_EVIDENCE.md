# QA Evidence

## WordPress Connector attribution candidate — 2026-09-01

- Authenticated read-only capture preserved the exact live Connector 1.0.0 PHP
  source at SHA-256
  `2938f47cca5e667a5b65b39fecfd32bb492f7b8f579179ac2ad3105957095a8f`.
  The live CSS and JavaScript are preserved byte-for-byte.
- The source-controlled 1.1.0 candidate is
  `700c78b77b24b0038078e45c6526908078dac46cf1a591b73dd0f13a6d840ec8`.
  Local `php-parser` 3.2.5 reports `PASS`. Native `php -l` is required by
  the hosted Release Gate and must pass again on the target host before any
  plugin replacement; native PHP is unavailable on this local Mac.
- Deterministic package verification passed:
  `ask-magic-mike-connector-1.1.0.zip` is
  `56934bdcc9a8685493609ffbe76938f7889ef24a01e69d5f73bd1720eed7d4fa`;
  the byte-preserved 1.0.0 rollback ZIP is
  `cd1d9171ff40ccc28740e5e59380bf373cacd4ebe5a853fdeabee45cc9d5d261`.
  Archive extraction reproduced the candidate, baseline, CSS, and JavaScript
  source hashes exactly.
- Exact Node 24.18.0 `pnpm run release:gate` passed 283 test files / 3,426
  tests, strict typecheck, full ESLint, optimized Next.js 15.5.21 build with 60
  generated pages, and 100 active-route checks.
- `pnpm run release:safety` passed 14/14 and
  `pnpm audit --prod --audit-level high` found no known vulnerability.
- Gitleaks scanned the complete staged delta with redaction enabled and found
  no secret.
- Hosted Node 24 run
  [33527644227](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33527644227)
  passed on authority head
  `1dbe5036c4eed517c1d0a5f82290c90de5122876`, including native `php -l`,
  3,426 tests, typecheck, lint, build, route assertions, and authority reports.
- Immutable Preview `dpl_3sYgoq4SHqjvyN3EFDThUDDjMBBL` was Ready from that
  exact head. Authenticated read-only Vercel requests returned 200 for `/`,
  `/ask`, `/sell`, `/home-value`, `/buy`, `/rent`, `/widget/v1`,
  `/robots.txt`, `/sitemap.xml`, `/api/health/live`, and
  `/api/health/ready`; anonymous `/admin` and `/api/admin/health` returned
  401. No write-mode request ran.
- During the first protected-Preview request, Vercel CLI auto-linking from the
  isolated directory created the unintended empty project
  `amm-wordpress-connector-attribution-20260901`. Immediate read-only audit
  proved zero deployments and zero environment variables. The exact empty
  project and ignored local link were removed, then absence was re-verified.
  Canonical project `ask-magic-mike`, its domains, deployments, configuration,
  and Production aliases were unchanged.
- Placement-manifest regression tests prove missing/stale Connector versions,
  hidden CSS, duplicates, lookalikes, page-ID drift, unavailable readiness, and
  fetch failures all fail closed. Non-actionable states expose no execution
  gate.
- Production authority was reconciled to accepted PR #247 merge
  `a2f3de834830f600df106dbf5836ae4bbde4eb4a`, tree
  `0065f829fc94f87ab5e0faf596c8e56733be3972`, deployment
  `dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U`; its approval is consumed and no
  application candidate is active.
- No WordPress file, option, page, form, cache, lead, notification, database,
  canonical environment, DNS, spend, Production deployment, or NellySelly
  state changed.

## Corrected cumulative Production preflight — 2026-08-30

- The encrypted Vercel Production `DATABASE_URL` remained non-exportable; a
  temporary pull contained no credential and was deleted immediately.
- The authenticated Neon console attested the exact unpooled Production
  project, branch, endpoint, database, owner, TLS, and channel-binding state.
- The first read-only preflight exposed a runner-only mismatch: canonical Neon
  has `service_role` and intentionally lacks optional `anon` and
  `authenticated` roles.
- After correcting optional-role handling, the same read-only Production
  preflight returned `ok: true`; all prerequisites were present and all three
  receipt tables, eight functions, four triggers, and five ledger versions
  remained absent.
- Focused regression coverage passed 1 file / 9 tests. A disposable PostgreSQL
  17.11 execute/verify with both browser roles absent passed all postconditions
  and produced a validated 330,650-byte, 616-entry backup before cleanup.
- Full bounded evidence is in
  [`phase9/CUMULATIVE_PRODUCTION_PREFLIGHT_2026-08-30.md`](./phase9/CUMULATIVE_PRODUCTION_PREFLIGHT_2026-08-30.md).
- No Production mutation, merge, deployment, WordPress change, lead access,
  notification, provider action, DNS change, spend, deletion, or NellySelly
  interaction occurred.

## Five-migration cumulative cutover rehearsal — 2026-08-30

- The cumulative runner now includes the Neon admin Lead Center persistence
  migration instead of leaving application code and required PostgreSQL
  functions in separate release paths.
- Focused interlock coverage passed 1 file / 9 tests; offline planning verified
  all five source hashes without reading a database variable.
- Actual execute/verify passed against disposable PostgreSQL 17.11 built from
  the complete pre-cutover migration history. Five ledger rows, three hardened
  receipt tables, eight hardened functions, four triggers, zero receipt rows,
  and unchanged growth baselines were proven.
- The runner created a validated 330,638-byte custom backup with 616 restore
  entries. A second cluster restored it, injected a late failure after the
  fifth migration, and proved all target schema plus all five ledger rows were
  rolled back.
- Full commands, fingerprints, privilege checks, and release boundaries are in
  [`phase9/CUMULATIVE_ADMIN_PERSISTENCE_CUTOVER_QA_EVIDENCE.md`](./phase9/CUMULATIVE_ADMIN_PERSISTENCE_CUTOVER_QA_EVIDENCE.md).
- No Neon Production, Vercel Production, WordPress, lead, notification,
  provider, DNS, publication, spend, deletion, or NellySelly state changed.

## Singular cumulative release authority — 2026-08-29

- A completion audit proved that sealed Draft PR #238 was already documented as
  the cumulative PR #210–#237 candidate while several active operator records
  and the protected Growth capability ledger still instructed operators to
  start with PR #210. That contradiction could have authorized the wrong
  release vehicle.
- `config/current-release-authority.json` now binds accepted Production PR
  #209, exact Draft PR #238 head/tree, the cumulative approval gate, ordered
  cutover command, and the SHA-256 values recomputed from all four reviewed
  migration files. A typed server-only adapter and protected ledger consume the
  same record.
- Active runbooks, status, owner queue, rollback guidance, and architecture
  records now classify PRs #210–#237 as preserved historical lineage without
  independent authority. PR #239 remains dependent read-only tooling.
- Focused verification passed 2 files / 29 tests. The full Node 24.18.0 Release
  Gate passed 275 files / 3,401 tests, strict TypeScript, full ESLint, optimized
  Next.js 15.5.21 build with 59 pages, 95/17 route proof, 14/14 release safety,
  and deployable-source isolation.
- Complete command and boundary evidence is recorded in
  [`phase9/CURRENT_RELEASE_AUTHORITY_TRUTH_QA_EVIDENCE.md`](./phase9/CURRENT_RELEASE_AUTHORITY_TRUTH_QA_EVIDENCE.md).
  Exact-head hosted CI and immutable Preview identity are pinned to the Draft
  PR after push to avoid a self-referential evidence commit.
- No Production migration, merge, deployment, environment/secret change,
  WordPress action, lead/PII access, message, provider action, DNS change,
  publication, spend, deletion, or NellySelly interaction occurred.

## Phase 9 OTP Facebook crawler Apache diagnosis — 2026-08-29

- The latest sealed PR #228 parent
  `3c01eeb2dc133d6463d2ce19904ac3a08f56284c` was reconciled by normal merge
  `1757c696af05ec35730f7e9f716ccb58ec7dc1f2`; the prior PR #229 head is
  preserved at
  `rescue/amm-pr229-pre-pr228-parent-refresh-20260829-140600`.
- Focused no-network regression coverage passes 111 tests. The verifier now
  reuses the known Apache diagnosis only for the exact two expected paths,
  Facebook crawler, and HTTP 403 outcome. Partial, different-path, and
  different-status failures remain unknown and fail closed.
- The reviewed host expression independently constrains both allowed hostnames
  and uses Apache `req_novary` header access to avoid adding Host or User-Agent
  to `Vary`. Official Apache 2.4 syntax and ordering references remain linked
  from the canonical evidence file.
- Earlier green Release Gate, immutable Preview, no-write QA, and clean runtime
  results remain historical pre-hardening proof. Final exact-head remote proof
  is pinned in PR #229 after push and is not written back into this commit.
- Read-only live crawler verification remains truthfully 40/42. Only the two
  expected Our Town Facebook checks fail; the corrected verifier emits the
  bounded Apache operator action and no stale broad-WAF instruction.
- Production remains unchanged at commit
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` and deployment
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`.

## Phase 9 identity-safe wide social preview — 2026-08-29

- `pnpm run amm:verify:social-preview`: 40/42 live checks passed. Ask Magic
  Mike root, Ask, and Value surfaces returned 200 with Open Graph metadata for
  browser, Facebook, X, LinkedIn, Slack, and Discord profiles. The only failures
  were Our Town's `/ask-mike/` and `/agents/mike-eatmon/` for Facebook.
- A path/UA matrix reproduced one identical Apache 403 body for every tested
  public/private Our Town path whenever the user agent contained
  `facebookexternalhit`; browser, `Facebot`, and
  `meta-externalagent/1.1` controls did not reproduce it. Later authenticated
  Apache evidence identified the exact `facebookexternalhit -> bad_bots`
  classifier and `Require not env bad_bots` denial; there is no ModSecurity
  rule ID to discover. No broad firewall bypass was attempted.
- `pnpm run amm:generate:social-card`: generated 1200x630, 160,316-byte JPEG;
  output SHA-256
  `68dea02d8b4beb24eb864363c2c0d30adc1c98f4d5f37872a32848dad037c713`,
  source SHA-256
  `e96c83acaa4555ce0bb4e62fda7db18cd8b6c0a2476efd1987a9f5843ec70aa4`,
  and logo SHA-256
  `d6f9cf50829416c348985307e68b111f8e46665a1c603810b46b55b377c32d49`.
- Final-parent local focused Vitest: PASS — 4 files / 144 tests. Strict
  typecheck, targeted ESLint (including an explicit `--no-ignore` pass over the
  generator), 14/14 release safety checks, and deployable-source isolation all
  pass. Final branch-bound full release-gate evidence is recorded only after the
  refreshed head is pushed and independently checked.
- Production dependency audit: PASS — no known vulnerabilities. Deterministic
  regeneration reproduced the exact output and lineage hashes. Ancestry and
  `git diff --check` pass against exact sealed PR #226 head
  `1a912d29e608d872a84d70c7563e91134d369741`.
- Fresh in-app Browser visual/DOM QA: PASS at 1280x900 and 390x844. The exact card,
  identity-preservation label, review heading, navigation, and footer rendered;
  mobile had no horizontal overflow. Post-fix reloads produced no new browser
  error or warning.
- AI-assisted hierarchy output was reviewed and rejected for identity drift.
  The shipped asset uses only deterministic composition of the approved source
  photograph and exact logo. Full source/final and browser evidence is recorded
  in `design-qa.md`.
- Former PR #227 head `cf92b9cb64a7cc5b70c98d629cc86d2289fbfedb`
  is preserved at
  `rescue/amm-pr227-pre-pr226-parent-refresh-20260829-131437`. Final sealed PR
  #226 head `1a912d29e608d872a84d70c7563e91134d369741` was reconciled through normal
  merge `89b57a7d16beb4f1c157d2f7fca6e49982623f10`; conflicts were limited to
  additive status/evidence ledgers. Earlier source rescue
  `rescue/amm-pr227-pre-pr226-exact-seal-20260829-0611` remains intact.
- Authenticated in-app Browser proof: `/social-preview` returned the correct
  heading, identity-preservation label, non-index metadata, exact wide-card
  render, navigation, footer, and equal document/client width. Direct asset
  navigation returned one complete 1200x630 image. `/`, `/ask`, and `/value`
  rendered canonical Production URLs plus the 1200x630 wide-card Open Graph and
  `summary_large_image` metadata; `/value` resolved to canonical `/home-value`.
- Exact deployment logs recorded HTTP 200 for the review route, image optimizer,
  root, Ask, and Home Value. Preview-only passive telemetry returned HTTP 202
  through the established read-only guard. The checked window contained zero
  4xx, 5xx, warning, or error result. No form was submitted.
- Production remains unchanged at
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`. Preview data, WordPress, DNS,
  email, SMS, lead records, providers, and NellySelly remained unchanged.

## Release-authority deduplication — 2026-08-29

- Authenticated GitHub evidence showed PRs #187 and #212 were both open Drafts,
  while current authority documents already described their replacement or
  consolidation.
- Exact Git ancestry proves PR #212 head
  `758154ca73b64f24f2df8f183ba8b3f6f82f769a` is an ancestor of PR #221 head
  `61e152cb7ce03fd1904a06f30435dbe7ef36c4e1`; current PR #221 is itself an
  ancestor of exact PR #225 head
  `f33c87f27bfcbbcad3b5566aefd80909d25303bb`. Selected bridge source is
  byte-identical, while later application files contain reviewed cumulative
  hardening.
- PR #225 intentionally lacks PR #187's target page, target action, target
  repository, and KPI-target migration while retaining the new read-only
  baseline-readiness contract. PR #187 therefore cannot be a parallel release
  vehicle.
- PRs #187 and #212 were closed with explanatory comments; their branches,
  commits, rescue refs, migrations/packages, tests, evidence, and rollback
  assets remain recoverable. No branch was deleted or force-pushed.
- The final Draft was reconciled onto sealed PR #225 through a normal branch
  merge. Former PR #226 head `ae666aa6c31ed3726155e110f065b64d4b445040`
  is preserved at
  `rescue/amm-pr226-pre-pr225-parent-refresh-20260829-1249`; exact PR #225 was
  merged at `954d66cfe629a9d14a73cd1d405ff9535b9de28b`. Conflicts were limited to
  additive implementation-status and QA evidence. No Production
  merge/deployment, environment, database, lead/event,
  communication, provider, WordPress/GTM/GA4, DNS, publication, spend,
  deletion, or NellySelly mutation occurred.
- Exact Node 24.18.0 refreshed-parent checks pass the focused executable
  authority contract 22/22, strict typecheck, targeted ESLint, release safety
  14/14, deployable-source Ask/NellySelly isolation, Production dependency
  audit with no known vulnerability, ancestry, and whitespace checks. These
  local results are not substitutes for final exact-head GitHub/Preview proof.

## Phase 9 baseline and target readiness — 2026-08-29

- **Canonical Production baseline:** a saved aggregate-only SELECT in Neon
  returned 6 total lead rows, all 6 test/suppressed, and zero eligible live or
  contactable leads, outcomes, response milestones, spend rows/dollars, market
  signals, opportunities, and non-test publication proofs at
  `2026-08-28T19:45:52.419594+00:00`. It returned no lead identity, contact,
  message, address, recipient, credential, or raw event data.
- **Historical public health at baseline capture:** `/api/health/live` and
  `/api/health/ready` returned HTTP 200; canonical Neon, capture function,
  tables, RBAC, Push, and phone readiness were true. The later accepted
  Production authority is exact commit
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`; the aggregate snapshot was not
  relabeled as a fresh query during stack reconciliation.
- **Provider observation:** Neon Production compute was active and the account
  displayed 93% monthly compute allowance consumed at check time. No provider,
  billing, branch, or database setting was changed.
- **Focused implementation proof:** `pnpm exec vitest run
  tests/adminops/growth-baseline-target-readiness.test.ts
  tests/adminops/admin-growth-route-guards.test.ts` passes 2 files / 12 tests;
  the widened Growth suite passes 6 files / 38 tests.
- **Former-head exact local release gate:** with Node 24.18.0,
  `pnpm release:gate` passed
  deployable-source isolation, 14/14 release safety, all 264 files / 3,299
  tests, strict typecheck, full ESLint, optimized Next.js 15.5.21 build, and 95
  active routes / 17 acknowledged duplicates.
- **Truth cases covered:** no-live activation lock, no target payload,
  measured owner-review readiness, directional-but-not-ready evidence,
  unavailable subsystem handling, explicit instrumentation gaps, PII-safe
  contactability gap, and unit formatting without fabricated zero.
- **Authenticated browser proof:** local Chromium at 390×844 and 1,440×1,000
  returned HTTP 200, rendered the protected Growth heading, explicit target
  lock, and all 42 disclosed contracts. Both viewports had exact document/client
  width, zero error overlay, zero console/page errors, and zero non-read request.
  Screenshots are retained only in gitignored local artifacts.
- **Hosted safety finding and containment:** direct authenticated verification
  of exact Preview commit `d800a03b3f472c17a9b75213e0e5a3d5817f6fc0`
  exposed an inherited gap: an ordinary browser page view reached
  `POST /api/events` before the Preview read-only guard. Aggregate-only Neon
  checks found exactly one privacy-minimized `/ask` page-view at
  `2026-08-28T20:11:40.295751Z` on branch `preview` and zero matching rows on
  Production branch `br-round-base-auh6h2wd`. No identity, contact, lead,
  outcome, message, or raw payload was read. The Preview-only row was preserved
  rather than deleted.
- **Safety correction:** `/api/events` (and `/api/widget/events`),
  `/api/analytics/event`, and `/api/experiments/event` now call the existing
  endpoint-aware Preview mutation guard before rate limiting or persistence.
  Ordinary Preview telemetry fails closed with HTTP 503, `persisted: false`,
  and `preview_data_disabled`; automated-browser exclusion remains earlier in
  the chain.
- **Stack reconciliation:** the previously sealed PR #225 head
  `60599703cf8ac5e65794b696aefaebc6353bbdf0` is preserved at
  `rescue/amm-pr225-pre-pr224-parent-refresh-20260829-1224`; the original
  implementation head also remains recoverable at the earlier documented
  rescue. Exact sealed PR #224 head
  `2effb45e2a324c25875dcf7d24019eae8dfdad38` was merged without rebase,
  reset, force push, or conflict at
  `eab49cbe2926f3726d289473c308363e1f03de9e`.
- **Definition-to-source data-quality proof:** focused cases prove tracked spend
  remains visible without eligible leads; partial close revenue and referral
  fees remain unknown; explicit zero referral fee is valid evidence; blended
  cost is withheld until every paid channel has spend attribution; agent
  follow-up remains uninstrumented without an agent-grain denominator; and all
  42 keys are unique.
- **Refreshed-parent local acceptance:** exact Node 24.18.0 passes 10 focused
  files / 99 tests spanning the baseline register, Growth aggregates,
  opportunity decisions, Web Vitals, Preview boundary, and public event routes;
  strict typecheck, targeted ESLint, release safety 14/14, sealed-parent
  ancestry, and whitespace checks also pass. The prior exact head's 264-file /
  3,324-test release gate, 59-page build, route contract, doctor, dependency
  audit, and history scans are historical until fresh exact-head CI supersedes
  them.
- **Focused security review:** `/admin/growth` remains server-authorized through
  `report:view`, force-dynamic, aggregate-only, and write-free. Public event
  origins remain allowlisted, ordinary Preview fails closed before durable
  limiter/body/repository work, and no raw HTML, browser secret, target writer,
  migration, or additional database query was added.
- **Browser-locator correction:** the first hosted no-write run passed all 18
  read-only checks with six deliberate mutation skips, then produced 13 browser
  passes and two failures because a legacy `.first()` assertion selected a
  matching economics label inside the new intentionally collapsed audit. The
  test now scopes economics assertions to the visible performance section and
  independently opens, verifies, and closes the 42-contract readiness audit.
  This changes no application behavior or data boundary.
- **Exact-head hosted acceptance:** sealed head
  `f33c87f27bfcbbcad3b5566aefd80909d25303bb` passes branch-bound GitHub
  Release Gate run `33263356616` and protected Preview run `33263505472`.
  The latter
  records 18 read-only passes, six deliberate mutation skips, 15/15 browser
  passes, doctor 43/43, desktop/mobile visual acceptance, and exact-deployment
  runtime review with zero warning/error/fatal entries. The only 5xx is the
  expected fail-closed authenticated Preview SLA sweep. Immutable deployment
  `dpl_9MNpd2ETo9Zgdd25NKfgue2ScQ7U` is READY at
  `https://ask-magic-mike-fuedubfue-eyes-up-industries.vercel.app`. Dedicated
  POST, PUT, PATCH, DELETE, warning, error, and fatal log queries returned zero;
  the retained keyboard-scroll focus/guidance is the only intended visual
  delta from the prior sealed artifact.
- No Production row, environment, migration, target, lead, notification,
  provider, publication, spend, WordPress/DNS, deletion, or NellySelly action
  occurred.

## Phase 9 cross-domain measurement consolidation — 2026-08-29

- Exact PR #212 head
  `758154ca73b64f24f2df8f183ba8b3f6f82f769a` was reconciled
  onto exact sealed PR #220 head `19689e95d824d7d06e5f3b60cd18335f53018c93`
  in a dedicated worktree. Its implementation, WordPress bridge 1.2.0 package,
  tests, and runbooks were reused rather than rewritten.
- Conflict resolution preserves the newer canonical funnel UUID, server-owned
  conversion outcomes, Web Vitals path, protected no-write browser harness,
  exact-origin widget checks, and automated-browser KPI exclusion while adding
  the consent-gated dedicated `ammDataLayer` boundary.
- Post-reconciliation hardening requires a present exact Origin on both public
  browser write routes, bounds experiment JSON at 4,096 bytes before parsing,
  applies exact identifier/context validation, and gives WordPress an explicit
  allow-to-deny revocation path with Google-only cookie expiry and duplicate
  runtime prevention.
- Final application head `735cc8930eb595b550adf69ace1d6fef3b82a939`
  also applies the endpoint-attested Preview mutation guard to both public
  telemetry routes before rate limiting or repository access. A normal hosted
  browser page view received HTTP 503 and `private, no-store` on the immutable
  Preview; controlled Preview mutation flags stayed off.
- Both application and WordPress measurement activation remain disabled. The
  current read-only public preflight is still expected to return `HOLD` until
  separately approved WordPress consent-order remediation and runtime QA.
- **Former-head local acceptance:** focused integration/privacy/WordPress coverage passed
  9 files / 77 tests. The complete Node 24.18.0 release gate passes system
  isolation, 14/14 safety checks, all 261 files / 3,275 tests, strict
  TypeScript, ESLint, optimized Next.js 15.5.21 build, and 95 active routes / 17
  acknowledged duplicates. Local isolated Chromium passes 4/4 no-write
  scenarios covering external-analytics absence, widget success/error, and
  keyboard focus.
- **Package acceptance:** PHP 8.1 syntax, ZIP integrity, source/archive parity,
  and SHA-256 sidecar verification pass for bridge 1.2.0. The current package
  digest is
  `9e8ea868281f2d3395afccdb37da063f16129471656cfd37dca47557043cc4eb`.
- **Current focused acceptance:** Node 24.18.0 passes 4 files / 46 tests for
  public events, public experiments, WordPress consent behavior, and package
  contracts. The later Preview mutation regression passes 3 files / 35 tests.
  Strict TypeScript, targeted ESLint, ZIP integrity, and whitespace checks pass.
- **Exact application-head acceptance:** GitHub Node 24 run `33239065433`
  passes 261 files / 3,291 tests, strict typecheck, lint, optimized build,
  isolation, and safety 14/14. Immutable Preview
  `dpl_8bWUx49oChfNeUrQpErDA9XxwK24` is READY. Protected run `33239236233`
  passes release doctor 43/43, 18 read-only checks, six intentional mutation
  skips, 4/4 expected browser scenarios, and `PREVIEW_READY` with
  `SAFE_DB_WRITE=false`.
- **Hosted visual/runtime acceptance:** nine full-page desktop/mobile captures
  across `/`, `/ask`, `/home-value`, `/widget-preview`, and `/privacy` show no
  horizontal overflow; browser console has zero warnings/errors. Exact Preview
  logs bind the expected `/api/events` refusal to HTTP 503 and contain no
  warning/error/fatal entry in the visual window.
- **Live read-only preflight:** truthful verdict `HOLD`; the approved brokerage
  container and destination remain `GTM-KZMCSLTJ` / `G-RQRBB1G270`, Ask server
  HTML remains tag-inert, and no NellySelly identity collision is present. The
  canonical Basic Consent gate is absent while legacy GTM head and noscript
  bootstraps remain. No consent choice, form, account, database, or deployment
  write occurred.
- **Security/dependency evidence:** Production dependency audit reports no known
  vulnerabilities; Gitleaks reports no leak in the 123.24 KB staged candidate
  or 636-commit history; the migration diff is empty; `.env.example` adds only
  the public configuration name and safe comments.
- The final documentation-only seal must repeat exact-head CI and protected
  Preview checks; no second evidence commit will be used to create a loop.
- One PII-free homepage `page_view` was persisted by the superseded Preview at
  `2026-08-29T06:36:50Z` before the server repair. It created no lead, identity,
  communication, or Production write and was not deleted. Otherwise no
  Production, environment, database, communication, WordPress, GTM/GA4, DNS,
  publication, spend, deletion, provider, or NellySelly mutation occurred.

## Phase 9 local-profile performance ingress refresh — 2026-08-29

- Draft PR #220 reuses exact sealed PR #219
  `b628fc00fc6b03d89871c65d884fe649db025968`, the authenticated Growth
  Command Center, shared bounded ingress transport, canonical growth ledgers,
  exact Neon endpoint guards, `growth:manage` RBAC, and immutable audits.
- Former PR #220 head `5e605ca8bd8b313f7a4c29b2d1220c7c40a477a3`
  is preserved at
  `rescue/amm-pr220-pre-pr219-exact-seal-20260829-012049`; exact-parent merge
  head is `61c162143cb9892f88a2318d32888ba2d644f329`.
- Reconciled code-bearing head `d73abeb1f2979f3c217fc5b0a873b483e0bd5561`
  passes Ask/Nelly isolation, safety 14/14, all 257 files / 3,238 tests,
  strict types, lint, optimized 59-page Next.js 15.5.21 build, 95/17 route
  proof, release doctor 43/43, dependency audit, 655-commit gitleaks,
  exact-parent ancestry, whitespace, and focused security review on Node
  24.18.0.
- A fresh disposable PostgreSQL 17.11 cluster applied all 37 migrations and
  passed the spend, organic-search, and local-profile contracts. Browser and
  legacy-role execution remained denied, every synthetic transaction rolled
  back, and a database-native assertion confirmed zero synthetic rows or
  receipts. The stopped cluster was moved recoverably to Trash; no remote
  database was connected.
- Former-head CI, Preview, browser, visual, and runtime-log proof is historical.
  Fresh exact-head remote proof is mandatory after the documentation-only
  evidence seal and before the separate PR #220 migration/merge/deploy gate.
- No Production, environment, Neon object or row, Google/provider call,
  profile edit, import, publication, lead, message, WordPress, DNS, purchase,
  deletion, or NellySelly action occurred.
- Full scope:
  `docs/phase9/LOCAL_PROFILE_PERFORMANCE_INGRESS_QA_EVIDENCE.md`.

## Phase 9 organic-search ingress refresh — 2026-08-29

- Draft PR #219 reuses exact sealed PR #218
  `f065d8801bec295c99185d846ff4bc38de2a0a6f`, the canonical Growth Command
  Center, shared bounded ingress transport, growth ledgers, endpoint
  attestation, `growth:manage` RBAC, and audit system.
- Former PR #219 head `5486bed20272d2a661bc28a0e3a4a4576b2cb11f`
  is preserved at
  `rescue/amm-pr219-pre-pr218-exact-seal-20260829-004949`; exact-parent
  reconciliation head is `f2754d0e1858c1afcf639977051f3488ab591f89`.
- Product, API, migration, shared-refactor, route, and test files merged without
  conflict. The existing spend-ingress parser, transport, and database-
  identity behavior remains represented by its regression suite and the
  combined Preview browser command retains both spend and organic scenarios.
- Reconciled head `5d598cc2228b6564af883a9716aedf1aa28cb2fb`
  passes isolation, safety 14/14, all 252 files / 3,210 tests, strict types,
  lint, optimized 57-page build, 92/17 routes, doctor 43/43, dependency audit,
  653-commit gitleaks, ancestry, whitespace, and focused security review on
  Node 24.18.0.
- A fresh disposable PostgreSQL 17.11 cluster applied all 36 migrations and
  passed both spend and organic executable contracts. Browser and legacy-role
  function execution remained denied, every synthetic transaction rolled
  back, and zero synthetic rows or receipts remained. The stopped cluster was
  moved to Trash; no remote database was connected.
- Former-head CI, Preview, browser, visual, and runtime-log proof remains
  historical. Fresh exact-head remote proof is mandatory after the
  documentation-only evidence seal and before the separate PR #219
  migration/merge/deploy gate.
- No Production, environment, Neon object or row, Search Console access,
  import, publication, lead, message, provider, campaign/budget, WordPress,
  DNS, purchase, deletion, or NellySelly action occurred.
- Full scope:
  `docs/phase9/ORGANIC_SEARCH_INGRESS_QA_EVIDENCE.md`.

## Phase 9 marketing-spend ingress refresh — 2026-08-29

- Draft PR #218 reuses the canonical growth schema, Growth Command Center,
  audited spend ledger, and safe-disabled import gate after exact sealed Draft
  PR #217 `8a6b92039bb82c1158db514c2c2f064ceb9cbbcf`.
- Former PR #218 head `cd087e5c5c0fda82a3175b86b550c966120eb2ab`
  is preserved at
  `rescue/amm-pr218-pre-pr217-exact-seal-20260829-001928`; exact-parent merge
  head is `693af26f3fb536f62784b475cbbebebfde28ff9f`.
- Application, API, migration, and test files merged automatically. Conflicts
  were limited to two additive release-history ledgers; no parser,
  persistence, SQL, route, RBAC, workbench, or browser-test file required
  manual conflict resolution.
- Former-head local, disposable PostgreSQL, CI, Preview, browser, visual, and
  runtime-log proof is historical. Fresh exact-head proof is mandatory before
  the separate migration/merge/deploy gate.
- Exact-parent code-bearing/reconciliation head
  `894643a60bd9fb50b441dccb3d2d3d8e6b5c805b` passes 6 focused files / 47
  tests, all 247 files / 3,184 tests, strict types before and after build, lint,
  optimized 55-page build, 89/17 routes, doctor 43/43, safety 14/14, isolation,
  dependency audit, 651-commit gitleaks, ancestry, whitespace, and focused
  security review on Node 24.18.0.
- A fresh disposable PostgreSQL 17.11 cluster applied 35 migrations and passed
  the transaction, role-denial, immutability, replay, revision, malformed-date,
  identity-conflict, and rollback contract. The stopped cluster was moved to
  Trash; no synthetic row remained before shutdown.
- No Production, environment, Neon object or row, spend, lead, message,
  provider, campaign/budget, WordPress, DNS, publication, purchase, deletion,
  or NellySelly action occurred.
- Full scope:
  `docs/phase9/MARKETING_SPEND_INGRESS_QA_EVIDENCE.md`.

## Phase 9 vendor-ingress contract-lab refresh — 2026-08-28

- Draft PR #217 reuses the existing vendor-neutral normalizer after exact
  sealed Draft PR #216 `211485df28fc818ab783ed357df8486f1460d5e2`.
- Former PR #217 head `d04984b4d162f13c79af261beb55a82f15a86b80`
  is preserved at
  `rescue/amm-pr217-pre-pr216-exact-seal-20260828-234940`; exact-parent
  application head is `e616170657861c3dd83fae43b28bef9cf89506af`.
- Product application files merged automatically. Conflicts were limited to
  additive release-history ledgers; no provider contract, normalizer, route,
  UI, or test file required manual conflict resolution.
- Security review confirmed server-side `growth:manage` enforcement, strict
  same-origin POST handling, bounded JSON, fixed profile IDs, private response
  headers, React escaping, constant-time comparisons, and no database/network
  client or raw-payload/signing-material response. Current first-party Follow
  Up Boss and Google documentation still matches the implemented synthetic
  contract examples.
- Former-head local proof is historical. Exact-parent reconciliation head
  `5721a62f40a0d2c63475ca43608be066dddb018a` passes 6 focused files / 46
  tests, all 242 files / 3,153 tests, strict types before and after build, lint,
  53-page build, 86/17 routes, doctor 43/43, safety 14/14, Ask/Nelly isolation,
  dependency audit, 649-commit gitleaks, ancestry, whitespace, and clean-tree
  proof on Node 24.18.0. Immutable Preview, protected no-write browser, and
  runtime-log proof remain mandatory after the documentation-only seal.
- No Production, environment, database, lead/event, message, provider,
  WordPress, DNS, publication, spend, deletion, or NellySelly action occurred.
- Full scope:
  `docs/phase9/VENDOR_INGRESS_CONTRACT_LAB_QA_EVIDENCE.md`.

## Phase 9 funnel-event identity-integrity refresh — 2026-08-28

- Draft PR #216 reuses the established funnel/session UUID and canonical event
  ledger after exact sealed Draft PR #215
  `c53cec6043525b593b254c457efdbbe5a29c0520`.
- Former PR #216 head `a6098ab4ee7a13d024bafc08264628e2691a8e06`
  is preserved at
  `rescue/amm-pr216-pre-pr215-exact-seal-20260828-231335`.
- Product application code merged automatically. Conflicts were limited to
  additive changelog/QA records and the executable release-authority test;
  PR #216's stronger shared catch-all mutation interceptor remains intact.
- Prior candidate local, CI, Preview, browser, and runtime-log evidence is
  historical. Exact application/parent-refresh head
  `70198a7bb8467ac741b3c0977bd0ed95b8b5dbda` passed 12 focused files / 89
  tests, all 239 files / 3,137 tests, typecheck, lint, 52-page build, 84/17
  routes, doctor 43/43, safety 14/14, Ask/Nelly isolation, dependency audit,
  647-commit gitleaks, and whitespace.
- GitHub gate `33231179999` passed with artifact `9708564416`. Immutable
  Preview `dpl_52wRTaBSYs1d6rGKmtMmetB8V2Cs` is READY at
  `https://ask-magic-mike-h7ylc9by3-eyes-up-industries.vercel.app`.
- Exact-branch protected run `33231584499` passed 17 read-only checks, six
  deliberate mutation skips, 6/6 intercepted browser checks, `GO`, and
  `PREVIEW_READY`; artifact `9708684727` has digest
  `sha256:b48ce2c006ceefd217f6f6e622b7514bb17842be19ec63e7b0a63f38db9e232f`.
- Four desktop/mobile Home Value and Ask PNGs passed manual containment and
  readability review. Direct Preview-log filters returned zero
  POST/PUT/PATCH/DELETE and zero warning/error/fatal records for the protected
  window. The evidence-only seal must repeat proof on its resulting exact head.
- No Production, database, lead/event, message, provider, WordPress, DNS,
  publication, spend, deletion, or NellySelly action occurred.
- Full scope:
  `docs/phase9/FUNNEL_EVENT_IDENTITY_INTEGRITY_QA_EVIDENCE.md`.

## Phase 9 home-value completion-integrity refresh — 2026-08-28

- Draft PR #215 reuses the canonical Home Value funnel and lead command after
  exact sealed Draft PR #214 `81a2c7544318d630437ed3e86cbea029c5c9b57d`.
- Former PR #215 head `2d020358da1d7f95ebf82c47c0f1c0e83d6216d2`
  is preserved at
  `rescue/amm-pr215-pre-pr214-exact-seal-20260828-224229`.
- The parent merge conflicted only in additive changelog, QA-evidence, and
  release-authority records. No funnel, API, lead, notification, provider, or
  analytics application file required manual conflict resolution.
- Exact application/parent-refresh head
  `eff8fc04449fab4fd34cd0fb69735e6787d0b382` passed 236 files / 3,108 tests,
  typecheck, lint, 52-page build, 84/17 routes, doctor 43/43, safety 14/14,
  Ask/Nelly isolation, dependency audit, 646-commit gitleaks, and whitespace.
- GitHub gate `33229869967` and immutable Preview
  `dpl_8qNH7Ry1gSPqdSwHrRNM3Y9LHhZR` passed for that exact head. Protected run
  `33230015801` passed 17 read-only checks, six intentional mutation skips,
  3/3 intercepted browser checks, `GO`, and `PREVIEW_READY`.
- Current-run 1280 × 720, 390 × 844, and 320 × 700 visual checks found no
  horizontal overflow. Empty Continue focused the address input and announced
  a specific inline alert without a lead request.
- Preview logs recorded four page-load telemetry POSTs to `/api/events` and
  `/api/experiments/event`; no `/api/leads`, notification, webhook, message,
  or provider request occurred, and all 49 records were info-level.
- No Production, schema, lead, message, provider, WordPress, DNS, publication,
  spend, deletion, or NellySelly action occurred. The evidence-only seal must
  repeat exact-head CI/Preview proof before the later release gate.
- Full scope:
  `docs/phase9/HOME_VALUE_COMPLETION_INTEGRITY_QA_EVIDENCE.md`.

## Phase 9 lead-alert brand identity v3 refresh — 2026-08-28

- Draft PR #214 reuses the canonical notification renderer, approved Mike/Our
  Town identity assets, existing urgency backgrounds, protected Message Review
  Studio, outbox, and provider controls; it does not create a notification or
  lead system.
- Former PR #214 head `94e3d66190df138d42c1321adfeb0cefb0478545` is
  preserved at
  `rescue/amm-pr214-pre-pr213-exact-seal-20260828-222353`.
- Exact sealed PR #213 parent
  `d2a1bf01d0962e07dd1e460acd4c295e145cf6a8` merged with conflicts limited to
  additive changelog and release-authority records; no alert-renderer
  application file conflicted.
- Prior candidate CI, Preview, and screenshot evidence is historical. Fresh
  exact-head Node 24, immutable Preview, protected no-write, no-send rendered
  acceptance, and deployment-log proof are required before the later gate.
- No Production, database, lead/event, message, provider, WordPress, DNS,
  publication, spend, deletion, or NellySelly action occurred.
- Full scope: `docs/phase9/LEAD_ALERT_BRAND_IDENTITY_QA_EVIDENCE.md`.

## Phase 9 responsive conversion-identity polish — 2026-08-24

- Draft PR #213 reuses the shared public header after exact final Draft PR #211
  `5d566a4a14d4a7cb67175683fdf099e8d62747b7`.
- Focused compatibility/React acceptance: 3 files / 11 tests passed.
- Focused ESLint: passed.
- Full Node 24.18.0 local acceptance: 232 files / 3,082 tests, strict
  TypeScript, full ESLint, optimized Next.js 15.5.21 build with 52 generated
  pages, 83/17 route proof, release safety 14/14, system isolation, no known
  Production dependency vulnerabilities, 596-commit redacted gitleaks scan,
  and whitespace verification all passed.
- The initial remote run correctly rejected one stale Plan-link source-string
  assertion after navigation became data-driven; the contract now asserts the
  exact typed registry destination and label, and the full suite passes.
- Fresh in-app visual/interaction QA passed at 1280×720, 390×844, and 320×700.
- Buyer→Seller path switch, menu auto-close, outside-pointer close,
  Escape/focus return, current-route semantics, no narrow overflow, and zero
  fresh console warnings/errors were observed.
- No field was filled and no lead/event/message/provider/database write was
  created.
- Immutable exact-head Preview and protected no-write proof remain pending
  after the evidence commit; Production remains unchanged.
- The former PR #213 head is preserved at
  `rescue/amm-pr213-pre-final-pr211-cutover-hygiene-20260824-170330`; earlier
  exact-head evidence is historical until the refreshed head is reproved.
- Full evidence:
  `docs/phase9/RESPONSIVE_CONVERSION_IDENTITY_POLISH_QA_EVIDENCE.md`.

## Phase 9 Ask conversion clarity and keyboard access — 2026-08-23

- Production read-only DOM inspection — PASS for evidence collection: `/ask`
  returned its route-specific title, one main landmark, one question field,
  and no framework-error state. The first focusable control was the logo link;
  no skip link was present. No form, prompt, lead, AI request, or event was
  submitted.
- Official mechanism review — PASS: W3C WCAG 2.2 Technique G1 describes a
  first focusable link that bypasses repeated content and moves focus to main
  content; WAI form guidance recommends an associated label, visible required
  instruction, the native `required` attribute, and input bounds that match
  the process.
- Focused Node 24.18.0 verification — PASS: 3 files / 11 tests for shared-
  header focus targeting, Ask field semantics, server-limit parity, all 12
  target surfaces, existing public UX behavior, and home-value validation.
- Full local verification — PASS: 231 files / 3,065 tests, strict typecheck,
  full ESLint, optimized Next.js build with 52 generated static pages,
  83 active / 17 acknowledged routes, release safety 14/14, and Ask Magic Mike
  / NellySelly isolation. Production dependency audit reports no known
  vulnerability; redacted full-history gitleaks scans 574 commits with no
  leak.
- Screenshot evidence — unavailable, not inferred: browser capture timed out
  on `/`, `/ask`, and a neutral control page. No blank, partial, stale, or
  indirect screenshot was accepted.
- Exact-head protected Preview — PASS for narrow rendered contracts on
  2026-08-24 at commit `af22494d96bc3fe1ec930a24f350e4b3e863fe2f`:
  route/title/content loaded, the focused skip control rendered inside the
  viewport with an explicit outline and focus shadow, activation focused
  `#page-content`, empty native validation generated no `/api/*` request,
  390x844 geometry had no horizontal overflow, and the inspected console had
  no warning or error. Screenshot-level visual acceptance and full-WCAG claims
  remain explicitly unproven because both integrated and operating-system
  capture paths failed to return a usable frame.
- External-state boundary — PASS: no database migration/read/write, lead,
  analytics event, AI/provider request, email/BCC, SMS, Push, consumer
  acknowledgment, WordPress edit, publication, DNS change, spend, deletion, or
  NellySelly action occurred.

## Phase 9 completed-release ledger integrity — 2026-08-24

- GitHub authority — PASS: PRs #183, #184, #185, #193, #196, #194, and #195
  are merged; their authenticated `headRefOid` and `mergeCommit` values match
  the corrected owner queue exactly.
- Vercel authority — PASS: each corresponding deployment ID resolves in the
  canonical `eyes-up-industries/ask-magic-mike` project as `READY`, target
  `production`, branch `main`, and the exact GitHub merge SHA.
- Defect corrected — PASS: the former PR #195 reviewed-head literal
  `db13953071aa5dca59b74b671c2ed4592c53494f` did not match GitHub; the queue
  now records `db13953fc5f6d24a684f66c9a1c10c6b929b72b3`.
- Historical completeness — PASS: PRs #183 through #185 now include the same
  head → merge → Production-deployment chain already recorded for later
  releases.
- Regression contract — PASS: the focused Node 24 release-authority suite
  requires all seven exact chains and rejects the incorrect PR #195 literal.
- Rescue and non-action boundary — PASS: pre-change PR #209 head
  `d0691a6938afa67c22c4e1bc0adc322963fa2d55` is preserved remotely at
  `rescue/amm-pr209-pre-release-ledger-integrity-20260824-0605`. No Production,
  environment, database, lead/event, message, WordPress, DNS, publication,
  spend, deletion, or NellySelly change occurred.

## Phase 9 field-experience fast-track — 2026-08-23

- Source preservation — PASS: donor PR #199 exact head
  `7690e54b3c1d225d09ab8838774c4ac9c6316cce` is preserved at
  `rescue/amm-pr199-pre-fast-track-20260823-175922`; the new branch starts at
  canonical PR #205 exact head
  `b9bbf61e60d94e980ea2453560966e1730655592`. No donor branch was rewritten.
- Scope isolation — PASS: only the 18-file field-experience application,
  tests, and focused specifications were imported. PR #187's migration,
  target register, numeric KPI UI, stale release evidence, and unrelated stack
  remain excluded.
- Privacy hardening — PASS: the API revalidates exact canonical Production
  origin, bounded metric/value/path/device dimensions, and a coarse normal-
  browser class. Lead/session identity, attribution, click IDs, queries, raw
  URLs, raw agents, IPs, cookies, tokens, and raw metric IDs are absent from the
  durable contract; metric IDs become deterministic domain-separated SHA-256
  digests before persistence.
- Focused Node 24.18.0 contracts — PASS: 5 files / 29 tests cover route
  normalization, open-house identifier collapse, value/rating bounds, raw-ID
  digesting, exact-origin enforcement, QA/automation/private-route suppression,
  actual reporter payload minimization, API persistence truth, aggregate P75,
  deduplication, and unavailable-state rendering.
- Full local acceptance — PASS: 226 test files / 3,031 tests, strict
  typecheck, full ESLint, optimized Next.js 15.5.21 build with 52 static pages,
  83 active / 17 acknowledged route proof, release safety 14/14, system
  isolation, and Production dependency audit with no known vulnerability.
- Clean-tree release doctor — PASS: 43/43 after application commit
  `1954f8ee63f0de40c5c7326f34b7acf6be94cf27`; safety remains 14/14.
- Exact-application-head Node 24 CI — PASS: GitHub run `32669693059` completed
  successfully against `1954f8ee63f0de40c5c7326f34b7acf6be94cf27`.
  Artifact `9501059810` has digest
  `sha256:9192efec527ad360ac349feb495703778d6a58c88b1e69afb68dfd25413c6d59`.
- Immutable Vercel Preview — PASS: deployment
  `dpl_8LnG6VoGbskJpERDGXbf7YNDHDCL` is READY at
  `https://ask-magic-mike-e2x6qk1os-eyes-up-industries.vercel.app`; the
  authenticated deployment record names the exact branch and application
  commit `1954f8e`. Preview cannot render or persist the reporter because
  `VERCEL_ENV=preview`.
- Protected no-write runtime acceptance — PASS: GitHub run `32669923014`
  completed 17 read-only passes, six intentional mutation skips, zero
  failures, Widget browser E2E 2/2, release doctor 43/43, safety 14/14,
  release-candidate GO, and `PREVIEW_READY`. Artifact `9501125995` has digest
  `sha256:b621ef368072a69ca2592cd173300e23a91f0226b93deca45b220c686913d9fd`.
  Preview Neon was reachable and schema-ready while `SAFE_DB_WRITE=false`;
  live email and SMS were disabled.
- Optimized-build responsive visual acceptance — PASS at 1440x1000 and
  390x844. Both renders have one main landmark, document width equal to the
  viewport, no clipping/overflow/framework overlay, truthful field-evidence-
  unavailable copy, zero `/api/events` requests, and zero browser
  warnings/errors. The inspected screenshots are intentionally gitignored at
  `output/playwright/phase9-field-experience-fast-track/growth-desktop-1440x1000.png`
  and
  `output/playwright/phase9-field-experience-fast-track/growth-mobile-390x844.png`.
- Preview runtime-log review — PASS: the latest 500 request records contain
  only `info` entries (200=200, 202=270, 204=20, and expected protected-route
  401=10); separate fatal, error, and warning queries each returned zero.
- No migration or runtime mutation — PASS: no database migration, Production
  deployment, analytics write, lead, email, SMS, Push, WordPress edit,
  publication, DNS change, spend, deletion, or NellySelly action occurred.
  Final documentation-head checks are recorded on Draft PR #206 so this
  evidence seal does not create a recursive commit loop.

## Phase 9 owned-traffic fast-track — 2026-08-23

- Production aggregate audit at 20:23 UTC — read-only PASS: 6 total leads, all
  6 unmistakably test/suppressed; 0 live or contactable leads; 0 unsafe tests;
  0 live notifications, outcomes, revenue, first-response samples, spend rows,
  experiments, or non-test owned-demand publication proofs. No PII or database
  credential entered repository files or command output.
- Reuse-first consolidation — PASS: only the reviewed unique PR #197
  attribution-trust commit and PR #198 WordPress-manifest commits were applied
  to exact sealed PR #204 head. Rescue branch
  `rescue/amm-pre-owned-traffic-fast-track-20260823-1625` preserves the base.
  No database migration is present.
- Exact Node 24.18.0 local acceptance — PASS: 3 focused files / 36 tests; full
  223 files / 3,011 tests; strict typecheck; ESLint; optimized Next.js 15.5.21
  build with 52 static pages; 83 active / 17 acknowledged route proof; release
  safety 14/14; release doctor 43/43; system isolation; and Production
  dependency audit with no known vulnerability.
- Public WordPress transport check — PASS at 20:36 UTC: published page index,
  page-149 record, and homepage returned HTTP 200 with expected JSON/HTML
  content types. The page index reported 42 published pages.
- Actual server-runtime manifest audit — PASS at
  `2026-08-23T20:37:18.057Z`. The bundled Node server implementation performed
  GET-only public fetches through exact-host HTTPS allowlists and returned:
  - `wordpress_homepage_ask_mike`: page 149, modified
    `2026-06-01T20:53:21`, one current/rollback href, one canonical proposed
    href, zero lookalikes, precondition
    `8634d945fb0ccdb2b556bdc66e31b199cb0d5b4e9c95991fc5e2c00307884dc3`;
  - `wordpress_home_value`: page 3952, modified
    `2026-06-06T02:10:06`, one current/rollback href, one canonical proposed
    href, zero lookalikes, precondition
    `7487f7e499a67e0a047cb9d141048f98ec927f84a98cec6ba1fc058efb716fe7`;
  - `wordpress_we_buy_homes`: page 3631, modified
    `2026-06-03T21:32:21`, one current/rollback href, one canonical proposed
    href, zero lookalikes, precondition
    `e8c3cdb946c1f0a12dfe331495b94c744e99c39410d9feb71e1ed484fb4eb4a3`.
- All three returned `legacy_match_ready`, no blockers,
  `publicationAuthorized=false`, and `mutationPerformed=false`. No WordPress
  login, cookie, nonce, revision, edit, cache purge, form submission, lead,
  analytics write, notification, publication proof, or external message was
  created.
- The manifest transport uses fixed approved hosts, manual redirect
  revalidation, a 20-second timeout, content-type checks, streaming 3 MB cap,
  and transient raw HTML. The protected download route is GET-only,
  placement-allowlisted, server-authorized with `report:view`, private/no-store,
  noindex, same-origin, and never renders or logs raw page HTML.
- Responsive optimized local Production render — PASS at 1440×1000 and
  390×844. Both viewports rendered one main landmark, exact document/viewport
  width, three protected readiness-manifest links, truthful measurement-
  unavailable copy, and zero console warnings/errors. The deliberately
  database-unconfigured/RBAC-disabled local inspection runtime rendered zero
  writable forms; the browser request ledger contained only GETs and no
  POST/PUT/PATCH/DELETE request.
- Focused visual inspection — PASS: approved existing portraits and Black
  Diamond styling remain intact; the Our Town WordPress card spans the desktop
  command grid; mobile changes to one column without clipping; tracked URLs
  wrap; and all three manifest controls remain visible, distinct, and usable.
  Gitignored evidence:
  `output/playwright/phase9-owned-traffic-fast-track/distribution-desktop-1440x1000.png`,
  `distribution-mobile-390x844.png`,
  `wordpress-manifests-desktop-1440.png`, and
  `wordpress-manifests-mobile-390.png`.
- PR #205 now includes refreshed PR #204 head
  `bd16a115af9f4b17dccab0bb7dad41682816be5d` through clean ordered merge
  `52a9b31cbab8da2e2ac251fe483bbbbd9a3f34e8`; the prior sealed head is
  preserved at `rescue/amm-pr205-pre-pr204-refresh-20260823-173028`. Fresh
  exact-head remote proof is required and recorded in PR #205.
- Superseded pre-refresh remote application-head acceptance — PASS. GitHub Node 24 run
  `32665394864` completed successfully against exact SHA
  `a1e8a4940f8d9eefe21bc6f43514e2e4941e8e31`; Vercel deployment
  `dpl_5AWNXqLf5k9Gc8UEqK2hA1AHiLFH` is READY, target Preview, Node 24, and
  records the same SHA and PR at
  `https://ask-magic-mike-pv8mtuv39-eyes-up-industries.vercel.app`.
- Protected exact-head run `32665666025` — PASS in 3m45s with
  `SAFE_DB_WRITE=false`: 17 read-only passes, 6 intentional mutation skips, 0
  failures; Widget browser E2E 2/2; doctor 43/43; safety 14/14; release
  candidate GO; launch verdict `PREVIEW_READY`. Artifact `9499989400` digest:
  `sha256:797352c0262fd03078a5ce9e5c4b422518bb052eece95bab4d908477c1e4e365`.
- Preview health reported exact commit `a1e8a49`, Preview Neon, mutation safety
  false, and live email/SMS disabled. Direct public root, home-value, and both
  health endpoints returned HTTP 200. Anonymous `/admin/distribution` returned
  HTTP 401 with no-store, Basic challenge, SAMEORIGIN, and noindex controls.
- Preview `LEAD_CENTER_RBAC_ENABLED` is false. The manifest route therefore
  returned HTTP 409 `rbac_not_enabled` before any WordPress fetch, for both a
  valid and unknown placement. Authorized synthetic `report:view`, denied,
  unknown-placement, headers, and no-fetch-before-auth contracts pass the
  isolated route suite. Perform one authenticated runtime download only after
  the ordered stack reaches an RBAC-enabled environment and before any
  separately approved WordPress publication.
- Vercel deployment-log queries since creation returned fatal=0, error=0, and
  warning=0. No lead, database write, form submission, notification, email,
  SMS, Push, WordPress mutation, publication proof, provider action, DNS
  change, spend, deletion, or NellySelly action occurred.

## Phase 9 conversion-journey fast-track live audit — 2026-08-23

- Browser: Chromium-compatible Playwright CLI at 390×844 against canonical
  Production.
- Before navigation, mocked /api/leads, /api/events,
  /api/experiments/event, /api/widget/events, Google Analytics/GTM, and
  Facebook collection requests. No lead, durable application event, provider
  message, or third-party analytics write was permitted.
- Homepage rendered one main landmark, correct brokerage identity, working
  public paths, and zero console warnings/errors. The existing Home Value
  intake advanced from synthetic address to required name/email without a lead
  request.
- Buyer page rendered required consent and the existing form. Blank submit
  displayed “Add an email or phone number so Mike can follow up,” made no lead
  request, but retained focus on “Request Buyer Plan.” This is direct current
  Production evidence for the recoverability fix already implemented in PR
  #200.
- Exact Node 24 fast-track acceptance passes 4 focused files / 42 tests and the
  complete suite, strict typecheck, ESLint, optimized
  build with 52 static pages, 82/17 route proof, system isolation, release
  safety 14/14, dependency audit, diff/migration integrity, and staged redacted
  secret scan.
- Optimized local Buyer and Renter acceptance at 390×844 confirms one main, no
  horizontal overflow, zero console warnings/errors, first and repeated Email
  focus recovery, exact `renter_page` payload identity, immutable Buyer first
  touch, and refreshed Renter last touch. Every lead/event request was mocked.
- PR #203 now includes final PR #202 head
  `37aa69421a70a177504e9ccaed99fef75852849e` through clean merge
  `3b5aef0aea2254c4b410393bb84ad1e1b61b7510`; the previous head is preserved
  at `rescue/amm-pr203-pre-pr202-refresh-20260823-173028`. Fresh exact-head
  remote proof is required and is recorded in the PR rather than inferred from
  the following superseded evidence.
- Superseded pre-refresh Draft PR #203 application head
  `a86eece1f2b18ceb064d109912c5b77314d2aca9` passes GitHub Node 24 release run
  `32660966818` and Vercel Preview `dpl_DQUyVzLXPmvyjghqUVzPtqoDuHcq` is READY
  at `https://ask-magic-mike-a0x610tpg-eyes-up-industries.vercel.app`. The
  deployment build log names that exact branch and commit.
- Protected no-write run `32661259833` passed 17 read-only checks with six
  intentional write skips and zero failures, Widget 2/2, release doctor 43/43,
  safety 14/14, release candidate GO, and `PREVIEW_READY`. The machine-readable
  artifact is `9498840303` with digest
  `sha256:9130e7665cabdce978543e594288587f2fc59095d5999524fb7d70cf4727a034`.
  Preview runtime log queries returned fatal=0, error=0, warning=0.
- No form completion, consent acceptance, lead submission, database write,
  email, SMS, Push, WordPress edit, publication, DNS change, spend, deletion,
  or NellySelly action occurred.
## Phase 9 conversion identity polish — 2026-08-22 15:17 EDT

- Current Production seller, buyer, and Ask paths were captured in the in-app
  browser with internal-QA attribution and no lead submission.
- The existing home-value Contact step now captures name and email; invalid
  fields receive focus and uniquely own the inline error description.
- Consumer footer navigation excludes internal preview/integration routes.
- The screenshot helper intercepts `/api/leads`, `/api/events`, and
  `/api/experiments/event`; visual QA cannot persist a lead, trigger
  notifications, or write analytics/experiment evidence.
- Focused verification: 4 files / 11 tests — PASS.
- Full local release gate: 214 files / 2,930 tests, typecheck, lint, optimized
  build, 82 active routes, 14/14 safety, and system isolation — PASS.
- Production dependency audit: no known vulnerability. Candidate text secret
  scan: no leak. `git diff --check`: PASS. Migration scan: empty.
- Full evidence:
  `docs/phase9/CONVERSION_IDENTITY_POLISH_QA_EVIDENCE.md`.
- No Production deployment, migration, database write, lead, email/BCC, SMS,
  Push, consumer acknowledgment, provider call, WordPress edit, publication,
  spend, DNS, or NellySelly action occurred.
## Phase 9 WordPress activation change-set evidence — 2026-08-22

- Dependency composition — PASS: PR #197 exact head
  `0fff501b550b12bda860570b1c74bdbdab0b2888` merged without application-code
  conflict after PR #198 head `808021468e1910e1d88f071575fd5e73c991d085`
  was preserved at
  `rescue/amm-pr198-pre-pr197-stack-refresh-20260822-2247`. Only four cumulative
  evidence documents required manual reconciliation.
- Final read-only live loader acceptance at 21:40 America/New_York — PASS. The exact
  public homepage, established home-value page, We Buy Homes page, and public
  WordPress page index were fetched through exact-host HTTPS allowlists. All
  three manifests reported `legacy_match_ready`, their reviewed page IDs
  (149, 3952, and 3631), one current/rollback href, one canonical proposed
  href, deterministic SHA-256 evidence, `publicationAuthorized=false`, and
  `mutationPerformed=false`.
- Final hardening acceptance — PASS: malformed index rows without explicit
  `publish` status are ignored, every ambiguity/lookalike count changes the
  precondition hash, and chunked upstream bodies are cancelled before exceeding
  the 3 MB cap.
- Isolated route execution — PASS: an authorized synthetic principal received
  the bounded private JSON attachment; unauthorized and unknown-placement paths
  retained privacy headers and performed no public WordPress fetch.
- Focused WordPress/change-set matrix — PASS: 4 files / 42 tests. Coverage
  includes exact legacy and already-canonical states; duplicate, missing,
  foreign, insecure, lookalike, page-ID drift, and page-index failures; raw
  HTML/telephone exclusion; deterministic hashing; API RBAC/no-store headers;
  existing surface-audit compatibility; and database placement-registry parity.
- Final stacked local release gate — PASS: system isolation, 14/14 safety
  controls, 217 test files / 2,967 tests, strict TypeScript, full ESLint,
  optimized Next.js
  15.5.21 build, and 83 active routes / 17 acknowledged root-source
  duplicates. The new route is explicitly required and classified in the
  canonical route manifest.
- Strict TypeScript check — PASS in the local shell. The repository requires
  Node 24; exact-head Node 24 CI remains the authoritative engine result after
  push because this local shell is Node 26.5.1.
- Focused ESLint initially found one unnecessary regex escape; it was corrected
  before final verification. No behavior or security boundary was relaxed.
- No login, WordPress write, page revision, cache purge, form submission, lead,
  notification, publication proof, database read/write, external send, DNS
  change, Production deployment, spend, deletion, or NellySelly action occurred.
- Production dependency audit — PASS: no known vulnerability. Working-tree
  gitleaks scanned approximately 65.35 KB of the unique candidate delta with no
  leak; candidate-pattern, diff-integrity, and empty migration scans passed.
- Rendered no-write acceptance — PASS: lead, durable event, and experiment
  routes were intercepted before navigation. The protected Distribution Command
  rendered three readiness links at 1440×1000 and 390×844, one `main`, truthful
  unavailable values, no horizontal overflow or framework overlay, and zero
  console errors/warnings. Application requests were GET-only. The named
  brokerage placement card now spans the desktop command grid and retains its
  single-column mobile stack.
- Whole-site WordPress public-surface audit — PASS as a read-only check: 42/42
  sitemap pages fetched, zero failed. It reconfirmed exactly three incomplete
  direct canonical links, two incomplete embeds, four legacy native-capture
  pages, five multi-capture pages, and Form 3 as the only supplied canonical
  bridge allowlist. These are preserved audit findings, not permission for a
  bulk cleanup.
- Exact-head Node 24 CI, canonical Vercel Preview, protected route, and rendered
  UI acceptance remain required after push before this becomes release
  authority.
## PR #193 released-main privacy audit — 2026-08-22

- Rebased/refreshed the candidate onto released PR #185 merge
  `44a7483400bdb9b4a10ecdf0883edc4bf96d4ab8`; `origin/main...HEAD` contains 46
  candidate files and no database migration.
- Confirmed anonymous Production `/admin/growth?window=90` redirects to
  `/lead-center-login?error=session`; no Growth evidence renders without a
  valid Lead Center session. The page itself also requires `report:view`, is
  force-dynamic, and reads canonical Neon server-side only.
- Confirmed the exact refreshed Preview root renders the Ask Magic Mike/Our
  Town identity and conversion controls. Vercel deployment protection returns
  an authentication redirect for anonymous protected requests, and the Preview
  application fails closed to read-only mode when explicit mutation enablement
  is absent.
- Manual threat review found that slug syntax alone could still accept a
  single-token name or slugified address as a public campaign dimension. The
  boundary now requires a registered source/medium/campaign/placement value,
  drops unregistered values, and reduces dynamic open-house identifiers to the
  generic `open-house` class. The protected lead record remains the full
  attribution source of truth.
- Focused registered-attribution/privacy/API verification: 7 files / 40 tests,
  all passed. Final exact-head Node 24 CI, Preview QA, dependency/secret scan,
  visual acceptance, and release evidence are attached to PR #193 after push.

## Historical PR #185 continuation readiness audit — 2026-08-22

- Reconfirmed that current Production remains PR #184 merge
  `f5f82f1bfaadea0ed20da50738ebc1f83e8dab97` on Ready deployment
  `dpl_ANYodUJ7VcceRRDAfpX6APkSKUcW`, with the `www` root returning HTTP 200,
  apex redirecting HTTP 308 to `www`, `/home-value`, `/buy`, public liveness,
  and the Our Town homepage returning HTTP 200.
- Reconfirmed PR #185 contains current Production. Final UI-to-Neon tracing
  then found that its accepted `ourtown_wordpress` tuples exceeded the released
  ledger constraints. PR #185 now includes the additive constraint-only
  `20260822195000_owned_demand_wordpress_proof_scope.sql` repair. Earlier
  application-only head evidence is regression history, not release authority
  for the repaired head.
- Traced the complete candidate story: authenticated Distribution Command to
  existing Neon aggregate/proof reads, deterministic activation state, protected
  allowlisted feed/story/QR exports, and fixed canonical UTM shortlinks. The
  candidate contains no publisher, provider send, lead submission, WordPress
  mutation, spend, or NellySelly action.
- Fresh focused verification passes 6 files / 61 tests. Fresh full local release
  verification passes system isolation, 14/14 release-safety checks, 205 files /
  2,866 tests, strict typecheck, ESLint, optimized Next.js 15.5.21 build, and the
  80-route manifest. The exact-head GitHub Node 24 gate remains the authoritative
  engine result because the local shell runs Node 26.5.1.
- `pnpm audit --prod --audit-level high` reports no known vulnerability;
  `git diff --check` passes; and redacted `gitleaks git` scans 504 commits /
  approximately 14.08 MB with no leak.
- Runtime headers preserve private/no-store, noindex, frame, and content-type
  boundaries on the protected command. Asset exports require server-side
  `report:view`; shortlinks accept no arbitrary destination; publication-proof
  writes remain behind server-side `growth:manage`, explicit confirmation,
  runtime validation, parameterized SQL, and the Preview mutation guard.
- Release-path asset probe found one missed boundary: the renter export source
  returned HTTP 404 on current Production because it was a branch-only JPEG,
  while the route deliberately renders from the canonical host. Fix
  `9a8baf935a7a68cda528ec4aee90b7cfcf5e87fc` reuses the equivalent approved PNG
  already returning HTTP 200 in Production and corrects the renderer fixture's
  PNG MIME type. The focused Node 24 matrix passes 5 files / 46 tests, including
  all four offer types in both feed and story formats.
- The first exact-head protected Preview run passed all endpoint and browser
  checks but exposed a workflow-integrity defect: direct Preview QA omitted
  release doctor, and neither Preview workflow asserted the generated launch
  verdict. The workflow is now required to run doctor before authority and to
  assert exact `PREVIEW_READY`; a regression test covers both dispatch paths.
- After that correction, the full local gate passes 206 files / 2,868 tests,
  strict typecheck, ESLint, optimized Production build, 80-route verification,
  system isolation, and 14/14 safety controls.
- After the retained-asset correction, the complete local gate was rerun under
  Node 24 and passes 206 files / 2,869 tests, strict typecheck, ESLint,
  optimized Production build, 80-route verification, system isolation, and
  14/14 safety controls. Production dependency audit reports no known
  vulnerability; gitleaks scans 511 commits / approximately 14.11 MB with no
  leak; all three canonical creative source URLs return HTTP 200 with image
  content. Exact-head Node 24 release run `32588096247`, Ready Preview
  deployment `dpl_83UZ6iisUUWK1LyGdTahkQvAiF2Y`, and protected Preview QA run
  `32588280489` pass. The protected run records 16 pass / 6 intentional write
  skips / 0 fail, 2/2 browser checks, 43/43 doctor checks, and strict
  `PREVIEW_READY` launch authority.
- No Production deployment, database read/write beyond public liveness,
  publication proof, lead, email/BCC, SMS, Push, external post, WordPress edit,
  DNS change, provider action, spend, deletion, or NellySelly action occurred.

The migration, executable PostgreSQL 17, runner, compatibility, and security
evidence for the repaired boundary is maintained in
`docs/phase9/OWNED_DEMAND_WORDPRESS_PROOF_SCOPE_QA_EVIDENCE.md`. Exact-head
GitHub/Vercel evidence is attached to PR #185 after push.

Status: production funnel, Neon persistence, routing, suppression, outbox, and
provider delivery are verified. No synthetic record is represented as a live
prospect.
All timestamps are America/New_York unless noted.

## PR #194 released-base phone handoff acceptance — 2026-08-22

- PR #193 was approved and released as main merge
  `9b82afb609674bb0209b73f8ac9622ab02733e2a`; Production acceptance passed on
  deployment `dpl_HkKHY5nF8DeF5azY1CuHAbHGNp3a` with no migration.
- PR #194 was refreshed onto that released baseline. Its prior exact state is
  preserved at `rescue/amm-pr194-pre-pr193-refresh-20260822-1841`; the
  released-base code head is `d5da4bd8ac4b0235e140ac785d46824a198292d8`.
- Unique candidate delta: 37 files, 1,440 insertions, 159 deletions, and no
  database migration. Focused verification passes 8 files / 58 tests.
- Exact Node 24 release run
  [32603258868](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32603258868)
  passes 214 files / 2,939 tests, strict typecheck, ESLint, 14/14 safety checks,
  and the optimized 82-route Next.js 15.5.21 build.
- Canonical Preview deployment `dpl_HErSvZNK89Wh79rbi71KAZhqKdq1` is Ready at
  `https://ask-magic-mike-b0vzgy747-eyes-up-industries.vercel.app` and contains
  exact code head `d5da4bd8ac4b0235e140ac785d46824a198292d8`.
- Protected Preview QA run
  [32603437125](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32603437125)
  passes on Node 24: 17 HTTP checks, six intentional write skips, zero failures,
  two expected browser tests, 43/43 doctor checks, and strict `PREVIEW_READY`.
  `SAFE_DB_WRITE=false`; live email/SMS are disabled; no invite, claim, lead,
  notification, device registration, or database write occurred.
- Production dependency audit reports no known vulnerability; candidate
  patch-integrity, gitleaks, and migration scans pass. The entries above are
  the released-PR193 checkpoint.
- Final PR #194 head `851ebe530ac6a91a4e410f26538d29c1bf43f1c6`
  subsequently passed run `32606142473`, Preview
  `dpl_7nhaV5tpS4YArtgKVV9PfVBRHq4H`, and protected run `32606286620`, then was
  merged as `5a3c5c7f2463ea399c21b616ff249f6c67e156b6` and accepted on Production
  `dpl_3FWSKSu9jXvC2FTPuojVpt8mgm8J`. Physical enrollment and a `[TEST]` Push
  remain separately gated.

## Historical pre-released-base phone handoff evidence — 2026-08-22

- Post-refresh security audit — PASS: PR #194 now contains exact PR #193 head
  `008f1faa95d98058199ec01534ee39b474d2a3b2`; the immediately preceding state
  is preserved at `rescue/amm-pr194-pre-pr193-final-refresh-20260822-1412`.
- Replay-boundary repair — PASS at code-bearing commit
  `b62957ba5f66f98808a9e31536615ab6ea1cbee4`: the bearer invite and HttpOnly
  setup session are distinct signed token kinds. A raw invite pasted into the
  cookie slot is rejected, the one-time durable claim remains authoritative,
  and the installed manifest is limited to `/phone-alerts/`.
- Scoped-authority repair — PASS at code-bearing commit
  `afc68b4060122481701514d0b2fe8630735aad8a`: copy enrollment cannot relabel a
  primary endpoint; RBAC-enabled deployments reject the legacy secret-header
  invite route; and the optional setup QA Push is a durable Production
  one-shot per session/subscription.
- Portable Production fail-closed repair — PASS at code-bearing commit
  `f979d808fd76a1dba82b0a7f2b922f04c75af483`: both invite claim and optional
  QA Push now require their durable
  guards on Vercel Production and on owned/self-hosted Production when Vercel
  metadata is absent; Preview remains separately identified and non-mutating.
- Fresh focused matrix — PASS: 9 files / 61 tests. Fresh full local release
  gate — PASS: system isolation, 14/14 safety controls, 213 files / 2,929 tests,
  strict typecheck, ESLint, optimized Next.js 15.5.21 build, and 82 active
  routes. `pnpm audit --prod --audit-level high` reports no known vulnerability;
  a redacted full-history scan of approximately 14.14 MB found no leak;
  candidate and migration scans are clean.
- The exact Node 24, Preview deployment, protected QA, and rendered screenshots
  listed below are the pre-refresh checkpoint. They prove the original handoff
  but are not authority for the repaired final head; fresh exact-head evidence
  is mandatory before PR #194 can leave Draft.
- Reuse/overlap audit — PASS: historical PR #179 was compared against the
  verified PR #193 stack. Only its unique iPhone Home Screen cookie-context
  handoff was refreshed; obsolete stack authority and duplicate docs were not
  imported. Rescue ref:
  `rescue/amm-pre-phase9-phone-handoff-consolidation-20260822-1130`.
- Pre-refresh focused phone/origin/Preview matrix — PASS: 8 files / 84 tests covering signed
  expiry, exact Production and exact configured Preview origins, Our Town and
  NellySelly rejection, private manifest metadata, token cleanup, durable
  one-time claim, replay denial, matching installed-app reopen, Production
  fail-closed behavior, setup UI, robots, and non-redemptive Preview QA.
- Pre-refresh `pnpm release:gate` — PASS on local Node 26.5.1: Ask Magic Mike/NellySelly
  isolation, 14/14 release-safety controls, 210 test files / 2,907 tests,
  strict typecheck, ESLint, optimized Next.js 15.5.21 build, and 82 active
  routes / 17 acknowledged root–`src` duplicates. The project declares Node
  24.x, so exact Node 24 GitHub evidence remains required on the PR head.
- `pnpm run typecheck`, `pnpm run lint`, `pnpm run release:doctor`, and
  `pnpm run release:safety` — PASS. Before commit, the doctor reported only the
  expected non-blocking dirty-worktree diagnostic; every blocking check passed.
- Supply-chain and secret review — PASS: `pnpm audit --prod --audit-level high`
  found no known Production dependency vulnerability; `gitleaks git --redact
  --no-banner` scanned 501 commits / 14.02 MB with no leak; the staged 45.74 KB
  candidate scan found no leak.
- Diff and migration review — PASS: `git diff --cached --check` is clean and
  the exact staged file list contains no SQL or migration path. The one-time
  guard reuses the existing HMAC-pseudonymized Neon rate-limit table.
- Rendered browser QA — PASS in a local no-provider/no-database harness. The
  approved Mike portrait and existing black/gold/cyan system rendered at
  390×844 and 1440×1000 with zero browser errors, no horizontal overflow, clear
  role/device/expiry state, four install steps, and visible bearer-link warning.
  Invalid-token rendering truthfully states that no phone was registered and no
  notification was sent. Gitignored evidence:
  `output/playwright/phone-handoff/install-390x844-v2.png`,
  `output/playwright/phone-handoff/install-1440x1000-v2.png`, and
  `output/playwright/phone-handoff/expired-390x844.png`.
- Preview automation was tightened before dispatch to use only an invalid
  synthetic token; it does not mint or redeem a bearer token or touch a durable
  rate-limit bucket. No Production/Neon write, migration, lead, device
  registration, email, SMS, Push, WordPress/DNS/provider action,
  external publication, spend, deletion, or NellySelly action occurred.
- Protected-Preview CLI hygiene — a `vercel curl` attempt from the isolated
  unlinked worktree auto-created empty helper project
  `prj_Mb30U4zzULbWox6TPJ0QlJ4cVYSY`. Read-only inspection proves zero
  deployments, empty targets/aliases, and no custom domain. The worktree was
  immediately relinked to canonical project
  `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`; the empty helper is preserved for a
  separate cleanup approval. No canonical setting, deployment, alias, domain,
  environment variable, or Production resource changed.
- Draft PR #194 code-bearing head
  `450e17bc3fe659b31682832ad97e659380e74136` — PASS: exact Node 24
  `local-release-gate` run
  [32583239916](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32583239916)
  completed in 2m27s; GitHub reports the PR CLEAN/MERGEABLE.
- Canonical Vercel Preview — PASS: deployment
  `dpl_9YpLm3EGtF1qPuCDCwhXpgMCKu8Y` is Ready at
  `https://ask-magic-mike-mby366s98-eyes-up-industries.vercel.app` and contains
  exact commit `450e17bc3fe659b31682832ad97e659380e74136`.
- Protected Preview QA — PASS: workflow
  [32583352634](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32583352634)
  completed in 3m26s on Node 24. The release doctor passed 43/43; HTTP QA passed
  17 with six expected mutation skips and zero failures; widget E2E passed two
  expected tests with zero unexpected/flaky/skipped; release-candidate verdict
  was GO and the strict launch-authority assertion reached `PREVIEW_READY`.
- The phone probe returned the expected private HTTP 404 manifest rejection and
  passed no-store/no-referrer/noindex plus truthful invalid-page copy using only
  `preview-qa-invalid-token`. `SAFE_DB_WRITE=false`, `FORCE_DB_WRITE=false`,
  and the mutation gate remained blocked. No invite or claim route was called.
- Runtime log review found no error-level records. The only 5xx was the expected
  authenticated SLA-cron HTTP 503 `preview_data_disabled`, which proves Preview
  writes were refused.
- Still required: release #185, refresh/release #193, then refresh PR #194 onto
  the exact predecessor and repeat final-head CI/Preview before considering
  `APPROVE PHASE 9 IOS PHONE HANDOFF MERGE AND PRODUCTION DEPLOYMENT`.
  Physical enrollment and a `[TEST]` Push remain separate actions.

## Phase 9 privacy and KPI-trust consolidation — 2026-08-22

- Boundary review — PASS at checkpoint: the candidate is stacked on PR #185
  exact final head `24be0afef1d836ee6eb9fd912d5a1afe6b677ea7`, includes no migration,
  and excludes PR #187's target register and parallel release authority.
- Focused regression matrix — PASS: 12 files / 103 tests covering
  HMAC limiter identifiers, stale-bucket pruning, public analytics event and
  property boundaries, body/origin validation, repository defense in depth,
  durable-write acknowledgment, controlled-slug attribution, script-safe
  JSON-LD, aggregate Growth outcomes/delivery, false-zero failure handling,
  protected health output, and inherited fail-closed Preview authority.
- `pnpm release:gate` — PASS on local Node 26.5.1: Ask Magic Mike/NellySelly
  isolation, 14/14 release-safety checks, 210 test files / 2,901 tests, strict
  typecheck, ESLint, optimized Next.js 15.5.21 build, and 80 active routes / 17
  acknowledged root–`src` duplicates. The repository declares Node 24.x, so
  exact Node 24 GitHub evidence remains required.
- `pnpm typecheck` — PASS both independently and inside the release gate after
  the aggregate Growth panel and route/privacy adaptations.
- Security source review — PASS at checkpoint: raw limiter identifiers and
  secrets are absent from Neon parameters; public analytics cannot attach lead
  or agent IDs; public notification lifecycle events are rejected; final
  persistence re-sanitizes dimensions and stores only a coarse user-agent class;
  both public routes await the canonical write and fail HTTP 503 when it is
  unavailable; free-form attribution names/addresses are dropped; all JSON-LD
  scripts use the shared escaping serializer; Growth SQL selects aggregate
  counts without recipient references or contact fields.
- `pnpm audit --prod --audit-level high` — PASS: no known Production dependency
  vulnerability.
- `gitleaks git --redact --no-banner` — PASS: 511 commits / approximately 14.11
  MB scanned with no leak. A supplementary pattern scan found only unmistakable
  test literals and documented placeholder syntax.
- `git diff --check` and base/staged migration scans — PASS: no whitespace
  error and no migration in the candidate.
- Historical pre-refresh PR #193 code-bearing head
  `6035131e394f3fa057acf662a204889743a69327` passed exact Node 24 GitHub CI and
  canonical Vercel Preview. That evidence is retained as a checkpoint, not used
  as authority for the refreshed final head.
- Historical canonical Vercel Preview — PASS: deployment
  `dpl_6wvQEvAZrBsgESJVfp5pdDtFvkuu`, immutable URL
  `https://ask-magic-mike-gt7gtgf0f-eyes-up-industries.vercel.app`. `/`,
  `/home-value`, `/buy`, and `/rent` returned 200 with Ask Magic Mike and Our
  Town identity, no application error, and no NellySelly marker.
- Authorization and privacy probes — PASS: anonymous `/admin/growth` and
  `/api/admin/health` returned 401; the protected Growth response included
  `Cache-Control: no-store`, CSP `frame-ancestors 'self'`, HSTS,
  `WWW-Authenticate`, `X-Frame-Options: SAMEORIGIN`, and
  `X-Robots-Tag: noindex, nofollow, noarchive`. A foreign-origin public
  analytics POST returned 403 before rate limiting or persistence. No valid
  analytics event was submitted.
- Responsive visual acceptance — PASS in an isolated local Preview harness
  with no `DATABASE_URL`, all mutation flags disabled, and synthetic local-only
  Basic Auth. At 390 x 844 and 1440 x 1000 the protected page returned 200,
  rendered one proof-ledger panel and all eight metric cards, displayed eight
  honest unavailable values, produced no horizontal overflow or browser error,
  and preserved the restrained black/gold hierarchy. Evidence is gitignored at
  `artifacts/phase9-privacy-kpi-trust-visual/`.
- Runtime inspection — PASS: the exact Vercel deployment reported no error logs
  and no 5xx requests after acceptance probes.
- Post-refresh KPI truth audit — FIXED: a failed delivery aggregate query could
  preserve `configured=true`, causing the UI to show zero beside an error.
  Outcome and delivery normalizers now set `configured=false` whenever an error
  exists, and regression coverage proves the protected page renders unavailable
  values instead of false zero.
- Preview tooling cleanup — PASS: an isolated-worktree CLI call briefly created
  an empty branch-named Vercel project because canonical `.vercel` metadata was
  absent. The target was confirmed to have no deployment or domain, removed,
  and the worktree was explicitly relinked to
  `eyes-up-industries/ask-magic-mike`. No canonical project, domain, deployment,
  environment variable, or Production alias changed.
- GitHub and Vercel must be green on the exact refreshed PR #193 head before the
  Draft is considered release-ready. Final immutable evidence is recorded on
  the PR rather than represented by the historical Preview above.
- Defense-in-depth residual: public responses do not yet enforce a complete
  nonce/hash-based `script-src` CSP. Existing HSTS, content-type, referrer,
  permissions, frame, and protected no-store/noindex controls remain intact;
  a broad CSP change is isolated from this privacy candidate to avoid breaking
  the established public funnel without a dedicated compatibility pass.
- No Production deployment, migration/write, valid analytics persistence test,
  lead, email/BCC, SMS, Push, provider action, WordPress edit, external
  publication, DNS change, spend, or NellySelly action occurred.

## Phase 9 consolidated owned-demand command — 2026-08-22

- Consolidation boundary — PASS: PR #185 contains the unique application work
  selected from PRs #185, #186, #188, and #189 on released PR #184. Diff review
  finds one constraint-only WordPress proof-scope migration and no provider
  publisher, second lead store, second CRM, or PR #187 KPI-target
  implementation.
- Final post-hardening focused matrix — PASS: 10 files / 148 tests covering the
  owned-demand command, asset exports, publication-proof contract, activation
  loop, WordPress audit, current-router safety, public-origin policy, UTM
  allowlists, public route authority, and executable feed/story rendering.
- `pnpm release:gate` — PASS on local Node 26.5.1: Ask Magic Mike/NellySelly
  isolation, 14/14 release-safety controls, 205 test files / 2,866 tests,
  strict typecheck, ESLint, optimized Next.js 15.5.21 build, and 80 active
  routes / 17 acknowledged root–`src` duplicates. The repository declares Node
  24.x, so exact Node 24 GitHub evidence is still required.
- Read-only public WordPress audit — PASS at
  `2026-08-22T14:10:43.297Z`: 42/42 sitemap pages fetched, zero failed, no form
  submission, no WordPress mutation, and no secret/private-field collection.
  The fetcher now accepts only HTTPS on `ourtownproperties.com` or
  `www.ourtownproperties.com`, revalidates each manual redirect, and caps the
  chain at five hops.
- Security source review — PASS at checkpoint: protected exports use
  server-side `report:view`; channel, placement, format, local image, short
  code, and destination are allowlisted; asset responses are private/no-store,
  noindex, nosniff, and sandbox SVG; shortlinks cannot accept a destination;
  no unsafe HTML or dynamic-code sink was introduced.
- Failure-closure regression — PASS: when Growth measurement is unavailable,
  all placements report `measurement_unavailable`, the operator receives no
  recommended first placement, and lead-dependent counts are not presented as
  measured. Publication-proof availability remains an independent boundary.
- `pnpm audit --prod --audit-level high` — PASS: no known Production dependency
  vulnerability.
- `gitleaks git --redact --no-banner` — PASS: 498 commits / approximately
  13.92 MB scanned with no leak.
- The earlier `git diff --check` and empty-migration scan passed on the
  application-only head. It is superseded by the repaired-head diff check,
  migration contract, and exact-head release evidence recorded above.
- Pending before exact-head acceptance: exact Node 24 GitHub checks, canonical
  Vercel Preview smoke/auth/origin/shortlink/asset checks, rendered
  desktop/mobile QA, and deployment-log inspection.
- No Production, Neon, WordPress, lead, email/BCC, SMS, Push, provider,
  publication, QR distribution, DNS, spend, or NellySelly mutation occurred.

## Phase 9 WordPress owned-traffic consolidation — 2026-08-21

- `WORDPRESS_BRIDGE_FORM_IDS=3 node scripts/audit-wordpress-form-placements.mjs` — PASS: 42 sitemap
  pages fetched, 42 succeeded, zero failed; the report captured only structural
  public evidence and compared all observed Gravity IDs against the proven
  Form 3 bridge allowlist.
- Public topology evidence: Form 1 on one page, Form 3 on one page, Form 4 on
  one page, Form 6 on one page, and Form 7 on 39 pages. Five pages expose more
  than one capture system. No form was submitted.
- Canonical/placement evidence: three indexable seller-value pages, two
  direct-purchase pages, two Ask Mike pages, four native legacy-capture pages,
  three direct AskMagicMike.com links missing `utm_content`, and two iframe
  placements missing `utm_content`.
- Mobile Chromium inspection at 390 x 844 covered the homepage, established
  home-value page, and Ask Magic Mike page. Existing layouts remained usable;
  the render confirmed visible capture duplication and did not create a lead,
  analytics conversion, provider call, or message.
- Focused command — PASS: 5 files / 85 tests covering the WordPress audit,
  owned-demand command, publication proof, UTM builder, and owned-demand
  assets.
- `pnpm release:gate` — PASS: Ask Magic Mike/NellySelly isolation, 14/14
  release-safety controls, 208 test files / 2,901 tests, strict typecheck,
  ESLint, optimized Next.js 15.5.21 build, and 81-route manifest.
- `pnpm audit --prod` — PASS: no known Production dependency vulnerability.
- `gitleaks git --redact --no-banner` — PASS: 477 commits and approximately
  13.53 MB scanned with no leak.
- `git diff --check` — PASS before final documentation update; it is rerun at
  handoff.
- Known local-only warning: Node 26.5.1 is newer than the Node 24.x project
  engine, and webpack could not persist one disposable cache entry because the
  local volume was nearly full. Compilation, page generation, build, and route
  checks still passed. Exact Node 24 CI and protected Preview verification are
  required on the Draft PR before the candidate is considered accepted.
- Full audit rationale, page-level matrix, rollback, and stop gates are in
  `docs/phase9/WORDPRESS_OWNED_TRAFFIC_CONSOLIDATION_AUDIT_2026-08-21.md`.
- Production, WordPress, Neon, providers, leads, notifications, DNS, and
  NellySelly remained unchanged.

## Phase 9 owned-demand publication proof ledger — 2026-08-21

The stacked additive ledger, authorization, security, migration, and cutover
evidence is maintained in
`docs/phase9/OWNED_DEMAND_PUBLICATION_PROOF_QA_EVIDENCE.md`. Production and all
external channels remain unchanged.

## Phase 9 campaign safety + owned-demand offer flight — 2026-08-21

- Measurement-truth hardening — PASS: the command distinguishes ready,
  not-configured, schema-pending, and query-failed states. Only ready
  measurement may render numeric demand, a measured bottleneck, or a data-backed
  first-channel recommendation. Focused unit/static coverage passes 17/17.
- No-database Production-render browser acceptance — PASS at 1440 × 1000 and
  390 × 844: HTTP 200, all three metrics render unavailable, false-zero and
  measured-recommendation copy are absent, recovery guidance is present, no
  horizontal overflow occurs, and browser console/page errors remain zero.
  Evidence is under the gitignored
  `artifacts/phase9-measurement-unavailable-20260821/` directory.

- Current-run operator UX audit — PASS: desktop 1440 × 1000 and mobile
  390 × 844 Production renders were captured and inspected. The recommended
  first move is present once, its same-page link lands on Google Business
  Profile, every channel exposes the full-flight copy control, the control
  reports its copied state, mobile document width remains contained, and no
  browser console warning/error was observed. Accepted evidence and audit notes
  are listed in `docs/phase9/OWNED_DEMAND_OPERATOR_UX_AUDIT.md`.

Status: local release gate, local Production-render visual verification, and
exact code-bearing protected Preview verification are complete. Production and
external channels remain unchanged.

- Reuse audit confirmed the canonical root `/admin/distribution`, Neon Growth
  loader, UTM builder, `/home-value`, `/buy`, `/rent`, and retained visual assets
  already existed.
- The first new regression run failed intentionally against the uncorrected
  retained campaign copy, proving that unsupported claims and conflicting public
  phone numbers were detectable. After the factual rewrite, the safety suite
  passes.
- The first offer-flight run also failed closed because the canonical UTM
  allowlist did not yet include the existing `/home-value`, `/buy`, and `/rent`
  routes. Those exact routes were added to the allowlist; arbitrary hosts and
  paths remain rejected.
- Focused final command:
  `pnpm exec vitest run tests/compliance/value-copy.test.ts tests/compliance/campaign-copy-safety.test.ts tests/adminops/owned-demand-command.test.ts tests/admin/utm-link-builder.test.ts tests/brand/marketing-system.test.ts tests/compliance/public-distribution.test.ts`
  — PASS, 6 files / 337 tests.
- `pnpm release:gate` — PASS: Ask Magic Mike/NellySelly isolation, 14/14
  release-safety controls, 196 test files / 2,797 tests, strict typecheck,
  ESLint, optimized Next.js 15.5.21 Production build, and 78-route manifest.
- `pnpm typecheck` — PASS.
- `git diff --check` — PASS.
- `pnpm audit --prod --audit-level high` — PASS: no known Production
  dependency vulnerabilities.
- `gitleaks detect --source . --redact --no-banner` — PASS: 482 commits and
  approximately 13.64 MB scanned with no leaks.
- High-signal scan of the new command surface found no client secret reads,
  unsafe HTML/DOM sinks, dynamic execution, Web Storage credentials,
  unrestricted `postMessage`, navigation mutation, or network send. A complete
  retained-source phone scan found neither conflicting private number.
- Verified boundaries: exact 18 offer placements, exact-once attribution,
  canonical routes/UTMs, retained local imagery, no prohibited campaign claims,
  current public office number retained, test/suppressed SQL exclusions, and
  local clipboard controls with no fetch, form, server action, or provider call.
- Active `/ask` rendered and source-level checks reject neighborhood, school,
  and buyer-demand steering language while requiring objective consumer-stated
  comparison criteria.
- `scripts/qa/visual-smoke.mjs` against a fresh local Production build — PASS,
  10/10 checks across `/home-value`, `/ask`, `/embed/ask`, `/widget-preview`, and
  authenticated `/admin/distribution` at desktop and mobile sizes. Every check
  returned 200 with no horizontal overflow, missing required copy, forbidden
  claim, bare appraisal language, or console error. The harness intercepted only
  `/api/events` and `/api/experiments/event` with local 204 responses so this
  rendered acceptance remained read-only. Evidence is under the gitignored
  `artifacts/phase9-campaign-safety-20260821/` directory.
- Visual inspection confirmed the active funnels remain clear and mobile-first;
  the protected three-offer command uses the existing high-resolution approved
  Mike portraits instead of the soft 150–175 px legacy derivatives.
- Exact code-bearing commit:
  `a0c80eaa9b429ed48871fc221d93af5e7d6fdfa1`.
- Exact Ready Preview: `dpl_5UQL8LDfMvFvvi4YZ8UhLdyDFbWF` at
  `https://ask-magic-mike-ihjwzl8rw-eyes-up-industries.vercel.app`.
- Exact GitHub status: release gate PASS in 2m56s; Vercel deployment and Preview
  comment checks PASS.
- Protected Preview read-only matrix — PASS: `/`, `/home-value`, `/ask`, `/buy`,
  `/rent`, `/embed/ask`, `/widget-preview`, `/api/health/live`,
  `/api/health/ready`, and `/api/listings/search?q=Wilson&limit=3` all returned
  200. Required active copy was present, Ask Magic Mike/NellySelly identity
  isolation held, and the listing response exposed none of the private-field
  denylist.
- Protected Preview visual matrix — PASS, 8/8: `/home-value`, `/ask`,
  `/embed/ask`, and `/widget-preview` at 1440×1000 and 390×844. All returned 200
  with no overflow, missing required copy, steering/offer claim, or console
  error. Analytics endpoints were intercepted with local 204 responses to keep
  the visual run read-only. Screenshots are retained outside Git at
  `/private/tmp/amm-pr183-preview-qa-a0c80eaa/visual/`.
- Anonymous protected-admin proof — PASS: `/admin/distribution` returned 401
  with a Basic challenge, `Cache-Control: no-store`, and
  `X-Frame-Options: SAMEORIGIN`. No app credential or session was bypassed.
- Vercel CLI unexpectedly created empty helper project
  `amm-phase9-campaign-compliance-20260821`
  (`prj_JUyx03Rh8iABqAFepNNuPI2jJqut`) before the worktree was relinked to the
  canonical project. Read-only inspection confirms zero deployments. It was not
  deleted because cleanup is a separate external-state action.
- No lead, email, BCC, consumer acknowledgment, SMS, Push notification, social
  post, GBP post, WordPress update, Neon write, DNS change, Vercel Production
  deployment, or NellySelly change occurred.

Authenticated `/admin/distribution` Preview inspection remains optional owner
acceptance and will not be bypassed. It is not required for the public release
candidate because the same protected route passed local authenticated rendered
QA and exact Preview anonymous-denial proof.

## Phase 7 completion gap closure — 2026-08-16

### Authenticated Production Copilot acceptance

- PR `#166` repaired payload-era lead-column references in the synchronous and asynchronous Copilot paths and added a canonical-schema regression test. It merged as `275f06e5857aceab2c79d499a3d29766c2c59c19` after the release gate passed 175 test files / 2,647 tests, strict typecheck, ESLint, optimized Production build, the 72-route manifest, 14/14 release-safety controls, and Ask Magic Mike/NellySelly isolation.
- Final Production deployment `dpl_7uQC5a9xudCNAN1HEAiBWdBZ7iC9` is Ready and owns both canonical Ask Magic Mike aliases. `AI_TIMEOUT_MS=20000` is encrypted and Production-only; the existing `OPENAI_API_KEY` was reused unchanged and never exposed or rotated.
- An authenticated Lead Center administrator generated an advisory for suppressed QA lead `59bba7cf-fe27-42c3-adb6-27b27727e5c7`. The provider-backed result reported mode `openai_responses`, model `gpt-5.6-luna`, 835 input tokens, 964 output tokens, estimated cost `$0.006619`, 7,624 ms latency, and no fallback reason.
- The advisory correctly treated `is_test=true` and `communication_suppressed=true` as controlling constraints, explicitly prohibited call/email/text contact, and left all controlled tools behind human approval. AI sending and AI assignment remained disabled.
- Neon Production durably contains one intelligence row and two Copilot usage rows: the earlier fail-closed provider attempt plus the final provider success. The latest usage row is the successful result above. The lead remained `assigned`, score `83`, with the same assignee and null `last_contacted_at` / `next_follow_up_at`; no assignment, score, stage, task, appointment, message, notification, email, BCC, SMS, Push notification, or consumer action changed.
- Post-deployment checks passed: production smoke 19/19 with two intentional auth/write skips, conversion funnel 15/15, synthetic monitor 6/6 with one intentional authenticated-health skip. Vercel returned no error-level logs from the final deployment timestamp onward. The earlier schema errors at 9:09–9:10 PM predate this deployment and are retained as truthful root-cause evidence.
- Final redacted repository scan passed with 376 commits and no detected secret leak.

### Signed Resend webhook Production acceptance

- Resend webhook `d466d4d9-6837-49ae-9343-86c54c2bd720` is enabled for the canonical `https://www.askmagicmike.com/api/webhooks/email/events` route and the documented eight-event allowlist.
- The provider-issued signing secret is stored only as the Sensitive, Production-scoped Vercel variable `RESEND_WEBHOOK_SECRET`; it was not printed, committed, copied into Preview, or written into evidence.
- Vercel deployment `dpl_5g43rkAatsVi3FHyarZf7Km1jZfG` rejected an invalid signature with HTTP 400 and `invalid_signature`.
- One correctly signed no-PII synthetic `email.sent` payload returned HTTP 200 with `duplicate=false`; exact replay returned HTTP 200 with `duplicate=true`.
- Neon Production contains exactly one row for event ID `msg_phase7_live_acceptance_1786914537362`, with `signature_verified=true`, payload hash `b3e5af1b0f0861316d70c77da0f04db6fac5d9830b3135d33ca00c18b114cd32`, and `processing_status=ignored` because the synthetic provider message ID matched no notification.
- This acceptance proves deployed signature alignment, minimized durable event storage, and replay idempotency. It is not evidence of an actual provider-delivered email. No lead, notification, email, BCC, SMS, Push notification, consumer acknowledgment, or Mike message was created.

- `pnpm release:gate` — PASS: Ask Magic Mike/NellySelly isolation, 14/14
  release-safety checks, 174 test files, 2,643 tests, strict typecheck, ESLint,
  optimized Next.js Production build, and the active-route manifest all pass.
- Route manifest — PASS: 72 active routes and 16 acknowledged root/source
  duplicates. The new routes are the authenticated mock-only sequence processor
  and the canonical signed inbound-SMS webhook.
- `pnpm audit --prod --audit-level high` — PASS: no known Production dependency
  vulnerabilities.
- `gitleaks detect --source . --redact --no-banner` — PASS after final merge:
  372 commits and approximately 11.71 MB scanned; no leaks found.
- The existing encrypted Production `OPENAI_API_KEY` is reused unchanged on the
  canonical Ask Magic Mike Vercel project. It is read only in server code and is
  not copied, rotated, downloaded, logged, committed, or exposed through a
  `NEXT_PUBLIC_*` variable.
- Consumer email, carrier SMS, Mike activation, automatic AI actions, and the
  sequence scheduler remain disabled. No external notification or production
  data mutation was performed by this gate.
- PR `#163` GitHub release gate and Vercel checks passed. Preview deployment
  `dpl_2uuhZkUMuu4qZTQBfw7rMdNd5eG6` is Ready. Authenticated Vercel CLI probes
  returned live 200, ready 200, and home-value 200; the cron processor rejected
  an unauthenticated request with 401; the inbound-SMS webhook rejected an
  unsigned request with 401; and the Copilot mutation remained unavailable in
  the disabled Preview RBAC environment with a truthful 409. No write or
  external provider action occurred.
- PR `#163` merged as `8e328fe9d26efcdba923489b37126c67e89bd62a`.
  Production deployment `dpl_5zYcSWtGquNvi8UTpVTkc6brAtGA` is Ready and owns
  the apex and `www` aliases. Read-only Production verification passed: smoke
  19/19 with two intentional write/auth skips, conversion funnel 15/15,
  synthetic monitor 6/6 with one intentional authenticated-health skip, and no
  error-level Vercel logs for the deployment. No test lead, email, SMS, Push,
  sequence step, database mutation, WordPress change, or NellySelly change was
  made.

## Preview RBAC and secure activation acceptance — 2026-08-14

- Isolated Preview role acceptance passed for administrator, primary lead
  owner, assigned agent, read-only analyst, disabled user, object-level lead
  isolation, logout, and stale-session denial on Vercel deployment
  `dpl_2Kpchet8VAee8oqoWi2PovznC8ct`.
- The browser/server auth-path mismatch found during live acceptance was fixed;
  all Better Auth surfaces now use `/api/lead-center-auth`.
- Five fictional `example.test` acceptance users are banned and all sessions
  revoked. Neon verification returned five QA users, five banned users, and
  zero active sessions. All fixtures are test-marked and suppressed.
- The one-use Preview bootstrap token and all bootstrap source files were
  removed; the Production bootstrap path remained HTTP 404 throughout.
- Secure password activation/reset now uses an independently gated Resend path,
  exact-origin link validation, one-use 60-minute tokens, non-enumerating UI,
  no BCC, opaque idempotency, and post-reset session revocation.
- Final release gate: 155 test files / 2,566 tests pass; strict typecheck,
  ESLint, 41-page Production build, 60-route manifest, 14/14 safety checks,
  isolation, dependency audit, and whitespace checks pass. No activation email
  or other external notification was sent.
- Final code-bearing Preview `dpl_FE63usgk8JmTYRS4aPyyGPA2euJa` is Ready.
  Authenticated Vercel probes returned live 200, ready 200 with RBAC schema
  ready, all three staff auth/password pages 200, and the removed bootstrap
  route 404. GitHub Node 24 run `31855717441` passed.

## Production RBAC cutover — 2026-08-14

- Additive Push device-label and RBAC migrations were applied in order on Neon
  Production. The Push constraint is present; all six auth tables reported
  ready before users were provisioned.
- PR 143 merged as `10eefde`. Production deployment
  `dpl_46R7PQfBPH8N5BPymTQPmeenfYd5` is Ready and canonical with per-user RBAC
  enabled; the preceding Ready deployment remains the environment rollback.
- Two approved users exist: one administrator and Mike as the linked primary
  lead owner. Mike has no credential/session and received no activation email.
- Brandon activation delivery was confirmed in Gmail from the verified sender
  with no BCC. Acceptance passed: sign-in 200, cookie issued, lead inbox 200,
  reporting 200, user-management 200, sign-out 200, stale session 307.
- The temporary password/cookie were cleared from process memory. A fresh,
  unused 60-minute owner reset link remains in Brandon's inbox for permanent
  password selection.
- Final database state: 2 users, 1 verified user, 1 credential account, 0
  sessions, 1 active reset link, 3 auth audit rows, 0 live leads, 6 suppressed
  test leads, and 0 notification backlog.
- Post-cutover public checks pass: smoke 19/19 (2 intentional protected/write
  skips), funnel 15/15, monitor 9/9, and health ready. No lead, consumer email,
  SMS, Push, social post, DNS, WordPress, or NellySelly change was made.
- A successful auth request exposed a `pg` future-compatibility warning for
  `sslmode=require`; the follow-up hotfix normalizes it to explicit
  `sslmode=verify-full`, preserving the current strong verification behavior.

## WordPress Form 3 production acceptance — 2026-08-14

- Bridge 1.1.0 is active with Form 3 as the only allowlisted form.
- Gravity entry `1549` produced canonical test lead
  `70f63f35-2478-4738-b84c-bc1a89b8482c`, one Resend internal alert, and no
  consumer email or SMS. Gmail confirmed Mike and the hidden audit receipt.
- Provider message ID: `bf31a582-e4a3-45cb-a7f1-5cb89121626f`; outbox status
  `sent`, attempt 1 of 3. Transport authentication passed SPF, DKIM, and DMARC.
- PR #139 fixed non-UUID idempotency replay. PR #140 deployed nested bridge
  click-ID compatibility and active-router listing-safety routes.
- The one incomplete pre-fix replay row was found on the actual production Neon
  branch, marked test/suppressed in a guarded transaction, and given one audit
  record. It has zero notifications and zero analytics events. Nothing was
  deleted and no additional message was sent.
- Complete local verification: 149 test files / 2,547 tests, strict typecheck,
  ESLint, production build, 56-route manifest, release safety 14/14, production
  dependency audit, and 320-commit secret scan all pass.
- Post-deploy public smoke, funnel, health, NellySelly isolation, and synthetic
  listing-safety monitoring pass.

## Brandon phone-registration repair — 2026-08-12

- Vercel production logs for deployment
  `dpl_5cDj7c7QcCPassZvww9mGZzAfeVm` showed repeated HTTP 401 responses at
  `/admin/notifications/phone`; production had no error-level function logs.
  This separated an authentication/session failure from VAPID, Neon, or push
  provider failure.
- The installed web-app manifest previously used that Basic Auth route as its
  `start_url`. The repair uses `/phone-alerts/setup` and a short-lived signed
  HttpOnly cookie specifically limited to Brandon's `copy` role.
- `pnpm run test` — PASS: 144 files, 2,521 tests.
- `pnpm run typecheck` — PASS.
- `pnpm run lint` — PASS.
- `pnpm run build` — PASS; all new setup/API routes compiled as dynamic routes.
- `pnpm run routes:assert` — PASS: 53 active routes and 13 acknowledged
  root/source duplicates.
- `pnpm run release:safety` — PASS: 14 checks, 0 failures.
- `pnpm audit --prod --audit-level high` — PASS: no known production
  vulnerabilities.
- Full `pnpm audit --audit-level high` — FAIL: 18 existing development-only
  advisories (4 moderate, 13 high, 1 critical), led by the Vitest 2.x toolchain.
  No automatic major-version dependency rewrite was mixed into the phone repair.
- Preview deployment `dpl_8aKsdtP1zi3tS1J9C1uprRvNbW9P` — READY. GitHub's
  local release gate and all required Vercel deployment checks pass.
- Non-mutating Preview route proof: invite 200; claim redirect 303; HttpOnly,
  Secure, SameSite=Strict cookie flags present; authenticated Brandon-only setup
  200; missing-CSRF request 403; malformed UUID 400; readiness 200 with
  `phone_setup_configured=true`. No valid subscription payload or test-send
  request was submitted.
- No production environment, deployment, database row, lead, email, push, or SMS
  was changed or sent during this repair and Preview verification phase.

### Operator-flow hardening

- Added an authenticated admin control for generating/copying/sharing the scoped
  setup link; no secret is passed to client code or persisted in Web Storage.
- Added route-level Basic Auth verification under `/admin/api/phone-alerts/invite`
  as defense in depth against a future middleware matcher regression.
- Client response validation rejects a returned invite unless it is same-origin,
  uses the exact claim path, contains a token, and has a future expiry.
- Claim responses now apply `no-store`, `no-referrer`, and `X-Robots-Tag:
  noindex, nofollow, noarchive` on both success and failure paths. Setup metadata
  is also no-index and no-referrer.
- Removed the post-claim clean-URL copy action because it could not transfer the
  signed session into Safari. Instructions now preserve the original secure link
  for Safari handoff.
- Verification after hardening: 144 test files / 2,525 tests pass; strict
  typecheck, lint, production build, 54-route manifest, 14/14 release-safety
  checks, production dependency audit, and whitespace checks pass.
- Enhanced operator-flow Preview `dpl_Bo8ojFMzf27bjqWX9Q2Qas11XxVy` is Ready.
  The branch-scoped Sensitive signing key was replaced through Vercel and the
  deployment proved: unauthenticated invite 401; authenticated invite 200;
  signed claim 303; scoped setup page 200; missing-session subscription request
  401; and a valid-session malformed payload 400 before persistence. Cookie
  flags and the no-store/no-referrer/no-index headers passed. No subscription,
  notification, lead, external message, or database mutation was created.
- Authenticated Vercel project-domain inspection confirms `ask-magic-mike`
  exclusively owns `askmagicmike.com` and `www.askmagicmike.com`; the bridge and
  legacy Ask projects have only `.vercel.app` domains, while NellySelly owns
  only its distinct NellySelly hostnames.

## Production notification health recheck — 2026-08-12

- Production Neon project `bitter-star-20214385`, branch
  `br-round-base-auh6h2wd` (`production`), was inspected using read-only,
  aggregate queries. No lead, notification, or subscription row was changed.
- Four lead records exist and all four are `is_test=true`; live-prospect count
  is zero. The records remain excluded from production KPIs.
- Notification history is test-only: two delivered/sent records, two historic
  permanent failures from the superseded invalid Resend key, and two intentional
  disabled-mode skips. There is no pending or retry backlog.
- Production health reports PostgreSQL ready, email enabled, Web Push enabled,
  the subscription table present, and complete VAPID configuration. No staff
  device is registered yet, so phone delivery cannot begin until each owner
  grants browser notification permission on the physical device.
- Public lead-pipe health passed all nine checked routes. Protected phone setup,
  push-subscription API, and Lead Center routes each returned HTTP 401 without
  credentials, confirming the server-side admin boundary.
- The phone setup now distinguishes missing server configuration from browser
  incompatibility and does not request permission on unsupported clients.
- The stale Vercel Preview database credential was traced to a deleted Neon
  branch. A new persistent Neon branch named `preview`
  (`br-morning-paper-aun3378r`) was forked from production, and only Vercel's
  Preview-scoped `DATABASE_URL` was replaced through the secure environment
  variable interface. No credential value was logged or committed.
- Preview deployment `dpl_8em8uYm1JxA7oSbCiMknf7vrew5W` is Ready at
  `https://ask-magic-mike-7c5ejyz5k-eyes-up-industries.vercel.app`.
  `/api/health/live` and `/api/health/ready` report healthy PostgreSQL capture;
  outbound preview email and push remain disabled, and the protected phone page
  returns HTTP 401 without admin credentials.

## Dual internal SMS/MMS upgrade — 2026-08-11

- Focused Vitest covers urgency selection, QA suppression, minimal SMS content,
  Twilio form encoding, the same-origin MMS allowlist, status callback URL, and
  provider message ID parsing.
- TypeScript strict checking passed after implementation.
- No live SMS was sent. Production had no Twilio credentials at audit time, so
  carrier delivery remains an explicit activation blocker.
- Three AI-generated urgency assets were normalized to 1120x350 PNG and contain
  no consumer PII or synthetic lead facts.

## Production cutover evidence — 2026-08-11

- Canonical commit: `008bbc8` on
  `rescue/amm-pre-consolidation-20260810-162915`.
- Production deployment: `dpl_SDMv6Nz69aKZJFfmGB54h6MpY5yt`, Ready and
  aliased to `https://www.askmagicmike.com`.
- Public routes `/`, `/sell`, `/buy`, `/ask`, `/widget/v1`,
  `/api/health/live`, and `/api/health/ready` return HTTP 200.
- `https://askmagicmike.com/` returns HTTP 308 to the selected `www` canonical
  hostname. `/admin/leads` returns HTTP 401 without authentication.
- Production health reports PostgreSQL configured, Neon capture ready, email
  enabled, notification mode `production`, and the canonical lead and outbox
  tables available.
- The production Neon branch received the complete migration chain. The former
  Supabase project and any historic data were not changed.
- Public-form QA lead `a1a7e899-9b2e-4ffe-968f-1e10728d60e8` was durably
  stored and immediately quarantined as `is_test=true` after an early UI marker
  omission was detected. It is score 83, communication/email/SMS suppressed,
  has three consent rows, first/last-touch attribution, click-ID fields, audit
  rows, and notification history.
- A second public-form QA lead `8609b5e2-da81-49b0-8db9-c113af6894a3`
  proved the server-side marker fix: it was born `is_test=true`, suppressed,
  linked to the first QA master as a duplicate, and excluded from live KPIs.
- The two provider attempts produced no outbound email and no provider message
  ID. The latest outbox record truthfully reports `permanently_failed` with
  `resend_http_400` / `API key is invalid`.
- The invalid key was replaced securely with a sending-only production key.
  `notify.askmagicmike.com` has matching DKIM, SPF, return-path MX, and DMARC
  monitoring records in Vercel DNS. Google Public DNS returns each expected
  value and Resend reports the domain `verified`.
- Final local gates after the Neon enrichment correction: 130 test files / 2,473
  tests pass; typecheck and ESLint pass; the 43-route manifest passes; 14/14
  release-safety checks pass; production build passes.

### Final controlled end-to-end QA — 2026-08-11 12:31 America/New_York

- Submitted through the public production `/sell` form with the campaign
  `production_launch_qa_verified_sender` and explicit `INTERNAL QA — DO NOT
  CONTACT` markers.
- Canonical lead ID: `59bba7cf-fe27-42c3-adb6-27b27727e5c7`.
- The lead was born `is_test=true`, score 83, grade A, assigned to active primary
  recipient Mike Eatmon, and communication/email/SMS suppressed. It is excluded
  from production KPIs and is not a live prospect.
- Request idempotency is stored. Replaying the same public API request returned
  HTTP 200 with `X-AMM-Idempotent-Replay: 1`, the same lead ID, one lead row, one
  internal-alert row, three consent rows, and no duplicate send.
- First/last touch, source URL, referrer, UTMs, click-ID object, consent version,
  consent timestamp/source, deterministic score version, five score factors,
  routing reason, and audit records are present.
- Internal alert status: `sent`; provider: Resend; message ID
  `fdf79d0e-7cf8-44d1-a1e1-d39dafb675c1`; provider event: `delivered`.
- Sender: `Ask Magic Mike <leads@notify.askmagicmike.com>`.
- Exact subject:
  `[TEST] SELLER LEAD | internal_qa | Seller | INTERNAL QA — DO NOT CONTACT — 999 Verification Way, Wilson, NC | INTERNAL QA — DO NOT CONTACT | Score 83`.
- Provider record contains one direct recipient and one hidden BCC. Gmail search
  in the approved audit mailbox found exactly one matching received message; the
  private BCC value is intentionally not reproduced.
- Authenticated Lead Center list/detail and notification routes returned HTTP
  200; the final lead ID and sent notification are present. The same routes
  return HTTP 401 without authentication.
- Consumer acknowledgment and SMS were intentionally not sent for this QA lead.
- Temporary full-access Resend DNS and one-hour Vercel maintenance credentials
  were revoked after verification. Only the restricted production sending key
  remains in Vercel Sensitive environment storage.

## Neon preview adapter verification — 2026-08-11

- Owner-controlled Neon Free preview branch was created and all canonical
  PostgreSQL migrations completed in the isolated preview database. No Neon
  production migration was run.
- `pnpm typecheck` — PASS after the direct Neon Postgres and notification-outbox
  adapters were added.
- `pnpm lint` — PASS.
- `pnpm test` — PASS: 130 files / 2,469 tests.
- `pnpm build` — PASS: 38 routes generated/verified by Next.js.
- `git diff --check` — PASS.
- Preview deployment and database write testing are complete. The Neon connection
  URL is stored as a Sensitive, Preview-only Vercel variable and was never logged
  or committed. Email/SMS remains disabled.

### Preview runtime proof — 2026-08-11 11:16 America/New_York

- Vercel Preview `DATABASE_URL` is Sensitive and Preview-only; the service-role
  credential was rotated without being printed, committed, or stored locally.
- `/api/health/live`: database configured, provider `postgres`, notifications
  disabled, email disabled.
- `/api/health/ready`: HTTP 200; capture function, leads table, and notification
  table all present.
- Public `POST /api/leads`: HTTP 200 for a seller QA record marked
  `INTERNAL QA — DO NOT CONTACT`; resulting lead ID
  `cf0e067d-287b-4ab9-90af-e429629b4eee`, score 83, `is_test=true`.
- Three immutable consent records exist (email/call/SMS, all denied). Two
  expected disabled-mode outbox records exist: the legacy assignment audit
  projection and canonical internal alert; both are `skipped`, and no provider
  delivery occurred.
- Replaying the same UUID session/idempotency key returned HTTP 200 with
  `X-AMM-Idempotent-Replay: 1`, the same lead ID, one distinct lead record, and
  no additional notification record.
- Two preview QA records created during recovery were explicitly marked
  `is_test=true` and communication/email/SMS suppressed. They are not live
  prospects and must remain excluded from KPIs.

### Final candidate replay — 2026-08-11 11:20

- Deployment: `https://ask-magic-mike-icl0ir5e7-eyes-up-industries.vercel.app`
  (Vercel deployment `dpl_EwjyYzJmKCiq1LjzyiJX24zFS3dX`).
- Final QA lead ID: `81183196-cf68-45a0-a8dc-e1641cc43477`; UUID session and
  idempotency key: `b3b0f6d4-1bd7-4af8-8fc9-8f30aac82c55`.
- Score 83; `is_test=true`; communication, email, and SMS suppression are all
  true; three denied-consent records and two expected `skipped` outbox records.
- Replay returned HTTP 200 with `X-AMM-Idempotent-Replay: 1`; no email, SMS, or
  consumer acknowledgment was delivered.
- `/api/health/ready` returned HTTP 200 with the capture function, leads table,
  and notification table ready.
- Final local gates: 130 test files / 2,469 tests pass; typecheck, ESLint,
  43-route manifest, 14/14 release-safety checks, production build, and
  `git diff --check` pass.

## Internal visual-alert templates

- Added the generated non-PII decorative asset at
  `public/images/ask-magic-mike/notifications/lead-alert-frame-v1.png`.
- `pnpm typecheck` — pass.
- `pnpm vitest run tests/leadops/lead-alert-visual-templates.test.ts tests/leadops/lead-engine-consolidation.test.ts` — 2 files / 9 tests pass.
- `pnpm lint` and `git diff --check` — pass.
- Templates keep transactional SMS text-only and render live lead facts as
  accessible HTML/text over a non-PII decorative frame. The final production
  email used the QA variant; SMS/MMS and consumer acknowledgment stayed off.

## Historical baseline evidence (superseded by production proof above)

- `pnpm routes:assert`: PASS, 42 active routes with 12 acknowledged root/src
  duplicates after the same-day additions.
- Git rescue branch: created before edits.
- Live route triage: documented in `LIVE_TRIAGE_2026-08-10.md`; the current public
  deployment is reachable but missing `/buy`, `/widget/v1`, robots, sitemap, and
  the new health route.
- Vercel baseline was captured before production mutation and remains useful for
  rollback comparison.

## Local candidate results

| Check | Result | Evidence |
|---|---|---|
| `pnpm typecheck` | PASS | strict TypeScript compiler, final local run |
| `pnpm lint` | PASS | ESLint, final local run |
| `pnpm test` | PASS | 130 files / 2,473 tests, final local run |
| `pnpm build` | PASS | Next.js production build, final local run |
| `pnpm routes:assert` | PASS | 42 active / 12 acknowledged duplicates |
| `pnpm routes:verify` | PASS | production build plus 43 active / 13 acknowledged routes |
| `pnpm release:safety` | PASS | 14 checks / 0 failures |
| `git diff --check` | PASS | no whitespace errors |
| production route/health matrix | PASS | required public routes and both health endpoints return 200 |
| banned product-copy scan | PASS | no forbidden product-copy matches in `app`, `public`, or `docs` |
| `pnpm amm:verify:funnel` against live | PASS | 15/15 read-only legacy conversion checks |
| `pnpm amm:public:cta-check` | PASS | 16/16 source/route/doc checks |
| production canonical/admin boundary | PASS | apex 308 to `www`; unauthenticated Admin returns 401 |
| Playwright local `/buy` + open-house mobile smoke | PASS | 390×844 snapshots; accessible labels/consent/footer; 0 browser errors after local-origin fix |
| `tests/leadops/lead-engine-consolidation.test.ts` | PASS | scoring, subject, BCC, privacy filters |
| migration application | PASS | production Neon branch ready; Supabase untouched |
| public QA lead/email/BCC | PASS | test lead stored; one alert; provider delivered; hidden copy confirmed |

The test suite deliberately does not call external providers. The Resend contract
test uses a synthetic transport and verifies that BCC is passed without logging or
rendering its value.

## Required local gates

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm routes:verify
python -m compileall <not applicable: canonical backend is TypeScript>
```

Also run the source-level banned-copy/secret scans, widget origin tests, API
contract/idempotency tests, notification console/retry tests, accessibility smoke,
and local production route matrix. Record exit codes and timestamps here.

## 2026-08-14 privileged-route hardening evidence

No lead, email, SMS, push notification, WordPress update, database mutation, or
production deployment was performed for this verification.

- Focused admin push, passwordless phone setup, and appointment security tests:
  PASS — 4 files / 18 tests.
- Full Vitest suite: PASS — 148 files / 2,538 tests.
- Strict typecheck and ESLint: PASS.
- Production build and route manifest: PASS — 54 active routes and 13 reviewed
  root/`src` duplicates.
- Release safety and Ask Magic Mike isolation: PASS — 14/14 and PASS.
- Browser E2E: PASS — 13/13 Chromium tests; admin fails closed anonymously.
- Production dependency audit: PASS — no known vulnerabilities.
- Gitleaks: PASS — 315 commits scanned with redaction, no leaks.
- `git diff --check`: PASS.

The tests prove route-level Basic Auth for push subscription list/register/remove
and push test delivery, exact-origin protection for mutation, omission of push
endpoint secrets from list responses, and pre-persistence appointment throttling.
Read-only Preview is rejected before the durable limiter can write a bucket.

Canonical Node 24 Preview `dpl_BZNVfpM6yFxMsNgve9mu2aKSSVm2` reached Ready.
Authenticated probes returned 200 for the root and both public health endpoints;
anonymous Admin and push API probes returned 401. A synthetic appointment POST
returned 503 in read-only Preview before persistence or rate-limit storage.
GitHub's independent release gate and all Vercel checks passed.

## Production QA gate (executed)

The approved QA lead was submitted through the public form, stored as
`is_test=true`, delivered to the internal recipient plus hidden audit BCC, and
replayed idempotently. Consumer acknowledgment, SMS, and WordPress publication
were not executed.

## Reuse-first hardening verification — 2026-08-11 16:05 America/New_York

This candidate did not submit another lead, send another email/SMS, mutate the
live database, deploy production, or publish WordPress. Prior controlled
production QA proof above remains the only delivery proof.

| Check | Result |
|---|---|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS; 38 generated pages, 43 active routes |
| `pnpm vitest run --reporter=dot` | PASS; 137 files / 2,488 tests |
| `pnpm exec playwright test` | PASS; 13/13 browser E2E tests |
| `pnpm routes:assert` | PASS; 43 active / 13 acknowledged duplicates |
| `pnpm release:safety` | PASS; 14/14 |
| `pnpm audit --prod` | PASS; zero known vulnerabilities |
| `gitleaks detect --source . --redact` | PASS; 319 commits, no leaks |
| `git diff --check` | PASS |
| `pnpm amm:verify:funnel` | PASS; 15/15 live read-only checks |
| `pnpm amm:public:cta-check` | PASS; 16/16 |
| `pnpm amm:verify:social-preview` | 40/42; Facebook crawler receives 403 on two Our Town WordPress URLs |

Rendered evidence for the retained visual system:

- `output/product-design-audit/2026-08-11/01-home-desktop.png`
- `output/product-design-audit/2026-08-11/02-home-value-desktop.png`
- `output/product-design-audit/2026-08-11/03-buy-desktop.png`

Known verification limitations: local shell Node is 26.5.1 while the project and
Vercel target are pinned to Node 20.x; the build passes locally but preview remains
the Node-20 deployment proof. PHP CLI is unavailable locally, so staging must run
`php -l` before the disabled bridge package is uploaded.

### Non-production preview proof — 2026-08-11 16:12 America/New_York

- Deployment: `dpl_C5Rt9Wssh4jGaqo3GHQyTs7a9R34`.
- URL: `https://ask-magic-mike-il5455ptk-eyes-up-industries.vercel.app`.
- Vercel state: `READY`; target: preview; production was not promoted.
- Authenticated preview requests returned HTTP 200 for `/`, `/home-value`, `/buy`,
  `/ask`, `/api/health/live`, and `/api/health/ready`.
- Public health reports environment `preview`, canonical PostgreSQL configured,
  email disabled, and notification mode disabled. No lead or external message was
  created during this smoke test.
- Vercel warns that Node 20 becomes unsupported for deployments created on or
  after 2026-10-01. A deliberate Node 24 compatibility upgrade is a follow-up,
  not an untested runtime change inside this hardening candidate.

### Approved production cutover and controlled QA — 2026-08-11 16:33 America/New_York

- PR `#122` merged to `main` as `38639bc873dda5bd51c261d6f340a84dd9ecef03`.
- Production-target deployment `dpl_4yacS3NeepmZNp4AnamDF6oPA5GW` was built
  with public domain assignment held back. Fifteen public/legal/health routes
  returned HTTP 200, `/admin/leads` returned 401 without authentication, and
  protected health reported production Neon reachable with the complete lead
  schema and notification delivery enabled.
- The first isolated-hostname form attempt failed closed with `origin not
  approved`; it created no lead and sent no message. The candidate was then
  promoted to the canonical domains with prior deployment
  `dpl_SDMv6Nz69aKZJFfmGB54h6MpY5yt` retained as rollback.
- A controlled public home-value submission used the exact marker
  `INTERNAL QA — DO NOT CONTACT`, synthetic contact data, `is_test=true`, and
  `internal_qa / qa / production_cutover` attribution. Lead ID:
  `bbed9a2d-4619-4c18-9298-5167a9694f73`.
- The deterministic score is 90. Exact subject:
  `[TEST] HOME VALUE LEAD | internal_qa | Home Value | INTERNAL QA — DO NOT CONTACT — 999 Verification Way, Wilson, NC | INTERNAL QA | Score 90`.
- The canonical notification record is `sent`, provider `resend`, attempt `1/3`.
  The configured hidden BCC is passed through the provider request without
  rendering its value. Consumer acknowledgment and SMS were suppressed for the
  test record.
- Post-cutover inspection found the protected notification view correctly used
  Neon while the Lead Center inbox still selected the retired Supabase read
  adapter. The follow-up patch makes inbox/detail reads provider-neutral and
  exposes provider message IDs in the protected notification view.

### Lead Center follow-up deployment — 2026-08-11

- PR `#123` passed the Node 20 release gate, including 2,489 unit tests,
  typecheck, lint, build, route-manifest verification, release report, and
  launch-authority report.
- Local verification passed: production build; 13/13 Playwright tests; 14/14
  release safety checks; route manifest; dependency audit; and staged
  high-confidence secret scan.
- Isolated production-target deployment `dpl_BGkVcCMFgeZQgnteRxRUomeJoyRv`
  passed before promotion: Neon reachable and schema ready; Resend, provider
  delivery, and hidden BCC configured; QA lead present in inbox/detail; provider
  message ID rendered without recipient references; anonymous admin returned 401.
- Post-promotion, fifteen required public/legal/health routes returned HTTP 200.
- Audit mailbox search matched the controlled QA lead ID and `[TEST] HOME VALUE
  LEAD` subject. Provider message ID is
  `fe5ab262-6dd4-405b-839b-0da71ab996fa`; canonical outbox status remains sent,
  provider Resend, attempt 1/3.
- WordPress canonical bridge installation succeeded and the health page reports
  `Shadow only — no forwarding` with secrets hidden. A 2026-08-14 re-audit found
  shadow-only observations for forms 6 and 7 and no forwarding attempts.
- Our Town homepage, `/ask-mike/`, and Mike's agent profile remained HTTP 200
  after activation.

## Phase 9 mobile-native publication handoff — 2026-08-23

This downstream candidate performed no Production deployment, database write,
lead submission, email/SMS/Push delivery, native-platform publication,
WordPress/DNS edit, spend, or NellySelly operation.

- Canonical Production was inspected with aggregate-only SQL at
  `2026-08-23T23:21:50Z`: six suppressed test leads, zero live/contactable
  leads, zero owned-demand proof rows, zero source/outcome rows, and zero active
  distribution rows. No identity or contact field was selected.
- Security-focused handoff tests: PASS — 4 files / 50 tests, including all 16
  approved channel/offer placements, separate prepare/share gestures,
  cancellation, unsupported browsers, bounded files, and disguised non-PNG
  rejection.
- Full Vitest suite: PASS — 227 files / 3,043 tests.
- Strict TypeScript and full ESLint: PASS.
- Optimized Next.js 15.5.21 / Node 24 build: PASS — 52 generated pages and 83
  active routes; the protected Distribution Command is 2.84 kB route code.
- Route manifest: PASS — 83 active routes / 17 acknowledged root-`src`
  duplicates.
- Release safety: PASS — 14/14.
- Ask Magic Mike/NellySelly deployable-source isolation: PASS.
- Production dependency audit: PASS — no known vulnerabilities.
- `git diff --check`: PASS.

The first operator tap reads one exact authenticated, same-origin, private
`image/png` asset with `no-store`; the second invokes the OS share chooser.
The client validates canonical host/path/UTMs, safe copy bounds, filename,
media type, five-megabyte maximum, and PNG byte signature. A resolved share
promise records no publication proof and makes no database or provider call.
The existing copy/download and separately gated proof-ledger controls remain
authoritative.

## Phase 9 native-handoff publication-proof return — 2026-08-23

This stacked candidate performed no Production deployment, database write,
lead submission, email/SMS/Push delivery, native-platform publication,
WordPress/DNS edit, spend, secret entry, or NellySelly operation.

- Exact share-to-proof tests: PASS — 10 tests. All 16 native channel/placement
  pairs produce one canonical relative proof URL. Missing, array-shaped,
  unknown, traversal-shaped, non-native, and foreign-origin values fail closed.
- Existing owned-demand command, activation, and append-only proof suites: PASS
  — 4 files / 56 tests.
- Full Vitest suite: PASS — 227 files / 3,045 tests.
- Strict TypeScript and full ESLint: PASS.
- Optimized Next.js 15.5.21 build: PASS — 52 generated pages and 83 active
  routes; `/admin/distribution` remains server-rendered.
- Route manifest: PASS — 83 active routes / 17 acknowledged root-`src`
  duplicates.
- Release safety: PASS — 14/14.
- Ask Magic Mike/NellySelly deployable-source isolation: PASS.
- Production dependency audit: PASS — no known vulnerabilities.
- Release doctor: HEALTHY — its only pre-commit, non-blocking failure was the
  intentionally dirty working tree under verification.
- `git diff --check`: PASS.
- In-app Browser visual/DOM QA: PASS at 1,425×990 and 375×812. The existing
  native-handoff cards showed no horizontal overflow or visual regression; the
  exact Facebook / seller-review return highlighted only the Facebook proof
  card. A non-native placement query rendered zero focused cards and no selected
  notice.

The URL carries only canonical channel and placement identifiers. It never
carries final copy, evidence, approval context, consumer data, credentials, or
secrets. The existing `growth:manage` server-action authorization, Preview
read-only guard, proof validation, deduplication, append-only Neon write, and
audit event were not modified. A resolved share promise merely reveals the
review link; an operator must still observe the platform and deliberately submit
the existing proof form.

## Phase 9 Neon Preview endpoint attestation — 2026-08-23

The release candidate now verifies the actual Neon endpoint before either the
application or QA automation may write in Preview. Full evidence, categorical
health contract, branch/endpoint mapping, tests, and no-action record are in
[`phase9/NEON_PREVIEW_ENDPOINT_ATTESTATION_QA_EVIDENCE.md`](./phase9/NEON_PREVIEW_ENDPOINT_ATTESTATION_QA_EVIDENCE.md).

- Focused security proof: PASS — 5 files / 30 tests.
- Full Vitest: PASS — 228 files / 3,054 tests.
- Typecheck, ESLint, optimized build, 83-route manifest: PASS.
- Release safety: PASS — 14/14.
- Isolation, dependency audit, 571-commit gitleaks, whitespace: PASS.
- Production/Preview database writes, sends, migrations, merges, deployments,
  WordPress/DNS edits, and NellySelly actions: none.

## Phase 9 atomic release-authority reconciliation — 2026-08-23

- Fresh GitHub main: PR #195 merge
  `b450b41c66c6740bd20571cdbe7d8caf82e92d5e`.
- Fresh Vercel Production: `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`, `READY`.
- `pnpm run amm:verify:funnel`: PASS — 15/15.
- `pnpm run smoke:prod`: PASS — 19 pass / two intentional skips / zero fail;
  read-only mode, no session or lead creation.
- `pnpm run monitor-production`: expected gate signal — 8/9. The candidate
  rejects the current Production readiness body because durable rate-limit
  schema/permission/store/secret readiness is not yet proven by the deployed
  contract.
- `tests/scripts/current-release-authority-docs.test.ts`: PASS — 5/5.
- No lead read or write, provider send, environment change, merge, deployment,
  migration, publication, DNS change, deletion, spend, or NellySelly action.
- Detailed evidence:
  [`phase9/ATOMIC_RELEASE_AUTHORITY_RECONCILIATION.md`](./phase9/ATOMIC_RELEASE_AUTHORITY_RECONCILIATION.md).

## Phase 9 organic-search ingress — 2026-08-24

Draft PR #219 adds a protected, safe-off, privacy-minimized owned-page evidence
ingress. Proof passes 39 focused tests, 3,207 full tests, the executable
PostgreSQL 17 atomic/replay/rejection/privilege contract, strict TypeScript,
ESLint, Node 24 optimized build, 92-route manifest, 14/14 safety, system
isolation, dependency audit, staged secret scan, 17/6/0 protected Preview QA,
and 10/10 Playwright scenarios with zero commit calls. Runtime deployment
`dpl_FcBUJ7hDxKu7oeMpXb8UuVHpkkCz` is `READY`; Production is unchanged and no
Search Console access or real report import occurred. Full evidence:
[`phase9/ORGANIC_SEARCH_INGRESS_QA_EVIDENCE.md`](./phase9/ORGANIC_SEARCH_INGRESS_QA_EVIDENCE.md).

## Phase 9 local-profile performance ingress — 2026-08-25

The existing Growth Intelligence system now has a bounded, protected candidate
for reviewed aggregate Google Business Profile performance reports. It retains
no raw CSV, search terms, provider location IDs, credentials, or consumer PII;
it performs no Google call, profile edit, message, or publication.

- Focused contract: PASS — 5 files / 27 tests.
- Full Vitest: PASS — 257 files / 3,234 tests.
- PostgreSQL 17 atomic/replay/rejection/rollback/privilege contract: PASS.
- JS-to-PostgreSQL normalized-payload parity: PASS.
- Node 24 strict TypeScript, ESLint, optimized Next.js 15.5.21 build, 95-route
  manifest, 14/14 release safety, system isolation, dependency audit,
  full-history secret scan, and whitespace checks: PASS.
- Desktop/mobile Playwright: PASS — 2/2, zero commit calls, zero console/page
  errors, no document overflow, and complete responsive metric rendering.
- Immutable exact-head Vercel Preview: READY —
  `dpl_EFb7Vzs65KoNWDXJLNr59caV92fS` at commit `814c2df4c17`.
- GitHub Release Gate run `32808025256`: PASS; protected Preview QA run
  `32808693945`: PASS — 17 checks / six intentional mutation skips / zero
  failures and 12/12 current browser scenarios.
- Release doctor: HEALTHY — its only pre-commit finding was the intentional,
  non-blocking dirty working tree.
- Production/Preview writes, real imports, provider calls, sends, publications,
  merges, deployments, configuration changes, purchases, and NellySelly
  actions: none.

Full evidence:
[`phase9/LOCAL_PROFILE_PERFORMANCE_INGRESS_QA_EVIDENCE.md`](./phase9/LOCAL_PROFILE_PERFORMANCE_INGRESS_QA_EVIDENCE.md).

## Phase 9 WordPress seller-intent truth — 2026-08-29

This Draft candidate performed no Production deployment, WordPress/DNS edit,
database write or migration, lead submission, email/SMS/Push delivery,
provider call, publication, spend, deletion, or NellySelly operation.

- Read-only WordPress surface audit: PASS — 42/42 pages fetched. It confirmed
  three duplicate seller-value pages, two direct-purchase pages, four legacy
  native capture pages, five multiple-capture pages, and Gravity Form 7 on 39
  pages. The new packet deliberately narrows its evidence to page IDs 3631 and
  4364 rather than duplicating that inventory.
- Live `/we-buy-houses/` browser inspection: PASS at 1440×1000 and 390×844;
  zero console warnings/errors, zero horizontal overflow, and no form
  submission. The mobile document/form/control widths were 390/310/268 px.
- Focused contract: PASS — 3 files / 19 tests.
- Full local release gate: PASS — deployable-source isolation, 14/14 release
  safety, 271 files / 3,372 tests, strict TypeScript, full ESLint, optimized
  Next.js 15.5.21 build, and 95 active routes.
- Exact code-bearing GitHub Release Gate: PASS — run `33278194658` on commit
  `750dacc52a16082edcb1ba95ffb34cd543a1221f`, Node 24.
- Immutable code-bearing Preview: READY — deployment
  `dpl_D5x8eKHfbUijo2nDyGCQcrd14B9C` at the same commit.
- Protected Preview QA: PASS — run `33278568998`, 18 checks / six intentional
  mutation skips / zero failures, 15/15 browser scenarios, and
  `PREVIEW_READY`. Desktop and 390 px mobile views showed a contained,
  readable hold with no overlap, truncation, or horizontal overflow.
- Runtime/auth boundary: PASS — anonymous `/admin/distribution` returned 401;
  authenticated page access returned 200. The generic Preview API returned 409
  `rbac_not_enabled`, correctly failing closed because that Preview does not
  carry Production RBAC configuration. Authorization was not weakened and no
  branch secret was added for QA.
- Runtime log review: PASS — expected 401/200/409 requests only, with zero
  warning, error, or fatal entries.
- `git diff --check`: PASS on the code-bearing candidate.

The final documentation-only head is revalidated after push and pinned in the
Draft PR #235 seal so the immutable evidence does not require a
self-referential evidence commit. Production remains PR #209 merge
`a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`; PR #210 remains the first
eligible application candidate.

## Phase 9 WordPress homepage visibility truth — 2026-08-29

Fresh read-only Production evidence overturned the earlier structural-only
homepage readiness result without changing WordPress:

- authenticated Growth/Distribution aggregates: 0 eligible live leads in 30
  days, 0% useful attribution, 0 measured owned placements, and 35 prepared
  placements; the measured constraint is owned-demand activation;
- public server-runtime manifest before the repair: page 149, one exact legacy
  href, one rollback href, zero lookalikes, and structural
  `legacy_match_ready`;
- independent browser DOM: one `askmagicmike.com` anchor with accessible text
  `Start With Your Address`, but `visible=false` before and after carousel wait;
- public source: exact `amm-visual-containment` CSS suppresses `.amm-cta` and
  `.amm-cta--dark` using `display:none !important`;
- corrected v2 live manifest: `hidden_target`,
  `targetVisibility=hidden_by_known_css`, one hidden target, two hidden
  selectors, page ID 149, zero lookalikes, `publicationBlocked=true`, and
  precondition
  `60614f9ce7f7e7fe165a6c3cf0d142a6669faf497fee4f94386aff34827d0638`;
- separate fresh manifests: home-value page 3952 and We Buy Homes page 3631
  remain `visible_candidate` / `legacy_match_ready`; neither was published;
- focused contract/route verification: PASS — 2 files / 16 tests;
- exact Node 24.18.0 release gate: PASS — system isolation, 14/14 safety, 271
  files / 3,374 tests, strict typecheck, full ESLint, optimized Next.js 15.5.21
  build with 59 static pages, and 95 active / 17 acknowledged routes;
- Production dependency audit: PASS — no known vulnerabilities;
- `git diff --check` and redacted Gitleaks delta scan: PASS;
- official WordPress revision, GA4 manual-tagging, and Google canonical guidance
  rechecked from primary sources; none treats hidden markup as a visible
  placement or grants publication authority.

No Production/Preview deployment, WordPress edit, revision, cache purge,
database write or migration, lead submission, analytics write, email/SMS/Push,
provider action, social publication, DNS change, spend, deletion, or
NellySelly interaction occurred. Exact-head CI, immutable Preview, protected
no-write browser QA, runtime logs, and final secret scans remain to be bound to
the Draft candidate seal.

## Phase 9 WordPress homepage CTA restoration packet — 2026-08-29

Authenticated WordPress inspection identified the exact source of the hidden
homepage CTA and confirmed the existing lead path without changing either:

- active Lead Ops plugin version `2.10.0`, source SHA-256
  `41de351d57e91b8ecf1d611d8b052381166effaf693319b0f9e8da32f5d8e972`;
- one `wp_head` homepage rule hiding `.amm-cta` / `.amm-cta--dark`;
- one separate output-buffer filter hiding only `.amm-widget`;
- Canonical Bridge `1.1.0`, signing secret configured, allowlist limited to
  Form 3, and the controlled Form 3 acceptance entry forwarded in one attempt;
- Form 3's sole Gravity Forms Admin Notification inactive, so the canonical
  backend remains the one internal notification owner; and
- no WordPress setting, plugin file, page, form, cache, database, lead,
  notification, provider, DNS, or NellySelly mutation.

The offline packet changes only the plugin header version, class version, and
the exact homepage suppression branch. Proposed SHA-256:
`6b9a30de24e3fbbbac5aa49def7552afd6b2e21b7ede7beafa8ad095d9a9f44c`.
It preserves the current CTA href, public phone, Form 3, Canonical Bridge, and
floating-widget suppression. Focused/full release verification and exact-head
candidate evidence follow after implementation review.

Pre-publication visual QA used a localhost-only transformation of the fresh
public homepage. It removed the one reviewed hide rule in memory, stripped 64
scripts and two iframes, and blocked scripts, connections, frames, and form
actions through CSP. It did not save or submit the page.

- Desktop 1440x1000: CTA visible at 920x339 px; one exact tracked anchor; no
  horizontal overflow; zero active scripts/iframes.
- Mobile 390x844: CTA visible at 355 px wide; button 317x76 px; no horizontal
  overflow; zero active scripts/iframes.
- Keyboard: the native anchor remained in tab order and accepted focus with a
  visible browser outline.
- Visual inspection: Black Diamond panel, Mike image, address-first copy,
  public `252-243-7700` phone, and surrounding brokerage hero remained
  contained. Script-dependent icon glyphs were intentionally not an acceptance
  signal in this no-script preview.

Final exact-engine acceptance used Node `24.18.0`:

- deployable-source/NellySelly isolation: PASS;
- release safety: 14/14 PASS;
- Vitest: 273 files / 3,383 tests PASS;
- strict TypeScript: PASS;
- full ESLint: PASS;
- optimized Next.js 15.5.21 build: PASS, 59 static pages;
- route manifest: PASS, 95 active / 17 acknowledged duplicate routes;
- Production dependency audit: no known vulnerabilities; and
- `git diff --check`: PASS.

## Phase 9 cumulative growth Production cutover hardening — 2026-08-29

The four additive growth migrations already included in Draft PR #238 now have
one executable, fail-closed cutover instead of four manual SQL paths.

Exact local engine: Node `24.18.0`.

- Offline source verification: PASS — all four reviewed SHA-256 values match;
  no connection was opened and no credential was printed.
- Focused cutover interlocks: PASS — 1 file / 9 tests covering exact approval,
  disabled import gates, mode conflicts, hash and transaction-envelope drift,
  canonical absent-target preflight, ledger drift, owner/RLS/privilege/function
  and trigger hardening, zero cutover receipts, backup, bounded locks, atomic
  commit/rollback, and credential redaction.
- Forced lint of the normally ignored operator script and its test: PASS.
- Disposable database execute/verify: PASS on PostgreSQL `17.11 (Homebrew)` —
  four migrations, four migration-ledger rows, zero growth rows, zero receipt
  rows, all target tables/functions/triggers hardened, and the retired-metric
  guard present and enabled.
- Disposable backup proof: PASS — custom-format backup, mode-600 path contract,
  45,437 bytes, 93 validated restore entries. The temporary cluster and proof
  database were stopped and removed.
- Full release gate: PASS — system isolation, 14/14 release safety, 274 files /
  3,392 tests, strict TypeScript, full ESLint, optimized Next.js `15.5.21`
  build with 59 static pages, and 95 active / 17 acknowledged routes.
- Production dependency audit: PASS — no known vulnerability at severity high
  or above.
- Full-history redacted Gitleaks: PASS — 714 commits / approximately 18.47 MB,
  no leaks.
- Exact staged-delta redacted Gitleaks: PASS — approximately 51.51 KB, no
  leaks.
- `git diff --check`: PASS.

No Production/Preview deployment, Neon query or migration, Vercel environment
change, WordPress edit, provider call, lead submission, analytics write,
email/SMS/Push, DNS change, publication, spend, deletion, or NellySelly action
occurred during this proof. Hosted exact-head CI, immutable Preview, protected
no-write browser QA, runtime-log review, and final staged secret scanning remain
required before the cumulative approval gate becomes requestable.
