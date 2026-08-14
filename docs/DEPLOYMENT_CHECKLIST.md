# Deployment Checklist

## Before approval

- Confirm branch is based on current `origin/main` and the draft PR contains no
  unrelated work.
- Run Node 24.x with locked pnpm; install, typecheck, tests, lint, route manifest,
  release safety, production build, production dependency audit, and isolation.
- Inspect Preview health and admin fail-closed behavior. Do not point Preview at
  the production Neon branch.
- Review variable names/scopes without revealing values. Confirm NellySelly
  identifiers are absent.
- Confirm notification and customer-send toggles remain in the approved state.
- Record current production and previous Ready Vercel deployment IDs.

## Explicit approval gate

One approval must name the PR/commit and authorize merge plus production deploy.
A separate approval is required for any live migration, WordPress publication,
DNS/mail change, first new external send, or production data mutation.

## After deployment

Run live/readiness probes, public route smoke, apex redirect, auth 401, seller and
buyer render, widget origin/fallback, system isolation, and error-log inspection.
Use a controlled `is_test=true` form submission only when separately approved.
Verify one durable record before provider status, idempotent replay, Lead Center
visibility, and test exclusion. Do not call queued email delivered.
