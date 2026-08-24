# PR #209 security review

Date: 2026-08-24
Scope: durable limiter, emergency memory fallback, readiness, and Neon endpoint
attestation in PR #209
Framework: Next.js / React / TypeScript on Vercel

## Executive summary

The durable Neon path uses parameterized SQL, HMAC-pseudonymized bucket keys,
bounded public health output, exact Production readiness checks, and redacted
provider errors. No Critical or High vulnerability was found in the reviewed
boundary.

Two Medium emergency-path defects were found and repaired on the PR branch:
the in-memory fallback had no cardinality bound, and its keys were not
partitioned by route even though the durable path was. The repaired fallback
reclaims expired entries, caps identifiers, fails closed for unseen identifiers
at capacity, and uses the same route partition as Neon. Production remains
ineligible until the dedicated encrypted `RATE_LIMIT_HASH_SECRET` and reviewed
PR are released through the existing exact gate.

## Findings

### AMM-RL-002 — unbounded emergency-fallback cardinality

- Rule ID: `NEXT-DOS-001 / AMM-RL-002`
- Severity: Medium
- Location: `src/lib/security/rate-limit.ts:127`,
  `InMemoryRateLimitStore` (`:137-181`)
- Evidence: the prior fallback inserted every unseen key into a process-wide
  `Map` and removed no key unless that exact identifier returned after expiry.
- Impact: high-cardinality traffic during Preview or a Production datastore
  incident could increase process memory until the serverless instance was
  recycled or exhausted.
- Fix: cap the store at 10,000 identifiers, reclaim expired entries
  opportunistically and at capacity, and fail closed for a new identifier when
  the bounded store remains full.
- Mitigation: Vercel continues to supply a non-spoofable public client IP in
  `x-forwarded-for`; the durable Neon limiter remains the required Production
  path.
- False-positive notes: serverless recycling limits duration but does not make
  an unbounded structure safe within an invocation instance.

### AMM-RL-003 — fallback buckets were not route-partitioned

- Rule ID: `NEXT-DOS-001 / AMM-RL-003`
- Severity: Medium
- Location: `src/lib/security/rate-limit.ts:310`, `checkRateLimit`
  (`:333-335`)
- Evidence: Neon derives `prefix + key`, while the prior memory fallback passed
  only the raw key to its shared singleton.
- Impact: analytics, chat, lead, appointment, and staff setup activity from one
  client could consume another route's allowance or produce inconsistent
  throttling during degraded operation.
- Fix: prefix the memory key with the typed route partition before checking the
  shared fallback store.
- Mitigation: dedicated per-route tests now prove isolation.
- False-positive notes: this did not affect the healthy Neon path, but the
  fallback is intentionally exercised in local, test, Preview, and emergency
  runtime states.

## Controls confirmed

- SQL values remain parameterized through the Neon tagged-template client.
- Raw IPs and other caller identifiers are never stored in Neon.
- Provider errors are reduced to bounded categorical codes before logging.
- Public readiness output is boolean/categorical and includes no role, URL,
  secret, bucket key, or row data.
- Production readiness requires the dedicated 32-or-more-character limiter
  secret; reused credentials cannot make the deployment ready.
- Vercel documents that it overwrites `x-forwarded-for` with the public client
  IP to prevent spoofing. If a reverse proxy is introduced later, the proxy/IP
  trust model must be reviewed again.
- Lead intake rejects non-durable limiting in Production unless the exact
  break-glass flag is enabled.
- Preview database mutation remains independently denied.

## Verification status

1. Complete: focused limiter/readiness tests.
2. Complete on the final worktree tree: full Node 24 release gate, 229 test
   files / 3,064 tests, strict typecheck, ESLint, 14/14 release safety,
   optimized build, 83-route verification, zero known Production dependency
   vulnerabilities, 584-commit secret scan, and changed-file secret scans.
3. Pending after commit/push: exact-head Vercel Preview and protected no-write
   acceptance.
4. Pending exact owner gate: Production secret entry, merge, and same-commit
   deployment.

## Rollback

Restore rescue branch
`rescue/amm-pr209-pre-memory-fallback-hardening-20260824-0333` at
`c04655cc04135f89cf9b401a631bc503c8c70057`. No database or environment rollback
is needed for this branch-only hardening.
