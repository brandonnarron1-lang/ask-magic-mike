# AdminOps Analytics V1 Plan

Read-only planning document for Ask Magic Mike admin analytics and conversion reporting.

## Scope

Analytics V1 should give protected admins a practical read on lead volume, attribution quality, status conversion, and funnel performance without changing the production Supabase schema or mutating lead data.

This is a plan only. No route, query helper, schema migration, production setting, or deployment is included.

## Audit Summary

Inspected active files:

- `app/admin/leads/page.tsx`
- `app/lib/adminLeadView.ts`
- `app/lib/adminLeadActions.ts`
- `app/api/leads/route.ts`
- `supabase/migrations/00001_init_sessions.sql`
- `supabase/migrations/00002_leads.sql`
- `supabase/migrations/00008_analytics_events.sql`
- `supabase/migrations/00012_canonical_platform.sql`
- `supabase/migrations/00014_leads_missing_columns.sql`
- `src/schemas/leads-canonical.schema.ts`
- `docs/SUPABASE_LEAD_CAPTURE_REMEDIATION.md`
- `docs/ADMINOPS_ROUTING_READINESS.md`

The active root admin inbox is `/admin/leads`. It reads `leads` through `app/lib/adminLeadView.ts` and is protected by the existing `/admin/:path*` middleware using `ADMIN_SECRET`.

Lead capture writes production-shaped rows in `app/api/leads/route.ts`:

- `sessions` is upserted first.
- `leads` is then upserted by `session_id`.
- The route writes existing production columns rather than canonical-only client fields.

Status actions from PR #100 update only `leads.status`; they do not change the reporting data model.

## Reporting Fields Available Now

Analytics V1 can be built read-only from the current `leads` table using:

- `created_at`
- `status`
- `lead_type`
- `source`
- `source_detail`
- `page_url`
- `timeline_months`
- `primary_intent`
- `assigned_agent_id`
- `address_raw`
- `email`
- `phone`
- `widget_session_id`

Additional useful fields exist in committed migrations and can be used defensively when present:

- `lead_grade`
- `spam_score`
- `is_duplicate`
- `converted_at`
- `closed_won_at`
- `closed_lost_at`
- `last_contacted_at`
- `next_follow_up_at`
- `assignment_status`

The current admin view model already tolerates older/newer field names for display, including `address_raw`, `lead_type`, `source`, and `assigned_agent_id`.

## Can V1 Be Read-Only?

Yes. V1 can be built as a protected, read-only admin route using one bounded Supabase REST query against `leads`:

- `GET /rest/v1/leads`
- `select=id,created_at,status,lead_type,source,source_detail,page_url,timeline_months,primary_intent,assigned_agent_id,address_raw,email,phone,widget_session_id`
- `order=created_at.desc`
- bounded date filter, such as last 30 or 90 days
- capped limit, such as 500 or 1000

For the first version, aggregate in application code. That avoids adding SQL views, RPC functions, cron jobs, materialized tables, or schema changes.

The existing indexes support a small launch dataset:

- `idx_leads_created_at`
- `idx_leads_status`
- `idx_leads_primary_intent`
- `idx_leads_lead_type`
- `idx_leads_assigned_agent_id`

## Recommended Route

Use:

```text
/admin/reporting
```

Reasoning:

- It is operational and business-facing, not event-instrumentation-facing.
- It sits naturally beside `/admin/leads`.
- It avoids ambiguity with product analytics SDKs or PostHog-style event analytics.

An alias from `/admin/analytics` can be added later if desired, but V1 should start with one route.

## V1 Dashboard Sections

### 1. Lead Volume

Show:

- Leads today
- Leads last 7 days
- Leads last 30 days
- Leads by day for the selected window

Filter out `spam` by default, with a visible toggle or secondary count for spam/test leads.

### 2. Status Counts

Group by `status`.

Recommended operational buckets:

- New: `new`, `scored`, `assigned`, `escalated`
- Working: `contacted`, `nurture`
- Qualified/Appointment: `qualified`, `appointment_requested`, `appointment_set`
- Closed: `converted`, `dead`
- Spam/Test: `spam`

Show both raw status counts and bucket counts.

### 3. Conversion Funnel Counts

Use status as the first practical conversion proxy:

- Captured: all non-spam leads
- Contactable: leads with email or phone
- Contacted: `contacted`, `qualified`, `appointment_requested`, `appointment_set`, `converted`, `dead`, `nurture`
- Qualified: `qualified`, `appointment_requested`, `appointment_set`, `converted`
- Appointment: `appointment_requested`, `appointment_set`
- Converted: `converted`

These are operational funnel stages, not guaranteed revenue attribution.

### 4. Source And Campaign Counts

Group by:

- `source`
- `source_detail`
- optionally source + detail combined

Expected sources/details from current write path include widget, OurTown/embed placement, campaign, and medium details.

Sort by:

- lead count
- contactable count
- qualified/appointment count
- converted count

### 5. Top Pages

Group by `page_url`.

This is especially important for:

- OurTownProperties.com embedded widget leads
- AskMagicMike.com home-value funnel leads
- widget preview/test traffic

