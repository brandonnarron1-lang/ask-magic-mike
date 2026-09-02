# Phase 9 Public AI Chat Provider Boundary

Date: 2026-09-02
Status: isolated successor to stacked Draft PR #265; Production unchanged

## Decision

Harden the existing public chat route rather than create a new chatbot,
provider adapter, datastore, queue, or user experience. The public panel already
posts to `/api/chat/message`, which re-exports the canonical `/api/chat`
handler. That handler already owns OpenAI Responses API access, redaction,
prompt-injection detection, untrusted-text delimitation, bounded generation,
timeout, and deterministic fallback.

The missing control was runtime ordering. A Preview request could previously
write the shared Neon rate-limit bucket and, if inherited flags and credentials
were enabled, reach the paid provider. A Production request could also reach
the provider after the limiter degraded to process-local memory. This candidate
closes those gaps at the existing boundary.

## Public request contract

- Explicit browser origins must match the current Ask Magic Mike / Our Town
  Properties allowlist. Originless same-host and trusted server requests retain
  the established behavior.
- Only `application/json` is accepted. The request must decode to a non-array
  object with a nonempty string `message`.
- Both declared and streamed body size are capped at 8,192 bytes; message text
  is capped at 2,000 characters.
- Invalid requests fail before rate-limit or provider access. They receive
  stable, non-sensitive error codes and no raw payload reflection.
- A throttled request returns HTTP 429 and a positive bounded `Retry-After`
  value.
- Every response is private/no-store and carries one random correlation ID in
  both the JSON envelope and `X-AMM-Correlation-Id` header.

## Runtime ordering

Read-only Vercel or database Preview returns the same deterministic guidance
fallback after input validation and before `checkRateLimit` or `fetch`. This
makes visual/product QA useful while preventing both a Neon bucket write and
OpenAI spend.

Production invokes the canonical shared limiter first. OpenAI is reachable only
when the result is allowed and durable. A non-durable allowed result returns
HTTP 503 with `rate_limit_store_unavailable`; the existing exact
`RATE_LIMIT_EMERGENCY_MEMORY=1` setting is the only break-glass exception. A
denied result never reaches the provider regardless of durability.

Local development and tests retain the established bounded in-memory fallback.
The AI enable flag, emergency disable, key, model, output ceiling, timeout,
guardrails, and provider fallback are unchanged.

## Safety and non-actions

This candidate sends no lead data to web search, tools, retrieval, or a second
model. It does not add an environment variable, credential, model, route,
session store, migration, table, queue, cron, notification, or analytics event.
It does not send email, SMS, Push, a lead, or a consumer acknowledgment.

## Release order and rollback

This branch starts from exact PR #265 head
`32509a8a1d5f566c3f8647cb44e9ea4c12ebdf2b` and remains downstream of the
ordered Draft stack beginning at PR #248. PR #248 remains the only currently
requestable application merge/deployment gate.

Rollback is application-only: restore the immediately preceding accepted Ready
deployment or revert this route/test/documentation change. No Neon row,
provider record, lead, notification, or user data needs deletion or rewriting.
