# Known Limitations — Ask Magic Mike
**Our Town Properties, Inc. · Wilson, NC**
**Version:** Omega Launch Phase

This document provides an honest accounting of platform limitations, known gaps, and workarounds. Every item here has a documented workaround or a roadmap entry.

---

## 1. Data & Integrations

### 1.1 No Real-Time MLS Data Feed
**Limitation:** The platform does not have a live MLS data feed. Property data requires manual CSV export from FlexMLS and import via the `/api/admin/listings/import` endpoint.

**Impact:** Property intelligence, buyer-listing matching, and valuation signals are only as fresh as the last import.

**Workaround:** Export and import FlexMLS CSV weekly (or when new listings go live). Import takes < 30 seconds.

**Roadmap:** Phase 16 — FlexMLS RETS/RESO API integration for automatic nightly sync.

---

### 1.2 Intelligence Signals Require 7 Days of Traffic
**Limitation:** The Intelligence Brain's signals window is 7 days. A freshly-launched system will show zeros across all intelligence metrics until traffic accumulates.

**Impact:** Predictions, opportunities, and seller/buyer intelligence are empty or low-confidence until day 7.

**Workaround:** Launch the funnel and allow 7 days of organic traffic before relying on intelligence outputs. The system degrades gracefully — all pages show appropriate empty states.

**Timeline:** Intelligence is fully operational after 30 days of steady traffic.

---

### 1.3 CRM Integration is Optional
**Limitation:** CRM sync (Follow-Up Boss, KVCore) is configured via environment variables and uses a null adapter by default.

**Impact:** Without CRM configured, lead data lives only in Supabase — no automatic sync to external CRM.

**Workaround:** Manual export or configure CRM adapter (see `src/lib/crm/`). Follow-Up Boss adapter is fully implemented.

---

### 1.4 Email Notifications Not Production-Ready
**Limitation:** The email adapter in `src/lib/adapters/email-mock.ts` is a mock. Production email delivery requires a transactional email provider (Resend, SendGrid, Postmark).

**Impact:** Agent notification emails will not deliver in production without configuring a real email adapter.

**Workaround:** SMS notifications (Twilio) work in production. Configure SMS for agent alerts immediately; defer email setup.

**Roadmap:** Phase 17 — Resend adapter for transactional email.

---

## 2. Document Engine

### 2.1 Documents Are Text-Based, Not PDF
**Limitation:** The Document Engine generates structured document content in Markdown/text format. It does not generate formatted PDFs, branded Word documents, or print-ready files.

**Impact:** Documents need to be copy-pasted into your word processor or printed from the browser.

**Workaround:** Browser print function (Ctrl+P / Cmd+P) produces a clean print layout from any document preview page.

**Roadmap:** Phase 18 — PDF generation via Puppeteer or a document API.

---

### 2.2 CMA Packet Does Not Include Comparable Sales Automatically
**Limitation:** The CMA Packet template generates the structure and talking points but cannot auto-populate comparable sales. Comps must be manually entered by the agent/broker.

**Impact:** Full CMA creation still requires manual comp research in the MLS.

**Workaround:** Use the template to structure the presentation; paste comps from FlexMLS directly into the generated framework.

---

## 3. Agent Portal

### 3.1 Agent Portal Has No Real-Time Notifications
**Limitation:** The agent portal does not push real-time notifications when a new lead is assigned. Agents must refresh the page or rely on SMS notification.

**Impact:** Agents may miss the SLA window if they're not actively watching the portal.

**Workaround:** Twilio SMS notifications are the primary alert mechanism. Agents should enable SMS notifications and treat the portal as a secondary reference.

**Roadmap:** Phase 19 — Server-Sent Events (SSE) or WebSocket for real-time lead alerts.

---

### 3.2 Agent Cannot Mark Leads as Duplicate
**Limitation:** Agents cannot flag a lead as a duplicate from their portal. Duplicate detection runs automatically on submission, but identical leads from different sessions may slip through.

**Workaround:** Agent adds a note "Duplicate of [ID]" and sets status to `dead`. Admin reviews and consolidates.

---

## 4. Automation

