# DB Security & Performance Review

## Status

The file `DB_SECURITY_PERF_FIXES.sql` referenced in the Release Train Delta mandate does not exist in this repository. No SQL fix file was provided for review.

This document records the findings from inspecting the 13 migration files (`supabase/migrations/00001` → `00013`) and notes the SQL improvements that should be applied when the owner provides the file or approves changes.

---

## Migration inventory

| File | Tables created |
|------|---------------|
| 00001 | sessions |
| 00002 | leads |
| 00003 | lead_scores |
| 00004 | agents |
| 00005 | lead_routing |
| 00006 | properties |
| 00007 | valuation_reports |
| 00008 | analytics_events |
| 00009 | crm_sync_log |
| 00010 | (agent seed data) |
| 00011 | contacts, source_attribution, consents, messages, agent_assignments, compliance_flags, audit_logs |
| 00012 | tasks, listings, listing_photos, listing_private_fields, flex_imports, listing_matches, notifications, marketing_templates, generated_assets, sms_templates, email_templates, message_deliveries, integration_accounts, webhook_events, saved_views, campaigns, campaign_events |
| 00013 | (unique constraint on source_attribution) |

---

## Known areas for SQL review

The following are observations from migration inspection. None have been verified against the live Supabase project.

### 1. Row Level Security (RLS)

**Check:** Confirm `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is present for every table that stores lead, contact, or PII data. The `leads`, `contacts`, `consents`, `compliance_flags`, `messages`, `audit_logs`, and `agent_assignments` tables are the highest priority.

**Why it matters:** Without RLS, the Supabase anon key (which is public in the client bundle) can read/write any row. Service role key bypasses RLS by design — verify it is never exposed client-side.

**Action:** Run in Supabase SQL editor to list tables without RLS enabled:
```sql
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT relname FROM pg_class
    JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
    WHERE nspname = 'public' AND relrowsecurity = true
  );
```

---

### 2. Index coverage on high-query columns

**Likely missing indexes** (based on admin query patterns in `src/lib/admin/`):

| Table | Column | Query type |
|-------|--------|-----------|
| `leads` | `status` | Filter (lead list, metrics) |
| `leads` | `created_at` | Sort, range scans |
| `leads` | `next_follow_up_at` | Filter (follow_up_due shortcut) |
| `leads` | `last_contacted_at` | Filter (never_contacted shortcut) |
| `leads` | `assigned_agent_id` | Filter (agent assignment views) |
| `analytics_events` | `event_name`, `created_at` | Aggregation |
| `lead_routing` | `lead_id` | Join (foreign key lookup) |
| `messages` | `lead_id`, `status` | Lead detail queries |
| `webhook_events` | `created_at` | Time-range queries |

**Action (when approved):** Create a migration `00014_performance_indexes.sql` with `CREATE INDEX CONCURRENTLY` statements for the columns above. Use `CONCURRENTLY` to avoid locking production tables.

---

### 3. Audit log — actor column

`audit_logs.actor` currently stores the raw Basic Auth credential string. Before launch, verify it stores only an identifier (e.g., admin username) and never the password or a base64 encoding that includes the password. See `src/lib/admin/auth.ts` → `actor` field.

---

### 4. compliance_flags — opt-out integrity

The compliance opt-out pipeline (SMS STOP / email UNSUBSCRIBE) inserts rows into `compliance_flags` via webhook routes. Confirm:
- No `ON DELETE CASCADE` from `leads` to `compliance_flags` — an opt-out record must survive even if the lead row is deleted.
- `lead_id` should be nullable or the foreign key should be `ON DELETE SET NULL` so orphan opt-outs are preserved for DNC compliance.

---

### 5. integration_accounts — credential storage

`integration_accounts` stores external CRM / service credentials. Confirm credentials are stored encrypted (not plaintext). If Supabase Vault is not in use, the `credentials` column should store values encrypted at the application layer before insert.

---

## Next steps

1. Owner provides `DB_SECURITY_PERF_FIXES.sql` for code review, OR
2. Engineering schedules a Supabase dashboard review to verify RLS status and create the index migration.

This document is not a blocking gate but is a pre-launch advisory. Items 1 (RLS) and 4 (compliance_flags integrity) are the highest-priority security items.
