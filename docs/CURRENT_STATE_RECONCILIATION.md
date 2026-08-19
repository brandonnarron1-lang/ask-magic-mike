# Current State Reconciliation

Audited 2026-08-19. This document overrides older status claims when they
conflict with observed Production, authenticated accounts, current `main`, or
provider/database state.

## Canonical identities

| Asset | Evidence | Status |
| --- | --- | --- |
| GitHub | `brandonnarron1-lang/ask-magic-mike`; `main` at `1c9c4eedae4de3d993def32dc6d646c1be2908ca` | VERIFIED LIVE |
| Vercel | `eyes-up-industries/ask-magic-mike`; project `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`; deployment `dpl_BCrmEB67TZDbJ9ihyLvsQkP5deD6` | VERIFIED LIVE |
| Public host | `https://www.askmagicmike.com`; apex redirects 308 | VERIFIED LIVE |
| Database | Neon `bitter-star-20214385`; Production branch `br-round-base-auh6h2wd` | VERIFIED LIVE |
| Brokerage/SEO | `https://www.ourtownproperties.com` WordPress | VERIFIED LIVE |
| Lead Center | Better Auth sessions plus server-side RBAC at canonical `/admin` | VERIFIED LIVE |
| Internal email | Canonical outbox with Production provider enabled; BCC remains a protected value | VERIFIED LIVE |
| Free phone alerts | VAPID Web Push schema/provider/phone setup ready; physical device acceptance remains owner-scoped | READY — OWNER ACTIVATION |
| NellySelly | Separate repository, project, domains, database, and environment | VERIFIED ISOLATED |

Observed 2026-08-19 public evidence: `/`, `/ask`, `/home-value`, `/buy`,
`/api/health/live`, and `/api/health/ready` return 200. Live health reports Neon,
Production notification mode, and email enabled. Readiness reports capture,
lead, notification, RBAC, Push subscription/provider, and phone-setup readiness.
Anonymous `/admin` returns 307 to `/lead-center-login`, not a Basic Auth challenge.

No new repository, public app, provider ledger, or parallel lead database is
warranted.

## Capability disposition

| Capability | Existing implementation | Disposition |
| --- | --- | --- |
| Public seller/buyer/renter/open-house/general funnels | Root `app/` routes and `POST /api/leads` | CANONICAL |
| Durable capture | `NeonPostgresAdapter` plus `capture_public_lead_v1` | CANONICAL |
| Attribution/consent/dedupe/idempotency | Lead lifecycle and versioned PostgreSQL migrations | CANONICAL |
| Scoring/routing | Deterministic lead scoring and routing | CANONICAL |
| Email/push/SMS ledger | `lead_notifications` outbox and provider adapters | CANONICAL |
| Lead Center | Better Auth, RBAC policy, server-side session/role/assignment checks | CANONICAL |
| WordPress bridge | Signed, form-ID-specific plugin; local entries retained | WORDPRESS BRIDGE ONLY |
| Supabase/PostgREST runtime | Non-Production compatibility only; forbidden as Production fallback | SUPERSEDED |
| Carrier SMS/Twilio | Adapter retained; disabled without paid compliant sender | DEFERRED — PAID SERVICE |
| Free phone alerts | VAPID Web Push with primary/copy roles | READY — DEVICE ACCEPTANCE |
| CRM adapters | Null/FUB/kvCORE; null remains safe default | OPTIONAL |
| AI augmentation | Env-gated; never authoritative for score/routing or automatic send | OPTIONAL/HUMAN-REVIEWED |

## Conflict decisions

1. Neon is canonical. `supabase/migrations/` is a retained directory name, not
   the active provider identity.
2. Better Auth/RBAC is the active private boundary. `ADMIN_SECRET` is retained
   for break-glass fallback and narrowly scoped operations, not staff login.
3. The public brokerage number remains `252-243-7700`. Private notification
   destinations remain hosting secrets and never alter public copy.
4. Supplied lead-card images are visual references only. Runtime facts remain
   accessible HTML/text, and synthetic samples never become prospects.
5. NellySelly identifiers are rejected by the release isolation check.
6. Legacy Vercel deployments remain rollback evidence but own no Ask Magic Mike
   hostname or canonical Git integration.
7. Internal email is active; consumer acknowledgment, nurture, automatic send,
   carrier SMS, and external publication remain independent gates.

## Open release work

| PR | Disposition | Gate |
| --- | --- | --- |
| #170 owned-demand command | Clean, mergeable, green Preview/CI | `APPROVE PHASE 9.1 OWNED DEMAND COMMAND MERGE AND PRODUCTION DEPLOYMENT` |
| #177 commercial-email compliance | Draft, clean, mergeable, green Preview/CI | `APPROVE PHASE 9 COMMERCIAL EMAIL COMPLIANCE MERGE AND PRODUCTION DEPLOYMENT` |
| #173 review planner | Clean, mergeable, green Preview/CI | `APPROVE PHASE 9.4 REVIEW PLANNER MERGE AND PRODUCTION DEPLOYMENT` |
| #172 database revival command | Draft and conflicting; preserve until prior sequence completes, then refresh | `APPROVE PHASE 9.3 DATABASE REVIVAL COMMAND MERGE AND PRODUCTION DEPLOYMENT` after refresh |

PRs #119, #120, #121, and #92 predate the current consolidation. They are
`ARCHIVE AFTER REVIEW`; none should merge without a fresh requirement/diff audit.
