# Current State Reconciliation

<!-- amm-current-operations-v1 -->

Audited 2026-10-02. Stable release policy is
`config/release-authority-policy.json`. Current accepted Production is derived
from the latest deployment-generated receipt and authenticated with
`pnpm release:authority:resolve`, not inferred from this prose.
`OWNER_APPROVAL_QUEUE.md` controls unconsumed actions;
`KNOWN_BLOCKERS.md` controls capability limits. Older packets remain historical
evidence and are not operator instructions.

## Canonical identities

| Asset | Current identity | Status |
| --- | --- | --- |
| Repository | `brandonnarron1-lang/ask-magic-mike`, protected `main` | VERIFIED |
| Accepted source | Latest authenticated acceptance receipt returned by the resolver | RESOLVE AT USE |
| Vercel | `eyes-up-industries/ask-magic-mike`, project `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8` | VERIFIED |
| Production | Receipt-selected Ready deployment; canonical `https://www.askmagicmike.com` | RESOLVE AT USE |
| Application rollback | Receipt-selected prior Ready deployment | RESOLVE AT USE |
| Database | Neon project `bitter-star-20214385`, branch `br-round-base-auh6h2wd`, database `neondb` | CANONICAL |
| Private access | Better Auth sessions plus server-side RBAC at `/admin` | ACTIVE |
| Brokerage surface | `https://www.ourtownproperties.com` WordPress | LIVE / SEPARATE CHANGE BOUNDARY |
| Internal email | Canonical outbox and authenticated provider; audit BCC remains a protected setting | ACTIVE |
| Free phone alerts | VAPID Web Push; physical device enrollment remains owner-scoped | READY / NOT UNIVERSALLY ENROLLED |
| Carrier messaging | Provider adapter retained but disabled without a compliant registered sender | DEFERRED |
| NellySelly | Separate repository, deployment, domains, database, and environment | VERIFIED ISOLATED |

## Accepted Production evidence procedure

Run the resolver immediately before an operational decision. It validates
receipt integrity and proves exact GitHub source/tree/PR/deployment, Vercel
project/target/source/alias, required verifier results, HTTP health, and Ready
rollback agreement. A contradiction is a hard stop and is never repaired
automatically.

Historical PR #282, #281, #280, and credential-redeploy approvals are consumed.
None can authorize another merge, deployment, environment change, database
operation, WordPress edit, message, publication, or deletion.

## Historical Phase E stack (accepted 2026-10-01)

- PR #281 was the accepted Production snapshot at the time. Its exact
  merge-and-deploy gate is consumed and is not current-state authority.
- Final-head Release Gate `36785767916`, protected no-write/browser run
  `36786151363`, main Release Gate `36795930424`, post-deploy verification
  `36796044756`, recurring monitors, and the zero-error runtime window pass.
- Connector 1.1.0, Home Value page 3952 publication, page-only cache refresh,
  and the one controlled QA lead/send completed under their own separately
  consumed gates with protected rollback artifacts.
- The link-out QA path proved one canonical test lead, attribution, consent,
  deterministic score/routing, Lead Center visibility, one notification intent,
  and separate provider-delivered events for the primary and hidden audit-BCC
  recipients. The test remains suppressed and excluded from live KPIs.
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
- WordPress Connector 1.1.0 renders the reviewed page-3952 attribution contract.
  Other placements still require their own page-specific evidence and gates.
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

When evidence conflicts, use the authenticated resolver output, then
`config/release-authority-policy.json`, `CURRENT_RELEASE_AUTHORITY.md`, this
file, `PRODUCTION_LAUNCH_GATE.md`, `GO_LIVE_RUNBOOK.md`,
`OWNER_APPROVAL_QUEUE.md`, and `KNOWN_BLOCKERS.md`. Record new evidence instead
of following stale chronological copy.
