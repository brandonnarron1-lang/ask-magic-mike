# Controlled preview mutation QA

The preview QA runner refuses to write to the database by default.
Mutation QA is intentionally **separate** from the standard preview
gate — it is a manual, human-approved procedure, and it is not wired
to any GitHub workflow.

## Why this is separate

- Mutation changes state. The default QA path must be reversible by
  closing a tab.
- Even on a preview database, an accidental mutation against a project
  ref that turns out to be production is irreversible.
- CI can be hijacked, branches can be force-pushed, secrets can be
  rotated mid-flight. The only reliable safeguard against a "this is
  preview, I promise" mistake is to require a human approver to type
  commands on a trusted machine.

## Required preconditions

All of the following must be true before any mutation run:

1. `DATABASE_ENV=preview` in the preview env.
2. `SUPABASE_PROJECT_REF` is set to a non-production project ref.
3. `PRODUCTION_SUPABASE_PROJECT_REF` is set to the production ref so
   the health endpoint can verify a non-match.
4. `PREVIEW_SUPABASE_PROJECT_REF` is set to the preview ref so the
   health endpoint can verify a match.
5. `PREVIEW_DATA_MODE=enabled` in the preview env only.
6. `ALLOW_PREVIEW_DB_MUTATION=true` in the preview env only.
7. `/api/admin/health` returns `safety.safe_for_preview_mutation: true`.
8. Migration `00012` is applied to the preview project.
9. `ENABLE_SMS=false` and `ENABLE_EMAIL=false` — no live sends.

## Non-mutating precheck (always run this first)

```
PREVIEW_URL="$(npm run preview:wait -s | jq -r .preview_url)" \
ADMIN_SECRET="…" \
CRON_SECRET="…" \
VERCEL_AUTOMATION_BYPASS_SECRET="…" \
SAFE_DB_WRITE=false \
npm run preview:qa
```

Confirm `health.safety.safe_for_preview_mutation: true` in the report
before proceeding. If it is `false`, do not continue — the
`safety_blockers` array names exactly what needs to be fixed.

## Controlled mutation run (human present)

```
PREVIEW_URL="…" \
ADMIN_SECRET="…" \
CRON_SECRET="…" \
VERCEL_AUTOMATION_BYPASS_SECRET="…" \
SAFE_DB_WRITE=true \
npm run preview:qa
```

This produces lead/note/task/SLA/SMS/email rows in the **preview**
database. Each QA write is tagged so cleanup is deterministic.

## QA-write fingerprints

Every QA-created row is tagged with one or more of:

- `source=preview_qa`
- `email` matches `qa+*@example.com`
- `notes` contains `preview-qa`
- `utm_source=preview_qa` or `campaign=phase_2_release_hardening`

These tags exist so cleanup can target QA rows only.

## Cleanup plan

Run in the preview Supabase project's SQL editor — never in
production.

```sql
-- Sanity-check the preview ref first.
select current_database(), current_setting('app.settings.environment', true);

-- Delete QA artefacts in dependency order.
delete from tasks where lead_id in (
  select id from leads where source = 'preview_qa'
);
delete from message_deliveries where lead_id in (
  select id from leads where source = 'preview_qa'
);
delete from compliance_flags where lead_id in (
  select id from leads where source = 'preview_qa'
);
delete from listing_matches where lead_id in (
  select id from leads where source = 'preview_qa'
);
delete from leads where source = 'preview_qa';
```

If anything in the above looks unfamiliar, **stop** — never run
cleanup against a database you cannot positively identify as preview.

## Evidence required for promotion review

- `artifacts/preview-qa-report.{json,md}` — with mutation pass and
  `health.safety.safe_for_preview_mutation: true`
- `artifacts/release-candidate-report.{json,md}`
- `artifacts/launch-authority-report.{json,md}` showing
  `MUTATION_READY` (or `PROMOTION_READY` when combined with rollback +
  governance evidence)
- A human approver named in the PR

## Strict no-go list

- Live SMS or email enabled in preview env. → no.
- Production Supabase ref detected by `/api/admin/health`. → no.
- Migration 00012 not applied. → no.
- `PREVIEW_DATA_MODE=disabled` or unset. → no.
- `ALLOW_PREVIEW_DB_MUTATION=false` or unset. → no.
- Health endpoint unreachable. → no.
- Operator cannot verify the preview Supabase project from the
  Supabase dashboard. → no.

Mutation QA is not a sprint task. It is the last safety brace before
promotion. Take the extra five minutes.
