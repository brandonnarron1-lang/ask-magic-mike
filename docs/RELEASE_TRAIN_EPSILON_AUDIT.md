# Release Train Epsilon — Audit Report

**Sprint:** Epsilon — Launch-Grade Product Hardening + Broker OS Completion  
**Status:** Completed  
**Branch:** `release-train-epsilon-product-hardening`

---

## Audit Findings

| Area | Finding | Evidence | Risk | Fix Now? | Action |
|------|---------|---------|------|----------|--------|
| Visual | `red-300` / `red-600` token violation — YouTube badge in Traffic Command | `src/app/(admin)/admin/traffic/page.tsx:28` | Low — admin-only page; design system drift | YES | Fixed: changed to `ruby-400/ruby-300` |
| Env types | `NEXT_PUBLIC_APP_URL: string` is marked required but is stale — actual var is `NEXT_PUBLIC_SITE_URL` | `src/types/env.d.ts:36` | Low — TypeScript false required field | YES | Fixed: marked optional + deprecation comment |
| Smoke script | `amm:smoke:prod` npm script missing; script existed at `scripts/prod-smoke.mjs` with no AMM-namespaced alias | `package.json` | Low | YES | Added `amm:smoke:prod` script |
| Smoke script | Missing checks: admin unauth 401, /embed/ask loads, security response headers, no-MLS-markers in public HTML | `scripts/prod-smoke.mjs` | Medium — gaps mean security regressions go undetected post-deploy | YES | Added 4 new checks + 2 exported helpers |
| Observability | No structured logging library; all logging via raw `console.*` calls — PII leak risk, no consistent format | `src/app/api/webhooks/`, `src/lib/db/` | Medium — unstructured logs make incident investigation harder; PII in log streams is compliance risk | YES | Created `src/lib/observability/logger.ts` with PII scrubber |
| Rate limiter | In-memory only; no shared state across Vercel instances; resets on cold start | `src/lib/security/rate-limit.ts` | High — launch blocker B-01 | Partial | Added `RateLimitStore` interface + `InMemoryRateLimitStore` class; upgrade to Upstash requires owner approval |
| TODO count | 1 TODO in source: rate-limit.ts Upstash upgrade | `src/lib/security/rate-limit.ts:4` | Known, documented | NO — already in KNOWN_BLOCKERS | Tracked |
| Compliance copy | `guarantee`, `cash offer`, `appraisal` in source | Multiple | Low — all occurrences are in correct "not an appraisal" disclaimers, prohibition lists, or admin-only question categorization | NO | Clean |
| Console logging | All `console.*` calls are appropriately categorized (error/warn for failures, log for adapters) — no raw PII evident | Multiple API routes | Low | NO | Logger available for incremental adoption |
| Health endpoint | `/api/admin/health` is comprehensive — DB reachability, migration status, safety flags | `src/app/api/admin/health/route.ts` | — | NO | Verified ✓ |
| Prod smoke | `scripts/prod-smoke.mjs` existed and is well-structured — expanded, not rebuilt | — | — | EXPANDED | Added 3 new check functions + 2 helpers |
| Admin routes | Tasks, notes, assign, messages routes all have explicit DB error handling returning non-200 | Multiple routes | — | NO | Verified ✓ |
| Webhook routes | SMS and email webhook routes log all DB failures with `[COMPLIANCE CRITICAL]` prefix for opt-outs (Gamma sprint) | Gamma PR #42 | — | NO | Verified ✓ |
| Stale vercel.app URLs | URLs appear only in docs context (migration history, visual system docs) — not in public-facing UI | `src/lib/brand/visual-system.ts`, docs | Low — acceptable context | NO | Verified contextual |
| Security headers | Missing HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options | `next.config.ts` on main | High | PENDING PR #44 | Headers added in Delta PR #44 (not yet merged) |
| serverActions origins | `allowedOrigins` missing production domains | `next.config.ts` on main | Medium | PENDING PR #44 | Fixed in Delta PR #44 (not yet merged) |
| Architecture docs | Schema table had 9 entries; 26 tables actually exist | `docs/ARCHITECTURE.md` | Low | PENDING PR #44 | Fixed in Delta PR #44 (not yet merged) |
| PR #8 | V8 value page — stale 20+ days, DIRTY merge state, tested against 370 tests (main now 1084) | PR #8 | Medium — will have conflicts if merged without rebase | NO | Owner action: rebase + product review before merge |
| Admin mutations audit | PATCH /api/admin/leads/[id] writes to `audit_logs`; assign route writes to both `agent_assignments` and `audit_logs` | Route handlers | — | NO | Verified ✓ |

---

## Summary

- **Bugs fixed:** 2 (red token violation, stale env type)
- **Smoke script checks added:** 7 (admin unauth, embed load, 4 security header warnings, MLS marker check)
- **New exports (smoke helpers):** 2 (`hasNoMlsMarkers`, `extractSecurityHeaders`)
- **New code modules:** 1 (`src/lib/observability/logger.ts` with PII scrubber)
- **New interfaces:** 1 (`RateLimitStore` + `InMemoryRateLimitStore` class)
- **Tests added:** 20+ (logger scrubber, logger emit, smoke helpers)
- **Launch blockers deferred:** B-01 (rate limiter) still requires owner approval for Upstash

---

## Verified Clean

- No `red-500` / `red-400` / `red-300` tokens in production UI (after fix)
- No raw `guarantee` / `instant cash offer` / `appraisal` in user-facing copy
- No MLS/IDX confidential data in public-facing pages
- Admin routes return correct error statuses
- Webhook compliance logging active
- Health endpoint comprehensive