Default display should compact long URLs and preserve the full URL in title/tooltip or details.

### 6. Funnel / Intent Mix

Group by:

- `lead_type`
- `primary_intent`
- `timeline_months`

Recommended timeline labels:

- `0`: immediate / 0-30 days
- `3`: 30-90 days
- `6`: 3-6 months
- `12`: 6-12 months
- `24`: 12+ months / just curious / not sure

### 7. Hot Lead Indicators

V1 can expose simple non-AI indicators without new schema:

- has phone
- immediate timeline: `timeline_months = 0`
- seller intent: `primary_intent = sell`
- lead type: `seller`, `seller_cash_offer`, or `home_value`
- status: `new`, `scored`, `qualified`, or `appointment_requested`
- not spam

If `lead_grade` or `spam_score` is present in production, include it as an optional enhancement. Do not require those fields for V1.

## Data Access Design

Create a new read model rather than expanding the inbox view model:

```text
app/lib/adminReportingView.ts
```

Recommended exports:

- `type AdminReportingLeadRow`
- `type AdminReportingSummary`
- `loadAdminReportingSummary(windowDays?: 7 | 30 | 90)`
- pure helpers:
  - `normalizeReportingLeadRow(row)`
  - `bucketLeadStatus(status)`
  - `isSpamOrTest(row)`
  - `isContactable(row)`
  - `isQualified(row)`
  - `isAppointment(row)`
  - `isConverted(row)`
  - `timelineLabel(months)`
  - `summarizeReportingRows(rows, now)`

Use the same server-side Supabase service-role pattern as `app/lib/adminLeadView.ts`. Return a configured=false state if Supabase env vars are missing.

Do not expose service-role keys to the client.

## Route Design

Create:

```text
app/admin/reporting/page.tsx
```

Route behavior:

- Protected by existing `/admin/:path*` middleware.
- Force dynamic rendering.
- No forms or mutations.
- Optional query parameter: `?window=7`, `?window=30`, `?window=90`.
- Default window: 30 days.
- Fail soft when Supabase is unconfigured or query fails.

Suggested first screen:

- Compact KPI row: today, 7 days, 30 days, contactable rate.
- Funnel row: captured, contacted, qualified, appointment, converted.
- Source table.
- Status table.
- Top pages table.
- Timeline/intent mix.

Keep it operational and dense; do not build a marketing dashboard.

## Missing Or Weak Fields

No schema change is required for V1, but reporting quality would improve later with:

- explicit `contacted_at` update when status changes to contacted
- explicit `appointment_set_at`
- explicit `status_updated_at`
- stable campaign id separate from `source_detail`
- explicit `is_test` or `is_internal_qa` boolean instead of overloading `spam`
- event-level funnel steps if the team wants visit-to-lead conversion rates rather than lead-only reporting

These are not required for read-only lead reporting.

## Schema Changes Needed

No schema changes are needed for Analytics / Conversion Reporting V1.

Do not add views, materialized tables, RPC functions, or migrations for V1. If lead volume grows enough that application aggregation becomes slow, revisit with a reviewed read-only reporting view or materialized aggregate.

## Tests Needed

Add tests before implementation:

### Reporting View Model

- Normalizes rows with current production fields.
- Tolerates missing optional fields.
- Groups leads by status.
- Buckets status into New, Working, Qualified/Appointment, Closed, Spam/Test.
- Counts today, last 7 days, and last 30 days deterministically with an injected `now`.
- Computes contactable rate from email/phone.
- Computes funnel counts from status.
- Groups by `source`, `source_detail`, and `page_url`.
- Labels timeline buckets correctly.
- Detects hot indicators without requiring `lead_grade`.

### Data Access

- Missing Supabase env vars return configured=false.
- Supabase query uses only GET/read-only behavior.
- Select list is bounded to reporting fields.
- Limit is capped.
- Query failure returns safe admin error, not raw secrets or service-role details.

### Route Protection

- `/admin/reporting` is covered by existing middleware matcher.
- Public routes do not import `adminReportingView`.
- Reporting page has no forms, POST/PATCH/DELETE fetches, or server actions.

### Regression Guards

- No package-manager contamination.
- No stale Vercel URLs.
- No public secret markers.
- No fake appraisal, guaranteed value, or fake automation claims.
- Existing LeadOps and AdminOps tests continue to pass.

## Implementation Order

1. Add `app/lib/adminReportingView.ts` with pure aggregation helpers and a bounded read loader.
2. Add tests for pure helpers first.
3. Add data access tests with mocked fetch.
4. Add `app/admin/reporting/page.tsx`.
5. Add route protection/read-only guard tests.
6. Run lint, typecheck, build, full tests, and targeted AdminOps/LeadOps tests.
7. Open a normal implementation PR.

## Non-Goals For V1

- No production schema migration.
- No production data mutation.
- No status updates from the reporting page.
- No revenue forecasting.
- No PostHog dependency.
- No cross-session visitor conversion rate.
- No export/download flow.
- No agent assignment UI.
- No CRM sync reporting.

Those can be planned after the owner validates the first read-only operational dashboard.
