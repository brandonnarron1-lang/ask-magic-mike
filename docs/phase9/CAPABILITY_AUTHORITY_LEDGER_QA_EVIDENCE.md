# Phase 9 Capability Authority Ledger QA Evidence

Date: 2026-08-29

Status: behavior-bearing head accepted; final evidence-only seal pending

## Scope and release identity

- branch: `codex/phase9-capability-ledger-20260828`
- exact sealed parent: `8c4d637207b2252520d61a005e193e370567c5cc`
- parent candidate: Draft PR 229
- behavior-bearing candidate head:
  `20dd97ed44d692103e3e2e1935950a4e31467b5d`
- accepted Production authority: PR 209 merge
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`
- first pending application candidate: Draft PR 210
- Production application, Vercel Production configuration, and canonical Neon
  Production were not changed.

The candidate adds one pure capability model and one read-only section to the
existing protected Growth Command Center. It does not add another dashboard,
database, CRM, route, migration, provider, form, notification engine, or
automation subsystem.

## Focused and full verification

Commands ran with Node 24.18.0 and pnpm 10.30.3:

```text
pnpm exec vitest run tests/adminops/growth-capability-ledger.test.ts tests/adminops/admin-growth-route-guards.test.ts tests/scripts/current-release-authority-docs.test.ts --reporter=dot
ADMIN_SECRET=changeme-local AMM_E2E_PORT=3217 playwright test tests/e2e/growth-decision-packets-preview.spec.ts --reporter=line
pnpm run release:gate
pnpm audit --prod --audit-level=high
gitleaks git --redact --no-banner --log-opts='--all'
gitleaks git --staged --redact --no-banner
pnpm run amm:verify:social-preview
git diff --check
```

Results:

- focused capability/auth/authority coverage: 3 files / 33 tests passed;
- focused protected browser coverage: desktop and mobile, 2/2 passed;
- system isolation: passed; no deployable NellySelly identifier;
- release safety: 14/14 passed;
- full Vitest suite: 267 files / 3,346 tests passed;
- strict TypeScript: passed;
- full ESLint: passed;
- Next.js 15.5.21 optimized build: passed;
- static generation: 59 pages;
- route manifest: 95 active / 17 acknowledged duplicates passed;
- Production dependency audit: no known vulnerabilities;
- full redacted Git-history scan: 677 commits / 16.36 MB / no leaks;
- exact staged truth-reconciliation delta: 7.04 KB / no leaks;
- whitespace check: passed.

A diagnostic whole-directory scan also traversed ignored `.next` build output
and inherited test/evidence fixtures. Its 11 matches were eight generated
`.next` cache/manifest matches and three unchanged tracked fixture matches. The
commit-aware 677-commit scan and exact staged-delta scan both passed; no matched
value was printed, copied, or added to evidence.

## Desktop and mobile visual acceptance

The local protected route was tested at:

- desktop: 1440×1000;
- mobile: 390×844.

Acceptance results for both viewports:

- HTTP 200;
- pointer opens the native details disclosure;
- keyboard Enter closes and reopens it;
- 11 capability decision cards;
- two exact current/future gates only: the PR #230 application gate and the
  Our Town consent-runtime gate;
- state distribution: three Production, two candidate, two operator, one host,
  two external-dependency, and one prohibited;
- the completed Facebook-crawler approval phrase is absent;
- the consumed PR #209 durable-rate-limit approval phrase is absent;
- the root/WHM access dependency is present;
- document and body widths equal the viewport width;
- every ledger action link meets the tested 40-pixel target minimum;
- zero console warnings/errors, page errors, failed requests, external
  requests, or mutation requests;
- axe WCAG 2 A/AA and 2.1 A/AA: zero violations.

The first visual pass found low contrast on the new domain labels and inherited
footer text plus an inherited unfocusable horizontal economics region. The
candidate corrected the label/footer contrast and added a named keyboard-focus
region with a visible focus treatment. The final pass is clean. Full-page
screenshots and the machine-readable report remain in the ignored local
`artifacts/capability-ledger-qa/` directory and are not part of deployable
source.

## Protected Preview selector hardening

The first protected Preview workflow completed its release-safety scan, unit
tests, typecheck, lint, build, release doctor, and read-only Preview QA. Its
mutation-free browser step then rejected two assertions because a global
`.first()` locator selected an identically named metric inside the existing
collapsed baseline-evidence disclosure instead of the visible performance
metric. The report recorded 13 expected tests and two unexpected selector
failures; it did not record a product error, failed durable write, external
request, or mutation.

The browser contract now scopes the three economics assertions to the named
`Growth performance metrics` region. The focused desktop/mobile suite and the
full release gate pass locally. A fresh exact-head protected Preview run is
required after this hardening commit; the failed run is retained as evidence
rather than hidden or relabeled.

## Approved host test reconciliation

While this candidate was being verified, the exact narrow Our Town crawler
test approval was received and consumed. The account-root directive parsed but
could not supersede the server-global Apache authorization decision; the live
matrix remained 40/42. The original `.htaccess` was restored to the same
SHA-256 as its retained backup, and the backup was moved outside the public
document root.

Post-rollback checks confirmed normal browser 200s, Facebook-crawler denial on
non-allowlisted and sensitive routes, and no active host override. The
supported per-vhost include is root-owned. The ledger therefore does not repeat
the consumed gate and directs the next action only to a root/WHM hosting
administrator.

Detailed host evidence:
[`OTP_FACEBOOK_CRAWLER_ACCOUNT_OVERRIDE_TEST_2026-08-28.md`](./OTP_FACEBOOK_CRAWLER_ACCOUNT_OVERRIDE_TEST_2026-08-28.md).

A fresh read-only live verifier after the authority reconciliation reproduced
the expected 40/42 boundary: every Ask Magic Mike crawler check passed, normal
browsers and four non-Facebook social crawlers passed on both Our Town pages,
and only Facebook remained denied with HTTP 403 on `/ask-mike/` and Mike's
agent profile. No request used a mutating method and no host policy changed.

## Immutable behavior-bearing proof

- GitHub exact-head Release Gate run `33251641125` passed against full SHA
  `20dd97ed44d692103e3e2e1935950a4e31467b5d` in 3m38s. Its
  `release-gate-artifacts` artifact is `9714580519`, digest
  `sha256:20a240fffa93460d72c40be4708848192509b92ec2cfeb365be4df391a492b10`.
- Vercel Preview deployment `dpl_7q3dL5CHBMRAXDdp7qs1LmnfqXDV` is `READY`
  at `https://ask-magic-mike-c5pmtkii1-eyes-up-industries.vercel.app` with
  target `preview`, branch `codex/phase9-capability-ledger-20260828`, full build
  commit `20dd97ed44d692103e3e2e1935950a4e31467b5d`, and Node 24 runtime.
