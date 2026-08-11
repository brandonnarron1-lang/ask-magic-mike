# Implementation Status

Updated 2026-08-11.

## Complete locally or evidenced

- Canonical repo and Vercel project identified; rescue branch created.
- Both Ask hostnames serve the correct Ask Magic Mike project; no NellySelly marker
  found in live HTML.
- Our Town remains live WordPress/SEO surface; live phone evidence preserved.
- Canonical Neon lead capture, attribution, dedupe/fingerprint, routing, audit,
  AdminOps inbox/detail, and notification outbox exist in the production codebase.
- Existing release-rehearsal work is preserved.
- Production is deployed on Neon Free PostgreSQL. Public capture, durable rate
  limiting, attribution, scoring, routing, audit, consent, notification outbox,
  and the protected Admin Lead Center are live.
- The canonical `www` hostname is live and the apex redirects permanently.
- Production sender DNS and a restricted Resend sending key are configured and
  verified. The final public-form QA alert reached provider `delivered` state and
  the approved audit mailbox contains the hidden copy.

## Same-day changes in this worktree

- Add required route aliases and public buyer/renter/open-house/general/widget surfaces.
- Add local privacy, terms, accessibility, and contact routes linked from the public footer.
- Add consent/test/attribution/click-ID fields and additive migration contract.
- Add internal Mike+BCC outbox delivery and consent-gated consumer acknowledgment
  using the existing provider/retry boundary.
- Add safe event capture, source-preserving widget origin checks, health script, and
  required operating documentation.
- Add deterministic internal visual-email template selection: `hot_priority`
  (80–100), `active_assignment` (60–79), `new_lead` (<60), and `qa_test`.
  The supplied cards are creative references only; their fictional sample lead
  details are never sent. The generated asset is decorative, and all lead facts
  remain accessible HTML/text.
- Keep agent urgency SMS text-only and fail-closed: it requires an approved
  recipient, enabled carrier provider, score ≥60, and a non-test lead. Video is
  intentionally excluded from transactional notifications because it degrades
  email/MMS delivery and does not improve routing accuracy.
- Add the read-only `pnpm amm:health:lead-pipe` monitor and protected retry endpoint
  for `lead_alert` / `consumer_ack` outbox records.

## Neon preview recovery — 2026-08-11

- An isolated Neon Free preview branch, `amm-lead-pipe-preview`, was created in
  the owner-controlled project and received the full canonical migration chain.
  The production Neon branch remains untouched.
- The application now selects a direct, server-only Neon Postgres adapter when
  `DATABASE_URL` is configured. Public capture, appointment requests, the
  protected AdminOps read/mutation functions, reporting reads, and the lead
  notification outbox use that one adapter/database; no browser receives a
  database credential.
- The notification outbox has a Neon repository with idempotency-key conflict
  handling, claim-before-send status updates, bounded retries, provider message
  IDs, and protected recipient references. Email/SMS remain disabled.
- `DATABASE_URL` is stored as a Sensitive, Preview-only Vercel variable. The
  database role credential was rotated and transferred without being printed,
  committed, or written to a local artifact.
- Preview readiness, durable test capture, consent persistence, deterministic
  score/routing, skipped notification outbox records, test suppression, and
  UUID idempotent replay are proven on deployment
  `dpl_EwjyYzJmKCiq1LjzyiJX24zFS3dX`.

## Combined-system audit — 2026-08-11

- Authenticated WordPress inspection found seven active Gravity Forms with durable
  local entry history and one admin notification each. None has a native Consent
  field. Exact field mappings and entry counts are recorded in
  `COMBINED_SYSTEM_AUDIT_2026-08-11.md`.
- The live AMM Connector is configured for the canonical Ask Magic Mike app; tracked
  CTAs are present on the homepage, home-value page, and seller page. Existing
  forms and legacy plugin records remain unchanged.
- The legacy WordPress AMM plugin remains a competing local lead/`wp_mail` silo and
  must be reconciled, not expanded.
- The hourly SLA cron and protected admin health route now use Neon directly.
  Preview mutation safety requires both `VERCEL_ENV=preview` and an explicit
  `DATABASE_ENV=preview`; stale Supabase project-ref variables no longer control
  this boundary. A live persisted cron breach remains a production QA gate.
- The server analytics ledger and public event endpoint now write through one
  privacy-minimized Neon repository. PII-shaped property keys and non-scalar
  payloads are dropped before insertion, and raw IP is not written.
- A signed Gravity Forms bridge package exists in disabled shadow-safe mode. It
  maps only approved form IDs 1–7, signs exact request bodies, uses deterministic
  idempotency, retries three times, and does not send a second WordPress email.
- Current `/admin` remains shared Basic Auth; per-user role-based Hub authentication
  is still required.
- No WordPress form/notification/plugin/page, DNS, database, environment, deployment,
  or external message was changed during this audit.

## Reuse-first hardening candidate — 2026-08-11

- Branch: `codex/amm-reuse-first-hardening-20260811`.
- Existing black-diamond public visuals were retained after rendered inspection of
  `/`, `/home-value`, and `/buy`; no redesign or synthetic replacement imagery was
  warranted. Evidence is under `output/product-design-audit/2026-08-11/`.
- Next.js was patched within 15.5, Node is pinned to 20.x, vulnerable transitive
  packages are overridden, and `pnpm audit --prod` reports zero known issues.
- Public chat now has exact-origin validation, bounded input/body size, a durable
  Neon limiter, provider timeout, no-store response policy, and safe correlation
  handling.
- Admin health no longer accepts query-string secrets; middleware Basic comparison
  is Edge-safe and digest-based. Shared Basic Auth remains the only unresolved
  high-traffic identity/RBAC limitation.
- Verification: 137 Vitest files / 2,488 tests pass; 13/13 browser E2E tests pass;
  lint, strict typecheck, production build, 43-route manifest, 14/14 release-safety
  checks, dependency audit, whitespace check, and 319-commit gitleaks scan pass.
- Non-production Vercel preview `dpl_C5Rt9Wssh4jGaqo3GHQyTs7a9R34` is READY at
  `ask-magic-mike-il5455ptk-eyes-up-industries.vercel.app`; core public routes and
  both health endpoints return 200 with delivery channels disabled.

## Database recovery decision

The owner reported that the Supabase project has outstanding invoices and no
funds are available to restore it. `FREE_DATABASE_RECOVERY_PLAN.md` selected
Neon Free PostgreSQL. Both preview and production Neon branches now have the
canonical schema; production health and public durable capture pass. No Supabase
historic-data mutation or copy was performed.

The current production deployment serves all required public routes, robots,
sitemap, health endpoints, widget, and legal pages. WordPress publishing remains
separate because the authenticated form/page IDs and notification rules have not
yet been inspected in the owner-controlled WordPress console.
