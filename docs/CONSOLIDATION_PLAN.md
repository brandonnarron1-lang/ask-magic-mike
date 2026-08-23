# Consolidation Plan

Refreshed 2026-08-23 from authenticated GitHub, Vercel, Neon, and WordPress
evidence. This plan organizes and strengthens the system already in service; it
does not authorize a parallel application, database, notification engine, or CRM.

## Canonical decision

- Repository: `/Users/brandonnarron/Projects/ask-magic-mike`
- Remote: `https://github.com/brandonnarron1-lang/ask-magic-mike.git`
- Production branch: `main`
- Active application router: root Next.js `app/`
- Deployment: Vercel project `eyes-up-industries/ask-magic-mike`
- Public application: `https://www.askmagicmike.com`
- Canonical database: Neon project `bitter-star-20214385`, Production branch
  `br-round-base-auh6h2wd`, database `neondb`
- Brokerage/SEO authority: `https://www.ourtownproperties.com`
- WordPress role: signed source-specific bridge into the canonical lead API
- Private operations: server-authorized canonical `/admin` Lead Center
- Internal email: authenticated Resend delivery with durable outbox and hidden
  audit BCC
- Free-first phone alert: Web Push; carrier SMS remains disabled until a
  compliant registered provider is explicitly approved

The Production baseline is PR #195 merge
`b450b41c66c6740bd20571cdbe7d8caf82e92d5e`, deployed as
`dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`. Earlier migrations and release gates are
already exhausted. Do not rerun a migration or redeploy an old commit merely
because a historical approval prompt is repeated.

## Consolidation already completed

1. Public seller, buyer, renter, general, appointment, widget, event, and chat
   surfaces normalize into the canonical server application.
2. Neon is the Production source of truth for leads, attribution, consent,
   scoring, assignment, notifications, outcomes, and audit history.
3. Lead storage is independent of notification delivery, with durable queue,
   idempotency, bounded retry, provider identifiers, and visible failures.
4. Internal email uses the configured authenticated provider and protected audit
   BCC. Consumer acknowledgments remain separate and permission-aware.
5. The Lead Center uses server-side authorization and records assignment, stage,
   task, note, export, and messaging changes in audit history.
6. Our Town Properties WordPress preserves its indexed content and Gravity Forms
   entries while Form 3 forwards through the signed bridge. The duplicate native
   Form 3 alert is inactive.
7. Ask Magic Mike and NellySelly have separate repositories, Vercel projects,
   databases, credentials, and domain ownership. No NellySelly marker appears in
   the verified Ask Magic Mike render.

## Current merge order

Release only one application candidate at a time. After every merge, preserve
the downstream head, refresh it onto the exact released `main`, and rerun Node
24 CI, immutable Preview, protected no-write QA, and release safety before using
its distinct gate.

### 1. PR #197 — legacy WordPress attribution trust

PR #197 is the sole next application candidate. It separates narrowly audited
legacy Our Town compatibility evidence from exact owned-demand KPIs without
changing stored attribution. It also reconciles the authoritative operating
documents from the released PR #195 state; this is not another database,
dashboard, publisher, or routing path.

`APPROVE PHASE 9 LEGACY WORDPRESS ATTRIBUTION TRUST MERGE AND PRODUCTION DEPLOYMENT`

### 2. PR #198 — WordPress activation change set

PR #198 is stacked behind #197 and exposes protected, read-only readiness
manifests for three exact existing WordPress placements. Its application merge
cannot edit or publish WordPress. After #197 releases it must be refreshed and
re-proven before its own application gate. Any page publication remains a
separate page-specific action.

`APPROVE PHASE 9 WORDPRESS ACTIVATION CHANGE SET MERGE AND PRODUCTION DEPLOYMENT`

### 3. PR #199 — field-experience trust

PR #199 is stacked behind #198 and reuses the canonical analytics ledger for
privacy-minimized LCP, INP, and CLS observations. It contains no migration and
does not revive PR #187's target register. It must follow both predecessors and
receive a fresh exact-main proof before its own gate.

`APPROVE PHASE 9 FIELD EXPERIENCE TRUST MERGE, PRODUCTION DEPLOYMENT, AND FIELD TELEMETRY ACTIVATION`

### Deferred and superseded candidates

- PR #182 is superseded; its unique Buyer/current-router work is already in
  released PR #185.
- PR #187's KPI target-register migration remains deferred because Production
  has no eligible live-demand baseline. Only its independent no-migration field
  measurement concept is consolidated in PR #199.
- PRs #186, #188, and #189 are source history consolidated once in PR #185.
- PRs #190-#192 are source history consolidated once in released PR #193.
- Historical PR #179 is superseded by released PR #194. Physical phone
  enrollment and a `[TEST]` Push remain separate owner actions.
- PRs #92 and #119-#121 remain archive-after-review history, not a parallel
  release sequence.

## Components to retain and polish

- Root public funnels, source attribution, consent capture, deterministic scoring,
  routing, deduplication, and idempotent lead creation.
- Neon repositories, migrations, notification outbox, assignment/audit ledger,
  first-response intelligence, and publication-proof ledger.
- Resend templates, provider webhook handling, delivery history, protected BCC,
  and consumer-acknowledgment separation.
- Server-authorized Lead Center, role boundaries, source reporting, health views,
  and operator audit controls.
- Versioned isolated widget, placement contracts, strict origin handling, and
  WordPress Form 3 bridge/reconciliation health.
- Current Ask Magic Mike/Our Town visual identity and approved creative templates;
  lead-specific data must remain live HTML/text, not baked into generated images.

## Systems intentionally not merged

- `/Users/brandonnarron/ask-magic-mike`, the two-commit bootstrap repository.
- NellySelly repositories, Vercel projects, databases, domains, keys, or assets.
- WordPress local lead tables or duplicate notification engines as competing
  sources of truth.
- Static creative packages as executable applications.
- A second CRM, spreadsheet database, Constant Contact store, publisher, mailer,
  SMS gateway, or AI assignment engine.
- PropertyLens, which is a separate product and not an Ask Magic Mike runtime.

## Current stack risk and rollback

PR #185's additive proof-scope migration and application release are complete;
its old cutover sequence and rollback deployment are historical evidence, not a
current command.

PRs #197 and #198 contain no database migration. PR #198 application release
does not publish WordPress. PR #199 also contains no migration; its later gate
would activate only minimized field-observation writes through the existing
analytics ledger. For each approved application release:

1. Record the exact reviewed head, current Production deployment, alias state,
   and current database aggregate before merge.
2. Merge only that exact head and allow only the canonical Vercel project to
   build.
3. Verify public routes, readiness, anonymous admin denial, protected operator
   behavior, alias ownership, and runtime logs.
4. If acceptance fails, repoint aliases to the immediately preceding verified
   deployment. For PR #197, that rollback target is current PR #195 deployment
   `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`.
5. Preserve all Neon, notification, attribution, and publication-proof rows;
   these application-only releases require no destructive data rollback.
6. Keep WordPress, provider, message, phone, social, QR, DNS, and paid actions
   behind their own gates.

## Remaining human and external gates

- Mike's recipient/contact approval and any additional agent assignment mapping.
- BIC/legal approval for public claims, disclosures, and campaign content.
- Native publication in GBP, Facebook, Instagram, or email tools.
- Carrier SMS registration/vendor approval if SMS is later required.
- Physical iPhone Web Push enrollment and real-device receipt verification.
- Any DNS, WordPress publication, production migration, production deploy,
  external message, or live-data mutation not covered by an exact approval gate.
