# Phase 5 Prechange Production Snapshot

Verified 2026-08-15 between 12:25 and 12:43 America/New_York. This was a
read-only production audit. No lead, notification, form, credential, session,
Push subscription, DNS record, or customer-facing page was changed.

## Canonical production

| Control | Verified state |
| --- | --- |
| Repository | `brandonnarron1-lang/ask-magic-mike` |
| Production commit | `e754456cecaf6538df25bb4bf5eebe57ebf6eacb` |
| Pull requests | #148 and #149 merged; release gates passed |
| Vercel project | `eyes-up-industries/ask-magic-mike` (`prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`) |
| Deployment | `dpl_3ogimm1EhHCaPkEfXLAeojrm2H8Z` — Ready |
| Canonical URL | `https://www.askmagicmike.com/`; apex redirects to `www` |
| Database | Neon `bitter-star-20214385`, Production branch `br-round-base-auh6h2wd`, database `neondb` |
| Public health | `/api/health/live` and `/api/health/ready` both passed |
| Public monitor | 9 of 9 checks passed; GitHub schedule green hourly |
| First-live monitor | Vercel cron GET every two minutes; sampled requests returned HTTP 200 |
| SLA cron | Vercel cron hourly at `/api/admin/sla/sweep` |
| Runtime errors | No Vercel error logs in the three-hour review window |
| PostgreSQL TLS warnings | None observed in the reviewed production log window |

## Queue and delivery state

Neon query timestamp: `2026-08-15T16:35:23.465075Z`.

| Metric | Count / state |
| --- | ---: |
| Genuine live prospects | 0 |
| Preserved QA records | 6 |
| Suppressed QA records | 6 |
| Unsuppressed QA records | 0 |
| QA in Active/New | 0 |
| QA without explicit QA evidence | 0 |
| Live unassigned leads | 0 |
| Live duplicate suspicions | 0 |
| Notification queue depth | 0 |
| Historical failed notifications | 2; both QA-related |
| Live notification failures | 0 |
| First-live detections/escalations | 0 / 0 |
| Active Web Push devices | 0 |

The signed-in Lead Center showed six TEST-badged QA records only under Spam / Test / Closed,
with valid creation times and no STALLED or ROUTING READY badges.

## Operators

- Brandon: active `administrator`; email verified; password credential present;
  two unexpired sessions at the audit point.
- Mike: provisioned `primary_lead_owner`; not banned; no password credential;
  no active session. Private activation remains pending.

No reset was sent during this snapshot.

## WordPress and forms

- Canonical bridge 1.1.0 is signed and enabled only for Gravity Form 3.
- Form 3 entry 1549 remains `forwarded` on attempt 1 to its preserved QA lead.
- Form 3's exact duplicate native `Admin Notification` remains Inactive.
- Forms 1, 2, 4, 5, 6, and 7 are not allowlisted.
- Form 7 entry 1550 remains WordPress-only, genuine, and consent-restricted or unclear.

## Isolation and external issue

- NellySelly is not referenced by deployable Ask Magic Mike code and is not
  connected to its Vercel or Neon runtime.
- Legacy deployments remain disconnected from the canonical repository.
- Social-preview verification remains 40 of 42. Meta alone receives HTTP 403
  on Our Town `/ask-mike/` and `/agents/mike-eatmon/`; the hosting-layer rule is
  the remaining enforcement layer.

## Stabilization window

The 24-hour nonessential Production freeze runs from the current production
deployment at 2026-08-15 10:41 America/New_York through 2026-08-16 10:41.
Monitoring, compliance, security, operator activation, first-lead handling, and
critical defect corrections remain permitted. No Lead Center redesign belongs
in this window.
