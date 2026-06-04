# Ask Magic Mike — Canonical Lead Platform (Implementation Notes)

This doc is the canonical handoff for the lead platform layer the funnel
plugs into. Production is currently the brand-kit-v2 funnel
(`ecf59c9 feat: fully integrate ask magic mike brand kit visuals`). The
platform additions below land on branch
`platform/canonical-lead-platform` and ship as **preview-only** until
human sign-off — no production promotion in this phase.

## What was already there (before this turn)

The repo is **not** a green field. The shipped foundation already covers
a large fraction of the canonical platform ask:

### Database (Supabase)

Migrations `00001..00011`:

- `sessions` — anonymous session + UTM + landing + initial address/question
- `leads` — TCPA-grade lead row with consent + CRM sync + intent enum
- `lead_scores` — seller + buyer + composite + temperature + factor log
- `agents` — name/email/phone/role/active/capacity/priority/availability/timezone
- `lead_routing` — current/latest assignment + SLA deadlines + status
- `agent_assignments` — full assignment history (separate from latest)
- `properties` — normalized property with geocode + valuation hooks
- `valuations` — AVM-style estimate row
- `analytics_events` — canonical event stream (session/intake/scoring/routing/etc.)
- `crm_sync_log` — adapter call history
- `contacts` — dedup identity (email/phone) separate from per-lead rows
- `source_attribution` — UTM + referrer + landing + paid flag, per session OR lead
- `consents` — append-only TCPA consent records (UPDATE/DELETE blocked)
- `messages` — multi-party chat / agent notes
- `compliance_flags` — sla_breach/consent_missing/do_not_contact/etc.
- `audit_logs` — append-only admin/action audit trail

RLS denies all anon/authenticated access by default; service role bypasses.

### TS engines

- `src/lib/scoring/` — buyer + seller + composite + temperature
- `src/lib/routing/` — `assign-agent.ts`, `escalation.ts`, `sla-monitor.ts`
- `src/lib/attribution/` — UTM parsing, referrer classifier, client storage
- `src/lib/crm/` — Follow Up Boss + kvCore + null adapter
- `src/lib/db/` — repositories for session/lead/contact/property/event/consent
- `src/lib/analytics/` — event ledger + canonical event names

### API routes

- `POST /api/intake/submit` (canonical intake from `/value` → `/ask`)
- `POST /api/intake/step` (partial save)
- `POST /api/scoring/compute`
- `POST /api/routing/accept`
- `POST /api/analytics/event`
- `POST /api/session/create`

### Funnel surfaces

- `/value` (campaign landing, Brand Kit v2)
- `/ask` (5-step intake)
- `/embed/ask` (WordPress iframe)
- `/widget-preview` (internal, noindex)
- `/admin` (existing dashboard scaffold)

### Tests

143 vitest tests passing (compliance, attribution, scoring, routing, schemas, db storage safety, brand kit evidence, widget shell, etc.).

## What was missing — and what shipped this turn

