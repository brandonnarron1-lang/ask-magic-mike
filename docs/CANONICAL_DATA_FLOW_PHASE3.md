# Canonical Data Flow — Phase 3

Status: implemented locally on `codex/phase3-live-operations-2026-08-14`; remote Preview and Production remain unchanged.

## Active runtime boundary

The deployed application is the repository-root Next.js `app/` tree. The parallel `src/app/` tree is preserved as superseded/reference material and is not an active Next.js router. It must not be reactivated piecemeal.

```text
AskMagicMike public form or approved WordPress bridge
  -> root app API validation, bot controls, consent, attribution
  -> createDefaultPersistence()
  -> NeonPostgresAdapter(DATABASE_URL)
  -> atomic PostgreSQL lifecycle function
  -> canonical Neon tables
  -> durable lead_notifications outbox
  -> configured provider with bounded retries
  -> protected root app Lead Center
```

## Canonical provider selection

Production and Preview use only `DATABASE_URL` and Neon PostgreSQL. A missing `DATABASE_URL` fails closed: public persistence is unavailable and Lead Center reads render safely empty. Production does not use `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `NEXT_PUBLIC_SUPABASE_ANON_KEY`, even if those legacy variables remain present in hosting.

`ALLOW_LEGACY_SUPABASE_FALLBACK=true` is honored only outside Vercel Production and exists solely for isolated compatibility tests or a deliberate local rollback rehearsal. It cannot override a Production environment.

## Active capabilities and stores

| Capability | Canonical implementation | Durable records |
| --- | --- | --- |
| Public capture | `NeonPostgresAdapter.captureLeadLifecycle` | session, contact identity, lead, attribution, routing, assignment, audit, outbox |
| Consent/score enrichment | `NeonPostgresAdapter.enrichLeadRecord` | lead projection, attribution, immutable consent |
| Lead inbox/detail | `neonAdminLeadView` | bounded Neon reads, RBAC agent scope |
| Lead status | `mutate_admin_lead_status_v1` | lead + audit atomically |
| Assignment/agent operations | Neon mutation functions | lead/agent + routing/history/audit/outbox |
| Reporting/allocation | `neonAdminReportingView`, `neonAdminAgentAllocationView` | read-only Neon queries; test/suppressed leads excluded |
| Appointments/follow-ups | `neonAdminAppointmentFollowupOps` | appointments/tasks + audit; lifecycle sync |
| Notification status/retry | `NeonLeadNotificationRepository` | `lead_notifications` outbox |
| Assignment audit reads/writes | `neonAssignmentAudit` | `audit_logs` |

## Test and live-lead controls

- `is_test=true` and `communication_suppressed=true` records are excluded from operational reporting and action queues.
- The durable lead write precedes provider delivery.
- Notification idempotency prevents repeated alerts for the same lead/template/channel event.
- Assignment, status, appointment, and task actions accept an authenticated actor and record `lead_center:<user-id>` when RBAC is enabled.
- Public failures expose safe correlation/error codes, never database/provider secrets.

## Separation from NellySelly

Ask Magic Mike has a distinct GitHub repository, Vercel project, domain aliases, environment variables, and Neon database. No Ask Magic Mike path reads NellySelly variables, domains, project IDs, or databases. `pnpm amm:verify:isolation` remains a release gate.

## Rollback

Application rollback is a Vercel rollback/redeploy to the last known-good Ask Magic Mike deployment. Database work remains additive. The local compatibility adapter is not an automatic Production rollback; enabling any alternate data provider requires a separate reviewed change and Preview proof.

