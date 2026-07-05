# AdminOps Routing Readiness

Post LeadOps hardening for Ask Magic Mike admin review, triage, and routing preparation.

## Protected Surfaces Found

The active public build uses the root `app/` tree. The Black Diamond lead capture surface writes through:

- `app/api/leads/route.ts`
- `app/lib/leadPayload.ts`
- `app/lib/attribution.ts`

The broader admin cockpit currently lives under the older `src/app/(admin)` tree:

- `src/app/(admin)/admin/leads/page.tsx`
- `src/app/(admin)/admin/leads/[id]/page.tsx`
- `src/app/api/admin/leads/route.ts`
- `src/app/api/admin/leads/[id]/route.ts`
- `src/app/api/admin/leads/[id]/assign/route.ts`

Because the active Next build is rooted at `app/`, this branch adds a narrow active protected route:

- `app/admin/page.tsx`
- `app/admin/leads/page.tsx`

## Auth And Protection Pattern

Admin UI protection is handled by `src/middleware.ts`.

- Matcher: `/admin/:path*`
- Mechanism: HTTP Basic Auth
- Secret: `ADMIN_SECRET`
- Production behavior when missing: `503`
- Unauthorized behavior: `401` with `WWW-Authenticate`

Admin API routes in `src/app/api/admin/*` use `src/lib/admin/auth.ts`.

- Mechanism: `x-admin-secret` request header
- Query-string secrets are rejected
- Missing `ADMIN_SECRET` returns `503`

This branch does not weaken or replace either pattern. The active `app/admin/leads` page is read-only and is protected by the existing `/admin/:path*` middleware.

## Lead Inbox Workflow

The protected inbox at `/admin/leads` is intended for:

- reviewing new captured leads
- confirming funnel type and source surface
- checking contact fields
- checking address, question, timeline, condition, and notes
- inspecting attribution source, medium, campaign, placement, parent URL, embed host, landing path, and device
- seeing status and assignment readiness

The page performs no writes, sends no messages, and does not submit forms.

## Canonical Admin Lead Fields

`app/lib/adminLeadView.ts` normalizes raw lead rows into an admin-safe shape:

- `id`
- `created_at`
- `status`
- `funnel_type`
- `lead_source_surface`
- `assigned_agent_id`
- `name`
- `email`
- `phone`
- `address`
- `timeline`
- `condition`
- `question`
- `notes`
- `attribution.source`
- `attribution.medium`
- `attribution.campaign`
- `attribution.content`
- `attribution.term`
- `attribution.referrer`
- `attribution.landing_page`
- `attribution.initial_path`
- `attribution.current_path`
- `attribution.parent_url`
- `attribution.embed_host`
- `attribution.placement`
- `attribution.gclid`
- `attribution.fbclid`
- `attribution.device_category`

Missing or unknown fields become `null` or safe display fallbacks. The view model never emits `undefined` attribution fields.

## Attribution Display Behavior

The admin view model accepts both:

- canonical top-level LeadOps fields such as `source`, `medium`, `campaign`
- nested `attribution` objects from client-side capture flows

For widget and OurTown embed leads, the inbox surfaces:

- source
- medium
- campaign
- placement
- parent URL
- embed host
- landing/current path
- device category

This makes legacy `/embed/amm-loader.js`, current `/widget.js`, and direct AskMagicMike.com funnel traffic reviewable from the same protected shape.

## Status And Routing Assumptions

Current read behavior preserves any status string found on the row and defaults missing status to `new`.

The inbox marks a lead as routing-ready when:

- status is `new`
- no `assigned_agent_id` is present
- either email or phone exists

Existing write-capable admin/routing patterns were found under `src/app/api/admin/*`, including:

- `PATCH /api/admin/leads/[id]`
- `POST /api/admin/leads/[id]/assign`

Those routes already use admin auth helpers and audit/event behavior. This branch does not add new mutation routes because the active root app and older `src/app` admin system need a deliberate consolidation decision before expanding write surfaces.

## Assignment Readiness

The protected inbox displays `assigned_agent_id` when present and labels unassigned leads. It prepares review for assignment without assigning leads automatically.

Recommended follow-up, if the business approves:

1. Consolidate active admin routing under the root `app/` tree or intentionally migrate back to `src/app`.
2. Reuse the existing `x-admin-secret` admin API pattern for any status or assignment writes.
3. Keep assignment writes audited in `audit_logs`.
4. Keep outbound SMS/email actions opt-in and consent-aware.

## Environment Variables

Required for live admin review:

- `ADMIN_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If Supabase variables are missing, the protected inbox renders an empty configured-state notice and does not attempt writes.

## Tests Added

`tests/adminops/admin-lead-view.test.ts` verifies:

- canonical LeadOps rows normalize into admin-safe shape
- missing attribution fields do not break display
- widget/embed attribution is visible
- status and `assigned_agent_id` are preserved
- address/question fallback behavior

`tests/adminops/readiness-guards.test.ts` verifies:

- `/admin/:path*` middleware protection remains
- active root admin inbox is read-only
- public routes do not import admin lead loaders
- pnpm remains the only lockfile
- no stale Vercel URLs are introduced
- active admin UI does not expose secret names
- no fake value, appraisal, or automatic-assignment claims are introduced

## Production Decisions Still Needed

- Whether the older `src/app/(admin)` cockpit should be migrated into root `app/`.
- Which exact status vocabulary should be exposed to admins for Black Diamond leads.
- Whether `assigned_agent_id` should route to an agents table, a CRM user id, or another ownership model.
- Whether production needs a non-destructive migration to add any missing LeadOps columns to `leads`.

No production deploy, DNS change, secret edit, schema change, destructive migration, lead submission, or Supabase production write was performed in this branch.
