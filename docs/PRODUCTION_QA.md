# Production QA Playbook — Ask Magic Mike
**Our Town Properties, Inc. · Wilson, NC**
**Version:** Omega Launch Phase

---

## Purpose

This document defines the complete QA protocol for every route, API, permission boundary, admin/agent surface, and automation workflow. Run this playbook before every production deployment and after any significant change.

---

## 1. Public Funnel

### 1.1 Landing Page (`/`)
- Loads within 2.5s on desktop (measured from cold cache)
- Hero CTA resolves to `/ask` or triggers intake widget
- No MLS data visible in public source
- Social meta tags (`og:title`, `og:image`, `og:description`) correct
- Fair housing disclaimer visible if property content shown

### 1.2 Intake Widget (`/ask`)
- Widget renders without JavaScript errors
- All 3 intake steps complete (intent → address → contact)
- Form validates: invalid phone rejected, duplicate email handled gracefully
- Submission reaches Supabase `leads` table within 3s
- Lead receives correct score (A+ for high-intent seller)
- Thank-you / confirmation state shown after submission
- Session cookie set with `sessionId`

### 1.3 Embedded Widget (`/embed/ask`)
- Renders correctly inside ourtownproperties.com iframe at `300px` and `500px` width
- Cross-origin submission works (CORS headers set on `/api/intake/*`)
- UTM params from parent page passed through to lead record

### 1.4 Value Page (`/value`)
- Loads with campaign-specific copy
- Valuation form submits and creates lead
- Disclaimer present

---

## 2. API Routes

### 2.1 Intake APIs
| Route | Method | Expected | Test |
|-------|--------|----------|------|
| `/api/intake/step` | POST | 200 with next-step data | Submit step 1 intent payload |
| `/api/intake/submit` | POST | 201 lead created | Submit complete intake |
| `/api/session/create` | POST | 200 session ID | Create new session |

### 2.2 Lead APIs
| Route | Method | Auth | Expected |
|-------|--------|------|----------|
| `/api/leads` | GET | None | 200 (public, rate-limited) |
| `/api/admin/leads` | GET | ADMIN_SECRET | 200 with lead list |
| `/api/admin/leads/[id]` | GET | ADMIN_SECRET | 200 with full lead |
| `/api/admin/leads/[id]/assign` | POST | ADMIN_SECRET | 200 assigns agent |
| `/api/admin/leads/[id]/notes` | POST | ADMIN_SECRET | 201 note created |
| `/api/admin/leads/[id]/tasks` | POST | ADMIN_SECRET | 201 task created |

### 2.3 Listing APIs
| Route | Method | Auth | Expected |
|-------|--------|------|----------|
| `/api/listings/search` | GET | None | 200 with results (safe fallback) |
| `/api/listings/[id]` | GET | None | 200 or safe 404 |
| `/api/admin/listings/import` | POST | ADMIN_SECRET | 200 or 422 with error |

### 2.4 Agent APIs (require AGENT_SECRET + agentId match)
| Route | Method | Expected |
|-------|--------|----------|
| `/api/agent/[agentId]/leads/[leadId]/contact` | POST | 200 contact logged |
| `/api/agent/[agentId]/leads/[leadId]/status` | POST | 200 status updated |
| `/api/agent/[agentId]/leads/[leadId]/follow-up` | POST | 200 follow-up scheduled |

**Cross-agent access test:** Agent A cannot update Agent B's leads. Must return 403.

### 2.5 Webhooks
| Route | Method | Expected |
|-------|--------|----------|
| `/api/webhooks/sms/inbound` | POST | 200 with Twilio TwiML response |
| `/api/webhooks/email/events` | POST | 200 |

**Twilio signature validation:** POST without valid `X-Twilio-Signature` → 403.

### 2.6 SLA Sweep
- `/api/admin/sla/sweep` called with valid `ADMIN_SECRET` → 200, marks overdue leads
- Vercel cron job fires every 5 minutes (check cron logs)

---

## 3. Admin Portal — Permission Boundaries

### 3.1 Access Control
- `/admin/*` without `ADMIN_SECRET` → redirect to auth or 401
- `/admin/*` with wrong secret → 401
- Admin can view all leads, all agents, all analytics
- Admin CANNOT: send messages without explicit send action, modify leads without confirmation, delete records (no delete route exists)

