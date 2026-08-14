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

## Final branch verification

Executed after the Lead Center exact-host matcher and Web Push device-label
changes were complete:

```text
pnpm run release:gate
PASS - isolation; 14/14 safety; 153 test files / 2,558 tests; strict
TypeScript; ESLint; 41-page Production build; 58 active routes

pnpm run test:e2e
PASS - 13/13 Chromium tests

pnpm audit --prod --audit-level=high
PASS - no known vulnerabilities

gitleaks git --no-banner --redact --log-opts='--all'
PASS - 326 commits, no leaks found

pnpm run smoke:prod
PASS - 19 pass, 2 protected/write skips, 0 fail

pnpm run amm:verify:funnel
PASS - 15/15

pnpm run amm:verify:health
PASS - 2/2 public probes; protected detail skipped without local secret

TARGET_URL=https://www.askmagicmike.com pnpm run monitor:synthetic
PASS - 6 pass, 1 protected skip, 0 fail

pnpm run monitor-production
PASS - 9/9

pnpm run amm:verify:social-preview
DOCUMENTED EXCEPTION - 40/42; Facebook HTTP 403 on two Our Town pages

vercel logs https://www.askmagicmike.com --since 1h --level error --no-follow
PASS - no error-level logs returned
```

The local shell used Node 26.5.1 and emitted an engine warning because the
project declares Node 24.x. All checks passed; the final GitHub release gate is
the authoritative Node 24 validation after push.

## Final CI and Preview

- Final staged commit: `424a159`.
- GitHub Actions run `31850872440`, job `94926265435`: PASS in 2m29s on the
  declared Node 24 release environment.
- Vercel Preview `dpl_8HJpyBC8yTXFBg8n9ZiujjMTg3vs`: Ready.
- Preview readiness: `ok=true`, database ready, core capture/lead/notification
  tables ready, and `rbac_schema_ready=true`.
- Preview outbound Push/provider/phone setup remains disabled by design; the
  subscription table exists and no notification was sent.
- Preview anonymous `/admin`: HTTP 401.
- Preview error-level logs in the inspected interval: none returned.
