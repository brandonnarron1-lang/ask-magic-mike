# Free-First Implementation Report

## Outcome

The fastest safe path is the system already deployed: Vercel + Neon Free +
Web Push + the existing Resend email path. This remediation organizes and
hardens that system rather than introducing another provider or repository.

## Completed on this branch

- `COMPLETE — READY TO MERGE` — health verifiers now accept the active Neon
  response contract and use protected `/api/admin/health` instead of removed
  Supabase-era routes.
- `COMPLETE — READY TO MERGE` — launch doctor scans both active root `app/` and
  preserved `src/`, requires canonical Neon/push/email variable names, and checks
  the current production release baseline.
- `COMPLETE — READY TO MERGE` — admin responses are no-store and frame-protected.
- `COMPLETE — READY TO MERGE` — generated `.amm-run` evidence is ignored.
- `COMPLETE — READY TO MERGE` — active runtime logging no longer calls missing
  Supabase variables the canonical configuration.
- `COMPLETE — READY TO MERGE` — current operations, security, privacy,
  activation, deployment, rollback, and owner-gate documentation.

## Reuse decisions

- Kept Neon, the SQL schema, outbox, provider adapters, scoring, routing,
  WordPress plugin, Lead Center, and visual system.
- Kept the static urgency artwork already derived from the approved references.
  No new image or video generation was necessary after live desktop/mobile QA.
- Kept carrier SMS disabled. There is no honest permanently free U.S. carrier
  SMS service; VAPID Web Push is the free/open-standard operational substitute.
- Kept customer email/SMS activation separate from internal alerts.

## Explicit non-actions

No production deploy, live migration, external send, customer contact, paid
trial, DNS change, WordPress publication, secret rotation, or production data
mutation was performed by this branch.