### 3.2 Admin Pages — Smoke Check
| Page | Expected | Data Source |
|------|----------|-------------|
| `/admin` | Command Center loads, 11 nav links visible | DB + signals |
| `/admin/leads` | Lead table with filters | DB |
| `/admin/leads/[id]` | Full lead detail, conversation, notes | DB |
| `/admin/analytics` | Analytics overview | analytics_events |
| `/admin/analytics/campaigns` | Campaign performance | analytics_events |
| `/admin/analytics/conversations` | Conversation metrics | analytics_events |
| `/admin/analytics/reports` | Custom reports | analytics_events |
| `/admin/analytics/sources` | UTM breakdown | analytics_events |
| `/admin/automation` | Workflow overview | workflow_executions |
| `/admin/automation/workflows` | Workflow list | workflow_executions |
| `/admin/automation/executions` | Execution history | workflow_executions |
| `/admin/automation/queue` | Pending queue | workflow_executions |
| `/admin/automation/history` | Historical runs | workflow_executions |
| `/admin/automation/templates` | Template gallery | static |
| `/admin/distribution` | Distribution command center | DB |
| `/admin/intelligence` | Intelligence overview | signals |
| `/admin/intelligence/predictions` | Prediction cards | signals |
| `/admin/intelligence/opportunities` | Opportunity grid | signals |
| `/admin/intelligence/properties` | Property scores | signals |
| `/admin/intelligence/sellers` | Seller readiness | signals |
| `/admin/intelligence/buyers` | Buyer probability | signals |
| `/admin/intelligence/relationships` | Knowledge graph | signals |
| `/admin/intelligence/memory` | Memory timeline | analytics_events |
| `/admin/listings` | Listing OS | DB + signals |
| `/admin/documents` | Document Engine | static templates |
| `/admin/marketing` | Marketing overview | DB |
| `/admin/revenue` | Revenue pipeline | DB |
| `/admin/routing` | Agent routing | DB |
| `/admin/traffic` | Traffic sources | DB |

---

## 4. Agent Portal — Permission Boundaries

### 4.1 Access Control
- `/agent/*` without valid agent credentials → 401
- Agent sees only their own assigned leads (not all leads)
- Agent cannot access admin portal routes

### 4.2 Agent Pages — Smoke Check
| Page | Expected |
|------|----------|
| `/agent` | Agent dashboard with own lead summary |
| `/agent/leads` | Agent's assigned leads only |
| `/agent/leads/[id]` | Lead detail for agent's own lead only |
| `/agent/performance` | Agent's own performance metrics |
| `/agent/tasks` | Agent's pending tasks |

---

## 5. Automation & Workflows

- Workflows execute without uncaught exceptions
- Audit log entries created for every automation action
- No automation sends outbound messages without explicit trigger
- Execution queue does not grow unbounded (verify no stuck executions)
- Template library renders without error

---

## 6. Intelligence Brain

- All 8 intelligence pages load (graceful fallback when DB empty)
- Prediction engine generates predictions from signals without crashing
- Opportunity engine ranks correctly (ROI descending)
- Knowledge graph builds and serializes without error
- Memory timeline shows correctly when `analytics_events` populated
- No MLS-confidential data surfaced in any intelligence output

---

## 7. Visual QA

- No `red-*` Tailwind tokens in production HTML (use `ruby-*`)
- All entrance animations use `motion-safe:` prefix
- `opacity-0` page-load elements have `motion-reduce:opacity-100`
- No `genie`, `magic lamp`, or `lamp` copy visible
- Mike Eatmon presented as executive advisor, never mascot
- No cartoons or playful mascots
- Luxury black/cream/gold/ruby palette consistent across all pages
- AdminShell gold top accent present on every admin page
- Font: Display (Cormorant/Playfair) for headings, Bebas for metrics, body text readable at 10px minimum

---

## 8. Performance QA

- Lighthouse desktop: LCP < 2.5s, CLS < 0.1, FID < 100ms
- `/ask` widget: First contentful paint < 1.5s on mobile
- Admin dashboard: full load < 3s with 100 leads
- No duplicate API calls (verify via Network tab)
- `force-dynamic` set on all admin/agent pages
- No client-side Supabase calls in admin/agent pages (all server-side)

---

## 9. Accessibility QA

- All interactive elements reachable by keyboard (Tab order logical)
- All images have `alt` attributes
- All icons with aria-hidden="true" verified
- Focus rings visible in high-contrast mode
- Admin pages navigable without mouse
- Form error messages associated with inputs via `aria-describedby`

---

## 10. Security Scan

- `pnpm run release:safety` passes
- No `.env` files committed to git
- No secrets in git history (`git log --all -- "*.env"`)
- API keys not logged in Vercel function output
- All admin/agent routes verify auth before any DB read
- No SQL injection vectors (all queries use parameterized Supabase client)
- Content-Security-Policy header set in `next.config.js`

---

## QA Sign-Off

| Area | Status | Signed Off By | Date |
|------|--------|--------------|------|
| Public Funnel | — | | |
| API Routes | — | | |
| Admin Portal | — | | |
| Agent Portal | — | | |
| Automation | — | | |
| Intelligence Brain | — | | |
| Visual QA | — | | |
| Performance | — | | |
| Accessibility | — | | |
| Security | — | | |