| Capability | Status |
| --- | --- |
| **Canonical lead types / statuses / events** (broader than seller/buyer) | **Shipped** as TS enums + DB columns |
| **Canonical `POST /api/leads`** for all sources | **Shipped** (wraps existing intake flow) |
| **Spam / bot detection** | **Shipped** (lightweight scoring heuristic + IP hash) |
| **Duplicate detection** (email + phone + address) | **Shipped** with unit tests |
| **Lead normalization** (phone E.164, email lowercase, address) | **Shipped** with tests |
| **Rate limit** for public endpoints | **Shipped** (in-memory window + pluggable interface) |
| **Communications engine** (SMS + email orchestration) | **Shipped** in mock mode (Twilio adapter stub keyed off env) |
| **SMS templates** (6 default templates from the brief) | **Shipped** |
| **Email templates** (canonical set) | **Shipped** as deterministic template factory |
| **Consent enforcement** in send paths | **Shipped** (cannot send marketing SMS to opted-out) |
| **SLA engine** | **Shipped** as computational module — deadline + watchlist + escalation thresholds |
| **Qualification engine** (next-question logic) | **Shipped** per lead type |
| **Listing CSV import** + parser boundary | **Shipped** with `CsvListingProvider` and tests |
| **Listing public/private separator** | **Shipped** with leakage tests |
| **Listing search + detail API** (public-safe only) | **Shipped** with `/api/listings/search` and `/api/listings/[id]` |
| **Marketing asset engine** (deterministic + AI stub) | **Shipped** with tests |
| **Fair-housing copy guardrail** | **Shipped** with tests |
| **Tasks table** | **Shipped** (migration 00012) |
| **Listings + listing_private_fields** | **Shipped** (migration 00012) |
| **Marketing templates + generated assets** | **Shipped** (migration 00012) |
| **Notifications, webhook_events, saved_views, campaigns** | **Shipped** (migration 00012) |
| **`.env.example`** updated to canonical list | **Shipped** |
| **Admin cockpit visual overhaul** (10 screens) | **Deferred** — existing `/admin` works; this turn extends it with a metrics widget but does not redesign |
| **Real Twilio integration** | **Deferred** — mock only |
| **Real LLM marketing generation** | **Deferred** — deterministic only; OpenAI key stub remains in `.env.example` |
| **Real FlexMLS API adapter** | **Deferred** — only `CsvListingProvider` implemented; interfaces for `PdfListingProvider` / `FlexMlsApiProvider` defined |
| **Map dashboards** | **Deferred** — list + table views only |

## Architecture overview (what landed)

```
src/
  lib/
    leads/
      lead-types.ts          ← canonical enums (lead_type, status, event)
      normalize.ts           ← phone/email/address normalization
      duplicate-detection.ts ← email/phone/addr fuzzy match
      spam-detector.ts       ← heuristic + reasons
    engines/
      lead-capture.ts        ← canonical capture orchestrator
      qualification.ts       ← next-question rules per lead_type
      sla.ts                 ← deadline + watchlist + grade-based targets
      communications.ts      ← SMS + email send orchestrator
      listing-intelligence.ts← search + match
      marketing-assets.ts    ← deterministic template renderer
    adapters/
      sms-twilio.ts          ← real adapter (only used if env vars present)
      sms-mock.ts            ← logs to analytics_events, returns success
      email-mock.ts          ← same shape
      listing-csv-provider.ts← CSV → normalized listings
    compliance/
      fair-housing.ts        ← discriminatory copy detector + reasons
      listing-sanitizer.ts   ← public-vs-private field split
      rate-limit.ts          ← in-memory window
  schemas/
    leads-canonical.schema.ts← zod for POST /api/leads
    listing.schema.ts        ← public + private listing shapes
  app/api/
    leads/route.ts           ← canonical public capture
    listings/search/route.ts ← public-safe search
    listings/[id]/route.ts   ← public-safe detail
    admin/listings/import/route.ts ← admin CSV import
supabase/migrations/00012_canonical_platform.sql
```

## How to run

```bash
# 1) Install
pnpm install   # or npm install

# 2) Local env (already in place from prior phases)
cp .env.example .env.local
# fill DATABASE / SUPABASE / NEXT_PUBLIC_AGENT_PHONE / NEXT_PUBLIC_AGENT_LICENSE
# leave the SMS / EMAIL / FLEXMLS / OPENAI vars blank in dev — mock adapters take over.

# 3) Dev server
./node_modules/.bin/next dev

# 4) Tests
./node_modules/.bin/vitest run

# 5) Typecheck / lint / build
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/next lint
./node_modules/.bin/next build
```

## How to run migrations

```bash
# Supabase CLI (preferred)
supabase db push

# Or apply individually against a remote project:
psql "$DATABASE_URL" -f supabase/migrations/00012_canonical_platform.sql
```

Migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … IF NOT EXISTS`). 00012 extends `leads` with `lead_type`, normalized address/phone fields, and adds `tasks`, `listings`, `listing_private_fields`, `marketing_templates`, `generated_assets`, `notifications`, `webhook_events`, `saved_views`, `campaigns`, `campaign_events`.

## What works in mock mode

- `POST /api/leads` from any source — writes to leads + analytics_events
- Lead normalization, dedup, spam scoring, rate-limit
- Lead scoring + assignment (existing engines)
- SLA engine — deadline + watchlist queries (no live cron yet)
- Communications engine — SMS + email are written to `messages` + `analytics_events`; no carrier roundtrip
- Listing CSV import — parses CSV into normalized public+private split
- Public listing search / detail — returns public-safe fields only
- Marketing asset engine — deterministic templates render against safe-only listing dto
- Fair-housing checker — flags banned protected-class language

## What requires external credentials for production

| Capability | Env vars | What unlocks |
| --- | --- | --- |
| Real SMS send | `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `ENABLE_SMS=true` | Twilio adapter (interface defined; stub returns `{provider: "twilio_disabled"}` when missing) |
| Real email send | `EMAIL_PROVIDER=resend\|sendgrid`, `EMAIL_API_KEY`, `FROM_EMAIL`, `ENABLE_EMAIL=true` | Email adapter (interface defined) |
| AI marketing generation | `OPENAI_API_KEY`, `ENABLE_AI_GENERATION=true` | LLM-backed marketing-asset and lead-summary functions (currently deterministic fallback) |
| FlexMLS API | `FLEXMLS_CLIENT_ID`, `FLEXMLS_CLIENT_SECRET`, `FLEXMLS_API_BASE_URL`, `ENABLE_FLEXMLS_API=true` | `FlexMlsApiProvider` (interface defined; CSV importer is the live path) |
| Google Calendar | `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` | Scheduling integration (not built this turn) |
| Storage (uploads) | `UPLOAD_STORAGE_BUCKET` | Photo uploads (not built this turn) |

## Tests run and results

This turn's vitest run on the new modules and the existing 143-test baseline ships together. Final count is reported at commit time.

## Remaining risks / manual setup

1. **Admin cockpit UI redesign** — the prompt's 10-screen cockpit is bigger than one safe change. The existing `/admin` works; this turn does not redo it. The lead-detail view will surface the new lead-type / status / events columns, but the visual cockpit is queued as a separate phase.
2. **Cron / scheduled SLA escalation** — the `SlaEngine` exposes pure computation (deadlines, breach detection, escalation thresholds). A cron / Vercel-cron / Inngest runner is needed to actually fire escalations. Recommended: Vercel Cron pointing at `POST /api/admin/sla/sweep` (route not built this turn — easy to add when ops chooses a runner).
3. **Inbound SMS / email webhook handlers** — interfaces exist in `CommunicationsEngine`; the webhook routes (`/api/webhooks/sms/inbound`, etc.) are not built this turn.
4. **Real PDF FlexMLS import** — `PdfListingProvider` is an interface stub. CSV is the live path.
5. **AI generation** — deterministic templates only. When `OPENAI_API_KEY` lands, swap `MarketingAssetEngine.generate()` to the LLM path; the public-safe sanitizer is already enforced upstream of the prompt, so leakage is prevented either way.
6. **Production promotion** — preview-only this phase. Production stays at `ecf59c9`.

## Phase 2 — Cockpit & Conversion Engine (added this turn)

Branch: `platform/phase-2-cockpit-conversion-engine` (off `61cc9da`). Production
remains at `ecf59c9`. Not promoted.

What landed:

- **New engines**:
  - `src/lib/engines/seller-offer-intelligence.ts` — deterministic seller
    scorer + router + script generator. Strict-no on guaranteed/binding/
    instant language; "subject to review, no commitment" is the safe
    phrasing.
  - `src/lib/engines/listing-match.ts` — buyer/listing matcher using
    public listing fields only. No protected-class signaling.
  - `src/lib/engines/sla-sweep.ts` — DB-aware sweep on top of the pure
    `SlaEngine`. `POST /api/admin/sla/sweep` triggers it. Persists
    breaches to `compliance_flags` when asked.
