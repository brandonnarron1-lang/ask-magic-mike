# Supabase Lead Schema Remediation

## Observed production failure

The OurTownProperties.com Ask Magic Mike widget could collect home-value or seller details, but saving the lead failed with a public PostgREST error:

```text
PGRST204: Could not find the 'address' column of 'leads' in the schema cache
```

This means the application sent a canonical LeadOps insert row containing `address`, while the live Supabase `leads` table did not expose an `address` column to PostgREST.

## Code compatibility added

The application now keeps the canonical LeadOps payload internally, but performs a schema-compatible insert into Supabase:

- The first insert includes canonical fields and compatible legacy aliases where available.
- If PostgREST returns `PGRST204` for a missing column, the API removes only that unsupported column and retries.
- Retries are capped to avoid loops.
- Dropped columns are logged server-side only.
- Public clients receive a generic save-failure message instead of raw Supabase or schema-cache details.

This preserves lead capture while production schema is reviewed.

## Recommended non-destructive SQL for human review

Do not run this blindly. First compare the live `public.leads` table against existing columns such as `address_raw`, `normalized_property_address`, `lead_type`, `source`, `source_detail`, `source_attribution`, and `metadata`.

```sql
alter table public.leads
  add column if not exists address text,
  add column if not exists property_address text,
  add column if not exists funnel_type text,
  add column if not exists lead_source_surface text,
  add column if not exists timeline text,
  add column if not exists condition text,
  add column if not exists question text,
  add column if not exists notes text,
  add column if not exists status text default 'new',
  add column if not exists assigned_agent_id text,
  add column if not exists attribution jsonb,
  add column if not exists medium text,
  add column if not exists campaign text,
  add column if not exists content text,
  add column if not exists term text,
  add column if not exists referrer text,
  add column if not exists landing_page text,
  add column if not exists initial_path text,
  add column if not exists current_path text,
  add column if not exists parent_url text,
  add column if not exists embed_host text,
  add column if not exists placement text,
  add column if not exists gclid text,
  add column if not exists fbclid text,
  add column if not exists device_category text,
  add column if not exists created_at timestamptz default now();
```

If Supabase continues reporting stale columns after a reviewed migration, reload the PostgREST schema cache from the Supabase dashboard or by issuing the documented schema reload action for the project.

## Operational notes

- No production Supabase schema change was applied by this hotfix.
- No production leads were submitted during verification.
- The compatibility retry is an application safety layer, not a replacement for aligning the database schema with canonical LeadOps fields.
- AdminOps lead review already tolerates legacy address fields such as `address_raw`, `property_address`, and `normalized_property_address`.
