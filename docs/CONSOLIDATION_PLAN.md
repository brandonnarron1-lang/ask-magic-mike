# Consolidation Plan

Refreshed 2026-09-01 from authenticated GitHub, Vercel, Neon, and WordPress
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

The Production baseline is PR #246, merge commit
`98a91f752c4c53dc0ae300dfc320f47b53e32820`, deployed as
`dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe` after the approved secure Production
`DATABASE_URL` replacement. The immutable source deployment
`dpl_E3Pob3TjWdxN9u4VK9xHZC61667g` is immediate rollback. Its recovery and
credential-redeploy gates and every earlier release gate are consumed and
cannot authorize a later candidate.

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

### 1. PR #246 — accepted Production recovery

PR #246 merged and passed the exact `main` Release Gate, post-deploy
verification, two manual monitors, and the first scheduled six-hour monitor.
It restored truthful CI and bounded incident reconciliation after the secure
canonical Neon credential repair. It created no application database, schema,
lead, notification, WordPress, DNS, or NellySelly mutation.

PR #238 remains the applied five-migration cutover receipt beneath this source.
Its migration hashes, one-row-per-version ledger, disabled import gates, and
postflight evidence remain preserved, but its approval is consumed.

### 2. PR #247 — clean sealed review candidate

PR #247 starts directly from accepted PR #246 `main` and ports only the
unique WordPress placement-readiness behavior that remained stranded in stale
stacked PR #245. It consumes the existing WordPress readiness manifests,
canonical owned-demand registry, proof ledger, and Distribution Command; it
does not create a parallel funnel, publisher, form, database, CRM, campaign
manager, or notification service.

The machine authority binds the one reviewed application candidate to content
head `f4503dc68b0f2c07a1e9c82827c27ffb5479e9f4` and tree
`f1023e295332b939d21313ed626a9b3a8b2d5483`. Exact Node 24 local verification,
hosted Release Gate, immutable Preview identity, protected no-write
visual/runtime QA, dependency/secret checks, and rollback review pass for that
content. PR #247 has no migration, environment delta, or authorized external
mutation. The final authority-only seal must pass the same exact-head checks;
any product, migration, environment, or target drift invalidates the gate.

### 3. Preserved and superseded review lineage

- PRs #202–#208 remain historical lineage represented once by released PR
  #209.
- PRs #210–#243 remain historical lineage represented once by released PR
  #238. Their former gates are not requestable.
- Draft PR #244 is a pre-recovery authority reconciliation and Draft PR #245 is
  stacked on it. Both are superseded by PR #246 current truth plus the clean PR
  #247 port; their branches and evidence remain preserved until archival
  review.
- PR #187's KPI target-register migration remains deferred because Production
  still has no eligible genuine-demand baseline.
- PR #182, PR #179, PRs #92 and #119–#121 remain superseded or
  archive-after-review history, not a parallel release sequence.

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

## PR #247 release risk and rollback

The current review changes only protected operator recommendation logic and
bounded public-read batching. Its primary risks are a slow WordPress dependency,
a false-ready placement, a false hold, protected page regression, or deploying
source other than the verified exact head. The allowlist, response-size and
timeout bounds, fail-closed readiness mapping, deterministic selection tests,
and existing RBAC boundary constrain those risks.

Release preparation sequence:

1. Record exact `main`, PR #247 head/tree, Preview, Production
   `dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe`, and rollback
   `dpl_E3Pob3TjWdxN9u4VK9xHZC61667g`.
2. Revalidate the three public WordPress targets read-only and confirm every
   manifest reports `mutationPerformed=false`.
3. Pass exact Node 24 tests, typecheck, lint, build, route/safety/isolation,
   dependency, and secret checks.
4. Prove immutable Preview identity and protected no-write desktop/mobile
   behavior without submitting a lead or calling a delivery provider.
5. Use only the exact sealed PR #247 application gate after all final
   authority-only exact-head checks pass and the owner supplies it verbatim.
6. Keep WordPress publication, sends, data actions, DNS, spend, and provider
   activation behind separate gates.

Rollback is application-only: keep PR #246 on the canonical aliases or promote
the recorded prior Ready deployment. Do not change `DATABASE_URL`, Neon rows,
WordPress, notification records, or publication-proof history as part of this
review rollback.

## Remaining human and external gates

- Mike's recipient/contact approval and any additional agent assignment mapping.
- BIC/legal approval for public claims, disclosures, and campaign content.
- Native publication in GBP, Facebook, Instagram, or email tools.
- Carrier SMS registration/vendor approval if SMS is later required.
- Physical iPhone Web Push enrollment and real-device receipt verification.
- Any DNS, WordPress publication, production migration, production deploy,
  external message, or live-data mutation not covered by an exact approval gate.
