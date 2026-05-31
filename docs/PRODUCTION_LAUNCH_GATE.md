# Production Launch Gate

**Complete every item before deploying to production.**

This is a hard checklist — not aspirational. If any item is blocked, the launch is blocked.

---

## 1. Required Environment Variables

All of the following must be set in the production environment:

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | **REQUIRED** |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) | **REQUIRED** |
| `NEXT_PUBLIC_ANON_KEY` | Supabase anon key | **REQUIRED** |
| `ADMIN_SECRET` | Password for `/admin` route | **REQUIRED** |
| `NEXT_PUBLIC_APP_URL` | Canonical site URL (e.g. `https://askmagicmike.com`) | **REQUIRED** |
| `NEXT_PUBLIC_AGENT_NAME` | `Mike Eatmon` | **REQUIRED** |
| `NEXT_PUBLIC_BROKERAGE_NAME` | `Our Town Properties` | **REQUIRED** |
| `NEXT_PUBLIC_MARKET_AREA` | `Wilson, NC` | **REQUIRED** |
| `NEXT_PUBLIC_AGENT_LICENSE` | NC license number | **REQUIRED** |

Missing `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` in production will:
- Return HTTP 503 on all intake API routes
- Show a locked configuration screen on `/admin`
- Never show mock/dev data

---

## 2. Database

- [ ] Supabase project created
- [ ] All migrations applied in order (`00001` → `00011`)
- [ ] Row Level Security enabled on all tables (verified in Supabase dashboard)
- [ ] Mike Eatmon agent row seeded (migration 00010 + upserted in 00011)
- [ ] `sessions`, `leads`, `lead_scores`, `lead_routing`, `agents` tables exist
- [ ] `contacts`, `consents`, `source_attribution`, `audit_logs`, `compliance_flags` tables exist
- [ ] Test: submit one lead via `/ask` and confirm it appears in `/admin`

---

## 3. Admin Route Security

- [ ] `ADMIN_SECRET` is set to a strong, unique value (not `changeme-local`)
- [ ] Accessing `/admin` without credentials returns HTTP 401
- [ ] Accessing `/admin` with wrong password returns HTTP 401
- [ ] If `ADMIN_SECRET` is missing or `changeme-local` in production, middleware returns 503
- [ ] Admin dashboard shows live data (not the dev mock banner)

---

## 4. Intake Flow Verification

- [ ] Complete `/ask` flow end-to-end: question → intent → contact → consent → confirmation
- [ ] After submission: `sessions`, `leads`, `lead_scores` rows exist in Supabase
- [ ] `consents` table has an immutable record for each consent type granted
- [ ] `crm_sync_log` has a `status: 'skipped'` entry (null adapter) or success entry
- [ ] `analytics_events` has `session_created`, `intake_completed`, `lead_scored` events
- [ ] Score, temperature, and agent assignment appear correctly in `/admin`

---

## 5. No Mock Data in Production

- [ ] `/admin` does not show the yellow "DEV MOCK DATA" banner
- [ ] No `DEV_LEADS` data visible in production
- [ ] `shouldUseDevStorage()` returns `false` when Supabase is configured

---

## 6. MLS / IDX Data

- [ ] No MLS/IDX-derived sold comps, listing data, or confidential MLS exports in any public-facing page
- [ ] All sold/performance data uses verified career biography statistics only
- [ ] Any MLS import functionality is internal/admin-only and gated behind broker approval
- [ ] Written IDX agreement obtained from MLS board before displaying live listing data

---

## 7. Compliance

- [ ] TCPA consent language reviewed by attorney
- [ ] Consent language version `v1` text matches exactly what is in `src/components/intake/step-consent.tsx`
- [ ] `consent_language_version` stored on every lead record
- [ ] SMS opt-out (STOP) handling documented and tested
- [ ] DNC registry scrub process documented
- [ ] AVM disclaimer present on every valuation response
- [ ] "Equal Housing Opportunity" statement in footer
- [ ] Agent license number (`NEXT_PUBLIC_AGENT_LICENSE`) set and visible in UI
- [ ] Privacy policy page at `/privacy` live before launch
- [ ] Physical mailing address in all outbound emails (`3301 Nash St. NW Suite E, Wilson NC 27896`)
- [ ] NC General Statute § 93A compliance reviewed with broker

---

## 8. Security

- [ ] `SUPABASE_SERVICE_ROLE_KEY` not exposed in any client-side bundle (verify with `NEXT_PUBLIC_` prefix absence)
- [ ] Rate limiting on `/api/intake/submit` — replace in-memory stub with Upstash Redis before launch
  - Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- [ ] `Content-Security-Policy` header configured
- [ ] Admin auth upgraded from Basic Auth to session-based auth (before high-traffic launch)
- [ ] All intake API routes return `Cache-Control: no-store` (already implemented)

---

## 9. CRM Adapter

- [ ] CRM adapter is disabled unless credentials are explicitly set
- [ ] If Follow Up Boss: `FUB_API_KEY` set and tested
- [ ] If kvCORE: `KVCORE_API_KEY` and `KVCORE_BASE_URL` set and tested
- [ ] Null adapter is active (no external writes) until CRM credentials are explicitly configured
- [ ] `crm_sync_log` entries appear for each adapter call (success or skipped)

---

## 10. Source Attribution

- [ ] UTM parameters captured and stored in `sessions` table on first visit
- [ ] `source_attribution` table populated for each submitted lead
- [ ] `utm_source`, `utm_medium`, `utm_campaign` visible in `/admin` expanded row

---

## 11. Final Sign-offs

- [ ] Broker (Mike Eatmon) has reviewed all consumer-facing copy
- [ ] All performance statistics on landing page confirmed accurate
- [ ] Legal/compliance attorney has reviewed TCPA consent language
- [ ] Hosting/DNS configured for `askmagicmike.com`
- [ ] SSL certificate active
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain

---

## Blocked Until Resolved

List any items that cannot be completed before launch and document the owner + ETA:

| Item | Blocked By | Owner | ETA |
|------|-----------|-------|-----|
| Rate limiting (Upstash) | Upstash account setup | TBD | Before launch |
| NC license # in UI | Confirm license number | Mike Eatmon | Before launch |
| Privacy policy page | Legal review | TBD | Before launch |
| Admin session-based auth | Engineering | TBD | Before high-traffic |
