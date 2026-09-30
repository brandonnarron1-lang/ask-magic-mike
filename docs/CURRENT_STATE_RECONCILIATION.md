# Current State Reconciliation

<!-- amm-current-operations-v1 -->

Audited 2026-09-30. This operating record is derived from
`config/current-release-authority.json`, authenticated platform evidence, and
live read-only checks. `OWNER_APPROVAL_QUEUE.md` controls unconsumed actions;
`KNOWN_BLOCKERS.md` controls capability limits. Older packets remain historical
evidence and are not operator instructions.

## Canonical identities

| Asset | Current identity | Status |
| --- | --- | --- |
| Repository | `brandonnarron1-lang/ask-magic-mike`, protected `main` | VERIFIED |
| Accepted source | PR #280, merge `fa1d0fb077882309970b801bbdfaa756107c2104`, tree `d9533274418430b750a87b8259902cddff5b2937` | ACCEPTED |
| Vercel | `eyes-up-industries/ask-magic-mike`, project `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8` | VERIFIED |
| Production | `dpl_51jpakXn2zav3WPQYfUmAiSBBHqZ`, canonical `https://www.askmagicmike.com` | READY |
| Application rollback | `dpl_aepoH5pzDwPMkerbrp9YekzVrdKD` | PRESERVED |
| Database | Neon project `bitter-star-20214385`, branch `br-round-base-auh6h2wd`, database `neondb` | CANONICAL |
| Private access | Better Auth sessions plus server-side RBAC at `/admin` | ACTIVE |
| Brokerage surface | `https://www.ourtownproperties.com` WordPress | LIVE / SEPARATE CHANGE BOUNDARY |
| Internal email | Canonical outbox and authenticated provider; audit BCC remains a protected setting | ACTIVE |
| Free phone alerts | VAPID Web Push; physical device enrollment remains owner-scoped | READY / NOT UNIVERSALLY ENROLLED |
| Carrier messaging | Provider adapter retained but disabled without a compliant registered sender | DEFERRED |
| NellySelly | Separate repository, deployment, domains, database, and environment | VERIFIED ISOLATED |

## Accepted Production evidence

The exact PR #280 release gate and post-deploy verification passed. The
acceptance record proves 11/11 monitoring checks, 19 passing read-only smoke
checks with two intentional skips, HTTP 200 readiness, and zero observed
runtime errors. The public funnel, canonical Neon persistence, deterministic
scoring/routing, Better Auth Lead Center boundary, notification outbox, and
test/KPI exclusions are live.

The PR #280 release approval and the earlier secure database-credential redeploy
approval are consumed. Neither can authorize another merge, deployment,
environment change, database operation, WordPress edit, message, publication,
or deletion.

## Current release stack

- PR #280 is accepted Production. Its exact merge-and-deploy gate is consumed
  and cannot authorize any Phase E external action.
- Candidate authority remains null. Draft PR #281 is the sole unsealed Phase E
  review vehicle at implementation head
  `9a45c3e84bdde66bc99ede8b8a40a57571ed63c9`; it ports the reviewed
  Connector 1.1.0 package from PR #248 and the narrow atomic callback pattern
  from PR #279 without importing their stale authority or unrelated stacks.
- Connector installation, Home Value page 3952 publication, and the controlled
  QA lead/send remain separate exact gates.
- PR #238 is an applied five-migration receipt. Its gate is consumed and its
  migrations must not be replayed.
- PRs #244 and #245 are superseded review artifacts with no current authority.

## Capability disposition

| Capability | Existing implementation | Disposition |
| --- | --- | --- |
| Seller, buyer, renter, open-house, and general funnels | Next.js routes and `POST /api/leads` | CANONICAL |
| Durable lead/event storage | Neon PostgreSQL adapter and versioned functions | CANONICAL |
| Attribution, consent, dedupe, idempotency | Canonical lead lifecycle | CANONICAL |
| Explainable scoring and routing | Deterministic engines and audit events | CANONICAL |
| Internal email and Web Push | Outbox plus provider adapters | CANONICAL / CHANNEL-GATED |
| Lead Center | Better Auth, RBAC, assignment scope, audit trail | CANONICAL |
| WordPress capture | Signed form-ID bridge with local entry retention | BRIDGE ONLY |
| Legacy database adapters | Compatibility and tests only | FORBIDDEN AS PRODUCTION FALLBACK |
| CRM adapters | Null by default until an existing account is approved | OPTIONAL |
| AI assistance | Human-reviewed; never authoritative for score, route, or send | OPTIONAL |

## Current operating constraints

- No contactable genuine prospect has yet been proven in the aggregate ledger;
  synthetic/test records remain suppressed and excluded from KPIs.
- WordPress Connector 1.0.0 cannot render the reviewed per-placement attribution
  contract. The 1.1.0 application readiness work and the later plugin/page
  actions remain separate gates.
- The homepage Ask Magic Mike component is hidden by known CSS; changing only
  its link would not create a visible placement.
- Consumer acknowledgments, nurture, carrier messaging, external publication,
  paid traffic, DNS, and live database changes remain independently gated.
- Mike's account and physical notification devices require Mike's own
  acceptance. Brandon cannot accept on his behalf.

## Conflict decisions

1. Neon is the sole Production database.
2. Better Auth and server-side RBAC are the staff-access boundary.
3. The live brokerage phone remains `252-243-7700` until the owner approves a
   public change.
4. Runtime facts remain accessible data and text; supplied lead-card artwork is
   presentation reference, never the lead record.
5. NellySelly identifiers are rejected by release isolation checks.
6. A readiness manifest is not proof of publication, provider delivery, or
   genuine demand.

## Operating source order

When evidence conflicts, use authenticated live state, then
`config/current-release-authority.json`, `CURRENT_RELEASE_AUTHORITY.md`, this
file, `PRODUCTION_LAUNCH_GATE.md`, `GO_LIVE_RUNBOOK.md`,
`OWNER_APPROVAL_QUEUE.md`, and `KNOWN_BLOCKERS.md`. Record new evidence instead
of following stale chronological copy.
