# Batch B — durable notification operations

Status: `VERIFIED_NOT_PRODUCTION`

This consolidation preserves the unique notification and first-response work
from Draft PRs #258, #260–#264, and #272 on the accepted PR #247 Production
base. It ports bounded capabilities without merging the historical stacked
ancestry or creating a second lead store, queue, worker, provider, or operator
dashboard.

## Scope

- reconcile first-response risks into the existing Action Queue and expose
  coverage/overdue truth through the current health surfaces;
- preserve one canonical `lead_notifications` outbox and process bounded due
  work through the existing protected retry route;
- authenticate scheduled retry requests with the existing `CRON_SECRET`, keep
  administrator GET read-only, and retain bounded manual POST processing;
- recover stale, never-claimed `pending` rows while leaving ambiguous
  `processing` rows for provider-history reconciliation;
- commit a public lead, attribution, consent evidence, deterministic score,
  routing result, and one minimized internal-email delivery intent through the
  additive `capture_public_lead_v2` transaction;
- make Resend webhook receipt, notification state, communication timeline, and
  bounce/complaint suppression one atomic, replay-safe database statement;
- retain the current Lead Center views, template renderers, recipient
  configuration, provider adapters, message IDs, attempts, error summaries,
  and idempotency keys; and
- reuse the dependency floors already verified by Batch A for Next.js,
  Nodemailer, Sharp, Browserslist, js-yaml, and Vitest.

## Migration and activation boundary

The branch contains exactly one additive migration:

`supabase/migrations/20260902012000_atomic_public_lead_delivery_intent.sql`

It adds `capture_public_lead_v2` and grants execution only to the server role.
It does not alter existing lead or notification rows. The application depends
on that function, so the migration must be applied and verified immediately
before the exact application tree is promoted.

The `vercel.json` change schedules the protected retry route every minute on a
Production deployment. The worker fails closed unless all existing delivery
controls are ready: Production notification mode, the explicit Production
delivery gate, email enablement, provider configuration, and a valid
`CRON_SECRET`. If those controls are already enabled, deploying this batch can
send eligible, non-test internal or consented email outbox rows. That effect
must be named in the eventual approval; an application-deploy approval alone
is insufficient.

Automated test rows are suppressed before provider dispatch. SMS and push are
not activated by this batch. Consumer acknowledgments still require their
independent gate, current consent, a current destination, and no suppression.

## Explicit exclusions

- no migration was applied to Neon or any remote database;
- no environment name, value, secret, webhook, sender, recipient, or BCC was
  changed;
- no email, SMS, push, or consumer acknowledgment was sent;
- no Resend, SMTP, Twilio, OpenAI, analytics, or messaging-provider setting was
  changed;
- no WordPress form, plugin, page, CTA, Gravity Forms notification, or cache was
  changed;
- no Production/Preview deployment, DNS, domain, publication, spend, deletion,
  lead mutation, or NellySelly action occurred; and
- no stale `processing` outbox row is automatically replayed.

## Local verification

- Node.js 24.18.0 and pnpm 10.30.3 are the counted runtime;
- 23 focused files / 168 tests pass for first-response coverage, cron policy,
  retry processing, stale-pending recovery, route authorization, atomic lead
  capture, webhook replay/rollback, provider safety, and dependency floors;
- strict TypeScript passes;
- the Production dependency audit reports zero known vulnerabilities;
- the exact webhook SQL passes processed, replay, forced rollback, failed-
  receipt retry, suppression, and unmatched-event scenarios on disposable
  PostgreSQL 17;
- all 40 repository migrations apply in order on disposable PostgreSQL 17;
- the v2 function exists, `anon` and `authenticated` cannot execute it, and
  `service_role` can;
- one synthetic, test-marked, fully suppressed capture creates one lead, three
  consent records, and one pending internal-email outbox row; same-key replay
  retains one lead and one outbox row;
- a trigger-forced outbox failure rolls back the lead, session, contact, and
  notification together, leaving zero rows in every tested relation; and
- the complete release gate passes system isolation, 14/14 safety controls,
  293 files / 3,475 tests, strict TypeScript, full ESLint, an optimized Next.js
  15.5.26 build with 60 static pages, and the 100-route manifest with 22
  acknowledged root/source duplicates; and
- no remote endpoint or provider credential is used by those proofs.

Exact-commit hosted CI, immutable Preview, protected no-write QA, and runtime-
log evidence are recorded only after the candidate is sealed.

## Release ordering

This branch is based on accepted PR #247. Batch A changes the public lead route
and the same dependency boundary, so Batch B is not requestable for merge until
Batch A is either accepted or explicitly declined. If Batch A is accepted,
Batch B must be reconciled onto that exact accepted tree and the entire local
and hosted gate rerun. This avoids silently choosing between two versions of
the public ingress.

## Rollback

Before application promotion, the additive v2 function can remain dormant or
be removed with its documented one-function rollback. After promotion, restore
the immediately prior accepted Vercel Production deployment first. That removes
the new schedule and returns the application to v1 without deleting any lead,
consent, attribution, audit, notification, receipt, or communication record.
Preserve the additive function until all in-flight requests are reconciled.

## Planned future release gate

Not requestable until release ordering and exact-head verification are sealed:

`APPROVE PHASE 9 BATCH B ATOMIC NOTIFICATION MIGRATION, ELIGIBLE EMAIL RETRY ACTIVATION, MERGE, AND SAME-TREE PRODUCTION DEPLOYMENT`

That phrase will authorize only the reviewed additive migration, exact
application merge/deployment, and processing of eligible email retry rows under
the already configured gates. It will not authorize SMS, push, provider or
secret changes, WordPress publication, marketing publication, DNS changes,
data deletion, paid spend, or NellySelly action.
