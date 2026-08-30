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

The Production baseline is PR #238, merge commit
`cef0f366380e2e8aa95a70cf45a70830d7997d45`, tree
`e6f388311fd07fc84ed0e580b77b190f7c56f458`, deployed as
`dpl_EU6Bx2Fj76HtBmNotCEKcfDk5uwe`. Its cumulative gate and every earlier
release gate are exhausted and cannot authorize a later action.

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

### 1. PR #238 — accepted cumulative Phase 9 release

PR #238 merged and passed same-commit Production acceptance. Its reviewed head
`9232641329acb8a02ce4cf2419cb12768ce33d17` became merge
`cef0f366380e2e8aa95a70cf45a70830d7997d45` with the identical reviewed tree
and deployment `dpl_EU6Bx2Fj76HtBmNotCEKcfDk5uwe`.

The backup-first cutover applied all five reviewed additive migrations once to
canonical Neon and passed identity, ledger, count, privilege, receipt, import-
gate, health, and runtime postflight checks. Acceptance evidence is in
`docs/phase9/CUMULATIVE_GROWTH_PRODUCTION_ACCEPTANCE_2026-08-30.md`.

The PR #238 approval phrase is consumed. There is no active application
candidate and no current application merge, migration, or Production deploy
gate.

### 2. Preserved component and dependent history

- PRs #202–#208 are superseded for release by PR #209. Their branches, checks,
  evidence, and rescue refs remain preserved.
- PRs #210–#243 are preserved as component lineage included once in accepted PR #238.
  Their former individual gates are historical and not requestable.
- PR #239 was incorporated by PR #238. Its read-only
  WordPress reconciliation tooling has no live export/import authority.
- PR #187's KPI target-register migration is deferred. Production has no
  eligible live-demand baseline, so deploying numeric targets now would create
  precision without evidence.
- PR #182 and historical PR #179 are superseded by already released current-
  stack work; their old gates are exhausted or obsolete.
- PRs #92 and #119 through #121 remain archive-after-review history, not a
  parallel Production release sequence.
- PR #244 reconciles post-cutover metadata only. It is not an active
  application candidate and needs a new exact gate before merge/deploy.

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

## Accepted PR #238 rollback and future-release discipline

The cumulative cutover completed successfully. Continue monitoring canonical
health, authorization boundaries, notification delivery, duplicate behavior,
database postconditions, and the Neon free-tier compute limit. All three growth
import gates remain false.

For a future release, record exact `main`, candidate head/tree, Preview,
Production, rollback, database identity, migration hashes, and environment
changes; run all read-only preflights; verify an immutable Preview; and obtain a
new exact action-specific approval. Never reuse the consumed PR #238 phrase or
infer authority from a passing check.

Rollback:

- Repoint the Production aliases to `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj` if a
  verified PR #238 application regression requires immediate rollback.
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
