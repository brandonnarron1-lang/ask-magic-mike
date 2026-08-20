# Phase 9 Outcome Ledger QA Evidence

Updated 2026-08-19, America/New_York.

## Scope and safety

All database execution used disposable PostgreSQL 17 Docker containers with
synthetic `INTERNAL QA OUTCOME` records. Containers were removed immediately
after each run. No Production/Preview database, live lead, email, SMS, push,
WordPress page, DNS record, or Vercel deployment was changed.

## Verified database behavior

The complete migration chain, including
`20260819223000_admin_outcome_ledger.sql`, applied successfully to PostgreSQL
17. The executable contract at
`supabase/tests/admin_outcome_ledger_pg17.sql` passed and rolled back its
transaction.

Observed synthetic contract:

```json
{
  "status": "converted",
  "audit_count": 2,
  "outcome_types": ["appointment", "closed"],
  "closed_revenue": 12345.67,
  "test_rows_suppressed": true
}
```

A separate pre-migration terminal lead proved historical reconciliation and
same-state replay:

```json
{
  "rows": 1,
  "type": "closed",
  "revenue": 500.25,
  "backfilled": true,
  "live_unsuppressed": true
}
```

No synthetic identity represents a real consumer. No provider delivery was
attempted.

## Application verification

Targeted tests:

```text
tests/adminops/admin-lead-actions.test.ts
tests/adminops/admin-outcome-ledger-migration.test.ts
tests/adminops/admin-lead-view.test.ts
tests/adminops/admin-lead-timeline.test.ts
```

Result: 4 files / 30 tests passed after the final timeline privacy assertion.

Full local release gate:

```text
pnpm run release:gate
```

Final result:

- system isolation: PASS;
- release safety: 14/14 PASS;
- Vitest: 192 files / 2,753 tests PASS;
- strict typecheck: PASS;
- ESLint: PASS;
- Next.js production build: PASS;
- route manifest: 78 active routes / 17 acknowledged root-`src` duplicates.

The local shell used Node `26.5.1` and emitted the expected engine warning.
GitHub Actions run `32316868621` supplied the independent Node 24 proof and
passed every release-gate stage in 2m20s.

## Preview deployment evidence

- PR: `#180`
- commit: `0668bd31ec22f2de61549226505781825283cd97`
- deployment: `dpl_44mpwLo47Gc35hYnomgxcxqKgku5`
- URL: `https://ask-magic-mike-fxm5akm4d-eyes-up-industries.vercel.app`
- state: Ready; target Preview; Node runtime 24.x
- public checks: `/`, `/ask`, `/sell`, `/value`, `/buy`, `/plan`,
  `/widget/v1`, `/api/health/live`, and `/api/health/ready` returned 200
- anonymous checks: `/admin`, `/admin/growth`, and `/admin/leads` returned 401
- readiness: canonical Neon reachable; capture, lead, notification, RBAC, and
  push-subscription schema checks passed; Preview delivery remained disabled
- identity isolation: correct Ask Magic Mike title; no NellySelly marker in
  homepage HTML
- Vercel error-log query: no error-level logs in the inspected ten-minute
  window

No form was submitted and no Preview database mutation or external delivery was
performed during these checks.

## Visual and authorization checks still required before Production

- administrator/primary-owner sees the optional actual-revenue field;
- approved agent does not see revenue input or amount;
- closed-won transition renders one outcome milestone;
- same-state revenue update does not duplicate the outcome or lifecycle audit;
- anonymous `/admin/leads/<id>` remains denied;
- `/admin/growth` reflects the synthetic Preview outcome while excluding test
  records from production KPIs;
- public funnel and health routes remain unchanged.
