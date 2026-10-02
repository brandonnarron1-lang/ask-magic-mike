# Phase E QA and security evidence

Date: 2026-09-30

Status: **PLACEMENT LIVE — CONTROLLED QA NOT AUTHORIZED OR EXECUTED**

This record separates code/runtime proof from the owner-gated WordPress and
message actions. No synthetic record is labeled as a live prospect, and no
end-to-end stage is marked PASS without inspectable evidence.

## Canonical baseline

- repository: `brandonnarron1-lang/ask-magic-mike`;
- accepted source: PR #281 merge
  `a3a0c235decab5a8e9209d983358d200a36ca979`;
- accepted tree: `7c8b8395e3cbf4b31b81d52b05add21894f0911e`;
- Production: `dpl_8488csXCtbfHMMZUF6KDQRiJVwTk`, Ready;
- application rollback: `dpl_aepoH5pzDwPMkerbrp9YekzVrdKD`, Ready;
- database: existing Neon Production database; and
- Phase E migrations/environment changes: zero.

## First-placement baseline

The selected first placement is WordPress page 3952,
`https://www.ourtownproperties.com/how-much-is-your-home-worth/`.

Historical before state:

- HTTP 200 and correct canonical tag;
- one visible Connector CTA;
- current destination:
  `https://www.askmagicmike.com/value?utm_source=ourtownproperties&utm_medium=home_value_page&utm_campaign=website_widget`;
- public Connector assets report `ver=1.0.0`;
- no `data-amm-connector-version` marker;
- one Form 3 and one separate, held Form 7 surface;
- zero console errors/warnings and no horizontal overflow at 1440×1200 and
  390×844; and
- existing Form 7 prompt and cookie banner preserved, not repurposed.

Current accepted state after the two independently approved page-only actions:

- HTTP 200 and the same correct canonical;
- Connector 1.1.0 marker exactly once;
- reviewed CTA exactly once and legacy CTA zero times;
- destination
  `https://www.askmagicmike.com/home-value?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_home_value_page`;
- desktop and iPhone 13 destination HTTP 200 with the full query preserved and
  one Home Value form;
- visible, native-anchor CTA reached through keyboard Tab navigation; and
- existing source-page forms and unrelated links preserved.

The approved actions changed one shortcode in `post_content`, then the same
one string in the bound Beaver Builder published/draft metadata, and cleared
only page 3952's two cache layers. No form was submitted.

Evidence:

- `output/playwright/phase-e/home-value-before-desktop.png`;
- `output/playwright/phase-e/home-value-before-mobile.png`; and
- matching Markdown DOM/accessibility snapshots in the same directory;
- owner-local `artifacts/phase-e-page3952-20261001/builder-alignment-execution.png`;
- owner-local `artifacts/phase-e-page3952-20261001/builder-alignment-postflight-server.png`;
- owner-local `artifacts/phase-e-page3952-20261001/public-aligned-desktop.png`;
  and
- owner-local `artifacts/phase-e-page3952-20261001/public-aligned-mobile.png`.

The postflight artifacts are intentionally ignored by Git and retained in the
owner's private worktree artifact store; no cPanel session URL or secret is
committed.

## Controlled QA lead evidence table

| Stage | Expected | Evidence | Result |
| --- | --- | --- | --- |
| WordPress CTA | one page-3952 CTA using the reviewed destination | server cache plus desktop/mobile/keyboard public postflight | **PASS** |
| Attribution | exact placement/source/UTM persisted | contract/unit coverage only; no Production QA record | **NOT EXECUTED** |
| Consent | approved evidence and version persisted | consent and signed-bridge tests pass; no Production QA record | **NOT EXECUTED** |
| Intake | one canonical public request | public route is healthy; separate QA submission is not authorized | **NOT EXECUTED** |
| Idempotency | one stable key | lead/WordPress replay contracts pass locally | **NOT EXECUTED LIVE** |
| Persistence | one durable Neon lead | canonical storage tests pass; no QA row created | **NOT EXECUTED** |
| Scoring | canonical deterministic server score | scoring tests pass; no QA lead score exists | **NOT EXECUTED** |
| Routing | canonical deterministic route | routing tests pass; no QA routing event exists | **NOT EXECUTED** |
| Assignment | one expected owner plus history | assignment tests pass; no QA assignment exists | **NOT EXECUTED** |
| Lead Center | visible exactly once | RBAC/read-model tests pass; no QA lead exists | **NOT EXECUTED** |
| Outbox | one notification intent | outbox/idempotency tests pass; no QA intent created | **NOT EXECUTED** |
| Email | provider accepted/delivered | provider config names are present; no email sent | **NOT EXECUTED** |
| BCC | protected audit copy | protected config name is present; private value not read; no send | **NOT EXECUTED** |
| Timeline | coherent communication/audit chain | timeline/callback tests pass; no QA chain exists | **NOT EXECUTED** |

