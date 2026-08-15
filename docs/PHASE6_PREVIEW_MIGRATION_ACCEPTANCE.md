# Phase 6 Preview Migration Acceptance

Executed: 2026-08-15 16:53–16:55 EDT

Migration: `supabase/migrations/20260815193000_phase6_ai_messaging.sql`

Status: **PASSED ON ISOLATED NEON PREVIEW; PRODUCTION UNCHANGED**

## Identity proof

Authenticated Neon console evidence established both branch names and IDs in
project `bitter-star-20214385`:

| Environment | Neon branch | Branch ID | Result |
| --- | --- | --- | --- |
| Preview | `preview` | `br-morning-paper-aun3378r` | migration applied and verified |
| Production | `production` | `br-round-base-auh6h2wd` | read-only precheck only; no migration |

The branch IDs, names, breadcrumb hierarchy, and SQL editor URLs were visible at
the same time in the authenticated Neon project. No connection string, role
password, token, or database credential was printed, copied into documentation,
or committed.

## Controlled execution

1. Preview precheck reported `phase6_tables_present=0` of 7.
2. The first transactional run reached privilege hardening and failed because
   canonical Neon does not define Supabase's `anon` role.
3. The transaction remained aborted and was explicitly rolled back; none of its
   DDL was committed.
4. The migration was corrected to revoke `PUBLIC` unconditionally and revoke
   `anon`/`authenticated` only when those roles exist.
5. The corrected migration was rerun inside `BEGIN`/`COMMIT` on Preview.
6. Post-migration acceptance returned:
   - `tables_present=7`;
   - `rls_enabled=7`;
   - `anon_authenticated_grants=0`; and
   - `new_table_rows=0`.
7. A separate read-only Production query returned
   `phase6_tables_present=0` of 7.

## Safety result

- No lead, consent, attribution, notification, assignment, user, or session row
  was inserted, updated, or deleted.
- All seven new Preview tables are empty.
- Production schema and runtime feature gates remain unchanged.
- Consumer automation, carrier SMS, and Mike activation remain disabled.
- The migration is now compatible with both the canonical Neon role model and a
  Supabase-style role model without creating either provider's roles.

## Next gate

Production migration remains a separate, explicit approval gate. Before that
gate, the merged migration commit and Vercel Preview deployment must pass the
normal test, typecheck, lint, build, health, and isolation checks.
