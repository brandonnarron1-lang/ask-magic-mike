# PR121 Production Cutover Runbook

Status: owner-operated cutover plan. This document does not authorize merge,
deployment, remote SQL, preview promotion, or Production traffic changes.

## 1. Scope And Immutable Assumptions

- Stack: PR #118, PR #119, PR #120, PR #121.
- PR #121 introduces the unpublished `20260716043829_infra_02_atomic_lifecycle.sql`
  migration and application code that expects its RPCs after deployment.
- Use merge commits only. Do not squash, rebase, force-push, or rewrite stack
  history during cutover.
- Do not print, screenshot, paste, or commit secret values.
- The remote identity preflight must pass before applying the migration.
- Production application traffic must not reach PR #121 runtime code before the
  migration is applied and verified.

## 2. Reviewed Preflight Source Prerequisite

Accepted PR #121 at `a6fc33c22ba9951487e2cafc97e2f511eeb6c23e` does not
contain the corrected offline preflight package. The remote operator must not
use the preflight script from accepted PR #121 as-is.

Before any remote preflight:

1. Integrate the reviewed offline correction into the operator-used branch under
   separate external authorization.
2. Verify the corrected `scripts/infra-03-contact-identity-preflight.sql` Git
   blob SHA against the authoritative offline evidence.
3. Verify the executable fixture source Git blob SHA against the authoritative
   offline evidence if local rehearsal is rerun.
4. Record the operator-used branch SHA, the preflight script blob SHA, and the
   evidence directory in the operator log.

Stop if the branch SHA or script blob SHA does not match the reviewed offline
evidence.

## 3. Required Owner Access

- GitHub permission to merge PRs and retarget child PRs.
- Vercel owner/admin permission for every connected project that can deploy from
  `main`.
- Supabase owner/admin permission to run a read-only SQL preflight, create a
  backup/restore checkpoint, apply the approved migration, and verify grants/RLS.
- Ability to pause and re-enable Production traffic or Production auto-deploys.

## 4. Vercel-Connected Projects To Verify

Observed connected projects:

- `askmagicmike-domain-bridge-v29`
- `ask-magic-mike-4miw`
- `ask-magic-mike`
- `nellyselly-mvp`

The owner must verify which of these can deploy Production from `main`. Do not
assume all four serve Production traffic. Any project that can deploy Production
from `main` must be held before merging the migration-bearing stack.

## 5. Required Production Environment Variables

Verify presence and Production scope only. Never print values.

- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- Any existing server-side Supabase URL alias used by the repository, if present
  in the owner environment.

Stop if a required variable is missing, scoped only to Preview/Development, or
points at the wrong Supabase project.

## 6. Production Auto-Deployment Hold Procedure

1. Identify every Vercel project that can deploy Production from `main`.
2. Pause, disable, or otherwise hold automatic Production deployment for those
   projects.
3. Record the hold method and UTC timestamp in the operator log.
4. Confirm that merging PR #118, #119, #120, or #121 cannot immediately expose
   unverified runtime code to Production traffic.

Stop if the hold cannot be verified.

## 7. Merge-Commit-Only Stack Sequence

1. Merge PR #118 into `main`.
2. Retarget PR #119 to `main`.
3. Merge PR #119 into `main`.
4. Retarget PR #120 to `main`.
5. Merge PR #120 into `main`.
6. Retarget PR #121 to `main`.
7. Keep PR #121 draft until separate migration authorization is present.
8. Integrate the reviewed offline preflight correction into the operator-used
   source under separate external authorization.
9. Verify branch SHA and corrected preflight script blob SHA against the
   authoritative offline evidence.
10. Run the read-only identity preflight.
11. Apply the migration only after preflight and backup checkpoints pass.
12. Merge PR #121 into `main`.
13. Deploy the resulting `main` SHA only after migration verification passes.

Do not merge PR #121 before the deployment hold, environment verification,
source/blob verification, preflight, and migration plan are all complete.

## 8. Branch Deletion Timing

- Delete a parent branch only after its child PR has been retargeted away from
  that parent branch or merged.
- Delete the PR #121 branch only after PR #121 is merged and post-deployment
  verification is complete.
- Do not delete any branch while another open PR still uses it as base.

## 9. Backup And Restore Checkpoint

Before migration:

1. Create or verify a fresh Supabase backup/restore checkpoint.
2. Record only the backup reference label, not credentials.
3. Verify the owner knows how to restore to the checkpoint.
4. Record the decision window for restore versus forward-fix.

Stop if a restore checkpoint cannot be identified.

## 10. Read-Only Identity Preflight Procedure

Run the checked-in SQL from:

`scripts/infra-03-contact-identity-preflight.sql`

Use only the corrected source whose Git blob SHA matches the authoritative
offline evidence. Run that SQL against the intended Production database in a
read-only operator session. The query reports contact identity blockers and
legacy lead split-identity blockers. Store the result in the operator evidence
location. Redact personal values before sharing outside the owner-controlled
system.

## 11. Exact Preflight Stop Conditions

Stop before migration if preflight reports any row where:

- `identity_type = 'email'`
- `identity_type = 'phone'`
- `identity_type = 'lead_split_identity'`

Stop if the operator cannot prove the query ran against the intended Production
database. Stop if any unexpected SQL error occurs. Stop if the source branch SHA
or preflight script blob SHA differs from the reviewed offline evidence.

Additional hard stops:

- source branch SHA mismatch;
- corrected preflight script blob SHA mismatch;
- any preflight blocker row;
- missing backup/restore checkpoint reference;
- missing `SUPABASE_SERVICE_ROLE_KEY` presence or Production scope;
- missing `NEXT_PUBLIC_SUPABASE_URL` presence or Production scope;
- grant/RLS verification failure;
- public lead, idempotent replay, appointment, Admin, notification outbox, or
  analytics smoke-test failure.

