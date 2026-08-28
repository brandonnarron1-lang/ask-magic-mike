# Phase 4 Prechange Production Snapshot

Verified 2026-08-15 between 09:15 and 09:25 America/New_York. No genuine lead
was created, edited, suppressed, or used for QA during this snapshot.

## Canonical production

| Control | Verified state |
| --- | --- |
| Repository | `brandonnarron1-lang/ask-magic-mike` |
| Main commit | `5301e3edab7ac1b120917da2bc8109a9a34de9f2` |
| Vercel project | `eyes-up-industries/ask-magic-mike` (`prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`) |
| Production deployment | `dpl_6vSTXZyHGiGkup7e4AuiebimZE2k` — Ready |
| Database | Neon `bitter-star-20214385`, Production branch `br-round-base-auh6h2wd`, database `neondb` |
| Public health | Live and readiness both `ok=true`; database provider `neon_postgres` |
| Public funnel | 15 of 15 checks passed |
| Anonymous Lead Center | HTTP 307 to authenticated login; no public lead data |
| Production monitor | 9 of 9 checks passed; GitHub schedule active hourly at minute 17 |
| SLA cron | Vercel cron active hourly at `/api/admin/sla/sweep` |
| Runtime logs | 500-request sample: 0 HTTP 5xx, 0 PostgreSQL TLS warnings, 0 reset/auth error matches |

## Canonical data state

Database query timestamp: `2026-08-15T13:18:15.306684Z`.

| Metric | Count / state |
| --- | ---: |
| Genuine live prospects | 0 |
| Suppressed QA leads | 6 |
| Unsuppressed QA leads | 0 |
| Unassigned live leads | 0 |
| Notification queue depth | 0 |
| Sent internal lead alerts | 3 |
| Failed notifications | 2 historical; both suppressed QA email alerts from 2026-08-11 |
| Live-lead notification failures | 0 |
| Active Web Push devices | 0 |

## Identity state

- Brandon: `administrator`, verified, not banned, password credential present,
  one active session. Activation is complete; no reset is required.
- Mike: `primary_lead_owner`, not banned, no password credential, no active
  session. A single new 60-minute one-use activation record was created after
  this snapshot; token and URL were not displayed or stored in this repository.
- RBAC readiness is true. The protected app remains fail-closed for anonymous
  requests.

## WordPress and delivery

- Gravity Form 3 is the only canonical bridge form.
- Form 3 local entry `1549` reconciles to one suppressed canonical QA lead and
  one canonical internal test email; its exact duplicate native Gravity
  notification remains inactive.
- Forms 1, 2, and 4 through 7 are not allowlisted.
- Email delivery, hidden audit BCC, and provider message persistence were
  previously verified. The BCC value is not included here.
- Carrier SMS remains disabled. Web Push is the free phone-alert path, with zero
  enrolled devices at snapshot time.

## Known external issue and isolation

- Social preview matrix: 40 of 42. Only Facebook's crawler receives HTTP 403
  from Our Town `/ask-mike/` and `/agents/mike-eatmon/`; other tested crawlers
  and AskMagicMike.com pass.
- Later authenticated evidence (2026-08-28) located the exact upstream Apache
  `authz_core` rule: `facebookexternalhit` is mapped to `bad_bots`, then denied
  by `Require not env bad_bots`. The former unknown-ModSecurity-rule hypothesis
  is superseded; the narrow host override remains unapplied.
- Ask Magic Mike system-isolation verification passed. Deployable code contains
  no NellySelly project identifiers and the canonical Vercel project is distinct.

## Prechange conclusion

The live funnel and canonical database are healthy. Phase 4 work should add
operator readiness, first-live monitoring, evidence, and owned-traffic assets;
it should not rebuild capture, routing, email, RBAC, or Form 3.
