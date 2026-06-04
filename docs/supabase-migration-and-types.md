# Supabase migration + type regen runbook

This is the operator runbook for applying `00012_canonical_platform.sql`
and refreshing `src/types/database.types.ts` so the new-table queries
stop relying on temporary `any` casts.

## When to run this

After any migration in `supabase/migrations/*.sql` that adds, removes, or
renames a column, table, view, or function — every production deploy that
ships schema changes.

## Migrations that need to be applied

| Migration | Purpose |
| --- | --- |
| `00001..00011` | Foundation (sessions/leads/scoring/routing/properties/agents/CRM sync/audit/contacts/source attribution/messages/consents/compliance flags). Already in production. |
| `00012_canonical_platform.sql` | Extends `leads` with `lead_type` + normalized fields + spam columns. Adds `tasks`, `listings`, `listing_photos`, `listing_private_fields`, `flex_imports`, `listing_matches`, `notifications`, `marketing_templates`, `generated_assets`, `sms_templates`, `email_templates`, `message_deliveries`, `integration_accounts`, `webhook_events`, `saved_views`, `campaigns`, `campaign_events`. **Not yet applied to production.** |

## Apply migration

Use the Supabase CLI against the linked project:

```bash
supabase db push
```

Or apply directly to a known database URL:

```bash
psql "$DATABASE_URL" -f supabase/migrations/00012_canonical_platform.sql
```

00012 is idempotent — `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE …
ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc. — so
re-running is safe.

## Regenerate the TypeScript types

```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

After this command:

1. `src/types/database.types.ts` is updated.
2. Lint + typecheck should still pass.
3. The `// eslint-disable-next-line @typescript-eslint/no-explicit-any` +
   `as any` casts can be removed from the files listed below. **Do
   them one at a time**, run `./node_modules/.bin/tsc --noEmit` between
   each, and pin the new typed query shape.

## Files currently relying on temporary `any` casts

These all carry a comment like
`// The tables added by migration 00012 aren't yet in the generated DB types`:

- `src/lib/engines/lead-capture-supabase-repo.ts`
- `src/lib/engines/sla-sweep.ts`
- `src/lib/admin/dashboard-metrics.ts`
- `src/lib/admin/lead-list.ts`
- `src/lib/admin/lead-detail.ts`
- `src/app/api/listings/search/route.ts`
- `src/app/api/listings/[id]/route.ts`
- `src/app/api/admin/listings/import/route.ts`
- `src/app/api/admin/leads/route.ts`
- `src/app/api/admin/leads/[id]/route.ts`
- `src/app/api/admin/leads/[id]/assign/route.ts`
- `src/app/api/admin/leads/[id]/notes/route.ts`
- `src/app/api/admin/leads/[id]/tasks/route.ts`
- `src/app/api/admin/leads/[id]/messages/route.ts`
- `src/app/api/admin/leads/[id]/match-listings/route.ts`
- `src/app/api/admin/leads/[id]/seller-offer-review/route.ts`
- `src/app/api/webhooks/sms/inbound/route.ts`
- `src/app/api/webhooks/email/events/route.ts`

Search the repo for the comment string `migration 00012` to find them
without grepping for `any` (which has other hits).

## Smoke test queries after regen

```bash
# 1) Lead row carries the new columns.
psql "$DATABASE_URL" -c "SELECT id, lead_type, lead_grade, spam_score FROM leads LIMIT 1;"

# 2) Listings split is in place.
psql "$DATABASE_URL" -c "SELECT id, mls_number, status FROM listings LIMIT 1;"
psql "$DATABASE_URL" -c "SELECT listing_id, agent_remarks FROM listing_private_fields LIMIT 1;"

# 3) Audit logs are append-only (UPDATE should be blocked).
psql "$DATABASE_URL" -c "UPDATE audit_logs SET actor='hacker' WHERE true; SELECT count(*) FROM audit_logs WHERE actor='hacker';"
# Expect: 0
```

## What NOT to do

- Don't `DROP` migration files. They're append-only history.
- Don't generate types against a different schema; always `--linked`.
- Don't run migrations against production without first running them
  against a preview branch / shadow database.
- Don't manually edit `src/types/database.types.ts` — it's regenerated.
