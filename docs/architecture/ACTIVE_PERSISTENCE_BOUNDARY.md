# Active persistence boundary

Status: local INFRA-02 architecture contract. This document does not authorize a provider or hosting migration.

## Canonical runtime

Next.js selects the repository's root `app/` tree. The `src/app/` tree remains inventoried, preserved, and inactive except where an active root route deliberately imports a reviewed implementation. The checked-in route contract is `config/active-route-manifest.json`; `pnpm run routes:verify` proves the contract against a production build.

The default persistence implementation remains Supabase PostgREST. Existing server environment names remain supported:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AGENT_NOTIFICATIONS_ENABLED`
- `LEAD_NOTIFICATION_MODE` / `NOTIFICATION_PROVIDER_MODE`

The service-role value is consumed only by server modules. It is not a PostgreSQL superuser credential and must never be exposed through a client component or public response.

## Runtime call graph

```text
public browser
  -> root API route
     -> provider-neutral contract (app/lib/persistence/contracts.ts)
        -> default adapter factory
           -> SupabasePostgrestAdapter
              -> PostgREST RPC
                 -> short PostgreSQL transaction

AdminOps page / server action
  -> provider-neutral read or mutation contract
     -> Supabase adapter
        -> bounded PostgREST read OR atomic PostgreSQL RPC

/api/admin/sla/sweep (root GET route)
  -> reviewed src handler
     -> SlaSweepRepository interface
        -> src/lib/persistence/supabase/sla-sweep-repository.ts
