# QA Evidence — Phase 3

Date: 2026-08-14
Branch: `codex/phase3-live-operations-2026-08-14`

## Production snapshot (read-only)

- Ask Magic Mike apex redirects to `www`; `www` returns 200.
- Our Town Properties apex redirects to `www`; `www` returns 200.
- Production smoke: 19 pass, 2 protected skips, 0 failures.
- Funnel checks: 15 pass.
- Production monitor: 9 pass.
- Synthetic monitor: 6 pass, 1 protected-auth skip.
- Ask Magic Mike / NellySelly isolation: pass.
- Refreshed Production Neon: 6 test leads, 0 live leads; no unsuppressed test
  leads, unassigned live leads, or live duplicate suspicions; notification
  queue/failure count 0/0; one Form 3 canonical QA record.
- Production RBAC tables absent and feature flag disabled.

## Form 7 priority review

Entry 1550 was inspected without contact or mutation and classified `GENUINE — CONSENT RESTRICTED OR UNCLEAR`. It remains in WordPress only and was not forwarded to canonical Neon because Form 7 is not allowlisted. See `FORM7_ENTRY_1550_DISPOSITION.md`.

## Neon-only reconciliation

```text
pnpm run typecheck
PASS

focused persistence suite
PASS — 7 files, 61 tests

pnpm run lint
PASS

pnpm run test
PASS — 151 files, 2,553 tests

pnpm run routes:verify
PASS — production build compiled; 58 active routes; 15 acknowledged duplicates

pnpm run amm:verify:isolation
PASS

pnpm run release:safety
PASS — 14 checks

git diff --check
PASS
```

The focused suite includes a Production boundary regression that sets legacy Supabase variables and the compatibility flag while omitting `DATABASE_URL`. Canonical factories fail closed, Lead Center reads stay empty, and no Supabase request occurs.

## RBAC Preview migration

- Existing isolated Preview branch: `br-morning-paper-aun3378r`.
- Preflight: core lead/outbox/rate-limit/push schema present; RBAC user/session tables absent.
- Applied the additive migration `20260814190000_lead_center_rbac.sql` to Preview only.
- Result: 13 statements executed successfully.
- Postflight: all six RBAC tables present; user count 0; session count 0.
- Production branch `br-round-base-auh6h2wd` was not migrated.
- Automatic Vercel Preview deployment `dpl_7tfvdECySRg49XtkTQUkDNWTuGdh`: READY.
- Latest Vercel Preview deployment `dpl_Gi3Pdo1aJW2MXhkudaNWAkYRhMpW`: READY.
- Authenticated Preview health: environment `preview`, database configured,
  provider `neon_postgres`, core readiness true, `rbac_schema_ready=true`, and
  notifications disabled.

## Controlled Form 1 and Form 6 audits

- Form 1: 1,337 entries; `/contact-us/`; native notification active; default
  `/thank-you/` confirmation; no consent or attribution fields. Stopped before
  allowlisting.
- Form 6: 18 entries; `/short-term-home-rentals/`; native notification active;
  default `/thank-you/` confirmation; no consent or attribution fields. Stopped
  before allowlisting.
- No form, notification, entry, bridge allowlist, email, or consumer message was
  changed or sent.

## Web Push, monitoring, crawler, and subdomain

- Production readiness: Push enabled/provider configured/setup configured/table
  ready; zero active devices; no Push sent.
- Human-readable device labels implemented and accepted on Neon Preview only.
- Active GitHub hourly monitor has a successful scheduled run; six consecutive
  Vercel SLA cron invocations were observed, with the latest two HTTP 200.
- Social preview matrix remains 40/42; only Facebook on two Our Town pages is
  blocked. Focused tests show an upstream host-wide Facebook-user-agent rule.
- `hub.ourtownproperties.com` remains absent from DNS and Vercel. Exact-host
  redirect behavior is implemented and unit-tested but not deployed.

## Known limitations / pending proof

- Preview-only `BETTER_AUTH_SECRET` and the branch RBAC feature flag are not yet configured.
- Fictional user/session and negative authorization tests require the Preview deployment.
- Production RBAC remains disabled pending Preview acceptance and owner-approved roster.
- No Gravity Form beyond Form 3 was activated.
- No external email, SMS, Push, social post, DNS change, Vercel domain attachment,
  Production database migration, or Production deployment occurred in this QA stage.
