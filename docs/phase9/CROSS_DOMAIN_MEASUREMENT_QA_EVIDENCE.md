# Phase 9 Cross-Domain Measurement QA Evidence

Date: 2026-08-24

Branch: `codex/phase9-cross-domain-measurement-20260824`

Production base: `b450b41c66c6740bd20571cdbe7d8caf82e92d5e`

Rescue ref: `rescue/amm-pre-cross-domain-measurement-20260824-0010`

## Completed local evidence

- Read-only live audit: Our Town HTTP 200 with one GTM container; Ask Magic
  Mike homepage and `/ask` HTTP 200 with no external tag.
- Full repository-history search: no prior GTM loader or `NEXT_PUBLIC_GTM_*`
  implementation found.
- Focused privacy/KPI and release-harness Vitest: 5 files / 34 tests pass.
- Full Vitest: 217 files / 2,971 tests pass.
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

## Explicit non-actions

Except for the two disclosed automatic telemetry attempts above, preparing and
testing this branch performs no Google/GA4/GTM mutation, Vercel environment
change, Production deployment, database migration, lead submission, email/BCC,
SMS, Push, consumer acknowledgment, WordPress edit, external publication,
spend, DNS/cache change, deletion, or NellySelly action.
