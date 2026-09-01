# Owner Action Proof Pack

<!-- amm-current-operations-v1 -->

Updated 2026-09-01. This template records evidence for gated operations without
storing credentials or personal data. Release identity comes from
`config/current-release-authority.json`; the canonical database is Neon and the
staff boundary is Better Auth plus server-side RBAC. Use
`OWNER_APPROVAL_QUEUE.md` for the exact current gate and `KNOWN_BLOCKERS.md` for
capability limits.

## 1. Accepted Production receipt

Record only public identifiers:

```text
Accepted PR: 247
Merge commit: a2f3de834830f600df106dbf5836ae4bbde4eb4a
Production tree: 0065f829fc94f87ab5e0faf596c8e56733be3972
Production deployment: dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U
Application rollback: dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe
Canonical URL: https://www.askmagicmike.com
Release approval status: consumed
```

Do not place database connections, provider keys, admin credentials, session
cookies, private BCC values, phone-install tokens, or private contact data in
this file.

## 2. Application candidate evidence

```text
PR: ____________________
Base branch and commit: ____________________
Head commit: ____________________
Tree: ____________________
Migration count: ______
Environment changes: ______
External mutations: ______
Vercel project: ____________________
Immutable Preview deployment: ____________________
Preview status: READY / NOT READY
Rollback deployment: ____________________
Hosted Release Gate URL/result: ____________________
Local Node version: ____________________
Release gate result: ____________________
Dependency audit: ____________________
Secret scan: ____________________
```

Required read-only proof:

- public routes and canonical metadata;
- `/api/health/live` and `/api/health/ready` shape/status;
- anonymous Better Auth/RBAC boundary;
- Preview email/notification safe-off state;
- security headers and targeted rendered-page secret scan;
- route manifest and NellySelly isolation; and
- runtime error/5xx window.

## 3. Approval receipt

Copy the phrase only from `OWNER_APPROVAL_QUEUE.md` after revalidating the exact
target. Never reuse a consumed phrase.

```text
Requested action: ____________________
Exact approval phrase: ____________________
Received from: ____________________
Received at: ____________________
Bound PR/head/tree or artifact hash: ____________________
Affected systems: ____________________
Explicit exclusions: ____________________
Rollback: ____________________
Status: requestable / received / consumed / invalidated
```

Head, tree, artifact hash, migration, environment, target, or evidence drift
invalidates the receipt.

## 4. Post-deploy application acceptance

```text
Resulting main commit: ____________________
Resulting tree: ____________________
Production deployment: ____________________
Canonical alias matched: [ ]
Public routes passed: ______ / ______
Smoke passed/skipped/failed: ______ / ______ / ______
Health/readiness HTTP: ______ / ______
Anonymous private access denied/redirected: [ ]
Authorized role-bound session checked: [ ] / not applicable
Runtime error count: ______
5xx count/window: ____________________
Rollback required: yes / no
Acceptance result: PASS / FAIL / HOLD
Evidence links: ____________________
```

No application acceptance row implies permission for another system.

## 5. Neon migration or data-action evidence

Complete only when a separate live-data gate exists:

```text
Project/branch/database identity (no connection value): ____________________
Migration or bounded data action: ____________________
Exact source hash/fingerprint: ____________________
Backup artifact and validation: ____________________
Transaction/lock/time limits: ____________________
Preflight assertions: ____________________
Pre-action bounded counts: ____________________
Post-action bounded counts: ____________________
RLS/grant/function/trigger assertions: ____________________
Migration ledger receipt: ____________________
Result: PASS / ROLLED BACK / FORWARD FIX REQUIRED
```

Never use application rollback to drop or delete canonical lead, consent,
notification, audit, Better Auth identity, or session data.

## 6. Controlled QA lead and notification evidence

Complete only after the exact QA mutation/send approval:

```text
Public source route: ____________________
is_test=true: [ ]
INTERNAL QA — DO NOT CONTACT present: [ ]
Synthetic identity only: [ ]
Consent text/version captured: [ ]
First/last attribution and click IDs captured: [ ]
One canonical Neon lead ID: ____________________
Replay produced no duplicate: [ ]
Score/grade/explanation present: [ ]
Assignment/routing audit present: [ ]
Visible in Better Auth Lead Center: [ ]
Excluded from production KPIs: [ ]
Internal email subject begins [TEST]: [ ]
Approved primary recipient confirmed: [ ]
Hidden audit BCC confirmed without recording its value: [ ]
Provider message ID: ____________________
Final delivery/failure status: ____________________
Retry/idempotency evidence: ____________________
Test record suppressed after acceptance: [ ]
```

A queued state alone is not delivery proof. A synthetic record is never a live
prospect.

## 7. WordPress plugin or placement evidence

Plugin and page publication are separate records.

```text
Action type: plugin / page / form / widget / cache
WordPress URL/page/form/placement ID: ____________________
Current artifact version/hash: ____________________
Proposed artifact version/hash: ____________________
Backup version/hash/location: ____________________
Exact diff/change set: ____________________
Public connector marker: ____________________
Fresh read-only manifest result: ____________________
Source URL and UTM contract: ____________________
Legacy links preserved: [ ]
Duplicate notification path disabled: [ ]
Bridge health/last forward: ____________________
Desktop/mobile/accessibility proof: ____________________
Rollback tested or byte-verified: ____________________
Result: PASS / FAIL / ROLLED BACK
```

Do not record a readiness manifest as publication proof. Capture the public
page only after an authorized operator actually publishes the exact change.

## 8. External publication, provider, or DNS evidence

```text
Channel/system: ____________________
Approved asset/copy/link/hostname: ____________________
Exact tagged destination: ____________________
Consent/compliance review: ____________________
Budget or spend ceiling: ____________________ / none
Native platform receipt: ____________________
Published/configured at: ____________________
Rollback/unpublish procedure: ____________________
Observed public result: ____________________
```

No application, WordPress, or database gate authorizes this section.

## 9. Operating sign-off

```text
Operator: ____________________
Timestamp: ____________________
Observed state matches config/current-release-authority.json: [ ]
Launch authority result: ____________________
Neon health/readiness: [ ]
Better Auth/RBAC boundary: [ ]
Requested action completed exactly once: [ ]
Excluded systems remained unchanged: [ ]
Rollback target remains available: [ ]
Known limitations copied to final report: [ ]
Decision: ACCEPT / HOLD / ROLLBACK
Evidence links: ____________________
```

Store sensitive screenshots in an approved secure evidence location, not Git,
chat, email, or an unprotected shared drive.
