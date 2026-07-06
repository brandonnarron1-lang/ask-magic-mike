# Supabase Lead Capture Remediation

## Confirmed production symptom

Post-hotfix QA on OurTownProperties.com confirmed that the public widget is interactive and no longer leaks raw Supabase/PostgREST errors, but lead capture still failed:

- `POST /api/leads` returned `500`.
- Supabase showed no new `sessions` or `leads` rows during the test window.
- The production `leads` table has no `address` column.
- `leads.session_id` is required and references `sessions.id`.
- One public submission caused a rapid series of failed PostgREST `400` lead inserts.

## Root cause

The active root `/api/leads` route was inserting a canonical LeadOps payload directly into `public.leads`. That payload included unsupported top-level fields such as `address`, `funnel_type`, `lead_source_surface`, and `attribution`, and it did not create the required `sessions` row first.

The production schema contract, as reflected in existing migrations and repository helpers, is:

1. Create or reuse a `sessions.id`.
2. Insert or upsert `leads.session_id`.
3. Store address in `leads.address_raw`.
4. Store timing in `leads.timeline_months`.
5. Use `leads.primary_intent` for the legacy intent enum.
6. Use additive canonical columns such as `lead_type`, `source`, `source_detail`, `page_url`, and `widget_session_id` where available.

## Implemented write mapping

The active `/api/leads` route now performs a production-shaped write:

### sessions

`sessions` is upserted first using:

- `id`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `referrer_url`
- `referrer_type`
- `landing_page`
- `user_agent`
- `device_type`
- `initial_question`
- `initial_address`
- `status = completed`
- `step_reached = 5`

### leads

`leads` is then upserted using:

- `session_id`
- `first_name`
- `last_name`
- `email`
- `phone`
- `phone_normalized`
- `state = NC`
- `address_raw`
- `primary_intent`
- `question_raw`
- `timeline_months`
- `consent_sms`
- `consent_call`
- `consent_email`
- `consent_timestamp`
- `consent_language_version`
- `status`
- `lead_type`
- `source`
- `source_detail`
- `page_url`
- `widget_session_id`

The route no longer sends unsupported canonical-only columns directly to `leads`, including `address`, `funnel_type`, `lead_source_surface`, or top-level `attribution`.

## Timeline mapping

- `ASAP`, `Immediately`, `0-30 days`, `This month` -> `0`
- `30-60 days`, `60-90 days`, `31-90 days` -> `3`
- `3-6 months` -> `6`
- `6-12 months` -> `12`
- `12+ months`, `Just curious`, `Just planning`, `Not sure`, `Unknown` -> `24`

## Retry storm fix

The prior missing-column compatibility loop has been removed from `/api/leads`.

A configured production submission now performs:

1. One `sessions` upsert.
2. One `leads` upsert.

No repeated missing-column retries are attempted. If persistence fails, the API returns a failure and does not claim the lead was saved.

## Public error hygiene

Public clients still receive only:

```text
We couldn't save that just yet. Please call Our Town Properties at 252-243-7700, or try again in a moment.
```

The public response must not expose Supabase errors, PostgREST codes, schema-cache text, table names, column names, stack traces, or raw JSON database errors.

## Schema migration status

No production Supabase schema migration was applied by this remediation.

If the team later wants canonical columns such as `funnel_type`, `lead_source_surface`, or JSON `attribution`, add them through a reviewed, non-destructive migration only after comparing the live production schema against the committed migrations.

## Next QA pass

Use one new opted-in QA lead through the live OurTownProperties.com widget after deployment.

Verify:

- One session row is created.
- One lead row is created.
- `leads.session_id` references the new `sessions.id`.
- `leads.address_raw` contains the submitted property address.
- `leads.timeline_months` is one of `0, 3, 6, 12, 24`.
- `leads.lead_type`, `primary_intent`, `source`, `source_detail`, `page_url`, and `widget_session_id` are populated as expected.
- The public widget does not show raw Supabase/PostgREST text if a failure occurs.

Do not use real customer information for QA.
