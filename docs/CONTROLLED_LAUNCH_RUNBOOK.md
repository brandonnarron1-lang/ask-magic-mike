# Controlled Launch Runbook

<!-- amm-current-operations-v1 -->

Updated 2026-09-01. The funnel is already live. This runbook controls a future
application release and any subsequent low-volume activation. Release identity
comes from `config/current-release-authority.json`; Production persistence is
Neon; staff access is Better Auth with server-side RBAC. Use
`OWNER_APPROVAL_QUEUE.md` for exact gates and `KNOWN_BLOCKERS.md` for current
holds.

## 1. Start from observed truth

- Confirm the canonical public host and current Vercel Production deployment.
- Confirm the candidate PR is clean, exact-head, and correctly ordered.
- Confirm the rollback deployment before requesting approval.
- Confirm migration, environment, WordPress, message, publication, spend, DNS,
  and data-action counts separately.
- Stop if documentation conflicts with authenticated state; update the record
  rather than following a dated packet.

## 2. Static and hosted release proof

Run from an isolated worktree on Node 24:

```bash
pnpm install --frozen-lockfile
pnpm run release:gate
pnpm run amm:launch:doctor
pnpm run amm:launch:authority
```

Then prove the same immutable head through hosted GitHub checks and a Ready
Vercel Preview. Verify changed public routes, canonical metadata, expected
redirects, health shape, anonymous auth denial, security headers, targeted
rendered-page secret scan, and runtime error logs. Preview notification and
email modes must remain disabled unless a separate test-send gate says
otherwise.

## 3. Secret-safe environment evidence

Use Vercel metadata to inspect names, scopes, and types only. Required names
must be Production-scoped; present value-gated controls require separate
runtime proof. Never reveal a value or weaken a sensitive variable to make it
locally readable.

The release gate must prove:

- canonical `DATABASE_URL` and `DATABASE_ENV` names are present;
- Better Auth/RBAC names are present;
- internal email/outbox and protected BCC names are present;
- Web Push names are present; and
- growth import controls remain absent/fail-closed or are independently proven
  disabled.

## 4. Approval classification

Before action, assign each requested operation to one row:

| Operation | Required gate |
| --- | --- |
| Git merge and Vercel Production deploy | Exact application PR/head/tree gate |
| Neon schema or data change | Exact migration/data gate with backup and assertions |
| Vercel environment/provider change | Exact setting and secure-entry gate |
| WordPress plugin change | Hash-pinned plugin backup/upgrade gate |
| WordPress page/form/widget change | Page/form-specific diff, backup, and publication gate |
| Internal test email or push | Explicit `[TEST]` send gate and approved recipients |
| Consumer communication | Purpose, consent, suppression, template, and send gate |
| DNS/domain mapping | Hostname and rollback-specific gate |
| Social, local profile, email, QR, or paid distribution | Asset/link/channel/budget gate |
| Lead import, merge, suppression, or deletion | Record-scope data gate |

Approval for one row never covers another.

## 5. Application release sequence

After the exact application gate is received:

1. re-fetch the PR and revalidate its exact head/tree and checks;
2. merge through the GitHub ruleset;
3. wait for the canonical Vercel Git deployment;
4. verify that generated artifact is Ready and owns the canonical aliases;
5. run read-only health, route, auth, funnel, isolation, and log checks; and
6. record acceptance or restore the pre-recorded rollback deployment.

No application release step may open a Neon write connection, alter WordPress,
send a message, or publish traffic.

## 6. Controlled QA lead

Only after an explicit QA mutation/send approval:

- submit through the public form;
- set `is_test=true` and use `INTERNAL QA — DO NOT CONTACT` in identity/message;
- use approved operator contact information only;
- prove one canonical Neon record and no duplicate on replay;
- prove consent text/version, first/last attribution, deterministic score/route,
  assignment audit, Lead Center visibility, and KPI exclusion;
- prove outbox/provider message identity and final delivery state when sending;
  and
- suppress the test record after verification.

Do not fabricate a live prospect. Do not delete audit evidence without a
separate data action.

## 7. Better Auth Lead Center checks

- Anonymous `/admin` access is denied or redirected to same-origin login.
- Authorized operator access is based on a server session and role.
- Agent visibility is limited to assigned leads unless explicitly elevated.
- Assignment, stage, note, task, export, suppression, and retry actions produce
  audit events.
- Protected responses are no-store and contain no deployment/provider secrets.

Do not substitute a shared secret or client-side hiding for RBAC.

## 8. WordPress bridge sequence

1. preserve the signed form-ID bridge and local entry/audit copy;
2. back up the live plugin before a separately approved Connector upgrade;
3. prove the public connector-version marker;
4. regenerate the read-only placement manifest;
5. select one visible page-specific placement and create an exact rollback;
6. request that publication gate; and
7. verify the public link, attribution, layout, bridge health, and no duplicate
   notifications.

Connector upgrade, page publication, and cache actions remain separate.

## 9. Controlled traffic

Natural direct and organic visitors can submit now. Any new owned placement is
activated one at a time under `CONTROLLED_TRAFFIC_ACTIVATION.md`. Monitor source
identity, durable capture, notification status, duplicate rate, assignment, and
response SLA before expanding. External publication and paid traffic require
separate approvals.

## 10. Stop and rollback

Stop if health/readiness fails, durable storage is unavailable, success appears
without a lead ID, private data is exposed, notification failures become
invisible, aliases drift, or 5xx errors increase materially.

Application rollback restores the recorded Vercel artifact and reruns read-only
acceptance. WordPress restores its exact backup. Messaging pauses only the
affected processor. Neon uses a reviewed forward fix and preserves all lead,
consent, notification, identity, and audit data.

## 11. Evidence record

Capture the exact source, artifact, commands, check counts, route results,
runtime window, approval phrase/status, affected systems, exclusions, and
rollback. Use `OWNER_ACTION_PROOF_PACK.md`; never store secrets or private BCC
values in Git, screenshots, or reports.
