# Ask Magic Mike Combined System Audit

Audit date: 2026-08-11 EDT
Scope: read-only repository, production, Vercel, Neon, DNS, public routes, WordPress,
Gravity Forms, notification, analytics, security, and release-process inspection.
No production data, page, form, plugin, DNS, environment value, deployment, or email
was changed or sent during this audit.

## Executive decision

Do not rebuild the lead system and do not create another repository, database, form
suite, dashboard, or notification engine.

Keep this owned architecture:

1. **OurTownProperties.com** remains the WordPress authority for brokerage trust,
   SEO, pages, agents, rentals, listings, FlexMLS, and the seven existing Gravity
   Forms.
2. **AskMagicMike.com** remains the canonical public conversion application and
   widget host.
3. **Neon Free PostgreSQL** remains the single canonical lead/event/notification
   database.
4. **Resend** remains the authenticated internal email provider.
5. The existing protected Admin Lead Center remains the operational MVP while its
   shared Basic Auth is replaced with real per-user roles.
6. Build one small, reversible WordPress bridge that maps only approved form IDs,
   signs requests, forwards after Gravity Forms has saved the entry, retries failed
   forwards, and reconciles WordPress entry ID to canonical lead ID.

The system is live enough to receive AskMagicMike.com submissions today. It is not
yet honest to call the whole combined system consolidated: WordPress forms and the
legacy Ask Magic Mike plugin still create competing local records and notifications,
the production SLA cron points to Supabase, and analytics are not coherent across
the two domains.

## Current canonical assets

| Layer | Current system | Decision |
|---|---|---|
| Repository | `/Users/brandonnarron/Projects/ask-magic-mike`, GitHub `brandonnarron1-lang/ask-magic-mike` | Canonical; preserve |
| Working branch | `rescue/amm-pre-consolidation-20260810-162915`, 18 commits ahead of `origin/main` | Stabilize and merge by reviewed PR; do not keep production-only work stranded here |
| Public deployment | Vercel `eyes-up-industries/ask-magic-mike`, production deployment `dpl_SDMv6Nz69aKZJFfmGB54h6MpY5yt` | Canonical |
| Public domain | `www.askmagicmike.com`; apex permanently redirects | Canonical and live |
| Database | Neon Free PostgreSQL | Canonical |
| Internal email | Resend with aligned `notify.askmagicmike.com` sender | Canonical |
| Brokerage/SEO | Our Town Properties WordPress | Preserve |
| WordPress forms | Gravity Forms IDs 1–7 | Preserve as capture UX and local fallback; bridge to Neon |
| WordPress legacy AMM plugin | `wp_amm_leads`, REST intake, `wp_mail`, local dashboard | Reconcile then reduce/retire; do not activate more subsystems |
| WordPress connector | CTA/embed route configuration | Keep as bridge-only component |
| Agent Hub | Existing `/admin` MVP with shared Basic Auth | Reuse UI/data views; replace authentication and add RBAC |

## What is proven working

- Both Ask Magic Mike hostnames serve the correct Vercel project; the apex redirects
  to `www` and no NellySelly marker was found.
- Required public routes, widget, legal routes, sitemap, robots, liveness, and
  readiness endpoints return successfully.
- Neon readiness passes and prior controlled public-form QA proved durable capture,
  score/routing, consent/attribution, notification outbox, Resend delivery, provider
  message ID, Mike delivery, and the approved hidden audit copy.
- `/admin` and `/admin/leads` reject unauthenticated requests.
- Existing WordPress connector CTAs on the homepage, home-value page, and seller
  page point to the canonical app with source UTMs.
- Gravity Forms has durable local entry history and therefore should be bridged,
  not discarded.
- Current local gates pass when run in the safe serial order: lint, test, build,
  then typecheck. The test suite passed 130 files / 2,473 tests, the production
  build produced 43 active routes, and the release safety scan passed 14/14.
- Full Git-history secret scanning produced three redacted findings; all were
  reviewed as UUID or deliberate secret-pattern test fixtures, not live credentials.

## WordPress and Gravity Forms inventory

WordPress 7.0.3 is using a Beaver Builder child theme, Beaver Builder Pro/Themer,
FlexMLS IDX, Gravity Forms 2.10.5, Wordfence, Yoast, WP Super Cache, Constant
Contact, the Ask Magic Mike legacy plugin, Lead Ops/Social Share, and the AMM
Connector. Query Monitor is active in production. Several inactive AMM visual
plugin variants remain installed. WordPress showed four available updates during
inspection, including Gravity Forms and Wordfence updates.

| ID | Form | Existing fields | Entries observed | Canonical mapping |
|---:|---|---|---:|---|
| 1 | Contact Us | name, email, phone, subject, message, CAPTCHA | 1,336 | general question/contact |
| 2 | Cash Offer Form | name, phone, email, address, CAPTCHA | 27 | seller/direct-purchase options |
| 3 | Home Value Form | address, name, email, phone, CAPTCHA | 9 | seller/home-value review |
| 4 | Join Our Team | name, phone, email, license, address, CAPTCHA | 4 | recruiting; admin review |
| 5 | Rental Property Search | name, phone, email, address, rental area, CAPTCHA | 0 | renter/property management |
| 6 | Short Term Home Rentals | name, phone, email, details, CAPTCHA | 17 | rental inquiry |
| 7 | Never miss a property! | name, phone, email, message, CAPTCHA | 151 | buyer/property alert |

Important findings:

