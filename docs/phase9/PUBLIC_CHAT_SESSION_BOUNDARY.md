# Phase 9 Public Chat-Session Boundary

Date: 2026-09-02
Status: isolated successor to stacked Draft PR #267; Production unchanged

## Decision

Harden the existing required `POST /api/chat/session` endpoint rather than add
a route, table, cookie, authentication mechanism, or session service. The
endpoint issues a random UUID used only as a public funnel correlation and
future lead-idempotency reference. Canonical session ownership still begins in
the existing atomic lead-capture transaction.

The audit found that this endpoint invoked the shared limiter in read-only
Preview and issued an identifier after a non-durable Production fallback. That
behavior conflicted with the established Preview zero-write and Production
durable-limiter contracts already enforced by lead, appointment, analytics,
and chat-message boundaries.

## Request and response contract

- Explicit browser origins must match the current Ask Magic Mike / Our Town
  Properties allowlist. Established originless same-host/server behavior is
  preserved.
- A successful response retains `session_id` as a random RFC 4122 UUID. It adds
  a separate random `correlation_id` in the body and matching
  `X-AMM-Correlation-Id` header.
- Every success and error response is `private, no-store` with a stable,
  non-sensitive error code.
- A throttled request returns HTTP 429 with a positive `Retry-After` capped at
  the existing ten-minute session-create window.
- The identifier is not an authenticated session, legal identity, consent
  record, unique-person claim, database row, cookie, or secret.

## Runtime ordering

Read-only Vercel or database Preview returns an ephemeral UUID after origin
validation and before `checkRateLimit`. This supports product and contract QA
without mutating the shared Neon rate-limit table.

Production invokes the canonical limiter first. An identifier is issued only
when the result is allowed and durable. A non-durable allowed result returns
HTTP 503 with `rate_limit_store_unavailable`; the already documented exact
`RATE_LIMIT_EMERGENCY_MEMORY=1` flag remains the sole break-glass exception.
Local development retains bounded in-memory behavior.

## Scope and non-actions

This candidate changes one existing route, focused tests, and documentation. It
adds no environment variable, migration, table, session store, provider,
analytics event, queue, cron, cookie, route, public UI, or WordPress component.
It sends no lead, email/BCC, SMS, Push, or consumer acknowledgment.

## Release order and rollback

This branch starts from exact PR #267 head
`0428e385a420a43403114106981daae3d022fbbf` and remains downstream of the
ordered Draft stack beginning at PR #248. PR #248 remains the only currently
requestable application merge/deployment gate.

Rollback is application-only: revert this route/test/documentation commit or
restore the immediately preceding accepted Ready deployment. No database row,
provider record, lead, notification, or WordPress revision needs restoration.
