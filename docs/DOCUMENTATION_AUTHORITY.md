# Documentation Authority

Updated 2026-08-19. This register prevents dated build packets from overriding
the observed production system.

## Operating source of truth

Use these files for current decisions, in this order:

1. `CURRENT_STATE_RECONCILIATION.md` — observed repository, deployment, runtime,
   database, authorization, and provider state.
2. `CANONICAL_PRODUCTION_STACK.md` — immutable project and infrastructure
   identities.
3. `PRODUCTION_LAUNCH_GATE.md` — mandatory release checklist.
4. `GO_LIVE_RUNBOOK.md` — deploy, verify, and rollback procedure.
5. `ENVIRONMENT_VARIABLE_MATRIX.md` and `.env.example` — names, scopes, and safe
   defaults only; the hosting secret interface remains authoritative for values.
6. `OWNER_APPROVAL_QUEUE.md` — exact external-action and Production gates.
7. `QA_EVIDENCE_CURRENT.md` — latest consolidated verification evidence.

Authenticated Production accounts, live route behavior, current `main`, and
provider/database state outrank every document when they conflict. Record the
new evidence and update this operating set rather than silently following stale
copy.

## Current invariants

- Canonical runtime: Next.js on the one owned Vercel `ask-magic-mike` project.
- Canonical database: Neon PostgreSQL project `bitter-star-20214385`.
- Canonical private authorization: Better Auth sessions plus server-side RBAC.
  `ADMIN_SECRET` is retained only as a disabled-feature/break-glass fallback and
  for narrowly scoped protected operational endpoints.
- Canonical internal email: the existing outbox plus authenticated Resend or
  SMTP provider boundary. Lead storage succeeds independently of delivery.
- Canonical free phone alert path: standards-based Web Push. Carrier SMS remains
  a separately gated paid capability.
- Canonical WordPress path: the signed, form-ID-specific bridge. WordPress keeps
  its local entry/audit copy but is not a competing lead database.
- NellySelly is isolated by repository, Vercel project, domains, database, and
  environment. Its identifiers are forbidden in Ask Magic Mike releases.

## Historical evidence

The repository intentionally preserves dated implementation packets, security
audits, migration rehearsals, and phase evidence. A file is historical when its
title/date or banner says so, or when it describes a superseded state such as:

- Supabase as the active production database;
- shared Basic Auth as the primary Lead Center boundary;
- email or Web Push as unimplemented;
- the pre-cutover 402/domain-conflict state; or
- a specific Preview/Production gate already recorded as completed.

Historical files may explain why a decision was made. They must not be used as
live commands, environment requirements, migration targets, recipient lists, or
deployment authority. Never delete them solely because the system advanced.

## Update rule

Any release that changes database identity, auth mode, provider state, domain
mapping, WordPress allowlists, or a production approval gate must update the
operating source-of-truth files in the same PR. Values and secrets are never
copied into documentation.