## 12. Migration Application Procedure Placeholders

Use the owner-approved Supabase migration method for exactly:

`supabase/migrations/20260716043829_infra_02_atomic_lifecycle.sql`

Record:

- UTC start and finish time;
- migration version;
- target project label;
- operator;
- backup reference;
- success/failure result.

Do not apply any additional migration during this cutover.

## 13. Migration Verification Queries

Run read-only verification queries that expose no secrets:

- `select to_regclass('public.contact_identities') is not null;`
- `select to_regclass('public.leads') is not null;`
- `select to_regclass('public.sessions') is not null;`
- `select to_regclass('public.lead_notifications') is not null;`
- `select to_regprocedure('public.capture_public_lead_v1(jsonb,jsonb,jsonb,text)') is not null;`
- `select to_regprocedure('public.request_public_appointment_v1(uuid,uuid,text,timestamptz)') is not null;`
- `select to_regprocedure('public.mutate_admin_lead_status_v1(uuid,text,text,jsonb,text,text,timestamptz)') is not null;`
- `select to_regprocedure('public.mutate_admin_assignment_v1(uuid,uuid,uuid,text,text,text,timestamptz)') is not null;`

## 14. Required Grant And RLS Checks

Verify:

- `anon` cannot execute public lifecycle or Admin RPCs.
- `authenticated` cannot execute public lifecycle or Admin RPCs.
- `service_role` can execute the PR #121 RPCs.
- RLS is enabled on `sessions`, `leads`, `contacts`, `contact_identities`,
  `source_attribution`, `agent_assignments`, `audit_logs`, `lead_notifications`,
  `lead_appointments`, and `tasks`.
- Deny-public policies remain in place for protected public-schema tables.

## 15. Required Public Lead Smoke Checks

After migration and before traffic:

- Submit only an owner-approved synthetic test lead.
- Confirm one `sessions` row, one `leads` row, one attribution row, expected
  routing/assignment state, and expected audit rows.
- Confirm the public response does not expose raw persistence/provider errors.
- Clean up synthetic records only through the owner-approved procedure.

## 16. Required Idempotent Replay Checks

Using the same synthetic submission identity:

- Repeat the identical payload.
- Confirm the same `lead_id` and `session_id` are returned.
- Confirm no second lead, attribution, assignment history, audit, or notification
  outbox row is created.
- Confirm provider and client analytics are not duplicated on replay.

## 17. Required Appointment-Request Checks

- Request an appointment for the synthetic lead/session pair.
- Confirm one active appointment and one open confirmation follow-up task.
- Repeat the request.
- Confirm the second request returns the existing appointment path and creates no
  duplicate task.

## 18. Required Admin Same-State And Concurrency Checks

- Submit a same-status Admin lead transition and confirm it is revalidated by the
  database as idempotent replay.
- Submit a stale expected-status transition and confirm it is rejected as a
  concurrency conflict.
- Submit same-assignment Admin allocation and confirm no duplicate assignment
  history, audit, or outbox row is created.
- Confirm a stale expected assignment is rejected.

## 19. Required Notification Outbox Checks

- Confirm public capture and Admin assignment enqueue notification outbox rows
  only through the atomic RPC path.
- Confirm idempotency keys prevent duplicate outbox rows.
- Confirm disabled notification mode records skipped status rather than attempting
  provider delivery.

## 20. Provider And Client Analytics Duplication Checks

- Confirm idempotent replay does not call OpenAI, Resend, or PostHog.
- Confirm idempotent replay returns `X-AMM-Idempotent-Replay: 1`.
- Confirm home-value and seller client flows do not emit fresh `lead_created`
  analytics on replay.
- Confirm widget replay emits neither `widget_lead_created` nor the lead-created
  parent-window postMessage.

## 21. Production Traffic Re-Enable Criteria

Traffic may be enabled only after:

- migration verification passes;
- required smoke checks pass;
- no duplicate replay/provider/analytics behavior is observed;
- service-role scoped server routes are healthy;
- owner records the traffic-enable decision.

## 22. Automatic Deployment Re-Enable Criteria

Automatic Production deployment may be re-enabled only after:

- PR #121 resulting `main` SHA is deployed and verified;
- no rollback decision is active;
- monitoring and owner smoke checks are green;
- branch retarget/merge sequence is complete.

## 23. Rollback Decision Matrix

| Phase | Primary action | Rollback path | Classification |
| --- | --- | --- | --- |
| Before migration | Stop sequence, keep Production deployment held | Source-only: do not merge remaining PRs or revert unneeded merge commits before deployment | Source-only |
| After migration, before app deployment | Keep traffic on old app, investigate migration verification failure | Database restore if the migration caused unacceptable state; otherwise forward-fix with reviewed migration | Database restore or forward-fix |
| After app deployment, before traffic enablement | Roll back deployment to previous verified Production deployment | Deployment rollback; database restore only if data integrity is affected | Deployment rollback |
| After traffic enablement | Disable traffic or restore previous deployment while assessing data impact | Forward-fix preferred for additive schema; database restore only with owner approval and accepted data-loss window | Deployment rollback or forward-fix; database restore by owner decision |

No verified reverse migration exists for PR #121. Do not claim database rollback
is a simple reverse migration.

## Operator Log Template

```text
UTC timestamp:
Operator:
Exact main SHA:
Migration version:
Backup reference:
Preflight result:
Deployment identifier:
Smoke-test result:
Traffic-enable decision:
Notes:
```
