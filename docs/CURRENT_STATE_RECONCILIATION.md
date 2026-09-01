# Current State Reconciliation

Audited 2026-09-01. This document overrides older status claims when they
conflict with observed Production, authenticated accounts, current `main`, or
provider/database state.

## Canonical identities

| Asset | Evidence | Status |
| --- | --- | --- |
| GitHub | `brandonnarron1-lang/ask-magic-mike`; Production baseline PR #246 merge `98a91f752c4c53dc0ae300dfc320f47b53e32820` | VERIFIED LIVE |
| Vercel | `eyes-up-industries/ask-magic-mike`; project `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`; deployment `dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe`; immediate rollback `dpl_E3Pob3TjWdxN9u4VK9xHZC61667g` | VERIFIED LIVE |
| Public host | `https://www.askmagicmike.com`; apex redirects 308 | VERIFIED LIVE |
| Database | Neon `bitter-star-20214385`; Production branch `br-round-base-auh6h2wd` | VERIFIED LIVE |
| Brokerage/SEO | `https://www.ourtownproperties.com` WordPress | VERIFIED LIVE |
| Lead Center | Better Auth sessions plus server-side RBAC at canonical `/admin` | VERIFIED LIVE |
| Internal email | Canonical outbox with Production provider enabled; BCC remains a protected value | VERIFIED LIVE |
| Free phone alerts | VAPID Web Push schema/provider/phone setup ready; physical device acceptance remains owner-scoped | READY — OWNER ACTIVATION |
| NellySelly | Separate repository, project, domains, database, and environment | VERIFIED ISOLATED |

Observed after the 2026-09-01 PR #246 recovery release: the exact `main` Release
Gate, post-deploy verification, two manual monitors, and the first scheduled
six-hour monitor pass. The later approved secure Production `DATABASE_URL`
replacement redeployed the identical accepted commit as
`dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe`. Canonical readiness and liveness return
HTTP 200. `/`, `/ask`, `/sell`, `/buy`, `/widget/v1`,
`/api/health/live`, and `/api/health/ready` return 200; `/value` redirects 308
to `/home-value`. The apex redirects permanently to `www`.
Anonymous private routes are denied or temporarily redirected to the
same-origin login route; authorized Lead Center sessions are additionally
restricted by server-side role and assigned-lead scope.

The current Production readiness body proves the canonical Neon durable limiter
table, schema, privileges, effective RLS bypass, runtime store, dedicated
server-only secret, and aggregate contract. The strict monitor passes 9/9.

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

## Current release authority

| PR | Disposition | Gate |
| --- | --- | --- |
| #195 conversion identity polish | Merged and live at `b450b41c66c6740bd20571cdbe7d8caf82e92d5e` | Gate exhausted; it authorizes no later action |
| #209 atomic controlled release candidate | Merged and accepted at `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` / `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj` | Gate exhausted; it authorizes no later action |
| #238 cumulative Phase 9 cutover | Merged as `cef0f366380e2e8aa95a70cf45a70830d7997d45`; five migrations applied and verified | Released receipt; approval consumed and not reusable |
| #246 CI and Production recovery | Merged and accepted at `98a91f752c4c53dc0ae300dfc320f47b53e32820`; current secure credential redeploy `dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe`, immediate rollback `dpl_E3Pob3TjWdxN9u4VK9xHZC61667g` | Current Production; release and credential-redeploy gates consumed |
| #247 WordPress placement readiness | Clean Draft based on current Production; implementation head `6eb2d37f7dc2c116e92ba7ee7e7c2ea4f2482e99` | Unsealed review; no current application gate |
| #244 and #245 | Stale Draft authority/readiness stack | Superseded by #246 truth and #247 port; no current authority |
| #239 WordPress legacy reconciliation | Read-only operator tooling included in released PR #238 lineage | Historical only; no live export/import authority |
| #210 through #243 | Preserved component lineage consolidated into released PR #238 | No independent current merge/deploy authority; historical component gates must not be replayed |
| #202 through #208 | Preserved incremental review records superseded for release by #209 | No independent merge or Production authority |
| #221 / #212 cross-domain measurement | #221 is the ordered consolidated Draft; #212 is closed as an exact preserved ancestor | #212 has no independent gate; #221 remains held behind predecessors and live consent remediation |
| #225 baseline/target readiness | Ordered read-only evidence replacement for #187 | No target writer, migration, or Production authority |
| #226 release-authority deduplication | Documentation/test-only Draft on exact #225; closed #187 and #212 remain recoverable evidence | No application or independent Production authority; eventual merge requires its own narrow gate after #225 |
| #227 through #234 | Preserved social identity, referral, host guidance, capability, organic experiment, Google Business Profile format, planner-metadata, and notification-operations component evidence | Included once in PR #238; no independent current gate |
| #187 KPI target register | Closed as superseded; branch, migration, and evidence preserved | No current release gate |

PR #246 is complete and its gate is exhausted. There is no active application
candidate. PR #247 remains review-only until exact-head verification and a new
gate are sealed. PRs #210 through #245 remain preserved lineage or superseded
review artifacts rather than parallel release vehicles.
PRs #92 and #119 through #121 remain `ARCHIVE AFTER REVIEW`; none should merge
without a fresh requirement/diff audit.

## Current aggregate truth

The 2026-09-01 protected aggregate observation contains six suppressed/test
leads, zero contactable live prospects, zero measured first-human responses,
zero live notification backlog, zero outcomes, and zero spend. The last 14-day
eligible analytics window contains 52 page views across 30 sessions and no
eligible `lead_created` event. This is a proven, available funnel with low
traffic and no genuine conversion sample—not evidence of a fabricated prospect
or a conversion result.
