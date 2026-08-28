# Phase 9 Capability Authority Ledger QA Evidence

Date: 2026-08-28

Status: local candidate accepted; immutable exact-head evidence refresh pending

## Scope and release identity

- branch: `codex/phase9-capability-ledger-20260828`
- exact parent: `0a139e41a565a3ff7a672b0a41a27d7c8a1ea07f`
- parent candidate: Draft PR 229
- first Production authority: Draft PR 209
- Production application, Vercel Production configuration, and canonical Neon
  Production were not changed.

The candidate adds one pure capability model and one read-only section to the
existing protected Growth Command Center. It does not add another dashboard,
database, CRM, route, migration, provider, form, notification engine, or
automation subsystem.

## Focused and full verification

Commands ran with Node 24.18.0 and pnpm 10.30.3:

```text
pnpm vitest run tests/adminops/growth-capability-ledger.test.ts tests/adminops/admin-growth-route-guards.test.ts
ADMIN_SECRET=changeme-local AMM_E2E_PORT=3217 playwright test tests/e2e/growth-decision-packets-preview.spec.ts --reporter=line
pnpm run release:gate
pnpm audit --prod --audit-level=high
git diff --check
```

Results:

- focused capability/auth coverage: 2 files / 11 tests passed;
- focused protected browser coverage: desktop and mobile, 2/2 passed;
- system isolation: passed; no deployable NellySelly identifier;
- release safety: 14/14 passed;
- full Vitest suite: 267 files / 3,316 tests passed;
- strict TypeScript: passed;
- full ESLint: passed;
- Next.js 15.5.21 optimized build: passed;
- static generation: 59 pages;
- route manifest: 95 active / 17 acknowledged duplicates passed;
- Production dependency audit: no known vulnerabilities;
- whitespace check: passed.

## Desktop and mobile visual acceptance

The local protected route was tested at:

- desktop: 1440×1000;
- mobile: 390×844.

Acceptance results for both viewports:

- HTTP 200;
- pointer opens the native details disclosure;
- keyboard Enter closes and reopens it;
- 11 capability decision cards;
- two exact **unconsumed** gates only;
- state distribution: three Production, two candidate, two operator, one host,
  two external-dependency, and one prohibited;
- the completed Facebook-crawler approval phrase is absent;
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

## No-action boundary

No merge, Production deployment, Vercel Production environment change, Neon
migration/write, lead/test submission, email/SMS/Push, WordPress content/form
publication, DNS change, provider activation, paid spend, public post, data
deletion, or NellySelly action occurred.

## Remaining immutable proof

After commit and push, this candidate still requires:

1. exact-head GitHub Release Gate;
2. immutable Vercel Preview identity;
3. protected no-write Preview QA;
4. clean/mergeable Draft PR evidence; and
5. confirmation that canonical Production still owns its recorded baseline.

This candidate cannot bypass PR 209 or consume the first Production gate.
