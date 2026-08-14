# Current State Reconciliation

Audited 2026-08-14. This document overrides older status claims when they
conflict with the observed repository, live deployment, or health probes.

## Canonical identities

| Asset | Evidence | Status |
| --- | --- | --- |
| GitHub | `brandonnarron1-lang/ask-magic-mike`, `main`, commit `8178e24106e723ddb4a302b7ac9fc1551008f697` | VERIFIED LIVE |
| Vercel | `eyes-up-industries/ask-magic-mike`, project `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`, deployment `dpl_4krvUvVDvgK4owaQmaHHfXyWAEke` | VERIFIED LIVE |
| Public host | `https://www.askmagicmike.com`; apex redirects 308 | VERIFIED LIVE |
| Database | Neon `bitter-star-20214385`; production branch `br-round-base-auh6h2wd` | VERIFIED LIVE |
| Brokerage/SEO | `https://www.ourtownproperties.com` WordPress | VERIFIED LIVE |
| Lead Center | Basic-auth protected `/admin` on the canonical app | VERIFIED LIVE |
| NellySelly | Separate repository, project, domains, database, and environment | VERIFIED LIVE |

Git `origin/main` and the active Vercel production deployment point to the same
commit. No new repository or parallel lead database is warranted.

## Capability disposition

| Capability | Existing implementation | Disposition |
| --- | --- | --- |
| Public seller/buyer/renter/open-house/general funnels | Root `app/` routes and `POST /api/leads` | CANONICAL |
| Durable capture | `NeonPostgresAdapter` + `capture_public_lead_v1` | CANONICAL |
| Attribution/consent/dedupe/idempotency | Lead lifecycle and additive SQL migrations | CANONICAL |
| Scoring/routing | Deterministic `leadScoring.ts` and `leadRouting.ts` | CANONICAL |
| Email/push/SMS ledger | `lead_notifications` outbox and provider adapters | CANONICAL |
| Lead Center | Root `app/admin` | CANONICAL |
| WordPress bridge | Signed, form-ID-specific plugin; shadow-first | WORDPRESS BRIDGE ONLY |
| Supabase/PostgREST runtime | Fallback adapter and legacy route tree | SUPERSEDED |
| Agent portal in `src/app/(agent)` | URL-selected broker-preview code, not active auth | REFERENCE/DOCUMENTATION |
| Carrier SMS/Twilio | Implemented adapter, disabled without paid compliant sender | DEFERRED — PAID SERVICE |
| Free phone alerts | VAPID Web Push with primary/copy roles | IMPLEMENTED — ACTIVATION REQUIRED |
| CRM adapters | Null/FUB/kvCORE adapters; null is active default | NOT REQUIRED |
| AI generation | Optional, env-gated, not used for scoring/routing | NOT REQUIRED |

## Conflicts resolved

1. Documents that call Supabase canonical are historical. Neon is authoritative.
2. SQL migrations remain under `supabase/migrations/` only as a legacy directory
   name; they are applied to canonical PostgreSQL after review.
3. The public brokerage number remains `252-243-7700`. Internal alert recipient
   numbers are private hosting variables and never alter public copy.
4. The attached lead-card samples are visual references, not consumer records.
   Runtime facts remain accessible HTML/text; PII-free urgency artwork is
   selected deterministically by score and test state.
5. NellySelly identifiers are rejected by the Ask release isolation check.

## Open GitHub work

PRs #119, #120, #121, and #92 predate the current `main` consolidation. They are
`ARCHIVE AFTER REVIEW`; none should be merged without a fresh diff against
`origin/main`. This task does not close or delete them.
