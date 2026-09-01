# Production Deployment Rehearsal

<!-- amm-current-operations-v1 -->

Updated 2026-09-01. This is a no-write rehearsal until the exact application
gate is received. Release identity comes from
`config/current-release-authority.json`; durable data is Neon; staff access is
Better Auth plus server-side RBAC. Current authority is in
`OWNER_APPROVAL_QUEUE.md`; stop conditions are in `KNOWN_BLOCKERS.md`.

## Preflight

```text
[ ] Canonical repository and protected main confirmed
[ ] Current Production and rollback deployments recorded
[ ] Candidate PR/head/tree/base recorded
[ ] Candidate is ordered behind every prerequisite
[ ] Migration count recorded
[ ] Environment delta recorded
[ ] External-action count recorded
[ ] Immutable Preview deployment is Ready
[ ] Exact hosted Release Gate succeeds
[ ] Exact approval is current, unconsumed, and bound to this candidate
```

No-write preflight must stop if any identity or evidence differs from the
recorded gate.

## Rehearsal sequence

| Time | Action | Expected result | Stop if |
| --- | --- | --- | --- |
| T-30 | Install frozen dependencies under Node 24 | Lockfile unchanged | Install or engine failure |
| T-25 | Run `pnpm run release:gate` | Isolation, safety, tests, typecheck, lint, build, routes pass | Any failure |
| T-20 | Run launch doctor/authority with secret-safe Vercel metadata | Zero failures; no value accepted | Missing name, unsafe payload, or stale operator doc |
| T-15 | Inspect PR and hosted checks | Exact head; clean/mergeable; checks green | Head/tree drift or failed/pending required check |
| T-12 | Inspect immutable Preview | Correct project, Preview target, Ready | Wrong project/target or non-Ready |
| T-10 | Check public routes and canonical metadata | Expected statuses and Production canonical URLs | 5xx, wrong canonical, or unsafe redirect |
| T-8 | Check health and auth boundary | Preview safe-off; anonymous private access denied | Notifications enabled or private data visible |
| T-5 | Review runtime logs and rendered-page secret scan | Zero errors and zero targeted secret matches | Error regression or match |
| T-3 | Revalidate requested action and rollback | Exact scope and exclusions written | Broad/generic or consumed approval |
| T-0 | HOLD | Await explicit exact gate | No gate received |

The rehearsal performs no merge, Production deployment, Vercel setting change,
Neon query/write, WordPress action, lead submission, email/SMS/Push, analytics
write, DNS action, publication, spend, deletion, or NellySelly action.

## Authorized application sequence

Only after the exact application gate:

| Time | Action | Expected result | Stop/rollback if |
| --- | --- | --- | --- |
| T+0 | Revalidate PR head/tree and mergeability | Still matches gate | Any drift |
| T+1 | Merge through protected GitHub rules | One resulting `main` commit | Unexpected files or method |
| T+2 | Observe canonical Git deployment | Correct Vercel project builds resulting commit | Manual/foreign artifact |
| T+5 | Confirm Ready and canonical aliases | Aliases point to exact deployment | Build/alias mismatch |
| T+7 | Run public smoke, funnel, health, readiness, isolation | Expected statuses; Neon ready | Any failure |
| T+10 | Verify anonymous Better Auth boundary | No private data exposed | Unauthorized access |
| T+12 | Inspect error and 5xx logs | No release regression | Material increase |
| T+15 | Record acceptance | Exact receipt completed | Any unresolved stop condition |

Do not execute any separately classified action during this application
sequence.

## Optional controlled QA sequence

This is not included in an application gate. If a separate QA mutation/send
approval is received:

1. submit one unmistakable `is_test=true` public-form record with
   `INTERNAL QA — DO NOT CONTACT`;
2. prove one canonical Neon lead and replay idempotency;
3. prove consent, attribution, score, route, assignment, Lead Center visibility,
   outbox state, and KPI exclusion;
4. when a real internal test send is authorized, prove provider message ID and
   final primary/audit-copy delivery or failure/retry state; and
5. suppress the test record after acceptance.

Do not delete it without a separate data-action gate.

## First-hour monitoring

| Checkpoint | Inspect | Stop if |
| --- | --- | --- |
| Immediate | Canonical aliases, liveness/readiness, public routes | Wrong artifact or any failure |
| 15 minutes | Vercel error/5xx logs | New release-correlated error pattern |
| 30 minutes | Notification failures, queue depth, SLA alerts | Invisible or growing failure state |
| First genuine lead | Durable record, consent/source, score/route, assignment, outbox | Missing, duplicated, or misrouted lead |
| 1 hour | Smoke/funnel/health rerun | Any new failure |

## Rollback rehearsal

1. Record the current verified application rollback deployment before merge.
2. Confirm it remains Ready and recoverable; do not promote it during rehearsal.
3. If acceptance fails after an approved release, restore that artifact.
4. Re-run canonical routes, health/readiness, auth boundary, and logs.
5. Preserve all Neon records and notification/audit history.
6. Record the incident and changed operating truth.

WordPress, provider, messaging, DNS, and data rollback are separate procedures
and are never implied by application rollback.

## Rehearsal receipt

```text
Operator: ____________________
Timestamp: ____________________
Candidate PR/head/tree: ____________________
Preview deployment: ____________________
Hosted gate: ____________________
Launch authority: ____________________
Rollback deployment: ____________________
Exact approval status: not requested / requested / received / consumed
No-write rehearsal result: PASS / HOLD / FAIL
Notes/evidence: ____________________
```

Use `OWNER_ACTION_PROOF_PACK.md` for the full acceptance record.
