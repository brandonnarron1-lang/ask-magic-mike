# Current State Reconciliation

Audited 2026-08-28. This document overrides older status claims when they
conflict with observed Production, authenticated accounts, current `main`, or
provider/database state.

## Canonical identities

| Asset | Evidence | Status |
| --- | --- | --- |
| GitHub | `brandonnarron1-lang/ask-magic-mike`; Production baseline PR #209 merge `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` | VERIFIED LIVE |
| Vercel | `eyes-up-industries/ask-magic-mike`; project `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`; deployment `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj` | VERIFIED LIVE |
| Public host | `https://www.askmagicmike.com`; apex redirects 308 | VERIFIED LIVE |
| Database | Neon `bitter-star-20214385`; Production branch `br-round-base-auh6h2wd` | VERIFIED LIVE |
| Brokerage/SEO | `https://www.ourtownproperties.com` WordPress | VERIFIED LIVE |
| Lead Center | Better Auth sessions plus server-side RBAC at canonical `/admin` | VERIFIED LIVE |
| Internal email | Canonical outbox with Production provider enabled; BCC remains a protected value | VERIFIED LIVE |
| Free phone alerts | VAPID Web Push schema/provider/phone setup ready; physical device acceptance remains owner-scoped | READY — OWNER ACTIVATION |
| NellySelly | Separate repository, project, domains, database, and environment | VERIFIED ISOLATED |

Observed after the 2026-08-28 PR #209 cutover: the conversion verifier passes 15/15 and
the read-only Production smoke passes 19 checks with two intentional skips.
`/`, `/ask`, `/sell`, `/value`, `/buy`, `/widget/v1`, `/api/health/live`, and
`/api/health/ready` return 200. The apex redirects permanently to `www`.
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
| #238 cumulative Phase 9 candidate | Draft exact head `de67db6e1183b2a47d329d4a9a11993d48d1992a`; byte-consolidated PR #210–#237 application tree plus the guarded four-migration cutover | Single current application gate; exact phrase and sequence in `CURRENT_RELEASE_AUTHORITY.md` |
| #239 WordPress legacy reconciliation | Read-only operator tooling stacked after exact PR #238 | Dependent review artifact only; not included in the PR #238 Production gate and no live export/import authority |
| #210 through #237 | Preserved component lineage consolidated byte-for-byte into PR #238 | No independent current merge/deploy authority; historical component gates must not be replayed |
| #202 through #208 | Preserved incremental review records superseded for release by #209 | No independent merge or Production authority |
| #221 / #212 cross-domain measurement | #221 is the ordered consolidated Draft; #212 is closed as an exact preserved ancestor | #212 has no independent gate; #221 remains held behind predecessors and live consent remediation |
| #225 baseline/target readiness | Ordered read-only evidence replacement for #187 | No target writer, migration, or Production authority |
| #226 release-authority deduplication | Documentation/test-only Draft on exact #225; closed #187 and #212 remain recoverable evidence | No application or independent Production authority; eventual merge requires its own narrow gate after #225 |
| #227 through #234 | Preserved social identity, referral, host guidance, capability, organic experiment, Google Business Profile format, planner-metadata, and notification-operations component evidence | Included once in PR #238; no independent current gate |
| #187 KPI target register | Closed as superseded; branch, migration, and evidence preserved | No current release gate |

PR #209 is complete and its gate is exhausted. PR #238 is the single cumulative
application candidate; no prior or component approval authorizes it. PRs #210
through #237 remain preserved lineage rather than parallel release vehicles.
PRs #92 and #119 through #121 remain `ARCHIVE AFTER REVIEW`; none should merge
without a fresh requirement/diff audit.

## Current aggregate truth

The latest protected aggregate Production observation contains six
suppressed/test leads, zero contactable live prospects, zero measured
first-human responses, zero live notification failures, zero outcomes, and
zero spend. The 2026-08-23 public checks did not submit a form or read lead
records. This is a proven, available funnel with no genuine demand sample
yet—not evidence of a fabricated prospect or a conversion result.
