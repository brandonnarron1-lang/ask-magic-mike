# Observability

## Correlation IDs

Every API route creates a request context at handler entry:

```typescript
const ctx = requestContext("route/name", req.headers.get("x-request-id"));
```

This generates (or echoes) a 16-char hex `X-Request-Id` header and stamps every log line with `request_id`. Clients can pass their own ID to chain frontend → backend traces.

**Response headers emitted on every API response:**
- `X-Request-Id` — stable ID for this request
- `X-Response-Time` — wall-clock ms from handler entry to response
- `Cache-Control: no-store`

Routes covered: `intake/submit`, `intake/step`, `session/create`, `analytics/event`.

## Structured Logging

`src/lib/observability/logger.ts` exports `createLogger(context)`. Each logger call emits a JSON line to stdout:

```json
{ "level": "info", "context": "intake/submit", "event": "request_started", "request_id": "a1b2c3d4e5f6a1b2", "ts": 1718000000000 }
```

PII (email, phone, name fields) is scrubbed before emission. Vercel captures stdout as structured logs visible in the Vercel dashboard → Logs tab.

## Rate-Limit Events

When a rate limit is hit, the route logs `warn("rate_limited", { request_id })` and returns:
- `429 Too Many Requests`
- `Retry-After: <seconds>`
- Standard correlation headers

Rate limits are enforced per IP. In production, the canonical Neon
`rate_limit_buckets` table makes limits durable across serverless instances.
Without `DATABASE_URL`, an in-memory sliding window is used for local tests only.
Neon receives only a versioned, route-scoped HMAC bucket identifier. Raw IP,
staff, and session keys are never durable bucket values.

**Required production configuration:**
- `DATABASE_URL` — the same server-only Neon connection used by lead capture
- `public.rate_limit_buckets` — applied by the canonical migration chain
- `RATE_LIMIT_HASH_SECRET` — recommended dedicated 32+ character HMAC secret;
  documented strong server secrets provide a compatibility fallback

`RATE_LIMIT_EMERGENCY_MEMORY=1` acknowledges a temporary degraded in-memory mode;
it does not make the limiter durable.

## Analytics Events

Client-side funnel events POST to `/api/analytics/event`. Key events:

| Event | Trigger |
|---|---|
| `page_view` (surface: ai_demo_section) | AI demo section scrolls into view |
| `cta_click` (action: intake_step_back) | User navigates back in the intake flow |
| `call_button_clicked` (surface: …) | User clicks a tel: phone link |
| `intake_step_completed` | User advances a step (server-side) |
| `session_created` | New session initialized |

Events are written to the canonical Neon `analytics_events` table via
`trackEventNoWait()` (fire-and-forget). Public routes accept only named scalar
dimensions, strip query strings and dynamic open-house paths, discard PII and
click IDs, and store only a coarse browser/automation device class.

## Log Levels

- `info` — normal operational events (request started/completed, session created)
- `warn` — recoverable anomalies (rate limited, missing optional config)
- `error` — failures requiring investigation (session creation failed, CRM errors)
