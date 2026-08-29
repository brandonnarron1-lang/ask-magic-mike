# Notification Operations Truth QA Evidence

Date: 2026-08-29
Status: local implementation evidence; remote exact-head proof pending

Draft PR: [#234](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/234)
Implementation head: `ba56f7b3ac98912c206eeb56fde4b004be78ea64`

## Baseline and audit

- Exact parent: sealed PR #233 head
  `ff67874eacdb44d7653c964ce395ae7bafd54910`.
- Rescue ref:
  `rescue/amm-pr234-base-pr233-20260829-171619`.
- Canonical Production remains PR #209 merge
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` on deployment
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`.
- At 2026-08-29T21:14:25Z, public `GET /api/health/ready` returned HTTP 200;
  the canonical database was ready, `lead_notifications` was present, and all
  durable limiter required/table/schema/permission/RLS/store/secret/aggregate
  booleans were true.
- Static audit confirmed that the existing notification page already exposed
  safe errors, attempts, next retry, provider event/time, provider message ID,
  and a confirmed one-record retry. Those capabilities were preserved.
- The same audit found that its KPI cards summarized only the latest 50 rows,
  mixed QA and live records, and did not expose due retries, stale work, exact
  queue depth, provider-confirmed delivery, orphan integrity, or last success.

## Focused verification

Commands executed with the repository's installed toolchain:

```text
pnpm exec vitest run \
  tests/adminops/notification-operations-truth.test.ts \
  tests/adminops/admin-notification-guards.test.ts \
  tests/security/admin-health-route-security.test.ts \
  tests/adminops/lead-notification-service.test.ts
pnpm exec tsc --noEmit --pretty false
pnpm exec eslint [changed TypeScript/TSX files]
```

Result:

- 4 test files / 42 tests passed.
- Strict TypeScript passed.
- Targeted ESLint passed.
- The query contract test proves a single read-only aggregate statement, exact
  live/test scope, retry/stale thresholds, provider confirmation scope, and no
  SQL write keyword.
- The security guard proves aggregate admin-health output does not expose
  recipient references or lead message fields.
- The existing notification service regression remains green, including
  idempotency, bounded retry, concurrent claim, reassignment, Preview no-send,
  recipient, SMS, and provider-mode safety.

## Complete local release proof

The final application and documentation candidate passes:

- deployable-source Ask Magic Mike / NellySelly isolation;
- 14/14 release-safety controls;
- all 270 test files / 3,366 tests;
- strict TypeScript;
- full repository ESLint;
- optimized Next.js 15.5.21 build with 59 generated static pages;
- route manifest with 95 active routes and 17 acknowledged root/src wrappers;
- release doctor: 43 pass / 0 fail / 0 skip;
- Production dependency audit: no known vulnerability; and
- redacted Gitleaks exact range scan: two candidate commits, no leak.

The local shell uses Node 26.5.1 while the repository requires Node 24.x.
GitHub's exact-head Node 24 release gate remains the runtime authority. The
local release-candidate report is intentionally `NO-GO` only because protected
Preview QA has not yet been attached; all other local prerequisites pass.

## Pending exact-head remote proof

- Complete local release gate.
- Redacted diff/history secret scan.
- GitHub Node 24 release check.
- Immutable Vercel Preview.
- Authenticated protected Preview visual and response-contract verification.
- Runtime log review.

These checks belong to the final pushed head. No Production/Preview database
write, lead, event, email, SMS, Push, retry, provider call, secret entry,
deployment, merge, WordPress/DNS change, publication, spend, deletion, or
NellySelly action occurred during this evidence pass.
