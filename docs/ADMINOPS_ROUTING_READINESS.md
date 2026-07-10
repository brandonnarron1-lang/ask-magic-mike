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
- `app/admin/reporting/page.tsx`
- `app/admin/allocation/page.tsx`

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

This branch does not weaken or replace either pattern. The active `app/admin/leads` page is protected by the existing `/admin/:path*` middleware.

## Lead Inbox Workflow

The protected inbox at `/admin/leads` is intended for:

- reviewing new captured leads
- confirming funnel type and source surface
- checking contact fields
- checking address, question, timeline, condition, and notes
- inspecting attribution source, medium, campaign, placement, parent URL, embed host, landing path, and device
- seeing status and assignment readiness

The page now supports protected status-only actions for lead triage. It does not send messages, delete leads, assign leads, or submit public forms.

## Read-Only Reporting

The protected reporting route at `/admin/reporting` provides AdminOps Analytics v1 from existing `leads` rows.

- It uses the existing `/admin/:path*` Basic Auth middleware.
- It reads only the current reporting columns through a bounded Supabase REST `GET`.
- It supports 7, 30, and 90 day windows with application-side aggregation.
- It provides lead volume, contactable rate, status buckets, source attribution, top pages, intent/timeline mix, and hot lead indicators.
- It does not add a schema migration, write production data, update lead status, submit public forms, or mutate Supabase.

## Agent Allocation

The protected allocation route at `/admin/allocation` provides AdminOps Agent Allocation v1 from existing schema-supported rows.

- It uses the existing `/admin/:path*` Basic Auth middleware.
- It reads `agents` and bounded `leads` rows through Supabase REST `GET`.
- It displays agent availability, capacity, current assigned lead count, hot lead count, unassigned queues, assigned leads by agent, stale unassigned leads, and source/intent/timeline mix.
- It uses existing schema support only: `agents`, `leads.assigned_agent_id`, `leads.assigned_at`, and `leads.assignment_status`.
- It does not add a migration or assume assignment history beyond the existing `lead_routing` table.
- It does not expose the Supabase service role key to page/client code.
- It does not submit public leads, call `/api/leads`, send messages, update WordPress/Vercel/DNS, or mutate production during tests.

Supported active allocation actions:

- Assign lead to agent: PATCH `leads.assigned_agent_id`, `leads.assigned_at`, and `leads.assignment_status`.
- Unassign lead: PATCH those same assignment fields back to an unassigned state.
- Reassign lead: the same assign action records a reassignment when the lead already had `assigned_agent_id`.

Unsupported allocation actions:

- Lead deletion.
- Destructive cleanup.
- Public lead mutation.
- Agent availability writes. The current schema has schedule-style `agents.availability` JSON, not a simple mutable availability status field, so v1 leaves availability read-only.

## Assignment Audit v1

`/admin/allocation` assignment writes are now wrapped with durable assignment audit logging before live operations should use the controls.

Storage used:

- `leads` remains the current assignment state table.
- `audit_logs` is the append-only assignment audit trail.
- `agent_assignments` exists as assignment history, but v1 does not use it for manual unassignment because `agent_id` is required and cannot represent "unassigned" cleanly.
- `lead_routing` remains the current/latest routing and SLA table. It has a unique `lead_id`, so it is not a full manual assignment history store.

Assignment event fields:

- `actor`: `system/admin_basic_auth` until a true named admin identity exists in the active root admin route.
- `action`: `lead.assigned`, `lead.reassigned`, or `lead.unassigned`.
- `resource_type`: `lead`.
- `resource_id`: lead id.
- `before_state.assigned_agent_id`: previous agent id or null.
- `after_state.assigned_agent_id`: new agent id or null.
- `after_state.assignment_status`: assignment state written to `leads`.
- `metadata.source`: `admin_allocation`.
- `metadata.action_route`: `/admin/allocation`.
- `metadata.warning_flags`: reserved for safe operational flags.

Supported audited actions:

- Assign: previous agent is null, new agent is set.
- Reassign: previous agent is set, new agent is set.
- Unassign: previous agent is set or null, new agent is null.

Failure behavior:

- Assignment preflight failure: no PATCH occurs.
- Assignment PATCH failure: no audit write is attempted.
- Assignment succeeds but audit write fails: the assignment remains in place and the server action returns a safe audit-warning result. Raw Supabase details are logged server-side only as status metadata, never exposed in UI.

