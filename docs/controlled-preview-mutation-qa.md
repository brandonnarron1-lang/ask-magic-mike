# Controlled preview mutation QA

The preview QA runner refuses to write to the database by default.
Mutation QA is intentionally **separate** from the standard preview
gate — it is a manual, human-approved procedure, and it is not wired
to any GitHub workflow.

## Why this is separate

- Mutation changes state. The default QA path must be reversible by
  closing a tab.
- Even on a preview database, an accidental mutation through a connection
  string that turns out to target Production is irreversible.
- CI can be hijacked, branches can be force-pushed, secrets can be
  rotated mid-flight. The only reliable safeguard against a "this is
  preview, I promise" mistake is to require a human approver to type
  commands on a trusted machine.

## Required preconditions

All of the following must be true before any mutation run:

1. `DATABASE_ENV=preview` in the preview env.
2. `DATABASE_URL` is scoped to the isolated Neon Preview branch only.
3. `PREVIEW_NEON_ENDPOINT_ID` is the endpoint ID for that Preview branch.
4. `PRODUCTION_NEON_ENDPOINT_ID` is the separate Production endpoint ID.
5. The two expected endpoint IDs are valid and distinct.
6. The endpoint parsed from `DATABASE_URL` exactly matches Preview and does
   not match Production. `/api/admin/health` reports this with booleans only;
   it never returns the URL or either endpoint ID.
7. `PREVIEW_DATA_MODE=enabled` in the branch-scoped preview env only.
8. `ALLOW_PREVIEW_DB_MUTATION=true` in the branch-scoped preview env only.
9. `/api/admin/health` returns `safety.safe_for_preview_mutation: true`.
10. The required canonical schema and candidate migration
    `20260830190000_admin_lead_api_persistence.sql` are applied to the Preview
    branch only.
11. `ENABLE_SMS=false` and `ENABLE_EMAIL=false` — no live sends.

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

This produces test lead/note/task/SLA and disabled-delivery evidence in the
**preview** database. Each QA write is tagged so cleanup is deterministic.
The run passes only when the note and task return durable IDs and an
authenticated readback finds those exact IDs. A 2xx response alone is not
acceptance evidence.

## QA-write fingerprints

Every QA-created row is tagged with one or more of:

- `source=preview_qa`
- `email` matches `qa+*@example.com`
- `notes` contains `preview-qa`
- `utm_source=preview_qa` or `campaign=phase_2_release_hardening`

These tags exist so closeout can identify QA rows only.

## Closeout plan

This schema treats consent and audit evidence as append-only. A QA lead that
has durable consent rows must therefore be **retained and suppressible**, not
partially deleted. Do not disable immutable triggers, delete child rows first,
or weaken foreign keys merely to remove a test record.

After acceptance, use the authenticated admin surface and atomic assignment
function to leave the QA row in this terminal state:

- `is_test=true`;
- `status=dead` (or the approved terminal test stage);
- `assigned_agent_id=null` and `assignment_status=unassigned`;
- `communication_suppressed=true`;
- `email_suppressed=true`;
- `sms_suppressed=true`;
- every notification remains `skipped`, with zero provider message IDs and
  zero attempts; and
- immutable consent and privacy-minimized audit evidence remains present.

Verify that operational reports and active-lead views exclude `is_test=true`.
If a future schema introduces a tested purge function that preserves required
evidence, use that reviewed function in one transaction. Until then, a direct
`DELETE FROM leads` cleanup is prohibited.

If any identity, suppression, or endpoint check is unfamiliar, **stop** —
never run closeout against a database you cannot positively identify as
Preview.

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
- Parsed database endpoint matches Production. → no.
- Expected Neon endpoint IDs are missing, invalid, or equal. → no.
- Parsed database endpoint does not exactly match approved Preview. → no.
- Migration 00012 not applied. → no.
- Candidate admin persistence migration not applied. → no.
- `PREVIEW_DATA_MODE=disabled` or unset. → no.
- `ALLOW_PREVIEW_DB_MUTATION=false` or unset. → no.
- Health endpoint unreachable. → no.
- Operator cannot verify the isolated Preview branch and endpoint in the Neon
  dashboard. → no.

Mutation QA is not a sprint task. It is the last safety brace before
promotion. Take the extra five minutes.