```

Public capture invokes `capture_public_lead_v1`. It commits session, identity, lead, attribution, duplicate decision, qualification projection, routing, assignment history, audit, and notification outbox together. Appointment intent invokes `request_public_appointment_v1`; appointment, lead projection, audit, and the confirmation task commit together.

Identity conflicts detected before the write phase return a sanitized `identity_conflict` result without writing lifecycle rows. Identity conflicts detected after a contact or first identity insert are raised inside a PL/pgSQL subtransaction; the subtransaction rolls back the contact/identity/session/lead/attribution/audit/routing/history/outbox write phase before returning the same sanitized `identity_conflict` result. A legacy orphan session row with no lead is treated as an `idempotency_conflict` and is not reused; this deterministic refusal avoids attaching a new lead to an ambiguous historical request id.

Admin status, assignment, and agent-operation writes invoke `mutate_admin_lead_status_v1`, `mutate_admin_assignment_v1`, and `mutate_admin_agent_operations_v1`. The assignment function shares the public capture capacity lock, locks the selected agent row, and commits routing, assignment history, audit, and outbox with the lead projection.

SLA persistence invokes `record_sla_breach_v1`. A lead/type advisory lock makes overlapping cron or manual GET sweeps idempotent without deleting historical compliance rows or imposing a uniqueness migration over unknown existing data.

Compatibility facades remain under `app/lib/` so existing imports and public response shapes do not change. Concrete PostgREST Admin read models and the notification repository live under `app/lib/persistence/supabase/`.

## Provider-neutral contracts

`app/lib/persistence/contracts.ts` defines narrow contracts for:

- lead lifecycle, session/source attribution, canonical contact identity, duplicate detection, qualification, routing/eligibility, assignment/history, audit, and notification outbox;
- appointment intent and follow-up task creation;
- Admin lead reads and mutations;
- Admin assignment and agent-operation mutations;
- reporting reads.

The lifecycle facets intentionally select the same atomic operation instead of exposing independently callable writes. A replacement adapter must preserve transaction semantics and idempotency, not merely implement similarly named CRUD methods.

The injected `PersistenceFetch` seam lets tests supply a request function without replacing global `fetch`. The default adapter uses the platform fetch implementation.

## Active table usage

| Capability | Tables read or written |
| --- | --- |
| Public lead capture | `sessions`, `contacts`, `contact_identities`, `leads`, `source_attribution`, `agents`, `lead_routing`, `agent_assignments`, `audit_logs`, `lead_notifications` |
| Public appointment intent | `leads`, `lead_appointments`, `tasks`, `audit_logs` |
| Admin lead mutation | `leads`, `audit_logs` |
| Admin assignment | `leads`, `agents`, `lead_routing`, `agent_assignments`, `audit_logs`, `lead_notifications` |
| Admin agent operations | `agents`, `audit_logs` |
| Admin read models | `leads`, `agents`, `audit_logs`, `lead_notifications`, `lead_appointments`, `tasks` |
| Reporting | `leads`, `agents`, `lead_appointments`, `tasks` |
| SLA sweep | `leads`, `lead_routing`, and, only when explicitly persisted, `compliance_flags` plus the existing analytics ledger |

Existing `consents` and `audit_logs` history stays append-only. INFRA-02 replaces silent update/delete rules with hard-failing triggers so an attempted mutation cannot be mistaken for success. Existing migrations, policies, appointments, tasks, notification history, and reporting data remain in place.

## Security boundary

- Browser code calls application routes; it never receives service-role credentials.
- Preview read-only guards run before adapter construction, so denied operations make zero database/provider calls.
- Atomic functions are `SECURITY INVOKER`, use a fixed `search_path`, and depend on the caller's existing privileges and RLS context.
- `anon` and `authenticated` cannot execute lifecycle/Admin RPCs. Only the server-side `service_role` principal is granted execute access.
- Protected lifecycle tables have RLS enabled with deny-public policies. INFRA-02 does not weaken existing policies.
- Notification functions enqueue metadata only. They do not send email or SMS inside a database transaction.
- The active root SLA route exports GET only, requires cron or Admin authentication, remains read-only unless `persist=true`, observes the Preview mutation guard, and returns 503 when persistence is absent.

## Supabase/PostgREST-specific behavior

The following details belong only to `SupabasePostgrestAdapter`, `app/lib/persistence/supabase/`, or the reviewed `src/lib/persistence/supabase/` SLA adapter:

- `/rest/v1` and `/rest/v1/rpc/*` URLs;
- `apikey`, bearer authorization, `Prefer`, and no-store headers;
- PostgREST operators such as `eq.`, `gte.`, `in.`, `is.null`, ordering, limits, selected columns, and `on_conflict`;
- Supabase client query-builder calls;
- PostgREST RPC names and JSON parameter encoding;
- interpretation of PostgREST response/status conventions.

Domain modules do not construct provider URLs, headers, or filters. Public API success bodies remain unchanged; identity and idempotency conflicts return deterministic HTTP 409 failures without exposing an existing lead id.

## Replacement contract

A future adapter is acceptable only if it can prove all of the following with the same synthetic matrix:

1. Stable request/session idempotency and normalized email/phone identity.
2. No address-only person merge.
3. Atomic lead, attribution, routing, history, audit, and outbox persistence.
4. Serialized capacity decisions under concurrent public and manual assignments.
5. Atomic appointment/follow-up and Admin mutation/audit behavior.
6. Immutable audit and consent history.
7. Equivalent RLS/least-privilege behavior and truthful unavailable/error responses.
8. Existing Admin reads, reporting visibility, and public response shapes.

The PostgreSQL functions use standard PostgreSQL behavior and have direct-database contract tests. A replacement need not expose PostgREST, but it must preserve the function contracts or provide equivalently tested transactions.

Remote application of the contact identity backfill remains blocked until an owner-authorized read-only preflight proves there are no duplicate normalized historical email or phone identities. The local query is provided in `scripts/infra-03-contact-identity-preflight.sql`; it must be run against any remote target before applying this unpublished migration there. The migration itself also fails closed if such ambiguity exists.

## Rollback path

Application rollback is to restore the previous route modules and default adapter calls while leaving RLS enabled. Database rollback guidance is recorded at the end of `20260716043829_infra_02_atomic_lifecycle.sql`: drop the new functions/triggers/table/column only after application callers have been rolled back. Do not delete historical migrations or disable RLS. Restore the prior append-only rules only if the hard-failing triggers must be removed.

Because the migration is additive, the safest operational rollback is normally to stop using the new RPCs first and retain the added constraints, identity table, RLS, and immutable history until a reviewed follow-up migration is available.

## Deployment accounting

INFRA-02/03/04 source changes do not authorize a manual deployment, production deployment, preview promotion, remote SQL application, or merge. GitHub/Vercel may still create automatic PR preview deployments from the existing repository integration after a branch push. Evidence and PR text should therefore report:

- `manual_deployments=0`
- `production_deployments=0`
- `automatic_pr_preview_deployments=triggered_by_existing_integration`
- `preview_promotions=0`

## Intentionally unsupported

This boundary does not abstract or migrate Supabase Auth, Storage, Realtime, or Edge Functions. They are not active persistence dependencies for the canonical root lifecycle. INFRA-02 also does not select another database/provider, introduce a direct Production SQL client, create provider accounts/resources, change hosting, or activate unrelated dormant `src/app` routes.