Security:

- Assignment write helpers and audit writer are server-only.
- The active route remains protected by `/admin/:path*` Basic Auth middleware.
- The page component does not read `process.env` and does not expose `SUPABASE_SERVICE_ROLE_KEY`.
- Public routes do not import allocation action modules or the audit writer.
- Tests mock Supabase REST and do not mutate production data.
- No deploy was performed as part of Assignment Audit v1 implementation.

Read-only activity:

- `/admin/allocation` now includes a bounded "Recent assignment activity" panel sourced from `audit_logs`.
- The panel displays action, lead id, previous agent id, new agent id, timestamp, source, and actor label.
- It does not join or expose contact data.

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

Those routes already use admin auth helpers and audit/event behavior. The active root app now includes a narrow status-only server action for `/admin/leads`. It updates only `leads.status`, validates IDs/statuses server-side, and uses only schema-supported status values.

Agent Allocation v1 is implemented in the active root app with server actions under `/admin/allocation`. Assignment writes validate UUIDs server-side and use PATCH only against the Supabase `leads` table. Tests mock fetch and do not mutate production data.

Supported active inbox actions:

- contacted
- qualified
- appointment_set
- converted
- dead
- spam
- new

Unsupported direct statuses such as `internal_qa`, `test`, and `archived` are not invented. Internal QA and not-a-real-lead cleanup uses `spam`.

## Assignment Readiness

The protected inbox displays `assigned_agent_id` when present and labels unassigned leads. `/admin/allocation` now provides the protected manual assignment workflow.

Recommended follow-up, if the business approves:

1. Consolidate active admin routing under the root `app/` tree or intentionally migrate back to `src/app`.
2. Consolidate the older `x-admin-secret` admin API pattern with the active root server-action path before adding messaging writes.
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

`tests/adminops/admin-reporting-view.test.ts` and `tests/adminops/admin-reporting-route-guards.test.ts` verify:

- reporting row normalization and missing optional fields
- deterministic KPI, funnel, status, source, page, timeline, and hot lead summaries
- missing Supabase env vars return an unconfigured read-only state
- Supabase access is bounded REST `GET` only with a capped limit
- `/admin/reporting` has no forms, server actions, or mutation fetches
- public routes do not import the reporting read model

`tests/adminops/admin-agent-allocation-view.test.ts`, `tests/adminops/admin-agent-allocation-actions.test.ts`, and `tests/adminops/admin-allocation-route-guards.test.ts` verify:

- agent and assignable lead row normalization
- unassigned vs assigned grouping
- hot lead scoring
- agent load/count summaries
- missing Supabase env safe state
- GET-only allocation read model
- assignment preflight GET before PATCH
- PATCH-only lead assignment/unassignment mutation
- audit POST to `audit_logs` after successful assignment PATCH
- audit warning behavior when audit write fails after assignment succeeds
- no POST to `/api/leads`
- no destructive methods
- allocation page has no delete controls
- public routes do not import allocation modules
- middleware protects `/admin/allocation`
- service role key is not used in the page component
- invalid lead/agent IDs are rejected
- safe error handling

`tests/adminops/admin-assignment-audit.test.ts` verifies:

- audit payload shape
- `audit_logs` REST write method
- missing env safe state
- safe failed-write result
- audit row normalization
- bounded recent activity readback

## Local Verification

Recommended verification commands:

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
pnpm exec vitest run tests/adminops/ tests/leadops/
```

Optional local smoke with blank Supabase env and a local-only admin secret:

- Anonymous `/admin/allocation` should return `401`.
- Authenticated `/admin/allocation` should render the safe unconfigured state.
- `/admin/reporting` should still render.
- `/widget` should still render.

## Production Decisions Still Needed

- Whether the older `src/app/(admin)` cockpit should be migrated into root `app/`.
- Which exact status vocabulary should be exposed to admins for Black Diamond leads.
- Whether `assigned_agent_id` should route to an agents table, a CRM user id, or another ownership model.
- Whether production needs a non-destructive migration to add any missing LeadOps columns to `leads`.

No production deploy, DNS change, secret edit, schema change, destructive migration, lead submission, or Supabase production write was performed in this branch.
