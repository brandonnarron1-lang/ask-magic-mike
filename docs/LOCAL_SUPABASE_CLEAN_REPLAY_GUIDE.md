# Local Supabase Clean Replay Guide

This guide verifies that the repository can initialize a brand-new local
Supabase database on the current Postgres 17 runtime.

## Scope

Local only:

- Do not run `supabase link`.
- Do not run remote SQL.
- Do not run a linked migration workflow.
- Do not deploy production.
- Do not enable notification delivery beyond local console mode.

## Clean Replay Procedure

1. Confirm no remote project link exists:

   ```bash
   test ! -f supabase/.temp/project-ref
   ```

2. Stop the local stack without preserving failed state:

   ```bash
   supabase stop --no-backup
   ```

3. Start Supabase from repository migrations:

   ```bash
   supabase start --debug
   ```

4. Verify migration history locally with `psql` or Studio. The final migration
   should be:

   ```text
   20260710221617_lead_notifications_outbox
   ```

5. Run the routing SLA SQL verification against the local database:

   ```bash
   psql -f supabase/tests/routing_sla_deadlines_pg17.sql
   ```

   The expected final line is:

   ```text
   routing_sla_deadlines_pg17: ok
   ```

## What This Proves

- `00005_routing.sql` replays on Postgres 17.
- `lead_routing.accept_deadline` remains `assigned_at + 2 minutes`.
- `lead_routing.contact_deadline` remains `assigned_at + 5 minutes`.
- Deadline storage remains absolute `TIMESTAMPTZ`.
- Timezone and daylight-saving boundaries preserve exact elapsed duration.
- The notification outbox migration is reached and applied.

## Notification Schema Verification

After clean replay, verify `lead_notifications` locally:

- table exists
- RLS is enabled
- unique idempotency index exists
- retry/status indexes exist
- valid statuses insert
- invalid statuses fail
- duplicate idempotency keys fail
- anonymous role cannot see notification rows under the deny policy

Notification delivery must remain disabled by default. Local smoke tests may use:

```bash
LEAD_NOTIFICATION_MODE=console
AGENT_NOTIFICATIONS_ENABLED=true
AGENT_SMS_NOTIFICATIONS_ENABLED=false
CUSTOMER_EMAIL_ENABLED=false
CUSTOMER_SMS_ENABLED=false
```

Console mode is local/sandbox only and must not print recipient values.

## Rollback

For a disposable local database, stop the local stack with `supabase stop
--no-backup` and replay from the desired repository state. For source rollback,
revert the commit that changes `00005_routing.sql`, tests, and documentation.

This guide does not describe a production rollback because this compatibility
repair does not run against production.
