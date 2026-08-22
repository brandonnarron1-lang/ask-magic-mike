# Consolidation Plan

Refreshed 2026-08-22 from authenticated GitHub, Vercel, Neon, and WordPress
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

The Production baseline is PR #184, merge commit
`f5f82f1bfaadea0ed20da50738ebc1f83e8dab97`, deployed as
`dpl_ANYodUJ7VcceRRDAfpX6APkSKUcW`. Its publication-proof migration is already
verified on the named Neon Production branch. Do not rerun that migration or
redeploy that commit merely because an old approval prompt is repeated.

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

### 1. PR #185 — owned-demand command consolidation

PR #185 is the single consolidation vehicle. It is refreshed onto the current
Production `main` and may contain only additive, no-migration work from these
already-built branches:

- PR #185: Buyer discovery, canonical current-router CTA authority, exact Vercel
  Preview-origin binding, and modern release-safety coverage.
- PR #186: protected, deterministic owned-demand image assets and tracked-link
  exports.
- PR #188: explicit WordPress placement catalog and read-only audit tooling.
- PR #189: deterministic activation decision support and operator UI.

The consolidated candidate does not publish to GBP, Facebook, Instagram,
WordPress, or email; send a message; create a lead; or change Production data.
After exact-head CI and Preview acceptance, merge and deploy only after this
separate gate:

`APPROVE PHASE 9 OWNED-DEMAND COMMAND MERGE AND PRODUCTION DEPLOYMENT`

### 2. Deferred candidates

- PR #182 remains Draft as historical evidence. Its unique current-router safety
  work is preserved in PR #185; its duplicated operational authority and launch
  scanner must not merge as a second control plane.
- PR #187's KPI target-register migration is deferred. Production has no eligible
  live-lead baseline, so deploying targets now would create precision without
  evidence. The branch remains available for later review after live demand.
- PRs #190-#192 were audited against the final PR #185 head. Their independent
  privacy, durable-limiter, and aggregate KPI-trust work is consolidated once on
  `codex/phase9-privacy-kpi-trust-consolidation-20260822`; stale documentation
  and PR #187's target-register dependency remain excluded. The consolidated
  candidate is stacked on PR #185 and has its own exact-head proof and release
  gate. Preserve the source branches until acceptance, then mark the duplicate
  PRs superseded without deleting their history.
- PR #179 audit is complete. Its unique token-scoped iOS Home Screen handoff is
  consolidated in Draft PR #194 on
  `codex/phase9-phone-handoff-consolidation-20260822`, stacked after the verified
  PR #193 candidate. The refreshed implementation adds a
  durable one-time Neon claim guard, distinct bearer-invite and HttpOnly-session
  credentials, a `/phone-alerts/`-scoped installed app, exact Ask Magic Mike
  origin isolation, copy-safe endpoint persistence, RBAC-only invite creation
  whenever RBAC is enabled, one-shot setup QA delivery, and private install/manifest Preview
  proof. Historical PR
  #179 remains preserved but must not merge as a second stack. Physical device
  enrollment and receipt confirmation remain a separate human step.
- PRs #92 and #119-#121: archive after review; they are not a parallel release
  sequence.

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

## PR #185 consolidation risk and rollback

PR #185 is application-only and must not include a database migration. Its main
risks are authorization gaps in generated-asset routes, an open redirect in
tracked links, accidental caching/indexing of private operator data, origin drift
between Production and Preview, and duplicate operational authority. The release
gate must prove strict allowlists, server-side roles, `private, no-store`,
`noindex`, attachment-safe generated files, current-root route authority, and the
absence of a second publisher or notification path.

Cutover sequence after explicit approval:

1. Record the exact Production Vercel deployment and exact tested PR head.
2. Confirm PR #185 contains no migration and no external publication action.
3. Merge only the exact tested head and let the canonical Vercel project build.
4. Verify public routes, health, anonymous admin denial, protected asset exports,
   tracked-link allowlists, responsive rendering, and runtime logs.
5. Keep all external posts and WordPress publication behind their own approval.

Rollback:

- Repoint the Production aliases to `dpl_ANYodUJ7VcceRRDAfpX6APkSKUcW` if the
  application candidate fails.
- Preserve the Neon branch unchanged; PR #185 has no database cutover to reverse.
- Disable the owned-demand asset/decision surfaces at the application layer if a
  narrow feature fault is found, without removing publication-proof evidence.

## Remaining human and external gates

- Mike's recipient/contact approval and any additional agent assignment mapping.
- BIC/legal approval for public claims, disclosures, and campaign content.
- Native publication in GBP, Facebook, Instagram, or email tools.
- Carrier SMS registration/vendor approval if SMS is later required.
- Physical iPhone Web Push enrollment and real-device receipt verification.
- Any DNS, WordPress publication, production migration, production deploy,
  external message, or live-data mutation not covered by an exact approval gate.