Production configuration was checked without exposing values. Vercel lists the
database, provider, primary-recipient, audit-BCC, and delivery controls as
Production-scoped Sensitive variables. Public health independently reports
Production, Neon configured/ready, notification mode `production`, and email
enabled. These are readiness facts, not email or BCC delivery proof.

## Commands executed in this session

Final counted verification used exact Node 24.18.0 and pnpm 10.30.3. One
intermediate diagnostic rerun used Node 26.5.1; it is not the acceptance result.
GitHub's pinned Node 24 workflow remains the hosted release-authoritative check.

| Command/check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS; lockfile unchanged |
| `pnpm audit --prod --audit-level=high` | PASS; no known vulnerabilities |
| `pnpm run release:gate` | PASS; 293 files / 3,605 tests, typecheck, ESLint, optimized build, 102 active routes / 22 acknowledged duplicates, 14/14 safety, isolation |
| `pnpm run test:e2e` | PASS; 26/26 after Playwright Chromium was installed and local development compilation was serialized |
| focused webhook/Connector/governance tests | PASS; 6 files / 128 tests |
| metadata-only `amm:launch:doctor` | PASS; 48/48, zero values read |
| metadata-only `amm:launch:authority` | PASS; 51/51, `GO_CONTROLLED_TRAFFIC_READY` |
| Production monitor | PASS; 11/11 on first attempt |
| Production smoke | PASS; 19 pass, 2 intentional skips, 0 fail |
| live conversion verifier | PASS; 15/15 |
| 500-record Vercel Production log window | PASS; 500 `info`, zero error/fatal/5xx signature |
| public apex/canonical/health checks | PASS; www 200, apex 308 to www, live/ready 200 |
| page-3952 source readiness command without authenticated source/backup inputs | EXPECTED FAIL-CLOSED; no mutation |
| page-3952 builder payload native PHP lint | PASS |
| guarded builder transaction and exact server postflight | PASS; two bound rows only, page-only cache invalidation |
| page-3952 desktop/iPhone/keyboard postflight | PASS; no form submission |
| Production `/api/health/live` and `/api/health/ready` | PASS; Production/Neon/notification/readiness checks healthy |
| focused page-contract tests under Node 24.18.0 | PASS; 2 files / 13 tests |
| focused QA classification, lead route, notification, replay, Home Value validation, and consolidation tests under Node 24.18.0 | PASS; 6 files / 136 tests |
| JSON parse, JavaScript syntax, targeted ESLint, `git diff --check` | PASS |

The first browser attempt could not launch because the lockfile-selected
Playwright Chromium binary was absent. After installing that exact browser,
24/26 parallel local-development tests passed and two Growth-page tests hit a
Next development compiler chunk race. Both passed serially. The normal local
configuration now uses one worker and the unchanged command passes 26/26;
deployed immutable Preview runs retain normal parallelism.

## Exact-head hosted and immutable-Preview receipt

- reviewed head: `3b1853b535000e09b6e9c40221f5898bd87a92f9`;
- reviewed tree: `23bc513823874e629cfc525c2832bbad4282f480`;
- hosted Node 24 Release Gate:
  [36784156065](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/36784156065),
  PASS;
- immutable Preview: `dpl_4iWCBVSoqFbvffq7KAWhteQBTX6Y`,
  `https://ask-magic-mike-ed9f9jfpm-eyes-up-industries.vercel.app`, Ready and
  bound by GitHub deployment receipt to the reviewed head;
- protected no-write QA/browser run:
  [36784678748](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/36784678748),
  PASS in 4m25s;
- Preview API QA: 18 pass, 7 intentional mutation skips, 0 fail;
- deployed browser E2E: 6 suites / 15 pass / 0 fail / 0 flaky / 0 skipped;
- release doctor: 43 pass / 0 fail / 0 skip;
- safety scan: 14 pass / 0 fail;
- release-candidate verdict: GO with zero blockers;
- launch-authority verdict: `PREVIEW_READY`; and
- Vercel runtime review: no error, fatal, or HTTP 500 record in the inspected
  exact-deployment window.

The generic launch report correctly records controlled Preview mutation QA as
not run. Phase E contains no migration and the Preview identity policy remained
fail-closed, with live email/SMS disabled; no attempt was made to weaken those
guards merely to manufacture a write receipt.

## Failure and recovery proof

