# Launch Checklist — Ask Magic Mike
**Our Town Properties, Inc. · Wilson, NC**
**Version:** Omega Launch Phase
**Owner:** Mike Eatmon (Broker / Executive Authority)

---

## Pre-Launch Gate

All items below must be ✅ before production traffic is opened to the full funnel.

### 1. Infrastructure
- [ ] Supabase project confirmed active (`NEXT_PUBLIC_SUPABASE_URL` set)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Vercel production environment (never committed to git)
- [ ] All 14 database migrations applied (`pnpm run amm:launch:doctor`)
- [ ] `ADMIN_SECRET` rotated and set in Vercel environment
- [ ] Vercel production alias verified (`scripts/amm/verify-production-alias.mjs`)
- [ ] `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` set (SMS path)
- [ ] `TWILIO_WEBHOOK_AUTH_TOKEN` set for inbound SMS webhook validation
- [ ] Domain DNS pointing to Vercel (A/CNAME confirmed, SSL active)
- [ ] WordPress widget snippet installed at ourtownproperties.com

### 2. Authentication & Access Control
- [ ] Admin portal requires `ADMIN_SECRET` header — verified via smoke test
- [ ] Agent portal requires `AGENT_SECRET` header — verified
- [ ] No public route exposes lead PII without auth
- [ ] Rate limiting active on `/api/intake/*`, `/api/leads`, `/api/scoring/*`
- [ ] Twilio webhook signature validation active on `/api/webhooks/sms/inbound`
- [ ] Admin secret minimum 32 characters, high entropy

### 3. Lead Funnel
- [ ] `/ask` intake form submits successfully (end-to-end test)
- [ ] `/embed/ask` widget submits successfully from ourtownproperties.com iframe
- [ ] Lead appears in Supabase `leads` table within 3 seconds
- [ ] Lead scored and graded (A+/A/B/C) within 5 seconds
- [ ] SLA clock starts immediately on A+ and A leads
- [ ] SMS consent captured and stored on lead record
- [ ] CRM sync fires if CRM adapter configured (Follow-Up Boss / KVCore)

### 4. Agent Routing
- [ ] At least one active agent record in `agents` table
- [ ] Lead assignment logic distributes new hot leads to agents
- [ ] Agent receives notification (SMS/email) on new assignment
- [ ] Agent portal shows assigned leads correctly
- [ ] Agent can log contact, update status, add notes

### 5. Admin Command Center
- [ ] `/admin` loads with live data (not dev/sample banner)
- [ ] Lead Intelligence grid shows correct counts
- [ ] Attention strip shows urgent/SLA-breached leads
- [ ] Today's Operations shows follow-up and never-contacted counts
- [ ] Source attribution shows correct UTM breakdown
- [ ] Intelligence Pulse section shows signals (verify after 7 days of traffic)
- [ ] All 11 Command Center navigation links resolve correctly

### 6. Intelligence Brain
- [ ] `/admin/intelligence` loads without error
- [ ] All 7 sub-pages accessible (predictions, opportunities, properties, sellers, buyers, relationships, memory)
- [ ] Intelligence signals load with graceful fallback when Supabase empty
- [ ] Seller/buyer intelligence derives from live lead data

### 7. Document Engine
- [ ] `/admin/documents` loads correctly
- [ ] All 9 document templates display with correct data requirements
- [ ] Links from Document Engine to Leads Inbox functional

### 8. Listings OS
- [ ] `/admin/listings` loads without error
- [ ] Seller leads filtered correctly by intent
- [ ] Neighborhood heat map renders (empty-state graceful)
- [ ] Import instructions accurate and link to correct endpoint
- [ ] Listing inventory status reflects `totalProperties` from intelligence signals

### 9. Analytics & Tracking
- [ ] `analytics_events` table receiving events (page views, lead submissions, CTA clicks)
- [ ] `/api/analytics/event` route returns 200
- [ ] UTM parameters stored on lead records from widget sessions
- [ ] SLA sweep cron job configured in Vercel (every 5 minutes)

### 10. Compliance
- [ ] Fair Housing disclaimer visible on all public listing pages
- [ ] SMS consent language reviewed by broker (Mike Eatmon)
- [ ] No MLS-confidential data exposed in public source or API responses
- [ ] TCPA consent stored with timestamp and IP on every lead

### 11. Performance
- [ ] Largest Contentful Paint (LCP) < 2.5s on mobile (GTmetrix / Lighthouse)
- [ ] `/ask` widget loads < 1.5s on 3G simulation
- [ ] Admin dashboard loads < 3s with 100 leads in DB
- [ ] No N+1 queries on lead list pages (verified via Supabase query logs)

### 12. Final Validation
- [ ] `pnpm run verify` (typecheck + test + lint + build) passes cleanly
- [ ] `pnpm run amm:launch:doctor` shows 26/26 checks green
- [ ] `pnpm run release:preflight` passes
- [ ] Smoke test at production URL passes
- [ ] Playwright E2E suite passes against production preview

---

## Day-of-Launch Sequence

1. Confirm all pre-launch gate items ✅
2. Run `scripts/amm/verify-production-alias.mjs` — confirm no deploy drift
3. Notify Mike Eatmon via direct message — "Launch window open"
4. Enable full traffic (remove any beta/preview gate if active)
5. Monitor Vercel function logs for first 30 minutes
6. Monitor Supabase `leads` table for first real submissions
7. Monitor SLA sweep execution (check `analytics_events` for sweep triggers)
8. First real lead → confirm routing → agent notified → contact logged within SLA window

## Post-Launch (First 48 Hours)
- [ ] Confirm first real lead routed correctly
- [ ] Confirm SLA compliance rate ≥ 90%
- [ ] Confirm no 500 errors in Vercel function logs
- [ ] Confirm CRM sync working (if enabled)
- [ ] Brief Mike Eatmon on first 48-hour metrics