### 4.1 Automation Does Not Send Outbound Messages
**Limitation:** By design, the automation engine does not send outbound SMS or email messages automatically. All outbound communication requires explicit agent action.

**Impact:** There is no "drip campaign" or automated follow-up sequence that fires without human involvement.

**Workaround:** Agents use the tasks system to schedule manual follow-ups. SLA sweep flags overdue leads for human action.

**Roadmap:** Phase 20 — Opt-in automated follow-up sequences with broker approval gate. (Requires TCPA compliance review.)

---

### 4.2 SLA Sweep Is Not Instantaneous
**Limitation:** The SLA sweep runs every 5 minutes via Vercel cron. A lead that breaches its SLA at minute 0 may not be flagged for up to 5 minutes.

**Impact:** Negligible for A leads (60-minute SLA). For A+ leads (5-minute SLA), there's a 5-minute detection delay.

**Workaround:** A+ leads are flagged real-time on the Command Center dashboard via the attention strip, which reads directly from the DB. The cron sweep is the secondary mechanism.

---

## 5. Intelligence Brain

### 5.1 Predictions Are Statistical, Not Guaranteed
**Limitation:** All predictions (likely_listing, likely_closing, etc.) are derived from behavioral signals and statistical models. They are not guarantees of outcome.

**Impact:** A lead with "likely_listing" score of 90 may still not list. Use predictions as prioritization tools, not certainties.

---

### 5.2 Knowledge Graph Is In-Memory
**Limitation:** The Knowledge Graph is built in-memory at request time from available signals. It is not persisted between requests and resets on each page load.

**Impact:** Very large graphs (1,000+ nodes) may cause slow page loads on the Relationships page.

**Workaround:** Graph is capped at `topNodes(10)` for display. Full graph is only materialized when needed.

**Roadmap:** Phase 21 — Persistent graph storage in Supabase for faster load and graph evolution tracking.

---

## 6. Visual & UX

### 6.1 No Mobile-Optimized Admin Portal
**Limitation:** The admin portal is designed for desktop use (1024px+ viewport). While it renders on mobile, the experience is not optimized.

**Impact:** Broker or agents checking the portal on mobile phones will see a cramped but functional interface.

**Workaround:** Use desktop browser for admin/agent portal operations.

**Roadmap:** Phase 22 — Mobile-responsive admin portal.

---

### 6.2 Dark Mode Only
**Limitation:** The admin and agent portals are dark-mode only (black/cream/gold palette). There is no light mode.

**Impact:** Users who prefer light mode have no toggle.

**Workaround:** Browser dark-mode overrides may partially affect the interface, but the palette is hardcoded.

---

## 7. Production Constraints

### 7.1 Migration 00012 Must Be Applied Manually
**Limitation:** Database migration 00012 (listings table, canonical lead columns) must be applied manually to a fresh Supabase project. It is not auto-applied on first deploy.

**Impact:** A fresh production Supabase instance without this migration will cause 500 errors on lead listing APIs.

**Workaround:** Run all migrations sequentially before enabling production traffic. See `supabase/migrations/` for the full sequence. Verify with `pnpm run amm:launch:doctor`.

---

### 7.2 Vercel Free Tier Cron Limitations
**Limitation:** The SLA sweep cron job requires Vercel Pro tier for sub-minute scheduling. On Vercel Free, crons are limited to once per day.

**Impact:** SLA enforcement degrades significantly on Vercel Free tier.

**Workaround:** Use Vercel Pro (already required for production workload). Alternatively, trigger the SLA sweep via external cron (GitHub Actions scheduled workflow pointing to `/api/admin/sla/sweep`).

---

## Prioritized Fix List

| # | Limitation | Priority | Effort |
|---|-----------|----------|--------|
| 1 | Email notifications (real adapter) | High | 1–2 days |
| 2 | Real-time agent notifications | High | 2–3 days |
| 3 | PDF document generation | Medium | 3–5 days |
| 4 | FlexMLS API sync | Medium | 1 week |
| 5 | CRM auto-sync (FUB) | Medium | 2–3 days |
| 6 | Mobile-optimized portal | Low | 2 weeks |
| 7 | Persistent knowledge graph | Low | 3–5 days |
| 8 | Automated follow-up sequences | Low | 2 weeks + compliance review |