- **Admin APIs**:
  - `GET /api/admin/dashboard` — totals, source breakdown, recent
    activity feed.
  - `GET /api/admin/leads` — filtered lead list (q / lead_type / status /
    grade / source / unassigned_only / spam_suspect / sort / pagination).
  - `GET /api/admin/leads/[id]` — full detail (lead + events + messages
    + tasks + assignments + attribution + consents + listing matches +
    compliance flags).
  - `PATCH /api/admin/leads/[id]` — update status/type/grade/follow-up,
    writes `audit_logs` + `analytics_events`.
  - `POST /api/admin/leads/[id]/assign` — assign/reassign, writes
    `agent_assignments` + `audit_logs` + `lead_assigned` event.
  - `POST /api/admin/leads/[id]/notes` — append note as a `messages` row.
  - `POST /api/admin/leads/[id]/tasks` — create a `tasks` row.
  - `POST /api/admin/leads/[id]/messages` — send templated SMS/email
    through `CommunicationsEngine`; reads consent + `compliance_flags`.
  - `POST /api/admin/sla/sweep` — runs `SlaSweepEngine`; `?persist=true`
    writes `compliance_flags`.
  - All admin routes gated by `x-admin-secret` against `ADMIN_SECRET`.
- **Webhook scaffolds**:
  - `POST /api/webhooks/sms/inbound` — Twilio-style + JSON; handles
    STOP/START/UNSTOP; writes `opt_out_sms`/`opt_in` flags; mirrors raw
    payload to `webhook_events`.
  - `POST /api/webhooks/email/events` — provider-generic envelope;
    updates `message_deliveries`; bounce/unsubscribe writes
    `opt_out_email`.
- **Widget backend**: `src/lib/widget/submit-lead.ts` — client helper
  the `MagicMikeWidgetShell` calls; pulls UTM attribution from
  `sessionStorage`, posts to the canonical `/api/leads`, persists a
  widget session id.
- **Admin UI**:
  - `/admin/leads` — full inbox with filters + sort.
  - `/admin/leads/[id]` — detail view with profile, attribution, events,
    messages, tasks, compliance flags, listing matches.
  - Existing `/admin` dashboard untouched (still works).
- **Analytics events**: extended the `AnalyticsEventName` enum and
  registry with `lead_updated`, `note_added`, `task_created`,
  `task_completed`, `appointment_*`, `widget_*`, `opt_out`, `opt_in`.

What still needs manual setup:

- **Generated DB types**: migration 00012 added tables that aren't yet in
  `src/types/database.types.ts`. The new modules cast through `any`
  with a clear comment. Apply 00012 and regen:
  ```
  supabase db push
  supabase gen types typescript --linked > src/types/database.types.ts
  ```
- **Vercel Cron**: wire the SLA sweep:
  ```
  // vercel.json
  { "crons": [{ "path": "/api/admin/sla/sweep?persist=true", "schedule": "*/5 * * * *" }] }
  ```
  When ops enables this, also add `x-admin-secret` via Vercel's
  Authorization header injection or move the sweep to a cron-only auth
  scheme.
- **Twilio signature verification**: `/api/webhooks/sms/inbound`
  currently logs `x-twilio-signature` but doesn't compute the HMAC.
  Production should compute it from `TWILIO_AUTH_TOKEN` before going
  fully open.
- **Email provider pick**: `/api/webhooks/email/events` is
  provider-generic. When Resend / SendGrid is selected, plug in the
  signature check + add a real provider adapter (interface already
  defined in `src/lib/adapters/email-types.ts`).
- **Real chat backend**: `MagicMikeWidgetShell` is still visual. The
  `submit-lead.ts` helper covers the lead-create handoff; an actual
  multi-turn conversation backend is queued.

Test status: 230 tests passing (+15 net). TypeScript clean. Lint clean.
Build clean.
