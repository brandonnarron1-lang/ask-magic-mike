# Cumulative Growth Production Acceptance — 2026-08-30

Status: **ACCEPTED**

This is the durable repository receipt for the owner-approved PR #238
cumulative cutover. It records what happened; it grants no future authority.

## Frozen application identity

- Reviewed PR head: `9232641329acb8a02ce4cf2419cb12768ce33d17`
- Reviewed tree: `e6f388311fd07fc84ed0e580b77b190f7c56f458`
- Merge commit: `cef0f366380e2e8aa95a70cf45a70830d7997d45`
- Merge tree: `e6f388311fd07fc84ed0e580b77b190f7c56f458`
- Main Release Gate: [run 33313337535](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33313337535), success
- Vercel Production deployment: `dpl_EU6Bx2Fj76HtBmNotCEKcfDk5uwe`, READY
- Canonical URL: `https://www.askmagicmike.com`
- Build log cloned `main` at `cef0f36`

## Database acceptance

- Canonical Neon target: project `bitter-star-20214385`, Production branch
  `br-round-base-auh6h2wd`, endpoint `ep-proud-bonus-autwv60g`, database
  `neondb`, owner `neondb_owner`, unpooled TLS with channel binding.
- Read-only preflight passed.
- All three growth import gates were false before and after the cutover.
- The five manifest-pinned migrations passed source-hash verification and
  committed in one transaction under an advisory lock, locked ledger/tables,
  and bounded timeouts.
- Exactly one ledger row exists for each version: `20260824193000`,
  `20260824220000`, `20260825033000`, `20260825060000`, and
  `20260830190000`.
- Existing bounded counts stayed unchanged: `audit_logs=9`; all five existing
  growth tables remained at zero.
- All three new receipt tables remained at zero rows.
- Ownership, RLS, public/browser denial, service-role allowlisting, immutable
  triggers, the metric-truth guard, and post-deploy read-only verification
  passed.
- Validated pre-cutover backup receipt: 380,265 bytes, 659 restore entries,
  mode 600, SHA-256
  `30fdeca85a7f883db9b812ed676a19f7ec141495fe1e1683bfb8b0e6282f8c49`.
  Its local path is intentionally not committed.

## Runtime acceptance

- Apex returns 308 to `www`.
- Required public funnel, widget, policy, `robots.txt`, and sitemap routes
  return 200.
- `/api/health/live` and `/api/health/ready` report healthy Neon persistence,
  capture, RBAC, durable rate limiting, and push readiness.
- Anonymous `/admin/leads` access redirects to same-origin login; anonymous
  admin APIs return 401.
- An existing authorized operator session loaded `/admin/leads`.
- Desktop and 390-pixel mobile visual checks passed without observed
  horizontal overflow.
- Deployment error-log and 5xx queries returned no entries.
- OurTownProperties.com and its home-value page remained 200 and were not
  modified.

## Rollback and authority boundary

Immediate application rollback remains
`dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`. The additive database objects and migration
ledger remain in place if application rollback is needed; destructive database
rollback is not authorized.

The exact PR #238 approval is consumed. No growth import, provider call, lead
submission or mutation, email/SMS/Web Push send, consumer acknowledgment,
WordPress save/publication, DNS change, purchase, data deletion, paid spend,
or NellySelly action occurred.
