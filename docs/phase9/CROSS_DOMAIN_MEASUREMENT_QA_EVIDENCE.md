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
- Focused privacy/KPI Vitest: 5 files / 31 tests pass.
- Full Vitest: 217 files / 2,969 tests pass.
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

## Pending exact-head evidence

Before requesting Production authority, attach:

- exact Node 24 GitHub CI run and artifact digest;
- immutable Vercel Preview deployment ID/URL, READY status, and exact candidate
  commit metadata; and
- protected Preview proof that no GTM script, consent panel, Google request,
  application POST, lead, email, SMS, Push, or database mutation occurs.

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
