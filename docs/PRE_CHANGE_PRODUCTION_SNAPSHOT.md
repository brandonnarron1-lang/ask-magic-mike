# Pre-change Production Snapshot

Captured at `2026-08-14T18:24:48Z` before the authorized WordPress canonical
bridge 1.1.0 upgrade. This record contains no secret values and no lead PII.

## Canonical application

- Repository: `https://github.com/brandonnarron1-lang/ask-magic-mike`
- Production branch: `main`
- Production merge commit: `a023edd314767b1c6fbe7a0dbae00219fc7246ea`
- Vercel project: `eyes-up-industries/ask-magic-mike`
- Production deployment: `dpl_8BKoXpvPyHQbRfo9q2tA6k486Kzm` (`Ready`)
- Canonical hostname: `https://www.askmagicmike.com`
- Apex behavior: HTTP 308 to the canonical `www` hostname
- Immediately prior retained Ready deployment: `dpl_GJkS5dRAtzakPdtVJRiNAUWbWSKp`

Public production checks were read-only: 19 smoke checks passed, two write or
authenticated checks were intentionally skipped, 15 conversion-funnel checks
passed, and the NellySelly isolation check passed. `/api/health/live` reported
production Postgres configuration and production email enabled.
`/api/health/ready` reported the database, lead table, notification table,
capture function, push subscription table, and phone setup as ready.

## Production configuration posture

Vercel listed the canonical Neon `DATABASE_URL`, internal email notification
settings, protected admin settings, Resend settings, and durable rate-limit
settings as encrypted Production variables. `WORDPRESS_BRIDGE_SECRET` was not
present. No secret value was read or printed.

Legacy Supabase-named variables remain present but are not the canonical database
boundary; runtime health reports provider `postgres` through `DATABASE_URL`.
No NellySelly identifier was found in deployable application code.

## WordPress / Gravity Forms

- Site: `https://www.ourtownproperties.com`
- WordPress: `7.0.4`
- Installed plugins: 33; active: 29
- Gravity Forms: seven audited forms; each still has one active admin notification
- Canonical bridge: active version `1.0.0`
- Canonical bridge mode: `Shadow only — no forwarding`
- Observed bridge rows: Form 7 / Entry 1548 and Form 6 / Entry 1547, both
  `shadow_observed`, attempt 0, with no canonical lead ID
- No native Gravity Forms Consent field is present on the seven audited forms
- WordPress toolbar reports maintenance mode enabled; the public brokerage origin
  returned HTTP 200 during the snapshot

Home Value Form 3 has one active notification named `Admin Notification`, event
`form_submission`, subject `Buy My House Submission from Ourtownproperties.com`,
and no BCC. Its edit screen selected direct-email routing, but the required
recipient control rendered empty during this audit. Treat the legacy notification
destination as unverified until a controlled test proves delivery. Do not disable
it before canonical delivery proof.

## Email, queue, and data writes

No lead, email, SMS, push notification, WordPress entry, or database record was
created by this snapshot. Protected queue detail was not queried because the
admin secret was not exported locally. Public health and Vercel deployment checks
showed no lead-pipe outage.

## Authorized change boundary

The next production change is limited to replacing active bridge 1.0.0 with
reviewed 1.1.0 while remaining in shadow mode. The signing secret and Form 3
allowlist may be enabled only after matching secure configuration exists on both
WordPress and Vercel. Forms 1, 2, and 4–7 remain shadow-only.
