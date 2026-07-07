# AdminOps Lead Actions

Protected status actions are available from `/admin/leads` so operators can triage Ask Magic Mike leads without editing Supabase directly.

## Auth model

- `/admin/:path*` is protected by HTTP Basic Auth in `src/middleware.ts`.
- The password is `ADMIN_SECRET`.
- If `ADMIN_SECRET` is missing in production, admin routes fail closed with `503`.
- Status updates run through a server action under `app/admin/leads/actions.ts`.
- Supabase service-role access is used only on the server in `app/lib/adminLeadActions.ts`.

No service-role key or admin secret is rendered into the browser.

## Actions added

The lead inbox exposes these status actions:

- Mark contacted -> `contacted`
- Mark qualified -> `qualified`
- Appointment set -> `appointment_set`
- Closed won -> `converted`
- Closed lost -> `dead`
- Spam / test lead -> `spam`
- Restore to new -> `new`

Spam/test, closed won, and closed lost require explicit checkbox confirmation in the admin UI.

## Allowed statuses

The implementation uses only the lead statuses supported by the committed production schema:

- `new`
- `scored`
- `qualified`
- `assigned`
- `contacted`
- `appointment_requested`
- `appointment_set`
- `nurture`
- `dead`
- `converted`
- `spam`
- `escalated`

## Unsupported statuses

The production schema does not currently expose separate `test`, `internal_qa`, `archived`, `closed`, `closed_won`, or `closed_lost` values on `leads.status`.

Operational mapping:

- Internal QA / not-a-real-lead -> `spam`
- Closed won -> `converted`
- Closed lost -> `dead`
- Archived -> not implemented

No schema migration was applied.

## Write behavior

Status updates:

- accept only `lead_id` and a requested status
- validate the lead id as a UUID
- validate status against the allowed schema values
- update only `leads.status`
- do not delete rows
- do not upsert full lead payloads
- return safe error codes from the helper

## Marking an internal QA lead

1. Open `/admin/leads`.
2. Find the QA lead.
3. Use **Spam / test lead**.
4. Check **Confirm not a real lead**.
5. Submit the action.

The record remains available for audit/review but is moved out of the default active queue.

## Rollback

If a lead is marked incorrectly:

1. Open `/admin/leads?filter=closed`.
2. Use **Restore to new**.
3. Re-triage the lead with the appropriate status.

## Production verification checklist

- Anonymous `/admin` and `/admin/leads` return `401` or fail closed with `503`.
- Authenticated `/admin/leads` renders status labels and action controls.
- Public routes do not import `adminLeadActions`.
- A non-production mocked test verifies the PATCH shape updates only `status`.
- No production lead status is mutated from terminal.

## Tests

- `tests/adminops/admin-lead-actions.test.ts`
- `tests/adminops/readiness-guards.test.ts`
- Existing LeadOps tests continue to verify capture and attribution behavior.
