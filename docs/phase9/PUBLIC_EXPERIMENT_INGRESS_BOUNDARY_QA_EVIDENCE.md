# Phase 9 Public Experiment Ingress Boundary QA Evidence

Date: 2026-09-02
Status: complete local verification passed; exact-commit and hosted evidence pending

## Scope proof

The candidate retains the existing Home Value experiment UI, deterministic
assignment engine, `POST /api/experiments/event`, canonical Neon
`growth_experiments`, `growth_experiment_assignments`, and
`growth_experiment_events` tables, and the existing atomic public lead capture.
It adds no route, table, migration, provider, environment variable, recipient,
queue, WordPress component, or parallel analytics/lead authority.

The application branch starts from exact PR #270 head
`9257c7ed720495a82370a2821d4f63a9900d8e9f`. Accepted Production remains PR
#247 and PR #248 remains the sole currently requestable application gate.

## Focused verification

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
  pnpm exec vitest run \
    tests/api/public-experiment-event-route.test.ts \
    tests/persistence/neon-public-experiment-repository.test.ts \
    tests/leadops/public-experiment-lead-context.test.ts \
    tests/leadops/lead-experiment-conversion.test.ts \
    tests/public/home-value-inline-validation.test.tsx \
    tests/leadops/api-leads-route.test.ts
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run typecheck
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
  pnpm exec eslint \
    app/api/experiments/event/route.ts \
    app/api/leads/route.ts \
    app/components/black-diamond/HomeValueFunnel.tsx \
    app/lib/growth/experiment-registry.ts \
    app/lib/growth/lead-experiment-conversion.ts \
    app/lib/growth/public-experiment-client.ts \
    app/lib/leadPayload.ts \
    app/lib/persistence/neonPublicExperimentRepository.ts \
    app/lib/publicLeadIngress.ts \
    tests/api/public-experiment-event-route.test.ts \
    tests/persistence/neon-public-experiment-repository.test.ts \
    tests/leadops/public-experiment-lead-context.test.ts \
    tests/leadops/lead-experiment-conversion.test.ts \
    tests/public/home-value-inline-validation.test.tsx \
    tests/leadops/api-leads-route.test.ts
git diff --check
```

Current result: 6 files / 103 tests pass; strict TypeScript, targeted ESLint,
and whitespace validation pass. Tests prove:

- explicit approved Origin is required before limiter/repository access;
- automated browser activity remains write-free;
- Preview refuses before durable limiter mutation;
- Production refuses a non-durable limiter unless the exact existing
  break-glass decision is active;
- HTTP 429 includes a positive one-minute-bounded `Retry-After`;
- JSON media type, object shape, declared/streamed 4 KB bounds, exact fields,
  subject shape, event, registry key, and static surface fail closed;
- a public caller cannot author `lead_created` or attach an arbitrary lead ID;
- repository absence and exceptions return a safe correlated 503;
- exposure creates an idempotent deterministic assignment/event only after all
  runtime, registry, and database approval gates agree;
- conversion cannot create its own assignment and requires a prior exposure;
- stored and submitted variants must match the deterministic registry result;
- only an existing non-test, non-suppressed durable lead is conversion-eligible;
- partial, substituted, unknown, and cross-surface lead context fails before
  canonical lead persistence;
- Home Value submits exact bounded context through `/api/leads` and makes no
  client-side experiment-conversion request;
- test leads and context-free leads do not invoke conversion persistence; and
- the server helper binds conversion to the exact durable lead UUID.

## Complete local release gate

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run release:gate
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm audit --prod --audit-level high
git diff --check
```

Results on Node 24.18.0:

- Ask Magic Mike/NellySelly deployable-source isolation: PASS.
- Release safety: 14 pass / 0 fail.
- Vitest: 303 files / 3,649 tests passed.
- Strict TypeScript: PASS.
- Repository-wide ESLint: PASS.
- Next.js 15.5.21 optimized Production build: PASS; 60 static pages generated.
- Route manifest: PASS; 102 active routes and 22 acknowledged root/src
  duplicates.
- Production dependency audit: no known vulnerabilities.
- Whitespace validation: PASS.
- Redacted full-history scan: PASS; 773 commits / approximately 19.79 MB and
  no leak.
- Redacted staged-candidate scan: PASS; approximately 54 KB and no leak.

## Immutable Preview no-write contract

After the exact commit is pushed as a Draft PR, hosted verification will be
limited to non-mutating evidence:

- public Home Value and health endpoints return successfully;
- a valid exposure request in read-only Preview returns
  `503 preview_data_disabled` before limiter/repository access;
- foreign Origin returns 403;
- the public conversion shape is rejected in local behavior tests; and
- Vercel runtime logs contain no unexpected route exception.

No hosted lead form will be submitted. No Preview or Production experiment
assignment/event, lead, email/BCC, SMS, Push, consumer acknowledgment,
WordPress forward, environment change, migration, DNS change, publication,
spend, deletion, or NellySelly action is authorized by this verification.

## External-state proof

Local tests use only synthetic identifiers and mocked repositories/providers.
No remote database query/write, public submission, provider call, Production
deployment, WordPress action, environment edit, DNS change, publication,
spend, deletion, or NellySelly mutation occurred.
