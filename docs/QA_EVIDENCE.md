# QA Evidence

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
- Exact Node 24 fast-track acceptance passes 4 focused files / 42 tests, the
  complete 220-file / 2,991-test suite, strict typecheck, ESLint, optimized
  build with 52 static pages, 82/17 route proof, system isolation, release
  safety 14/14, dependency audit, diff/migration integrity, and staged redacted
  secret scan.
- Optimized local Buyer and Renter acceptance at 390×844 confirms one main, no
  horizontal overflow, zero console warnings/errors, first and repeated Email
  focus recovery, exact `renter_page` payload identity, immutable Buyer first
  touch, and refreshed Renter last touch. Every lead/event request was mocked.
- Draft PR #203 application head
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

- Final read-only live loader acceptance at 21:27 America/New_York — PASS. The exact
  public homepage, established home-value page, We Buy Homes page, and public
  WordPress page index were fetched through exact-host HTTPS allowlists. All
  three manifests reported `legacy_match_ready`, their reviewed page IDs
  (149, 3952, and 3631), one current/rollback href, one canonical proposed
  href, deterministic SHA-256 evidence, `publicationAuthorized=false`, and
  `mutationPerformed=false`.
- Focused WordPress/change-set matrix — PASS: 3 files / 18 tests. Coverage
  includes exact legacy and already-canonical states; duplicate, missing,
  foreign, insecure, lookalike, page-ID drift, and page-index failures; raw
  HTML/telephone exclusion; deterministic hashing; API RBAC/no-store headers;
  existing surface-audit compatibility; and database placement-registry parity.
- Full local release gate — PASS: system isolation, 14/14 safety controls, 215
  test files / 2,958 tests, strict TypeScript, full ESLint, optimized Next.js
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
  gitleaks, candidate-pattern, and patch-integrity scans passed with no secret
  finding.
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
