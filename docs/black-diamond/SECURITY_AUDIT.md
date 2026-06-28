# Security Audit — Ask Magic Mike
**Black Diamond Certification · 2026-06-27**

---

## Security Model

Ask Magic Mike uses a layered security model:
1. **Public boundary** — intake, session, analytics APIs are public but rate-limited
2. **Admin boundary** — all `/api/admin/*` and `/admin/*` require `ADMIN_SECRET`
3. **Agent boundary** — `/api/agent/*` and `/agent/*` require agent credentials + agent ID match
4. **DB boundary** — all DB writes go through `createAdminClient()` (service role, server-only)
5. **Webhook boundary** — Twilio signature verification on inbound SMS

---

## Authentication Audit

| Surface | Auth Mechanism | Status |
|---------|---------------|--------|
| `/api/admin/*` | `Authorization: Bearer {ADMIN_SECRET}` header | ✅ Verified |
| `/admin/*` (UI) | Session-based; Supabase auth gated | ✅ Verified |
| `/api/agent/[agentId]/*` | Agent credentials + agent ID path match | ✅ Verified |
| `/agent/*` (UI) | Agent session | ✅ Verified |
| `/api/webhooks/sms/inbound` | Twilio signature (`TWILIO_WEBHOOK_AUTH_TOKEN`) | ✅ Verified |
| `/api/analytics/event` | Public — rate limited | ✅ Verified |
| `/api/intake/*` | Public — rate limited | ✅ Verified |
| `/api/listings/search` | Public — safe responses only | ✅ Verified |

---

## Permission Isolation

| Rule | Status |
|------|--------|
| Agent cannot read other agents' leads | ✅ Agent ID path param enforced |
| Agent cannot access admin endpoints | ✅ Separate auth mechanisms |
| Admin cannot trigger outbound messaging without explicit action | ✅ No auto-send anywhere |
| Automation engine cannot self-authorize message sends | ✅ No outbound in automation |
| Intelligence brain is read-only | ✅ All engines are pure functions |
| Memory engine reads `analytics_events`, never writes | ✅ No write path in memory-engine.ts |

---

## Input Validation

| API | Validation |
|-----|-----------|
| `/api/intake/submit` | Lead schema validation; phone normalization; spam detection |
| `/api/intake/step` | Step type validation; session required |
| `/api/admin/leads/[id]/assign` | Agent ID validated against agents table |
| `/api/admin/leads/[id]/notes` | Content sanitized; lead ID validated |
| `/api/admin/listings/import` | CSV format validation; MLS content sanitizer |
| `/api/webhooks/sms/inbound` | Twilio signature required; body validated |

---

## Secret Exposure

| Check | Result |
|-------|--------|
| No `.env` files committed | ✅ `.env*` in `.gitignore` |
| No secrets in git history | ✅ Verified via `git log --all -- "*.env"` |
| `SUPABASE_SERVICE_ROLE_KEY` server-only (never in client bundle) | ✅ Only in `src/lib/supabase/admin.ts` + `server.ts` |
| `ADMIN_SECRET` server-only | ✅ Only in API route handlers |
| No API keys logged in Vercel output | ✅ Logger filters secrets |
| `NEXT_PUBLIC_*` vars contain no secrets | ✅ Only public Supabase URL + anon key |

---

## Rate Limiting

| Endpoint | Rate Limit |
|----------|-----------|
| `/api/intake/submit` | Per-IP window (compliance/rate-limit.ts) |
| `/api/intake/step` | Per-session window |
| `/api/analytics/event` | Per-IP window |
| `/api/leads` | Per-IP window |
| Admin endpoints | ADMIN_SECRET required (no rate limit needed) |

---

## Compliance

| Rule | Status |
|------|--------|
| TCPA consent stored with timestamp + IP | ✅ `consent_timestamp`, `consent_ip` on lead record |
| Fair Housing compliance check on listing content | ✅ `src/lib/compliance/fair-housing.ts` |
| Listing content sanitizer removes protected-class language | ✅ `src/lib/compliance/listing-sanitizer.ts` |
| Duplicate lead detection prevents spam | ✅ `src/lib/leads/duplicate-detection.ts` |
| Spam detection on intake | ✅ `src/lib/leads/spam-detector.ts` |
| Opt-out stored on lead; no further contact without check | ✅ `complianceFlags` queried on lead detail |

---

## Production Mutations

The following operations cannot occur automatically:
- ❌ No auto-send SMS/email without agent action
- ❌ No auto-publish content without approval
- ❌ No auto-delete records without operator action
- ❌ No auto-assign leads to external systems without CRM adapter configured
- ❌ No ML model writes to production DB

---

## Security Score: 98/100

Deductions:
- **-1**: Email adapter is a mock (no production transport = no email injection risk, but means email-based alerts are disabled)
- **-1**: SLA sweep requires `ADMIN_SECRET` in cron job — if secret leaked, sweep endpoint is callable. Mitigated by: sweep only reads + marks records, never deletes or sends.

**No critical security vulnerabilities found.** No SQL injection vectors (Supabase parameterized client). No XSS vectors (Next.js auto-escaping). No command injection (no `exec`/`spawn`).
