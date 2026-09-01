# CI Recovery Report

Updated 2026-09-01. This report contains infrastructure identifiers and
aggregate health evidence only. It contains no database credentials, provider
tokens, lead data, notification recipients, or private BCC values.

## Executive result

Ask Magic Mike Production is healthy again. The canonical
`https://www.askmagicmike.com/api/health/ready` endpoint returns HTTP 200 and
reports every required database, lead-capture, notification, RBAC, durable
rate-limit, and push-readiness flag as true. The recovery reused the accepted
application commit and canonical Neon database; it did not create a new app,
database, lead store, notification service, or NellySelly dependency.

## Canonical identities

| System | Canonical identity |
| --- | --- |
| GitHub | `brandonnarron1-lang/ask-magic-mike`, default branch `main` |
| Accepted source | `cef0f366380e2e8aa95a70cf45a70830d7997d45` |
| Vercel | team `eyes-up-industries`, project `ask-magic-mike` |
| Neon | organization `org-royal-tooth-46065082`, project `bitter-star-20214385` |
| Neon Production | branch `br-round-base-auh6h2wd`, database `neondb`, runtime role `service_role` |
| Production URL | `https://www.askmagicmike.com` |

NellySelly remains isolated in its separate organization and project. No
NellySelly environment, deployment, database, branch, or domain was read from
or changed during the repair.

## Incident chronology and root cause

- Scheduled run `33357386870` was the last green run before the incident.
- Run `33360557108` was the first failure: ten of eleven route contracts passed,
  while production readiness returned HTTP 503 and database-dependent checks
  were false.
- The hourly job then produced nineteen consecutive failures on the unchanged
  accepted commit. The last inspected failed run was `33450409852`.
- Canonical Neon read-only inspection proved that the Production branch,
  database, runtime role, capture function, lead and notification tables,
  migration ledger, RBAC objects, and durable rate-limit objects were present
  and correctly privileged.
- The evidence-supported root cause was Production runtime database-credential
  drift: Vercel's sensitive `DATABASE_URL` no longer established the healthy
  canonical Neon runtime path. It was not an application-code regression, a
  missing schema migration, Neon plan exhaustion, or a NellySelly collision.

The noisy hourly workflow was disabled during diagnosis so it could not keep
creating duplicate red runs against the same unchanged fault.

## Recovery action

After the explicit secure replacement and redeployment approval:

1. Neon Connect was pinned to the canonical Production branch, `neondb`, the
   pooled endpoint, and the least-privilege `service_role` runtime identity.
2. A live read-only capability query proved the credential before cutover.
3. Vercel's sensitive Production `DATABASE_URL` was atomically replaced through
   its secure environment interface. The value was passed only through process
   memory and was never printed, saved to a file, committed, or placed in a
   command argument.
4. The exact previously accepted Production deployment was redeployed. The new
   deployment is `dpl_6xDEsJojfeWKrLPBYyrwgPGaCfBD`.
5. Canonical post-deploy verification returned eleven of eleven passing route
   contracts and all readiness flags true.

No migration, schema write, lead write, email, SMS, WordPress edit, DNS change,
secret rotation, data deletion, or vendor purchase was required.

## CI stabilization design

The recovery branch consolidates CI into four non-overlapping layers:

1. **PR/main release gate** — tests, typecheck, lint, build, safety, route, and
   authority assertions; stale release-branch push triggering is removed.
2. **Manual Preview QA** — one workflow with a caller-selected ref, protected
   Preview discovery, mutation-free QA, and optional browser E2E. The duplicate
   bootstrap workflow is removed.
3. **Post-deploy verification** — a successful Vercel Production deployment
   status calls the canonical production verifier.
4. **Scheduled production monitor** — the same verifier runs every six hours,
   not hourly.

Production verification uses at most three read-only attempts with bounded
backoff. It never converts a final failure into success. Every run uploads JSON
and Markdown evidence and emits these stable incident fields:

- `ROOT_CAUSE_CATEGORY`
- `FAILED_COMPONENT`
- `EXPECTED`
- `ACTUAL`
- `REMEDIATION`
- `RETRY_SAFE`
- `PRODUCTION_IMPACT`

A failed final attempt opens or updates one rolling GitHub issue. A later green
run records recovery and closes that issue. Synthetic artifacts contain no PII.
Release-gate and Preview failures emit the same seven-field diagnostic contract
with their candidate blocked; they do not claim production impact that did not
occur.

## Evidence completed before PR

| Check | Result |
| --- | --- |
| Canonical Production readiness | HTTP 200, every required flag true |
| Public production contracts | 11/11 pass |
| Focused monitor, incident, and workflow tests | 27/27 pass |
| Full Node 24 test suite | 282 files / 3,433 tests pass |
| Typecheck, lint, optimized build | pass / pass / 60 pages built |
| Retry maximum | hard-capped at three |
| Duplicate Preview workflow | removed in recovery branch |
| Production data mutation | none |
| Secret exposure | none observed; credential value never emitted |

## Post-merge acceptance

The operational acceptance sequence is deliberately executed only from the
merged default-branch workflow: one green PR gate, one green main gate, two
consecutive green manual production-monitor runs, and one naturally scheduled
six-hour run. GitHub Actions run URLs are the authoritative immutable evidence;
the operator must not substitute a local 200 response for those checks.
