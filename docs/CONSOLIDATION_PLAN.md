# Consolidation Plan

Refreshed 2026-08-28 from authenticated GitHub, Vercel, Neon, and WordPress
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

The Production baseline is PR #209, merge commit
`a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`, deployed as
`dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`. Its combined durability gate and every
earlier release gate are exhausted and cannot authorize a later candidate.

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

## Current release consolidation

### 1. PR #209 — accepted atomic controlled release

PR #209 merged and passed same-commit Production acceptance. It contains the
reviewed cumulative work from incremental PRs #202 through #208 once, plus the
fail-closed Neon endpoint attestation and durable Neon rate-limit contract.

The incremental PRs remain immutable review records, but none has independent
merge or Production authority. This removes the risk of seven intermediate
Production deployments, contradictory gates, or partial feature ordering.

PR #209 contained no database migration. Its Production-only encrypted secret,
exact merge, bounded malformed request, 9/9 monitor, and clean log window are
recorded in
`docs/phase9/DURABLE_RATE_LIMIT_PRODUCTION_ACCEPTANCE_2026-08-28.md`.

### 2. PR #238 — single cumulative Phase 9 candidate

Draft PR #238 at exact head
`9232641329acb8a02ce4cf2419cb12768ce33d17` is the current application
release vehicle. Its linear history preserves the tested PR #210–#243
component train and one hash-pinned, backup-first runner for the five reviewed
additive migrations, including durable Neon Lead Center API persistence.

Hosted Node 24 Release Gate, immutable Preview, protected no-write browser QA,
runtime logs, dependency audit, secret scans, and route proof are sealed on the
exact head. Only this phrase may authorize the guarded migrations, exact merge,
and canonical Production deployment:

`APPROVE PHASE 9 CUMULATIVE GROWTH MIGRATIONS, PR 238 MERGE, AND PRODUCTION DEPLOYMENT`

The phrase does not enable any growth import or authorize WordPress, messaging,
provider, publication, spend, DNS, deletion, or NellySelly action.

### 3. Preserved component and dependent candidates

- PRs #202–#208 are superseded for release by PR #209. Their branches, checks,
  evidence, and rescue refs remain preserved.
- PRs #210–#243 are preserved as component lineage included once in PR #238.
  Their former individual gates are historical and not requestable.
- PR #239 was incorporated by the PR #238 fast-forward. Its read-only
  WordPress reconciliation tooling has no live export/import authority.
- PR #187's KPI target-register migration is deferred. Production has no
  eligible live-demand baseline, so deploying numeric targets now would create
  precision without evidence.
- PR #182 and historical PR #179 are superseded by already released current-
  stack work; their old gates are exhausted or obsolete.
- PRs #92 and #119 through #121 remain archive-after-review history, not a
  parallel Production release sequence.

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

## PR #238 release risk and rollback

The cumulative cutover combines an application release with five additive
migrations. Its primary risks are wrong database identity, migration
drift, partial application, accidental import enablement, redirect/attribution
regression, or deploying a commit other than the reviewed head. The guarded
runner, exact manifest, one transaction, validated backup, disabled import
gates, and same-head acceptance checks fail closed around those risks.

Cutover sequence after explicit approval:

1. Record exact `main`, PR #238 head/tree, Preview, Production, rollback, and
   canonical unpooled Neon identity.
2. Run the read-only guarded preflight and confirm all three growth import gates
   are false.
3. Execute and verify only the five manifest-pinned migrations with the
   validated backup retained.
4. Merge only exact PR #238 head and deploy only that reviewed commit through
   the canonical Vercel project.
5. Prove health, canonical redirects/destinations, attribution preservation,
   anonymous admin denial, protected operations, database postconditions, and
   a clean exact-deployment log window.
6. Keep imports, external sends, WordPress changes, publications, data actions,
   and dependent PRs behind their own gates.

Rollback:

- Repoint the Production aliases to `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj` if PR
  #238 application acceptance fails.
- Before any separately approved import, leave the empty additive migration
  objects installed and prefer a reviewed forward fix; do not drop receipt,
  audit, signal, opportunity, lead, or notification data.
- Do not change `DATABASE_URL`, `RATE_LIMIT_HASH_SECRET`, or limiter rows as
  part of application rollback.
- Preserve every audit, lead, notification, and publication-proof record.

## Remaining human and external gates

- Mike's recipient/contact approval and any additional agent assignment mapping.
- BIC/legal approval for public claims, disclosures, and campaign content.
- Native publication in GBP, Facebook, Instagram, or email tools.
- Carrier SMS registration/vendor approval if SMS is later required.
- Physical iPhone Web Push enrollment and real-device receipt verification.
- Any DNS, WordPress publication, production migration, production deploy,
  external message, or live-data mutation not covered by an exact approval gate.
