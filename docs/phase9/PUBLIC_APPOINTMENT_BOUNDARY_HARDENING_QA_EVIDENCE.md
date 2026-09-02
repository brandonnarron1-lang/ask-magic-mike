# Phase 9 Public Appointment Boundary Hardening QA Evidence

Date: 2026-09-02
Status: local final-source verification; hosted exact-head evidence pending

## Scope proof

The candidate reuses:

- `request_public_appointment_v1` for atomic appointment/lifecycle/audit/task
  persistence;
- `requestPublicAppointment` and the canonical persistence adapter;
- `LeadSourceSurface` and lead payload normalization;
- the shared public-origin policy;
- the shared durable Neon rate limiter and exact emergency override;
- the privacy-minimized analytics repository and canonical protected-event
  policy; and
- the current `AppointmentRequestCTA` and its truthful confirmation language.

No alternative store, route, queue, provider, calendar, dashboard, or public
funnel was added.

## Focused verification

```bash
pnpm exec vitest run \
  tests/api/public-appointment-route-security.test.ts \
  tests/public/appointment-funnel-identity.test.tsx \
  tests/analytics/client-analytics-privacy.test.ts \
  tests/public/public-appointment-request.test.ts
pnpm run typecheck
pnpm exec eslint \
  app/api/appointments/request/route.ts \
  app/components/black-diamond/AppointmentRequestCTA.tsx \
  app/lib/constants.ts \
  app/lib/leadPayload.ts \
  app/lib/publicAppointmentRequest.ts \
  src/lib/analytics/privacy.ts \
  tests/api/public-appointment-route-security.test.ts \
  tests/public/appointment-funnel-identity.test.tsx \
  tests/analytics/client-analytics-privacy.test.ts
git diff --check
```

Focused result: 4 files / 30 tests passed; strict typecheck, targeted ESLint,
and diff whitespace validation passed. Coverage includes Preview zero-write,
explicit foreign-origin refusal, media type, declared and streamed body caps,
malformed and non-object JSON, exact source vocabulary including renter,
throttle response, Production durable-limiter failure, explicit break-glass,
correlation/no-store headers, canonical outcome association, replay
deduplication, browser-ledger separation, and truthful success when secondary
analytics is unavailable.

## Complete local release gate

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run release:gate
```

Node 24.18.0 result: Ask Magic Mike / NellySelly isolation passed; release
safety passed 14/14; Vitest passed 300 files / 3,577 tests; strict typecheck and
full-repository ESLint passed; the optimized Next.js 15.5.21 build generated 60
static pages; and route verification passed 102 active routes with 22
acknowledged root/source duplicates.

The intercepted local browser path also passes:

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
  pnpm exec playwright test tests/e2e/ask-flow.spec.ts
```

Result: 2/2 tests passed. Chat remained anonymous before explicit follow-up,
the lead and appointment endpoints were intercepted locally, and retry reused
the original synthetic submission identity. No remote write or provider call
was possible.

`pnpm audit --prod --audit-level high` reports no known vulnerability.
Redacted Gitleaks passes the approximately 29 KB staged delta and the full 767-commit
history / approximately 19.62 MB with no leak. Hosted CI, immutable Preview,
protected no-write QA, and runtime-log review remain pending.

## External-state proof

Focused tests use synthetic UUIDs and mocked persistence/analytics boundaries.
They perform no network request, remote database query/write, appointment
request, lead submission, analytics mutation, provider call, email/SMS/Push,
WordPress action, Vercel configuration change, deployment, DNS change,
publication, spend, deletion, or NellySelly action.
