# Phase 9 Public AI Chat Provider Boundary QA Evidence

Date: 2026-09-02
Status: local final-source verification; hosted exact-head evidence pending

## Scope proof

The candidate reuses:

- the existing `AskMikeChatPanel` and `/api/chat/message` route alias;
- the canonical `/api/chat` handler and OpenAI Responses API call;
- current lead-text redaction, prompt-injection detection, and untrusted-input
  delimiter;
- the current shared Neon rate limiter and exact emergency-memory override;
- the current Preview-runtime detector; and
- the existing enable/disable, model, token, timeout, and fallback controls.

No alternative chat surface, route, provider, database, queue, scheduler,
notification, analytics writer, or session authority was added.

## Focused verification

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
  pnpm exec vitest run \
    tests/api/chat-route-security.test.ts \
    tests/public/ask-conversion-accessibility.test.tsx \
    tests/lib/rate-limit-store.test.ts
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run typecheck
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
  pnpm exec eslint \
    app/api/chat/route.ts \
    tests/api/chat-route-security.test.ts \
    tests/public/ask-conversion-accessibility.test.tsx
git diff --check
```

Focused result: 3 files / 50 tests passed; strict TypeScript, targeted ESLint,
and whitespace validation passed. Coverage includes origin, media type,
declared and streamed body limits, object validation, message length,
correlation/no-store headers, bounded retry guidance, deterministic Preview
behavior without limiter/provider access, Production non-durable refusal,
exact break-glass behavior, and provider access only after a durable shared
limit result.

## Complete local release gate

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run release:gate
```

Node 24.18.0 result: Ask Magic Mike / NellySelly isolation passed; release
safety passed 14/14; Vitest passed 300 files / 3,586 tests; strict typecheck and
full-repository ESLint passed; the optimized Next.js 15.5.21 build generated 60
static pages; and route verification passed 102 active routes with 22
acknowledged root/source duplicates.

The intercepted local browser path also passes:

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
  pnpm exec playwright test tests/e2e/ask-flow.spec.ts
```

Result: 2/2 tests passed. Chat remained anonymous before explicit follow-up,
and lead/appointment requests were locally intercepted. No remote write or
provider call was possible.

`pnpm audit --prod --audit-level high` reports no known vulnerability.
Redacted Gitleaks passes the full 769-commit history / approximately 19.67 MB
and the approximately 35 KB exact candidate delta with no leak.

## Remaining exact-head seal

Hosted Release Gate, immutable Preview endpoint probes, visual QA, and
runtime-log review will be recorded against the final exact commit. Preview
probes will use only a harmless synthetic real-estate question and will not
submit a lead, write analytics, call OpenAI, or mutate Neon.

## External-state proof

Focused tests use synthetic text, mocked limiter results, and a mocked OpenAI
response. They perform no network request, remote database query/write,
provider call, lead submission, analytics event, appointment, notification,
email/SMS/Push, WordPress action, Vercel configuration change, deployment, DNS
change, publication, spend, deletion, or NellySelly action.
