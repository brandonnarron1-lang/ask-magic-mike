# Rate Limiting Durability Plan

## Current state (not launch-grade)

`src/lib/security/rate-limit.ts` implements an **in-memory rate limiter** backed by a plain `Map`. This works for local development but has three disqualifying properties for production:

| Property | In-memory (current) | Required for launch |
|----------|--------------------|--------------------|
| Survives cold start | No — resets to zero on every function boot | Yes |
| Shared across instances | No — each Vercel function instance has its own store | Yes |
| Persistent under load | No — Vercel scales horizontally; stores diverge | Yes |

**Practical impact:** An attacker can exhaust any single instance's window, then route to another instance (or wait for a cold start) and bypass all limits. The limiter provides best-effort protection in single-instance dev environments only.

The code already documents this with a TODO comment:

```
// TODO (before launch): Replace the in-memory store with Upstash Redis
```

---

## Launch-grade upgrade path: Upstash Redis

Upstash is a serverless Redis provider that works in Vercel Edge and Node.js runtimes. The `@upstash/ratelimit` package provides a drop-in sliding-window limiter.

### Required packages

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

### Required environment variables

| Variable | Source | Note |
|----------|--------|------|
| `UPSTASH_REDIS_REST_URL` | Upstash console → REST API | Do not use `NEXT_PUBLIC_` prefix |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console → REST API | Secret — server-only |

### Migration sketch

```typescript
// src/lib/security/rate-limit.ts — production version
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const LIMITERS = {
  intakeSubmit: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "10 m"),
    prefix: "amm:intake",
  }),
  sessionCreate: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "10 m"),
    prefix: "amm:session",
  }),
  analyticsEvent: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "amm:analytics",
  }),
};

// Usage: const { success, remaining, reset } = await LIMITERS.intakeSubmit.limit(ip);
```

The existing `checkRateLimit` callers in `src/app/api/intake/submit/route.ts`, `src/app/api/session/create/route.ts`, and `src/app/api/analytics/event/route.ts` would each need to `await` the new async API instead of the current sync call.

---

## Authorization gate

This upgrade adds a paid external dependency (Upstash). **Do not implement without owner approval.** The Upstash free tier allows 10,000 requests/day; paid plans start at $10/month.

When approved:
1. Create Upstash account and Redis database
2. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel production environment
3. Swap the implementation and update the three callers
4. Deploy and verify the `X-RateLimit-Remaining` header decrements correctly across instances
5. Remove this blocker from `docs/PRODUCTION_LAUNCH_GATE.md` Section 8

---

## Blocking status

This item is tracked as a hard launch blocker in `docs/PRODUCTION_LAUNCH_GATE.md` Section 8.

Owner: TBD · ETA: Before launch