- None of the inspected forms has a native Gravity Forms Consent field. Exact
  consent language/version/timestamp therefore cannot be proven from the form
  schema and must be added deliberately before canonical marketing/SMS use.
- Each inspected form has one active admin notification; no separate consumer
  acknowledgment was observed.
- Gravity Forms saves entries, which is a valuable fallback. The bridge must forward
  after save and retain `gravity_form_id` and `gravity_entry_id` as source keys.
- No Gravity Forms webhook add-on is installed. A custom signed bridge is the least
  disruptive integration.
- Constant Contact is exposed as a per-form feed surface and must be audited before
  adding consent or consumer acknowledgment logic.
- The legacy AMM plugin separately stores `wp_amm_leads`, exposes a public REST
  endpoint, calls `wp_mail`, and has an unsigned optional webhook without durable
  retries or canonical idempotency. It is a competing silo, not the future bridge.
- The WordPress toolbar reports maintenance mode enabled even though the public
  site is reachable anonymously. Confirm the maintenance plugin's effective rules.
- The seller-page CTA currently routes to `/value`; it should eventually route to
  `/sell`, but the published page was not changed in this audit.
- Mike's agent page and rental pages do not yet have approved canonical placements.

## Data-flow gaps that matter

### P0 — correct before calling the combined system production-ready

1. **The hourly SLA cron is wired to Supabase.** `vercel.json` calls
   `/api/admin/sla/sweep`, but the route requires Supabase variables and creates a
   Supabase repository. Neon leads therefore are not reliably swept for overdue
   SLA breaches.
2. **Admin health is also stale Supabase code.** The protected health route can
   disagree with the live Neon readiness endpoint and accepts `admin_secret` in a
   query string, which risks secret leakage through URLs and logs.
3. **Production rate-limit configuration is noisy and degraded.** Recent Vercel
   logs show failed Upstash DNS/URL calls on `/api/leads` and `/api/events`, followed
   by Neon fallback. Remove the stale Upstash variables after verifying Neon bucket
   health; do not buy another service for this.
4. **The public AI chat endpoint has no origin check, rate limit, or input-length
   bound.** Because a production OpenAI key exists, it can create avoidable cost and
   abuse exposure. Reuse the existing limiter/origin helper and enforce a small
   request bound.
5. **The production implementation is 18 commits ahead of `origin/main`.** Create a
   reviewed merge path so disaster recovery and future Vercel links do not depend
   on an obscure rescue branch.
6. **Dependency audit found 17 production advisories** (10 high, 7 moderate),
   including Next.js 15.5.20 where the patched 15.5 line begins at 15.5.21. Patch
   and retest before the next production release.

### P1 — consolidation without reinvention

1. Implement one WordPress bridge with explicit mappings for form IDs 1, 2, 3, 4,
   5, 6, and 7; signed server-to-server requests; durable retry queue; reconciliation
   status; canonical idempotency; and a read-only health panel.
2. Preserve existing Gravity Forms entries and notifications during shadow mode.
   Disable a form's duplicate admin email only after that exact form passes one QA
   record through Neon, Lead Center, Mike, hidden audit copy, and delivery status.
3. Export and dry-run reconcile historical `wp_amm_leads` and Gravity Forms entries
   into Neon. Dedupe before import and never relabel a historical record as a new
   live prospect.
4. Replace shared Basic Auth with per-user server-side sessions and the existing
   roles. Keep the current dashboard instead of building another.
5. Remove stale Supabase runtime variables, code paths, and dependencies only after
   a reference report proves no current route needs them.
6. Archive inactive AMM visual plugins after a WordPress file/database backup and
   code review. Keep the connector and the minimal bridge only.

### P2 — measurement and operating refinement

1. AskMagicMike.com currently has no detectable GA/GTM tag, while Our Town uses
   GTM. Extend the existing Our Town measurement strategy to Ask Magic Mike with
   cross-domain linking and no PII in event parameters.
2. Add exact consent fields/versioning to the approved forms and keep Constant
   Contact, acknowledgment, and SMS permissions separate.
3. Add page-specific placements on Mike's agent page, selected rental pages,
   listing pages, and approved open-house pages only after performance/consent QA.
4. Keep notification images decorative. Lead facts must remain accessible live
   HTML/text; SMS should remain text-only and consent/recipient gated. Do not add
   generated video to transactional lead alerts.

## Reuse-first implementation sequence

1. Cut a small reliability/security branch from the canonical rescue branch.
2. Patch dependencies and the P0 routes; remove URL-secret authentication; make
   SLA sweep and health use Neon; disable/remove stale Upstash configuration; bound
   public chat; run all gates serially.
3. Open and merge a reviewed PR to `main`; use one controlled Vercel preview and one
   approved production deployment rather than repeated production releases.
4. Build the WordPress bridge as an isolated plugin using the explicit mapping
   table above. Start in shadow mode with notifications unchanged.
5. Run one labeled QA lead for each high-value form (IDs 2, 3, and 7 first), then
   disable only the proven duplicate WordPress notifications.
6. Reconcile legacy records with dry-run reports and owner-approved import batches.
7. Upgrade authentication in the existing Lead Center and complete cross-domain
   analytics.

## Decisions explicitly deferred

- No live WordPress form, notification, plugin, page, or CTA was altered.
- No DNS, Vercel environment, database, or provider setting was altered.
- No production deployment, migration, real email, SMS, consumer acknowledgment,
  historic-data import, deletion, or external marketing publication occurred.
- No paid service is required by the recommended plan.