| Path | Evidence | Result |
| --- | --- | --- |
| Lead durability independent of provider failure | notification service/retry and canonical lead-route tests | PASS (local contract) |
| Exact lead replay | canonical lead, Neon idempotency, source-attribution, and client replay tests | PASS (local contract) |
| Duplicate provider callback | one-statement receipt/side-effect claim plus exact-payload replay tests | PASS |
| Out-of-order provider callback | timestamp guard preserves newer notification truth while retaining audit event | PASS |
| Concurrent newer callback | atomic notification timestamp predicate records ignored transition reason | PASS |
| Invalid provider timestamp/signature | rejected before database work | PASS |
| Callback persistence failure | one PostgreSQL statement rolls back receipt and side effects; route returns private retryable 503 | PASS |
| WordPress signed replay | signed entry/body identity and canonical idempotency tests | PASS |
| Invalid WordPress signature | fails closed | PASS |
| Consent mismatch | fails closed | PASS |
| Attribution mismatch | server-owned attribution policy tests | PASS |
| Preview isolation | no-write Preview/browser and ingress safety tests | PASS |

These are local/Preview-safe contract results. Provider-failure, replay, and
delivery behavior for the eventual Production QA lead must still be attached
to that lead's correlation and provider identifiers after approval.

## Security review

Scope: the Phase E diff, Resend webhook, Connector package, iframe messaging
boundary, release workflow, and relevant security headers. The review applied
the repository security checks plus the Next.js/React/browser guidance in the
Codex `security-best-practices` skill.

### SEC-E-001 — resolved

- Rule: `NEXT-WEBHOOK-001`, `NEXT-INPUT-001`, `NEXT-INJECT-001`
- Severity before fix: Medium
- Location: `app/api/webhooks/email/events/route.ts`, `POST` and bounded-body helpers
- Evidence: the route verifies the Svix signature over the raw bounded body,
  rejects malformed timestamps, uses parameterized SQL, stores a hash rather
  than the raw payload, and returns no secret or contact data.
- Fix: retained the existing raw-body signature boundary and added runtime
  timestamp validation before database access.
- Result: RESOLVED; regression coverage passes.

### SEC-E-002 — resolved

- Rule: webhook idempotency and replay integrity
- Severity before fix: Medium
- Location: `app/api/webhooks/email/events/route.ts`, `recordResendEventAtomically`
- Evidence: the existing PR #279 atomic callback pattern was ported onto
  current `main`; receipt claim, notification update, communication event, and
  suppression are one PostgreSQL statement. Only the claim winner can apply
  side effects, and notification updates compare provider timestamps in SQL.
- Impact prevented: concurrent duplicate callbacks cannot both apply effects,
  a failed side effect cannot strand a committed receipt, and stale events
  cannot regress a newer delivery/failure state.
- Result: RESOLVED; duplicate, stale, and racing-event tests pass.

### SEC-E-003 — accepted low-risk hardening backlog

- Rule: `NEXT-CSP-001` / `REACT-CSP-001`
- Severity: Low in the inspected scope
- Location: `next.config.ts`, private phone-alert CSP, line 54
- Evidence: the route-specific policy still includes `script-src 'unsafe-inline'`
  and `style-src 'unsafe-inline'`. The same route is private, no-store,
  noindex, frame-denied, and no untrusted HTML sink was found in the Phase E
  path.
- Impact: the CSP provides less XSS defense-in-depth than a nonce/hash policy.
- Fix boundary: migrate the private phone setup route to a nonce-compatible
  policy in a separate regression-tested release; do not loosen the policy or
  block Phase E activation on speculative CSP surgery.
- Mitigation: React escaping, server-side authorization, no-store, frame deny,
  restrictive source lists, and existing route/browser tests remain active.

No Critical or High finding was identified in the Phase E scope. The
Connector restricts destinations to exact owned HTTPS hosts, permits only
relative route syntax, sanitizes/caps attribution dimensions, escapes rendered
output, and contains no secret, lead API, email, database, dynamic execution,
or remote-fetch subsystem. `pnpm audit` and the release safety scan are clean.

## Activation boundary

PR #281, Connector 1.1.0, the protected page backup, the one-token
`post_content` publication, builder metadata alignment, page-only cache
invalidation, and public postflight are complete. No QA lead, email, or BCC
delivery was executed.

The sole immediate external gate is:

`APPROVE PHASE E ONE HOME VALUE LINK-OUT QA LEAD AND INTERNAL TEST EMAIL/BCC`

It is scoped to exactly one server-recognized `INTERNAL QA — DO NOT CONTACT`
submission through the live page-3952 CTA and Home Value form, its canonical
suppressed/KPI-excluded lifecycle records, one existing-provider `[TEST]`
internal alert to the configured primary recipient and hidden audit BCC, and
read-only delivery verification. Consumer acknowledgment, nurture, SMS, push,
second submission, manual replay, resend, deletion, or unrelated system change
remain unauthorized. On approval, append inspectable lead, correlation,
provider, Lead Center, receipt, and audit evidence to the table above without
exposing contact data or the private BCC value.
