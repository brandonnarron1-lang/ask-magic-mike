# Phase 9 Durable Rate-Limit Cutover Rehearsal

Date: 2026-08-24  
Status: read-only operator guard; no Production authority

## Purpose

PR #209 already contains the reviewed durable Neon limiter, readiness contract,
bounded emergency fallback, monitoring, and rollback. This rehearsal closes the
remaining operator gap without adding another limiter, provider, database, or
release vehicle.

The command proves the exact GitHub, Vercel, Preview, Production, and
environment-name boundary before the release gate is used. It has no execution,
merge, deployment, secret-entry, database-write, provider-send, WordPress, DNS,
publication, deletion, or NellySelly mode.

## Safe usage

Print the fixed plan:

```text
pnpm run phase9:durable-rate-limit:readiness -- --plan
```

Run the authenticated read-only preflight from the exact PR head. Point the
command at an existing local checkout linked to the canonical Vercel project;
the linked directory may be different from the clean release worktree:

```text
AMM_VERCEL_PROJECT_CWD=/absolute/path/to/linked/ask-magic-mike \
  pnpm run phase9:durable-rate-limit:readiness -- --preflight
```

The path is local, is not a credential, and is never committed. The command
refuses to auto-link a Vercel project, preventing another helper-project
accident. Vercel returns no values for sensitive/encrypted variables during
inventory; the runner discards the one plain public URL value and fails closed
if any protected value is returned.

## Required pre-change result

`READY_FOR_EXACT_GATE` means all of the following were observed in one run:

- clean local HEAD equals the current PR #209 head;
- PR #209 is Draft, open, cleanly mergeable, and based on the exact current
  `main`/Production commit;
- all attached checks pass, including `local-release-gate` and `Vercel`;
- the Vercel check resolves to one Ready immutable Preview;
- the linked Vercel project is exactly `ask-magic-mike` / the recorded project
  and organization IDs;
- current Production is exactly the recorded Ready rollback deployment and owns
  both Ask Magic Mike custom aliases;
- Production contains the protected `DATABASE_URL` name but not the new
  `RATE_LIMIT_HASH_SECRET` name;
- the candidate Preview reports database ready plus table, schema, privileges,
  RLS, store, and aggregate limiter readiness true; and
- no selected identity contains a NellySelly project, alias, deployment, or
  environment name.

The Preview correctly reports `rate_limit_required=false` and
`rate_limit_secret_ready=false`; Preview remains read-only. The old immutable
Production response correctly lacks the new limiter fields. Those are
pre-release boundary checks, not release defects.

## What remains gated

The rehearsal does not consume or replace this exact gate:

```text
APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT
```

After that gate, the operator still performs one controlled action set: enter a
new Production-only encrypted secret without displaying it, merge only the
revalidated PR head, let the canonical Git integration build the resulting
merge commit, and complete the health/malformed-request/log/monitor acceptance
in `docs/GO_LIVE_RUNBOOK.md`.

## Rollback

The rehearsal itself needs no rollback because it writes nothing. Release
rollback remains deployment `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW` first, followed
by removal of only the newly added secret from future Production builds if
required. Do not alter limiter buckets, lead/event/message data, stale Upstash
variables, or NellySelly.
