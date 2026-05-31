# Implementation Tickets

## Completed (This Session)

### T-001: Project Scaffold
- [x] package.json, tsconfig, tailwind.config, next.config, postcss, eslint
- [x] .env.example with all required variables documented
- [x] pnpm install — all dependencies resolved

### T-002: Database Schema
- [x] 10 Supabase migration files (sessions → leads → scoring → agents → routing → properties → valuations → analytics → crm_log → seed)
- [x] database.types.ts placeholder

### T-003: Domain Types & Zod Schemas
- [x] src/types/domain.types.ts — all domain interfaces
- [x] src/types/env.d.ts — process.env augmentation
- [x] src/schemas/*.schema.ts — 7 schema files

### T-004: Supabase Client Layer
- [x] client.ts (browser), server.ts (SSR), admin.ts (service role)

### T-005: Scoring Engine
- [x] constants.ts, seller-score.ts, buyer-score.ts, temperature.ts, index.ts

### T-006: Attribution Parser
- [x] utm-parser.ts, referrer-classifier.ts

### T-007: Analytics Ledger
- [x] events.ts (23 named events), ledger.ts (fire-and-forget)

### T-008: Agent Routing
- [x] assign-agent.ts (priority → load → availability → SLA)
- [x] sla-monitor.ts, escalation.ts

### T-009: CRM Adapter
- [x] types.ts (interface), null-adapter.ts, follow-up-boss.ts, kvcore.ts, index.ts (factory)

### T-010: Valuation Foundation
- [x] provider-interface.ts, mock-provider.ts, disclaimer.ts, index.ts

### T-011: API Routes
- [x] /api/session/create
- [x] /api/intake/step, /api/intake/submit (full orchestration)
- [x] /api/analytics/event
- [x] /api/routing/accept
- [x] /api/scoring/compute

### T-012: Landing Page UI
- [x] Tailwind design tokens (black/gold/ruby palette)
- [x] HeroSection, QuestionInput, CTAChips, TrustBar
- [x] app/page.tsx

### T-013: Intake Flow UI
- [x] IntakeShell (progress bar, nav)
- [x] StepQuestion, StepIntent, StepContact, StepConsent, StepConfirmation
- [x] useSession, useAnalytics, useIntakeFlow hooks
- [x] /ask page (5-step wizard)

### T-014: Shared UI Primitives
- [x] Button (5 variants), Input, Badge, Progress
- [x] DisclaimerBanner

### T-015: Tests
- [x] scoring/seller-score.test.ts (12 tests)
- [x] scoring/buyer-score.test.ts (8 tests)
- [x] scoring/temperature.test.ts (9 tests)
- [x] attribution/utm-parser.test.ts (8 tests)
- [x] routing/assign-agent.test.ts (11 tests)
- [x] schemas/validation.test.ts (12 tests)

### T-016: Docs
- [x] README.md, ENVIRONMENT.md, ARCHITECTURE.md, COMPLIANCE_CHECKLIST.md

---

## Next 10 Tickets

### T-017: Admin Dashboard (MVP)
Build `/admin` with lead table, score display, temperature badges, SLA timers.
- Components: LeadTable, LeadDetail, ScoreDisplay, TemperatureBadge, SLATimer
- Auth: basic auth via ADMIN_SECRET
- Route: app/(admin)/admin/page.tsx

### T-018: Valuation Estimate Route + UI
- Implement GET /api/valuation/estimate
- Create ValuationCard component with range + comps + disclaimer
- Wire to Step 1 (show estimate when seller intent + address present)

### T-019: CRM Route + Manual Sync
- Implement POST /api/crm/sync (admin-only manual re-sync)
- Build CRM status indicator in admin lead detail

### T-020: Real Estate Notifications (Email/SMS)
- Wire Resend for agent email notification on new lead assignment
- Wire Twilio for SMS notification to agent
- Fire on lead_assigned event

### T-021: Agent Accept Portal
- Simple page: /accept/[routingId]?agentId= 
- Calls /api/routing/accept
- Shows lead summary and SLA countdown

### T-022: Admin Routing/Accept Route
- Implement POST /api/routing/assign (manual admin re-assign)
- Build re-assign UI in admin dashboard

### T-023: SLA Monitor Background Job
- Implement checkSLABreaches() polling via admin dashboard load
- Or: Supabase Edge Function cron that runs every minute
- Escalate to admin agent on breach

### T-024: AI Intent Enrichment (Optional)
- Wire AI abstraction layer to intake submit
- Use intent detection prompt when questionRaw is ambiguous (primaryIntent = 'unknown')
- Adjust score based on detected intent

### T-025: Google Places Autocomplete
- Wire address input to Google Places API
- Store structured address components (line1, city, state, zip)
- Add NEXT_PUBLIC_GOOGLE_PLACES_API_KEY to env vars

### T-026: Production Deployment
- Set up Vercel project
- Configure production env vars
- Point askmagicmike.com DNS to Vercel
- Run migrations against production Supabase
- Verify build, lint, typecheck all pass
- End-to-end smoke test: submit a lead, verify it appears in admin

---

## Backlog

- T-027: Lead scoring V2 (AI-augmented, question text NLP)
- T-028: Valuation real provider (ATTOM or HouseCanary)
- T-029: Automated follow-up sequences (email/SMS drip)
- T-030: Analytics dashboard (conversion funnel by UTM source)
- T-031: WordPress integration (embed intake form as iframe or widget)
- T-032: Double opt-in for SMS (TCPA hardening)
- T-033: CCPA data deletion request handler
- T-034: Agent mobile app / PWA for lead acceptance
- T-035: Mike's "Did It Again" video integration on confirmation page
