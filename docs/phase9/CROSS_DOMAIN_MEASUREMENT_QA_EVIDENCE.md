# Phase 9 Cross-Domain Measurement QA Evidence

Date: 2026-08-25

Consolidated branch:
`codex/phase9-cross-domain-measurement-consolidation-20260825`

Cumulative base: exact PR #220 head
`5e605ca8bd8b313f7a4c29b2d1220c7c40a477a3`

Imported source: exact PR #212 head
`758154ca73b64f24f2df8f183ba8b3f6f82f769a`

Consolidation rescue ref:
`rescue/amm-pr220-pre-cross-domain-consolidation-20260825-0042`

WordPress pre-change rescue ref:
`rescue/amm-pr212-pre-wordpress-consent-bridge-20260824-0244`

## Consolidated-branch local evidence

- Reused the complete PR #212 implementation, package, and runbooks; no second
  analytics store, WordPress bridge, identity, or deployment path was created.
- Conflict resolution preserves the cumulative train's canonical funnel UUID,
  server-owned conversion outcomes, Web Vitals, dedicated no-write interceptor,
  and exact application-origin checks. A query-only navigation into internal QA
  now tears down an already-loaded analytics runtime and reloads cleanly.
- Focused integration/privacy/WordPress verification: 9 files / 77 tests pass.
- Complete Node 24.18.0 release gate: system isolation, 14/14 safety checks,
  261 test files / 3,275 tests, strict typecheck, full ESLint, optimized Next.js
  15.5.21 build, and 95 active routes / 17 acknowledged duplicates pass.
- Isolated local Chromium: 4/4 scenarios pass. The analytics-isolation scenario
  proves no consent surface, GTM script, dedicated data layer, runtime marker,
  analytics request, or first-party mutation. Widget happy/error commands are
  intercepted, automated analytics/experiment requests remain absent, and the
  shared skip link transfers focus correctly.
- The first consolidated browser run exposed two harness-only conflicts: the
  Preview helper still overrode the isolated port with localhost:3000, and the
  older scenarios expected automated analytics writes that PR #212 correctly
  suppresses. Both contracts are repaired and covered by static regression
  tests; no request reached the wrong application and no durable write occurred.
- PHP 8.1 syntax, ZIP integrity, source/archive parity, checksum verification,
  and `git diff --check` pass for canonical bridge 1.2.0.
- The current public read-only preflight returns truthful `HOLD`: approved
  container `GTM-KZMCSLTJ` and destination `G-RQRBB1G270` remain detectable,
  Ask server HTML is tag-inert, NellySelly collision is false, the canonical
  Basic Consent gate is absent, and legacy GTM head/noscript bootstraps remain.
  The verifier made no consent choice, form, account, database, or deployment
  write.
- Production dependency audit reports no known vulnerability. Gitleaks scans
  the 123.24 KB staged candidate and all 636 commits with no leak. The migration
  diff is empty, and `.env.example` contains only the public configuration name
  plus safe comments.
- Exact-head CI, immutable Vercel Preview, protected dispatcher, deployment-log,
  dependency, and secret evidence remain pending until the merge commit is
  pushed. Production and WordPress activation remain unchanged.

## Canonical WordPress bridge 1.2.0 consent repair candidate

- The existing canonical plugin was extended in place; no second plugin,
  consent banner, analytics property, lead database, or notification path was
  added.
- Lead forwarding remains independently controlled by
  `AMM_CANONICAL_BRIDGE_ENABLED` plus its existing per-form allowlist.
  Measurement independently defaults off behind
  `AMM_GOOGLE_MEASUREMENT_ENABLED === true`.
- The same-origin loader is rendered at `wp_head` priority 0, is pinned to
  `GTM-KZMCSLTJ`, and requires the existing provider cookie to equal the exact
  value `vv_cookieconsent_status=allow` before creating `dataLayer` or a Google
  request.
- Behavioral coverage proves missing, deny, dismiss, unknown, malformed,
  wrong-container, and wrong-cookie states fail closed; explicit allow loads
  one exact GTM runtime without duplication; an asynchronous allow is observed.
- Static security coverage rejects dynamic-code execution, HTML injection,
  cross-window messaging, and browser-navigation primitives in the loader.
- The public preflight now recognizes only the canonical Basic Consent marker,
  requires it before the existing cookie provider, and independently rejects a
  legacy GTM bootstrap, GTM noscript bypass, alternate container, Ask-side
  preconsent Google runtime, and NellySelly identity collision.
- Focused Vitest: 3 files / 23 tests pass. PHP 8.1 CLI syntax check in an
  isolated container: no syntax errors. `git diff --check`: pass.
- Full local Node 24 release gate: system isolation pass, release safety 14/14,
  219 test files / 2,990 tests, strict typecheck, full ESLint, optimized Next.js
  build, and 82 active routes / 17 acknowledged duplicates — pass.
