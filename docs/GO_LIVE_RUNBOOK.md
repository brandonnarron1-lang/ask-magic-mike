# Production Release and Go-Live Runbook

<!-- amm-current-operations-v1 -->

Updated 2026-09-02. Ask Magic Mike is already live. This runbook governs
incremental application releases and controlled owned-traffic activation. It
derives release identity from `config/current-release-authority.json`, uses
Neon as the canonical database, and uses Better Auth plus server-side RBAC for
staff access. Current gates are in `OWNER_APPROVAL_QUEUE.md`; capability limits
are in `KNOWN_BLOCKERS.md`.

## 1. Resolve the exact change

1. Confirm the canonical repository, protected `main`, current Production
   deployment, and rollback deployment from the release-authority manifest.
2. Record the candidate PR, immutable head, tree, base, migration count,
   environment delta, external-action count, and Vercel Preview ID.
3. Confirm the candidate is ordered behind every prerequisite. A downstream
   Draft must never leapfrog the one requestable application candidate.
4. Classify each state change independently: application deploy, Neon
   migration, environment/provider change, WordPress plugin, WordPress page,
   DNS, test send, consumer message, publication, spend, or data mutation.
5. Stop if a historical or consumed phrase is presented as authority.

## 2. Prove the immutable candidate

Use Node 24 and the repository's established checks:

```bash
pnpm install --frozen-lockfile
pnpm run release:gate
pnpm run amm:launch:doctor
pnpm run amm:launch:authority
```

Additionally require:

- clean mergeability and exact-head hosted Release Gate success;
- a Ready immutable Vercel Preview built from that head;
- protected read-only route, metadata, auth-boundary, and runtime-log checks;
- production dependency audit and redacted staged secret scan; and
- no secret value, recipient value, database connection, token, cookie, or
  private key in logs, screenshots, artifacts, or the diff.

The authenticated environment check consumes only variable names, scopes, and
types. It must never pull or print values.

## 3. Present the action-specific gate

Immediately before a gated action, present:

1. exact PR/head/tree or exact external artifact hash;
2. affected systems, routes, and data;
3. verification evidence and known limits;
4. explicit exclusions;
5. rollback target and trigger; and
6. the one current phrase from `OWNER_APPROVAL_QUEUE.md`.

An application gate does not authorize a Neon migration, WordPress change,
message, publication, environment edit, DNS action, spend, or deletion.

## 4. Merge and application deployment

Only after the exact application gate is received:

1. revalidate the PR head/tree and all hosted checks;
2. merge through the protected GitHub ruleset;
3. allow the canonical Git integration to deploy that resulting `main` commit
   to the one Ask Magic Mike Vercel project;
4. wait for Ready and prove the canonical aliases resolve to that artifact; and
5. stop and restore the recorded rollback deployment if acceptance fails.

Never deploy from another repository or attach Ask Magic Mike domains to a
different project.

## 5. Immediate read-only acceptance

At minimum verify:

- `/`, `/ask`, `/sell`, `/home-value`, `/buy`, `/rent`, `/widget/v1`,
  `/privacy`, `/terms`, `/accessibility`, `/contact`, `/robots.txt`, and
  `/sitemap.xml`;
- when the candidate changes open-house capture, one reviewed
  `/open-house/{public-reference}` route plus its deterministic
  `/go/open-house/{public-reference}` redirect, with no form submission;
- when the candidate changes response operations, compare aggregate-only
  Growth response-risk and Action Queue coverage: every eligible risk must be
  represented by `first_response_overdue` or an existing priority-1/2 action,
  with test/suppressed rows excluded and no contact action performed;
- apex permanent redirect and canonical/Open Graph metadata;
- `/api/health/live` and `/api/health/ready` with canonical Neon readiness;
- anonymous private access denied or redirected to the same-origin Better Auth
  login route;
- authorized RBAC access only when an operator is already authenticated;
- no NellySelly identifier, hostname, project, database, variable, or content
  crossover; and
- no error-level or 5xx regression in the observed Vercel window.

Record exact deployment, source commit, check counts, skips, and limitations in
the PR seal and production change log.

For notification-retry releases, also prove that the authenticated cron path is
outside browser-admin middleware, anonymous API access fails closed, Preview
refuses before repository access, and a disabled/incomplete Production provider
returns 503 without consuming due outbox rows. Prove current assignment,
agent-active, global/channel permission, destination, and recorded-type checks
run before every retried provider call.

