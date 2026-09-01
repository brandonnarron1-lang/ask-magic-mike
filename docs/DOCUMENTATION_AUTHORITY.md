# Documentation Authority

Updated 2026-09-01. This register prevents dated build packets from overriding
the observed production system.

## Operating source of truth

Use these files for current decisions, in this order:

1. `CURRENT_RELEASE_AUTHORITY.md` and
   `config/current-release-authority.json` — accepted Production, consumed
   receipts, the one reviewed application candidate, and its exact active gate.
   A candidate gate applies only to the exact bound PR/tree and listed action;
   it never implies authority for an external system.
2. `CURRENT_STATE_RECONCILIATION.md` — observed repository, deployment,
   runtime, database, authorization, and provider state.
3. `CANONICAL_ASSET_MANIFEST.md` and `CANONICAL_PRODUCTION_STACK.md` —
   canonical repository, project, domain, database, and asset dispositions.
4. `CONSOLIDATION_PLAN.md` — merge order, systems to retain, and systems that
   must remain separate.
5. `PRODUCTION_LAUNCH_GATE.md` — mandatory release checklist.
6. `GO_LIVE_RUNBOOK.md` — deploy, verify, and rollback procedure.
7. `ENVIRONMENT_VARIABLE_MATRIX.md` and `.env.example` — names, scopes, and safe
   defaults only; the hosting secret interface remains authoritative for values.
8. `OWNER_APPROVAL_QUEUE.md` — exact external-action and Production gates.
9. `KNOWN_BLOCKERS.md` and `KNOWN_LIMITATIONS.md` — current operating
   constraints and truthful capability boundaries.
10. `IMPLEMENTATION_STATUS.md`, `QA_EVIDENCE.md`, and the applicable
   `docs/phase9/*_QA_EVIDENCE.md` file — current release evidence. Exact-head
   GitHub checks and matching Vercel deployment metadata outrank a run ID frozen
   into documentation.

Current release authority is intentionally singular: accepted PR #247 merge
`a2f3de834830f600df106dbf5836ae4bbde4eb4a` on deployment
`dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U` is the Production baseline; deployment
`dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe` is immediate application rollback. PR #248
is the one reviewed application candidate and exposes one exact owner-only
same-tree merge/deploy gate. It has no migration or external-action authority
and does not authorize a WordPress plugin or page change. PR #238 is a consumed
cutover receipt. The PR #247 release approval, credential-redeploy approval,
and every historical component/application gate are consumed and cannot
authorize a new merge, deployment, mutation, send, or publication.

`QA_EVIDENCE_CURRENT.md` is a cumulative 2026-08-14-era evidence packet with
later appendices. Preserve it as provenance, but do not use its first baseline
table as the current release matrix.

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
