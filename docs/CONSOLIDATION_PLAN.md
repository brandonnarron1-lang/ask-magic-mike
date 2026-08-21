# Consolidation Plan

Refreshed 2026-08-21 from authenticated GitHub, Vercel, Neon, and WordPress
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

The Production baseline is PR #181, merge commit
`5335697edf31eed0b8a38cd0295a4f5e7d501a3e`, deployed as
`dpl_HVoqg1t4j2SJWPFMEEzpiHGQ6hmM`. Do not rerun that migration or redeploy that
commit merely because an old approval prompt is repeated.

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

### 1. PR #183 — three-offer campaign-safety flight

Merge and deploy only after this exact approval:

`APPROVE PHASE 9 CAMPAIGN SAFETY AND THREE-OFFER OWNED-DEMAND FLIGHT MERGE AND PRODUCTION DEPLOYMENT`

This is the next application release. It does not authorize publication to an
external channel, a database migration, a message send, or a fabricated lead.

### 2. PR #184 — append-only publication-proof ledger

After PR #183 reaches Production, refresh PR #184 onto the new `main`, rerun its
exact-head CI/Preview/database-contract evidence, and then use this separate gate:

`APPROVE PHASE 9 OWNED-DEMAND PUBLICATION PROOF LEDGER PRODUCTION MIGRATION, MERGE, AND PRODUCTION DEPLOYMENT`

The guarded migration must run against the named Neon Production branch before
the application artifact is promoted. The cutover verifier must pass before and
after deployment.

### 3. Deferred candidates

- PR #182 audit is complete. Its Buyer navigation/path card, exact Vercel
  Preview-origin binding, canonical root-`app/` CTA authority, and modern
  release-safety coverage are preserved on
  `codex/phase9-current-router-safety-20260821`, stacked above #184. Its
  duplicated operational authority and launch-scanner work is superseded by
  #184. PR #182 remains Draft as historical evidence and must not merge as-is.
- PR #179 audit is complete. Its token-scoped iOS Home Screen install handoff is
  unique and retained. The only direct file overlap with #184 is the generated
  route manifest. PR #179 remains Draft until the current stack lands; refresh
  it against the final `main` and repeat exact-head Preview proof before any
  release. Physical device enrollment and receipt confirmation remain a
  separate human step.
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

## PR #184 migration risk and rollback

The publication-proof migration is additive and append-only. It creates the
proof/audit contract and grants only the minimum required writer capability; it
does not rewrite leads or publish content. Its local PostgreSQL 17 contract proves
idempotent replay, URL revalidation, minimized metadata, immutable rows, audit
creation, transaction rollback, and denial of direct authenticated table access.

Cutover sequence:

1. Record the exact Production Vercel deployment and Neon branch/endpoint.
2. Confirm a verified database backup/restore point using Neon branch history.
3. Apply only the reviewed PR #184 migration to the named Production branch.
4. Run the migration cutover verifier and stop on any mismatch.
5. Merge the exact tested PR head and allow the canonical Vercel project to build.
6. Verify health, authorization, public routes, and a controlled proof write.
7. Do not publish an external campaign or send a consumer message as part of the
   deployment.

Rollback:

- Repoint the Production aliases to the recorded prior Ready deployment if the
  application fails.
- Disable the new publication-proof write path before attempting schema changes.
- Preserve proof and audit rows; do not delete evidence during an incident.
- Restore the Neon branch to the recorded restore point only if the database
  contract itself is unsafe and the owner separately approves that destructive
  recovery action.

## Remaining human and external gates

- Mike's recipient/contact approval and any additional agent assignment mapping.
- BIC/legal approval for public claims, disclosures, and campaign content.
- Native publication in GBP, Facebook, Instagram, or email tools.
- Carrier SMS registration/vendor approval if SMS is later required.
- Physical iPhone Web Push enrollment and real-device receipt verification.
- Any DNS, WordPress publication, production migration, production deploy,
  external message, or live-data mutation not covered by an exact approval gate.
