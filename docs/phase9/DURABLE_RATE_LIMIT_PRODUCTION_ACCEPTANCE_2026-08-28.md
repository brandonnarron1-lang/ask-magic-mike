# Phase 9 Durable Rate-Limit Production Acceptance — 2026-08-28

Status: **ACCEPTED IN PRODUCTION**

The owner supplied the exact combined gate for PR #209. The gate was consumed
once for the purpose-specific Production secret, exact reviewed merge, canonical
same-commit deployment, and bounded malformed-request acceptance described
below. It grants no authority to any later PR or external action.

## Immutable release identity

- reviewed PR #209 head:
  `b28b380f2cc3f9b63b2c0048b398e97a88dfee4b`;
- prior accepted `main` and rollback commit:
  `b450b41c66c6740bd20571cdbe7d8caf82e92d5e`;
- resulting merge and accepted `main`:
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`;
- accepted Vercel Production deployment:
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`;
- immutable deployment URL:
  `https://ask-magic-mike-cly0n8wl7-eyes-up-industries.vercel.app`;
- canonical aliases: `https://www.askmagicmike.com` and
  `https://askmagicmike.com`; and
- same-commit Node 24 release gate:
  `https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33224881791`.

GitHub, Vercel Git metadata, the Vercel status context, and `origin/main` all
resolved to the same merge commit. The release gate completed successfully
before acceptance was recorded.

## Secure configuration

A newly generated high-entropy value was piped directly into the canonical Ask
Magic Mike Vercel project as sensitive, Production-only
`RATE_LIMIT_HASH_SECRET`. The value was never printed, placed in chat, used as a
shell argument, written to a file, committed, or reused from another project.
Name/scope-only inventory confirms that both `DATABASE_URL` and
`RATE_LIMIT_HASH_SECRET` are encrypted Production variables.

## Acceptance evidence

- `GET /api/health/ready`: HTTP 200;
- `rate_limit_required`, table, schema, permissions, RLS, store,
  dedicated-secret, and aggregate readiness: all literal `true`;
- point-in-time Production monitor: 9/9 pass;
- read-only Production smoke: 19 pass, two intentional skips, zero fail;
- live conversion verifier: 15/15 pass;
- apex: 308 to `www`; required public routes: HTTP 200; and
- anonymous admin access: denied or temporarily redirected to the same-origin
  login route.

The one gate-authorized approved-origin malformed `POST /api/events` returned
HTTP 400 `Invalid event.` after executing the limiter and before analytics
persistence. The exact deployment log window contained 36 informational rows:
32 GET, three HEAD, and exactly one POST. Response totals were 31 HTTP 200,
three HTTP 307, one HTTP 401, and the expected one HTTP 400. There were no
unexpected 5xx responses and no durable-limiter fallback or failure matches.

The invalid-event control flow returns before the persistence call. Therefore
the request created only the intended HMAC-pseudonymized aggregate limiter
bucket; it created no valid analytics event, lead, notification, or message.

## Non-actions and rollback

No lead, email/BCC, SMS, Push, consumer acknowledgment, WordPress/GTM/GA4 edit,
DNS change, publication, spend, migration, deletion, or NellySelly action was
performed.

Acceptance passed, so rollback was not invoked. The immediate application
rollback remains deployment `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`. If later
evidence requires rollback, restore that deployment and its aliases first;
then remove only the new Production secret from future builds if necessary.
Preserve limiter buckets and all lead, event, notification, and audit data.

The consumed PR #209 gate is exhausted and must never authorize PR #210 or any
later candidate.