## 6. Lead or communication acceptance

When a release changes capture, routing, email, push, messaging, or sequences:

1. keep all write/send checks disabled until their separate exact approval;
2. use only `is_test=true` and `INTERNAL QA — DO NOT CONTACT` for controlled QA;
3. submit through the public form rather than inserting a row directly;
4. prove one canonical record, consent/attribution, deterministic score/route,
   Lead Center visibility, KPI exclusion, and idempotent outbox entries;
5. prove provider message ID and final delivery/failure state when a real test
   send is authorized; and
6. suppress the QA record after acceptance. Deletion is a separate data action.

A 200 response or queued state is not delivery proof. Never label a synthetic
record as a genuine prospect.

## 7. WordPress activation order

Keep WordPress as the brokerage and SEO surface, not a competing lead backend.
The safe order is:

1. application readiness release;
2. separately approved Connector plugin backup/upgrade;
3. public version-marker and fresh read-only manifest proof;
4. one page-specific rollback packet and publication approval;
5. one visible placement at a time; and
6. public link, attribution, layout, performance, and bridge-health proof.

Do not combine plugin and page changes. Do not activate the hidden homepage
component by changing only its link.

## 8. Controlled owned traffic

Natural direct and organic visits can enter the live funnel now. New owned
placements, Google Business Profile, social, email, QR, or brokerage-page
changes require their own publication evidence and approval. Start with one
reversible placement, monitor attribution and delivery, then expand. Paid
traffic and carrier messaging remain separate decisions.

## 9. Monitoring

- Immediate: public health, readiness, route smoke, aliases, and error logs.
- First genuine lead: storage-before-delivery, score/route, assignment, consent,
  attribution, notifications, and response SLA in the Better Auth Lead Center.
- Every activation window: confirm the one-minute notification-retry cron is
  authorized only by `CRON_SECRET`, Preview remains read-only, and the latest
  aggregate run has no unavailable result. Never invoke it with a browser query
  secret or record recipient/message data in cron output.
- Hourly during activation: 5xx rate, notification failures, retry-due and
  stale-processing counts, queue depth, duplicate rate, unassigned leads, and
  overdue SLA.
- Next day: genuine/test KPI separation, source totals, first-response evidence,
  provider failures, and all published-placement receipts.

Use `CONTROLLED_TRAFFIC_ACTIVATION.md` for expansion stages and
`OWNER_ACTION_PROOF_PACK.md` for evidence fields.

## 10. Rollback and incident boundaries

- Application: restore the recorded Vercel rollback deployment and re-run
  canonical health/route checks.
- WordPress: restore only the changed plugin/page artifact from its verified
  backup; preserve entries and bridge audit history.
- Messaging: pause only the affected channel/processor and preserve outbox
  records for reconciliation.
- Better Auth/RBAC: revoke affected sessions first; do not weaken role or
  assignment checks.
- Neon: prefer a reviewed forward fix. Never drop or delete lead, consent,
  notification, audit, identity, or session data to roll back application code.

Stop traffic expansion and update `KNOWN_BLOCKERS.md` when the incident changes
operating truth. No rollback action is implied by this document; use the exact
authority in `OWNER_APPROVAL_QUEUE.md`.

## 11. Additive rental CTA boundary

The Available Rentals page-226 candidate is not an href replacement. A public
readiness manifest may prove the page ID and absence of the exact CTA, but it
must return `authenticated_source_required` and no active approval gate until
the exact editor source is captured.

Before requesting any rental-page publication:

1. authenticate to WordPress without exposing credentials;
2. capture exact page-226 editor source, current revision, and verified backup;
3. choose and hash one stable insertion anchor that preserves FlexMLS listings;
4. confirm no duplicate Ask Magic Mike CTA or canonical form exists;
5. preserve the explicit exclusion of page 4120 / Gravity Form 6;
6. generate a source-bound candidate with exact insertion and rollback steps;
7. complete desktop/mobile, keyboard, canonical, performance, and no-submit
   attribution acceptance; and
8. only then request the exact page-specific WordPress publication gate.

Mike's page-597 CTA is already live and must not be duplicated. The additive
rental gate, a Connector plugin upgrade, and a Form 6 consent/form change are
three separate actions; none authorizes another.
