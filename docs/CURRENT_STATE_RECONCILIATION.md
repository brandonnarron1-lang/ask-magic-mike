# Current State Reconciliation

Audited 2026-08-23. This document overrides older status claims when they
conflict with observed Production, authenticated accounts, current `main`, or
provider/database state.

## Canonical identities

| Asset | Evidence | Status |
| --- | --- | --- |
| GitHub | `brandonnarron1-lang/ask-magic-mike`; Production baseline PR #195 merge `b450b41c66c6740bd20571cdbe7d8caf82e92d5e` | VERIFIED LIVE |
| Vercel | `eyes-up-industries/ask-magic-mike`; project `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`; deployment `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW` | VERIFIED LIVE |
| Public host | `https://www.askmagicmike.com`; apex redirects 308 | VERIFIED LIVE |
| Database | Neon `bitter-star-20214385`; Production branch `br-round-base-auh6h2wd` | VERIFIED LIVE |
| Brokerage/SEO | `https://www.ourtownproperties.com` WordPress | VERIFIED LIVE |
| Lead Center | Better Auth sessions plus server-side RBAC at canonical `/admin` | VERIFIED LIVE |
| Internal email | Canonical outbox with Production provider enabled; BCC remains a protected value | VERIFIED LIVE |
| Free phone alerts | VAPID Web Push schema/provider/phone setup ready; physical device acceptance remains owner-scoped | READY — OWNER ACTIVATION |
| NellySelly | Separate repository, project, domains, database, and environment | VERIFIED ISOLATED |

Observed 2026-08-23 public evidence: `/`, `/ask`, `/sell`, `/value`, `/buy`,
`/widget/v1`, `/robots.txt`, `/sitemap.xml`, `/api/health/live`, and
`/api/health/ready` return 200. Two independent point-in-time monitors passed
18/18 checks. Live health reports canonical Neon and the Production
notification boundary. The apex redirects permanently to `www`. Anonymous
`/admin` redirects to the active session login boundary with private/no-store
headers; authorized Lead Center sessions remain restricted by server-side role
and assigned-lead scope. The Our Town Properties homepage also returns 200.

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

## Current release work

| PR | Disposition | Gate |
| --- | --- | --- |
| #195 conversion identity polish | Reviewed head `db13953fc5f6d24a684f66c9a1c10c6b929b72b3` merged as `b450b41c66c6740bd20571cdbe7d8caf82e92d5e` and accepted on `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW` | Gate satisfied and exhausted; no migration or external publication |
| #197 legacy WordPress attribution trust | Draft refreshed onto released `main`; pre-authority-reconciliation application head `3ef57919aedc6413301bf55c34cf7c570b3fed08` is preserved and the final exact head/evidence is tracked on the PR | Sole next application candidate; fresh exact-head proof and distinct gate required |
| #198 WordPress activation change set | Draft `85321a0dbeb98d7c6f105f6405a224e8e13727f2`, stacked behind #197 | Refresh and re-prove after #197 releases; application release cannot publish WordPress |
| #199 field-experience trust | Draft `ec51f8cda97631f481f6f640d3ba9da60ccfc190`, stacked behind #198 | Refresh and re-prove after predecessor releases; later gate includes minimized telemetry activation |

PRs #170, #172, #173, #177, #178, #180, #181, #183-#185, #193-#196 are
merged and removed from the approval queue. PRs #119, #120, #121, and #92 predate the current
consolidation. They are `ARCHIVE AFTER REVIEW`; none should merge without a
fresh requirement/diff audit.

## Current aggregate truth

A read-only Production aggregate was re-executed against Neon on 2026-08-23. It
contains six test leads, all six suppressed, and zero live or contactable
prospects. It also reports zero eligible first-response samples, live
notification queue/failures/sends, outcomes, spend rows, active experiments,
open opportunities, open recommendations, or live SLA breaches. All measured
schema capabilities are present. This is a proven, available funnel whose
current bottleneck is genuine demand—not evidence of a fabricated prospect or
conversion result.