- Release archive:
  `output/release/ask-magic-mike-canonical-bridge-1.2.0.zip`.
  SHA-256:
  `9b9534e7fdf078b60ed4f32c72fad93ed7632cf5702fc9a4fa58eefe26bf902c`.
  The consolidation refresh changes only the README rollback instruction so it
  does not recommend restoring the legacy pre-consent GTM bootstrap; source,
  archive, and sidecar are verified together on the consolidated branch.
  Preserved 1.1.0 and 1.0.0 rollback archives remain untouched.
- No WordPress file, setting, page, form, cookie, cache, GTM/GA4 account,
  Production deployment, lead, notification, database row, or NellySelly
  system was changed while preparing this package.

## Completed local evidence

- Read-only live audit: Our Town HTTP 200 with one GTM container; Ask Magic
  Mike homepage and `/ask` HTTP 200 with no external tag.
- Full repository-history search: no prior GTM loader or `NEXT_PUBLIC_GTM_*`
  implementation found.
- Focused privacy/KPI and release-harness Vitest: 5 files / 35 tests pass.
- Full Vitest: 217 files / 2,972 tests pass.
- Strict TypeScript: pass after the optimized build completed.
- Full ESLint: pass.
- Optimized Next.js build: pass; 52 generated static pages.
- Route manifest: 82 active routes pass.
- Release safety: 14/14 pass; system isolation: pass.
- Release doctor: 43/43 pass on the committed clean tree.
- Production dependency audit: no known vulnerabilities.
- Gitleaks full-history scan: 577 commits, no leaks.
- Database migration diff: empty.
- `git diff --check`: pass.
- Production-base drift: pass after authenticated refresh;
  `origin/main=b450b41c66c6740bd20571cdbe7d8caf82e92d5e`.
- Production-simulated Playwright checks: automation produced GET-only traffic;
  a simulated human rendered the accessible consent panel with no Google script
  or data layer before choice, loaded only the exact approved GTM URL after
  grant, kept all advertising purposes denied, and removed the runtime/queue on
  revoke. Desktop and 390x844 mobile screenshots passed visual inspection.

The focused contracts prove:

- exact Our Town container allowlisting and NellySelly/mistyped-container
  rejection;
- Production-only configuration resolution;
- canonical public-route restriction;
- Preview, automation, private/admin, operational, embed/widget, and internal-QA
  exclusion;
- no script or data layer before an explicit grant;
- denied Consent Mode v2 defaults before the analytics-only update;
- advertising storage/user-data/personalization remain denied;
- flat sanitized event publication only while the consented runtime is active;
- dedicated `ammDataLayer` isolation and stale pre-load queue removal on revoke;
- no dead preferences control when external analytics is unavailable;
- clean reload when a loaded public runtime enters an excluded route;
- client and API-level exclusion of HeadlessChrome/Playwright/Puppeteer KPI
  writes, including experiment exposure;
- decline persistence and no Google loader;
- footer preference reopening and accessible controls; and
- continued sanitized server-ledger publication independent of the GTM gate.

## Exact-head CI and Preview evidence

Initial code-bearing commit `a16e8d63607be77168fe4d65c4a4fdd4accbf7fb`
passed GitHub Node 24 release run
[`32690780827`](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32690780827):

- 217 test files / 2,969 tests, strict typecheck, full ESLint, optimized build,
  82-route manifest, 14/14 release safety, and 43/43 release doctor passed;
- release artifact `9507217836`, digest
  `sha256:d4df2aa451530fa59acc5099875b619062d3e84a72f4ddeee0a43cf09fe0be7e`;
- Vercel Preview deployment `dpl_2i9oeFx4y77bFc9fy2stojYPbnWZ` reached
  READY at
  `https://ask-magic-mike-cuq63lasx-eyes-up-industries.vercel.app`; and
- both Vercel checks passed on the same commit.

Protected no-write dispatcher run
[`32691073871`](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32691073871)
checked out the exact commit, hard-pinned `SAFE_DB_WRITE=false`, and passed:

- 17 read-only Preview checks, six intentional mutation skips, and zero
  failures;
- both intercepted widget browser scenarios with zero unexpected tests;
- `PREVIEW_READY` launch authority;
- artifact `9507311595`, digest
  `sha256:fbfe5d2b25d2ba1e5fe80a72f5461d2c358a7aeeddab88b4494a3bb56ddfe0d9`.

The follow-up release-gate hardening adds explicit protected-Preview HTML and
Playwright assertions for no consent surface, no approved GTM marker, no Google
measurement request, no analytics data layer, and no application write. All
three isolated local Chromium scenarios pass. Final exact-head evidence for
that release-harness/documentation commit is attached to the Draft PR after CI
and the protected dispatcher complete.

