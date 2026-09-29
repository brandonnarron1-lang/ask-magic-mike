# Go / No-Go Command Center — Ask Magic Mike

<!-- amm-current-operations-v1 -->

Updated 2026-09-01. This is the current operator decision surface. It reads
release identity from `config/current-release-authority.json`, uses Neon for
durable Production data, and uses Better Auth plus server-side RBAC for the
Lead Center. Exact pending actions are in `OWNER_APPROVAL_QUEUE.md`; capability
limits are in `KNOWN_BLOCKERS.md`.

## §1 — Current decision

**CURRENT STATUS: `GO_CONTROLLED_TRAFFIC_READY`**

The public funnel and internal lead-email path are live. Controlled traffic may
reach the canonical public site. This does not authorize a new application
release, WordPress change, message, publication, database operation, DNS action,
paid campaign, or deletion.

## §2 — Accepted Production

- PR #247
- Merge: `a2f3de834830f600df106dbf5836ae4bbde4eb4a`
- Tree: `0065f829fc94f87ab5e0faf596c8e56733be3972`
- Deployment: `dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U`
- Canonical URL: `https://www.askmagicmike.com`
- Immediate application rollback: `dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe`

The PR #247 release and secure database-credential redeploy approvals are
consumed. They cannot authorize another action.

## §3 — Proven operating layers

| Layer | Current proof | Decision |
| --- | --- | --- |
| Public conversion routes | Canonical pages, widget, metadata, redirects, and health checks pass | GO |
| Durable capture | One canonical Neon backend; storage precedes notification | GO |
| Lead lifecycle | Attribution, consent, dedupe, score, route, assignment, audit, and test exclusion implemented | GO |
| Lead Center | Better Auth, server-side RBAC, role/assignment scope, secure cookies, and audit controls | GO |
| Internal email | Canonical outbox, authenticated provider, protected audit BCC, retry and delivery ledger | GO |
| Free staff alerts | Web Push infrastructure ready; each physical device requires owner acceptance | CONDITIONAL |
| Carrier messaging | No compliant registered sender/provider enabled | NO-GO FOR SMS/MMS |
| WordPress bridge | Signed form-specific bridge live; owned-demand placement upgrade remains gated | CONDITIONAL |
| System isolation | Repository, Vercel, domains, database, and environment separated from NellySelly | GO |

## §4 — Current release queue

PR #248 is the sole requestable application candidate. Its exact head/tree and
gate are in `OWNER_APPROVAL_QUEUE.md`. Downstream Drafts are review vehicles and
must not leapfrog it. The application gate authorizes no WordPress plugin/page
change, Neon migration, environment edit, message, publication, or data action.

## §5 — Controlled-traffic GO criteria

All must remain true:

- launch doctor and launch authority have zero failures;
- authority ends in `GO_CONTROLLED_TRAFFIC_READY` using authenticated Vercel
  names/scopes/types only;
- canonical Production deployment is Ready and health/readiness return 200;
- public routes and canonical metadata pass;
- anonymous private access is denied or redirected to same-origin login;
- the active data path is Neon and staff access is Better Auth/RBAC;
- test records remain suppressed and excluded from KPIs;
- no NellySelly crossover is detected; and
- any new state change has its own unconsumed exact approval.

## §6 — Hard stop conditions

Stop release or traffic expansion if any occurs:

- launch doctor/authority, route manifest, safety scan, or Production smoke
  reports a failure;
- canonical health/readiness becomes non-200 or durable storage is unavailable;
- a success UI appears without a durable lead ID;
- anonymous Lead Center data becomes visible;
- assignment, consent, suppression, idempotency, or test exclusion regresses;
- notification failures become invisible or bypass the outbox;
- the canonical alias points to an unapproved deployment;
- runtime logs show a sustained 5xx increase; or
- an external action lacks the exact current gate.

## §7 — Controlled traffic definition

Controlled traffic includes natural direct/organic visits and an explicitly
approved low-volume owned placement with source tagging and monitoring. It does
not include a new WordPress publication, Google Business Profile/social/email
post, QR distribution, consumer sequence, carrier message, paid campaign, or
lead-vendor purchase without its separate approval.

No synthetic submission may be called a genuine prospect. Current aggregate
truth still contains no proven contactable live prospect.

## §8 — Read-only operator commands

```bash
pnpm run amm:launch:doctor
pnpm run amm:launch:authority
pnpm run amm:smoke:prod
pnpm run amm:verify:funnel
pnpm run amm:health:lead-pipe
pnpm run monitor-production
```

For Vercel environment evidence, project to variable names, targets, and types
only before piping into the launch scripts. Never pull or print values.

## §9 — Separate approval boundaries

| Action | Authority source | Included now? |
| --- | --- | --- |
| Application merge/deploy | Exact phrase in `OWNER_APPROVAL_QUEUE.md` | Only when explicitly received |
| Neon migration/data mutation | Migration-specific backup/hash/transaction gate | No |
| Environment/provider change | Setting-specific secure-entry gate | No |
| WordPress Connector upgrade | Plugin hash, backup, marker, rollback gate | No |
| WordPress page/CTA publication | Page-specific diff and rollback gate | No |
| Internal QA email/push | Test-recipient and send-specific gate | No |
| Consumer communication | Consent/template/suppression/send gate | No |
| External publication or spend | Asset/link/channel/budget-specific gate | No |
| DNS/domain change | Hostname/mapping/rollback-specific gate | No |

## §10 — Rollback authority

For an approved application release, restore the recorded prior Vercel
deployment if acceptance fails, then re-run health, routes, auth boundary, and
logs. A code rollback must not delete Neon data or weaken Better Auth/RBAC.
WordPress, provider, message, DNS, and data rollback each require their own
bounded procedure.

## §11 — First 24-hour operations

| Checkpoint | Inspect | Expected |
| --- | --- | --- |
| Immediate | Canonical routes, health/readiness, aliases, Vercel errors | Ready, expected statuses, no new errors |
| First genuine lead | Lead Center detail, source, consent, score, route, outbox | One durable record; correct owner; no duplicate |
| 1 hour | Failures, queue depth, duplicate rate, unassigned/overdue leads | Visible and within thresholds |
| 4 hours | Genuine/test separation and response tasks | Tests excluded; next actions assigned |
| 24 hours | Source totals, first response, outcomes, provider failures | Evidence-backed values only |

Use `CONTROLLED_TRAFFIC_ACTIVATION.md` for staged expansion and
`OWNER_ACTION_PROOF_PACK.md` for the evidence record.

## §12 — Operator sign-off

```text
Operator: ____________________
Timestamp: ___________________
Accepted Production matches config/current-release-authority.json: [ ]
Launch authority result: GO_CONTROLLED_TRAFFIC_READY [ ]
Canonical Neon health/readiness: [ ]
Better Auth anonymous and authorized boundaries verified: [ ]
Requested action and exact gate identified: [ ]
Rollback target recorded: [ ]
No unapproved WordPress/message/database/DNS/publication/spend action: [ ]
Decision: GO / HOLD
Reason or evidence link: __________________________________________
```
