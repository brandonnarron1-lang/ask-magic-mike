# Neon Lead Center API persistence candidate

Date: 2026-08-30 ET

Scope: authenticated Lead Center REST routes only

Release parent: exact PR #241 head `e30b91fb102a478438df0cda9ca5d0e67bf287ad`

## Outcome

The documented authenticated `/api/admin/leads` surface is now active under
the authoritative root `app` router and uses the canonical
provider-neutral persistence boundary, with Neon preferred whenever
`DATABASE_URL` is configured. It no longer returns `ok: true` with a
`mock_mode` note when the former Supabase configuration is absent.

The canonical root Lead Center remains intact. This change closes a secondary
router/API gap by exposing thin authority wrappers over one reviewed handler
implementation; it does not create another CRM, database, dashboard,
notification engine, or public lead path.

## Durable operation contract

Migration `20260830190000_admin_lead_api_persistence.sql` adds four narrowly
scoped functions:

- `patch_admin_lead_v1`
- `add_admin_lead_note_v1`
- `create_admin_lead_task_v1`
- `mutate_admin_assignment_v2`

Each business mutation and its audit evidence commit in one PostgreSQL
transaction. A route reports success only after the function returns durable
record identifiers. A missing database, failed RPC, invalid response, or
Preview mutation gate returns an explicit error; there is no mock success.

Clearing a spam flag is also atomic. The patch function restores the most
recent valid pre-spam status from immutable `audit_logs` evidence. Only legacy
spam rows without usable history fall back to `new`.

## Security properties

- Route payloads use strict Zod schemas, bounded strings, UUID checks, and
  allowlisted status, type, grade, priority, and timestamp values.
- Every activated route independently requires the existing server-side
  `ADMIN_SECRET` header contract; the secret is never accepted in a URL.
- Neon list/detail reads use parameterized SQL; sort expressions are selected
  from a static allowlist.
- SQL patching uses fixed columns and rejects unknown JSON keys.
- Functions use `SECURITY INVOKER`, pin `search_path`, revoke `PUBLIC`, and
  revoke browser roles when those roles exist.
- Internal note text is stored in the protected message record, while the
  immutable audit row stores only message ID and content length.
- Preview mutation remains fail-closed unless endpoint identity is exact and
  both Preview write gates are explicitly enabled.
- Public responses and logs contain no database URL, provider secret, or
  private BCC value.

## Controlled Preview acceptance

The only authorized staging target is the Ask Magic Mike Neon Preview branch:

- project: `bitter-star-20214385`
- branch: `br-morning-paper-aun3378r`
- endpoint: `ep-billowing-paper-au4tdhz8`

The Production endpoint is distinct:
`ep-proud-bonus-autwv60g`. The migration and synthetic mutation proof must run
against Preview first, with email and SMS disabled. The enhanced QA runner
requires returned message/task IDs and then reads the lead back through the
authenticated detail route to prove those exact rows exist.

Every synthetic record must use `is_test=true` and
`INTERNAL QA — DO NOT CONTACT`. Cleanup must target only the documented QA
fingerprints and must be followed by restoring both Preview mutation gates to
disabled.

## Production hold

This candidate does not authorize a Production migration, merge, deployment,
environment change, WordPress edit, or outbound message. Those remain behind
the exact cumulative Production gate and its rollback procedure.

## Rollback

Application rollback is an exact redeploy of parent
`e30b91fb102a478438df0cda9ca5d0e67bf287ad`; this removes the five root-router
wrappers and restores the prior adapters. The migration adds functions only
and does not alter table shape. On the isolated Preview branch, its functions
can be removed in reverse dependency order after application rollback:

```sql
DROP FUNCTION IF EXISTS public.mutate_admin_assignment_v2(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
);
DROP FUNCTION IF EXISTS public.create_admin_lead_task_v1(
  UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ
);
DROP FUNCTION IF EXISTS public.add_admin_lead_note_v1(
  UUID, TEXT, UUID, TEXT, TIMESTAMPTZ
);
DROP FUNCTION IF EXISTS public.patch_admin_lead_v1(
  UUID, JSONB, TEXT, TIMESTAMPTZ
);
```

Immutable audit evidence is retained. Never weaken audit protections as part
of rollback.