Release-harness commit `90857fe2fd904474f51e995c8a0dadbaa49fdeb0`
passed exact Node 24 run
[`32691794254`](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32691794254)
and READY Preview deployment `dpl_3Wpmi9gqHphqCVsBKtWAgebXPLUf`. The release
artifact is `9507538658`, digest
`sha256:d489dc3d4d96a498a698f530c1e657340a2628c19df1f900f853d20db5e688e7`.

Its first protected dispatcher run
[`32691992594`](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32691992594)
passed 18 read-only checks—including `preview:external_analytics_off`—with six
intentional mutation skips and zero failures. Both existing widget scenarios
passed. The new browser assertion alone failed because it intercepted an
external Vercel protection-platform `POST /login/validate` and classified every
mutating URL as an application write. The request was fulfilled locally by the
runner and did not leave the browser. The assertion now counts writes only on
the exact Ask Magic Mike application origin while still intercepting every
mutating request on every origin. A clean exact-head rerun is required.

During the local rerun, port 3000 belonged to an unrelated CaseFile Truth
development server. The prior shared Playwright configuration reused it, which
correctly failed the widget assertions but could have produced a false result
for a generic absence check. No process was stopped or altered. Local Ask Magic
Mike E2E now owns loopback port 3210 by default and refuses server reuse; a port
collision fails visibly. Protected Preview runs remain bound to their exact
Vercel URL.

## Local tooling disclosure

An authenticated `vercel curl` attempt from the previously unlinked worktree
created empty helper project `amm-phase9-cross-domain-measurement-20260824-001`
(`prj_o4fTpG5p5yx1lmYDjd55orc67WzT`). It did not receive code, a Production
deployment, domain, environment value, or canonical-project mutation. The
worktree is now linked locally to canonical project `ask-magic-mike`
(`prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`). The empty helper remains untouched until
a separate exact cleanup approval is granted.

## Observed live test telemetry

At `2026-08-24T04:24:27Z`, the first Playwright local-routing command failed
before navigation. Hydrating the live `/home-value` page then caused the
already-deployed first-party client to send two automatic, sanitized telemetry
requests with a `HeadlessChrome/151` user agent:

- `/api/events` accepted one `page_view` with HTTP 202, Vercel request
  `iad1::iad1::npq7r-1787545467160-3c5caa4dcdf3`; under the current API contract
  this means one event was persisted.
- `/api/experiments/event` accepted one exposure attempt with HTTP 202, Vercel
  request `iad1::iad1::vdtm5-1787545467162-594247935f4a`; that endpoint can
  return 202 with `recorded=false`, and the unavailable response body prevents
  a stronger claim.

No lead, contact identity, email, BCC, SMS, Push, notification, appointment, or
consumer acknowledgment was created. No Production data was deleted or altered
afterward. The candidate now blocks automation in both clients and APIs; any
cleanup of the one confirmed telemetry row remains a separate Production-data
approval decision.

## Follow-up brokerage consent-order audit

Authenticated read-only browser and public-source inspection on 2026-08-24
found stronger evidence than the earlier server-HTML-only note:

- the rendered Our Town homepage exposes a **Cookie Policy** choice with
  **Decline** and **Allow cookies**;
- the server HTML starts `GTM-KZMCSLTJ` synchronously, then references the
  cookie-choice provider with a deferred script;
- the public GTM payload contains destination `G-RQRBB1G270`, configured as a
  Google tag that fires on `gtm.init`;
- no default-denied consent command preceding the GTM bootstrap was detectable
  in the public page source;
- the Ask Magic Mike homepage remains free of a server-side Google bootstrap;
- the Our Town homepage has one canonical Ask Magic Mike CTA with registered
  `ourtownproperties` / `homepage_cta` / `website_widget` attribution; and
- no NellySelly container or domain identity appeared in the inspected public
  measurement sources.

This evidence makes activation `HOLD` until brokerage consent sequencing and
authenticated GTM/GA4 configuration are repaired or explicitly approved. The
new `pnpm run amm:verify:cross-domain` operator preflight encodes the public,
read-only portion of that boundary and fails closed while the current order
persists.

The browser page load may have generated an ordinary event in the already-live
Our Town Google tag because that tag currently initializes before the visible
choice. No consent button was clicked, form submitted, page edited, account
setting changed, or Production data cleanup attempted.

## Explicit non-actions

Except for the two disclosed Ask Magic Mike telemetry attempts and the possible
existing Our Town page-view described above, preparing and testing this branch
performs no Google/GA4/GTM mutation, Vercel environment
change, Production deployment, database migration, lead submission, email/BCC,
SMS, Push, consumer acknowledgment, WordPress edit, external publication,
spend, DNS/cache change, deletion, or NellySelly action.