- Protected no-write run `33251829052` passed in 4m10s. Its
  `preview-qa-dispatch-artifacts` artifact is `9714641968`, digest
  `sha256:9c344ec5027e34f180541d4146375f73e9a88afc92a9fdfc21761e998b338b70`.
- The protected artifact reports 43/43 release-doctor checks, 14/14 safety,
  18 Preview checks passed, six intentional write skips, zero failure, four
  expected browser tests, zero unexpected/flaky/skipped browser tests,
  release-candidate `GO`, and launch authority `PREVIEW_READY`.
- Vercel protection was accepted by the redacted automation header. The exact
  Preview database was reachable and schema-ready, while the mutation gate
  remained blocked because `SAFE_DB_WRITE=false`; live email and SMS were also
  disabled. No lead, event, note, task, SLA write, webhook write, email, SMS, or
  Push occurred.
- The QA request window produced 38 Vercel runtime records, all `info`: 31 HTTP
  200, four 204, one 307, the expected invalid-token 404, and the expected
  fail-closed Preview cron 503. Methods were 34 GET and four OPTIONS; there was
  no POST/PATCH/PUT/DELETE and no warning, error, or fatal record.

## No-action boundary

No merge, Production deployment, Vercel Production environment change, Neon
migration/write, lead/test submission, email/SMS/Push, WordPress content/form
publication, DNS change, provider activation, paid spend, public post, data
deletion, or NellySelly action occurred.

## Final evidence-only seal boundary

This documentation update changes no executable behavior. After it is committed
and pushed, the final documentation-only head still requires a fresh exact-head
GitHub Release Gate, a matching READY Preview identity, clean/mergeable Draft PR
proof, and confirmation that canonical Production still owns its recorded
baseline. The accepted behavior-bearing Preview proof above remains immutable.

PR #209's durability gate is consumed. This candidate cannot bypass PR #210 or
any later predecessor and cannot reuse historical Production authority.
