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

The Production baseline is PR #195, merge commit
`b450b41c66c6740bd20571cdbe7d8caf82e92d5e`, deployed as
`dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`. Do not redeploy that commit or reuse its
conversion-identity approval merely because an old approval prompt is repeated.

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

### 1. PR #209 — atomic controlled release candidate

Draft PR #209 is the sole current application release vehicle. It contains the
reviewed cumulative work from incremental PRs #202 through #208 once, plus the
fail-closed Neon endpoint attestation that prevents Preview mutation when a
Production connection is mislabeled as Preview.

The incremental PRs remain immutable review records, but none has independent
merge or Production authority. This removes the risk of seven intermediate
Production deployments, contradictory gates, or partial feature ordering.

PR #209 contains no database migration and does not enable consumer messaging,
carrier SMS, Push delivery, WordPress publication, paid media, DNS changes, or
NellySelly access. Its two remaining action classes are deliberately separate:

- isolated synthetic Preview mutation and cleanup:
  `APPROVE PHASE 9 NEON-ATTESTED CONTROLLED PREVIEW MUTATION QA`;
- one encrypted Production-only durability secret, exact reviewed PR #209
  merge, and matching same-commit Production deployment:
  `APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`.

Neither phrase authorizes an email, SMS, Push, consumer acknowledgment, lead,
WordPress edit, external publication, spend, DNS change, data deletion, or
NellySelly action.

### 2. Preserved and deferred candidates

- PRs #202 through #208 are superseded for release by PR #209. Their branches,
  checks, evidence, and rescue refs remain preserved.
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

## PR #209 release risk and rollback

The immediate risk is configuration/application mismatch: entering the
durability secret without deploying the code, deploying the code without the
secret, or allowing Preview labels to conceal a Production database URL. PR
#209 addresses this with one combined Production gate, exact-head evidence,
categorical endpoint attestation, and a fail-closed readiness contract.

Cutover sequence after explicit approval:

1. Record the exact Production deployment and exact tested PR #209 head.
2. Enter only the purpose-specific encrypted Production durability secret.
3. Merge only that exact head and allow the canonical Vercel project to deploy.
4. Prove the deployment commit, Production alias, durable limiter capability,
   health/readiness body, public funnels, anonymous admin denial, and logs.
5. Send a malformed non-lead request to exercise one pseudonymized limiter
   bucket only; verify no lead, event, notification, or message was created.
6. Keep all external sends, WordPress changes, publications, and data actions
   behind their own gates.

Rollback:

- Repoint the Production aliases to
  `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW` if the application candidate fails.
- Remove or disable the new purpose-specific secret only if rollback evidence
  requires it; do not change `DATABASE_URL` or delete limiter rows as part of
  application rollback.
- Preserve every audit, lead, notification, and publication-proof record.

## Remaining human and external gates

- Mike's recipient/contact approval and any additional agent assignment mapping.
- BIC/legal approval for public claims, disclosures, and campaign content.
- Native publication in GBP, Facebook, Instagram, or email tools.
- Carrier SMS registration/vendor approval if SMS is later required.
- Physical iPhone Web Push enrollment and real-device receipt verification.
- Any DNS, WordPress publication, production migration, production deploy,
  external message, or live-data mutation not covered by an exact approval gate.
