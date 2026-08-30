-- Phase 9 canonical marketing-spend ingress contract.
-- Additive, server-only, and disabled at the application boundary by default.
-- The contract atomically reconciles explicit channel/campaign identities,
-- daily spend facts, an append-only batch receipt, and immutable audit evidence.
-- It cannot launch a campaign, change a budget, call a provider, create a lead,
-- send a message, or retain the source CSV.

CREATE TABLE IF NOT EXISTS public.marketing_spend_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_fingerprint text NOT NULL UNIQUE CHECK (batch_fingerprint ~ '^[0-9a-f]{64}$'),
  import_version text NOT NULL CHECK (import_version = 'marketing_spend_csv_v1'),
  row_count integer NOT NULL CHECK (row_count BETWEEN 1 AND 250),
  inserted_rows integer NOT NULL CHECK (inserted_rows >= 0),
  updated_rows integer NOT NULL CHECK (updated_rows >= 0),
  unchanged_rows integer NOT NULL CHECK (unchanged_rows >= 0),
  spend_usd_total numeric(14,2) NOT NULL CHECK (spend_usd_total >= 0),
  impressions_total bigint NOT NULL CHECK (impressions_total >= 0),
  clicks_total bigint NOT NULL CHECK (clicks_total >= 0),
  platform_leads_total bigint NOT NULL CHECK (platform_leads_total >= 0),
  booked_appointments_total bigint NOT NULL CHECK (booked_appointments_total >= 0),
  date_start date NOT NULL,
  date_end date NOT NULL CHECK (date_end >= date_start),
  source_systems jsonb NOT NULL,
  approval_reference text NOT NULL CHECK (length(approval_reference) BETWEEN 4 AND 160),
  imported_by text NOT NULL CHECK (length(imported_by) BETWEEN 1 AND 180),
  audit_id uuid NOT NULL REFERENCES public.audit_logs(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (inserted_rows + updated_rows + unchanged_rows = row_count),
  CHECK (jsonb_typeof(source_systems) = 'array'),
  CHECK (jsonb_array_length(source_systems) BETWEEN 1 AND 20),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS marketing_spend_import_batches_created_idx
  ON public.marketing_spend_import_batches(created_at DESC);

ALTER TABLE public.marketing_spend_import_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_spend_import_batches FROM PUBLIC;

DROP TRIGGER IF EXISTS marketing_spend_import_batches_reject_change
  ON public.marketing_spend_import_batches;
CREATE TRIGGER marketing_spend_import_batches_reject_change
  BEFORE UPDATE OR DELETE ON public.marketing_spend_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.amm_reject_immutable_change();

DO $marketing_spend_import_table_privileges$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE public.marketing_spend_import_batches FROM %I',
        role_name
      );
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.marketing_spend_import_batches FROM service_role';
  END IF;
END;
$marketing_spend_import_table_privileges$;

CREATE OR REPLACE FUNCTION public.import_marketing_spend_batch_v1(
  p_batch_fingerprint text,
  p_rows jsonb,
  p_actor text,
  p_approval_reference text,
  p_confirmation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row jsonb;
  v_batch_id uuid := gen_random_uuid();
  v_audit_id uuid;
  v_spend_id uuid;
  v_campaign_id uuid;
  v_existing_batch public.marketing_spend_import_batches%ROWTYPE;
  v_existing_spend public.marketing_spend_daily%ROWTYPE;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_unchanged integer := 0;
  v_row_count integer;
  v_spend_total numeric(14,2);
  v_impressions_total bigint;
  v_clicks_total bigint;
  v_platform_leads_total bigint;
  v_booked_appointments_total bigint;
  v_date_start date;
  v_date_end date;
  v_source_systems jsonb;
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF p_batch_fingerprint !~ '^[0-9a-f]{64}$' OR
     jsonb_typeof(p_rows) <> 'array' OR
     jsonb_array_length(p_rows) NOT BETWEEN 1 AND 250 OR
     p_actor IS NULL OR length(btrim(p_actor)) NOT BETWEEN 1 AND 180 OR
     p_approval_reference IS NULL OR length(btrim(p_approval_reference)) NOT BETWEEN 4 AND 160 OR
     p_confirmation IS DISTINCT FROM 'IMPORT REVIEWED SPEND' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_spend_batch');
  END IF;

  -- Serialize spend imports so two different batches cannot race on the same
  -- channel, campaign, or day while preserving exact replay semantics.
  PERFORM pg_advisory_xact_lock(hashtextextended('amm_marketing_spend_import_v1', 0));

  SELECT * INTO v_existing_batch
    FROM public.marketing_spend_import_batches
   WHERE batch_fingerprint = p_batch_fingerprint;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'batch_id', v_existing_batch.id,
      'audit_id', v_existing_batch.audit_id,
      'idempotent_replay', true,
      'row_count', v_existing_batch.row_count,
      'inserted_rows', v_existing_batch.inserted_rows,
      'updated_rows', v_existing_batch.updated_rows,
      'unchanged_rows', v_existing_batch.unchanged_rows
    );
  END IF;

  -- Validate every normalized row again inside the database. Application
  -- validation is usability; this contract is the trust boundary.
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    IF jsonb_typeof(v_row) <> 'object' OR
       (SELECT count(*) FROM jsonb_object_keys(v_row)) <> 20 OR
       NOT (v_row ?& ARRAY[
         'spend_date', 'channel_key', 'channel_name', 'vendor', 'channel_type',
         'buying_model', 'campaign_key', 'campaign_name', 'campaign_status',
         'external_campaign_id', 'utm_source', 'utm_medium', 'utm_campaign',
         'spend_usd', 'impressions', 'clicks', 'platform_leads',
         'booked_appointments', 'source_system', 'row_fingerprint'
       ]) OR
       v_row->>'spend_date' !~ '^\d{4}-\d{2}-\d{2}$' OR
       (v_row->>'spend_date')::date > current_date OR
       (v_row->>'spend_date')::date < current_date - interval '10 years' OR
       v_row->>'channel_key' !~ '^[a-z0-9][a-z0-9._-]{0,119}$' OR
       length(v_row->>'channel_name') NOT BETWEEN 2 AND 120 OR
       v_row->>'channel_name' ~ '[[:cntrl:]]' OR
       v_row->>'channel_name' ~ '^[=+@-]' OR
       v_row->>'vendor' !~ '^[a-z0-9][a-z0-9._-]{0,119}$' OR
       v_row->>'channel_type' NOT IN (
         'portal', 'search', 'social', 'display', 'referral', 'organic',
         'database', 'event', 'direct_mail', 'partner', 'outbound', 'other'
       ) OR
       v_row->>'buying_model' NOT IN (
         'owned', 'subscription', 'cpl', 'cpc', 'cpm', 'referral_fee',
         'hybrid', 'free'
       ) OR
       v_row->>'campaign_key' !~ '^[a-z0-9][a-z0-9._-]{0,119}$' OR
       length(v_row->>'campaign_name') NOT BETWEEN 2 AND 160 OR
       v_row->>'campaign_name' ~ '[[:cntrl:]]' OR
       v_row->>'campaign_name' ~ '^[=+@-]' OR
       v_row->>'campaign_status' NOT IN ('draft', 'active', 'paused', 'completed', 'archived') OR
       (
         v_row->>'external_campaign_id' IS NOT NULL AND
         v_row->>'external_campaign_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$'
       ) OR
       v_row->>'utm_source' !~ '^[a-z0-9][a-z0-9._-]{0,119}$' OR
       v_row->>'utm_medium' !~ '^[a-z0-9][a-z0-9._-]{0,119}$' OR
       v_row->>'utm_campaign' !~ '^[a-z0-9][a-z0-9._-]{0,119}$' OR
       v_row->>'spend_usd' !~ '^(0|[1-9][0-9]{0,7})(\.[0-9]{1,2})?$' OR
       (v_row->>'spend_usd')::numeric > 99999999.99 OR
       v_row->>'impressions' !~ '^(0|[1-9][0-9]{0,9})$' OR
       (v_row->>'impressions')::bigint > 2147483647 OR
       v_row->>'clicks' !~ '^(0|[1-9][0-9]{0,9})$' OR
       (v_row->>'clicks')::bigint > 2147483647 OR
       v_row->>'platform_leads' !~ '^(0|[1-9][0-9]{0,9})$' OR
       (v_row->>'platform_leads')::bigint > 2147483647 OR
       v_row->>'booked_appointments' !~ '^(0|[1-9][0-9]{0,9})$' OR
       (v_row->>'booked_appointments')::bigint > 2147483647 OR
       v_row->>'source_system' !~ '^[a-z0-9][a-z0-9._-]{0,119}$' OR
       lower(concat_ws(
         chr(31),
         v_row->>'channel_key',
         v_row->>'channel_name',
         v_row->>'vendor',
         v_row->>'campaign_key',
         v_row->>'campaign_name',
         v_row->>'external_campaign_id',
         v_row->>'utm_source',
         v_row->>'utm_medium',
         v_row->>'utm_campaign',
         v_row->>'source_system'
       )) ~ '(^|[^a-z0-9])(qa|test|demo|synthetic)($|[^a-z0-9])' OR
       v_row->>'row_fingerprint' !~ '^[0-9a-f]{64}$' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_spend_row');
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
      FROM jsonb_to_recordset(p_rows) AS row_data(campaign_key text, spend_date date)
     GROUP BY campaign_key, spend_date
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
      FROM jsonb_to_recordset(p_rows) AS row_data(
        channel_key text, channel_name text, vendor text, channel_type text, buying_model text
      )
     GROUP BY channel_key
    HAVING count(DISTINCT concat_ws(chr(31), channel_name, vendor, channel_type, buying_model)) > 1
  ) OR EXISTS (
    SELECT 1
      FROM jsonb_to_recordset(p_rows) AS row_data(
        campaign_key text, channel_key text, campaign_name text,
        campaign_status text, external_campaign_id text,
        utm_source text, utm_medium text, utm_campaign text
      )
     GROUP BY campaign_key
    HAVING count(DISTINCT concat_ws(
      chr(31), channel_key, campaign_name, campaign_status,
      COALESCE(external_campaign_id, ''), utm_source, utm_medium, utm_campaign
    )) > 1
  ) OR EXISTS (
    SELECT 1
      FROM jsonb_to_recordset(p_rows) AS row_data(
        channel_key text, campaign_key text, external_campaign_id text
      )
     WHERE external_campaign_id IS NOT NULL
     GROUP BY channel_key, external_campaign_id
    HAVING count(DISTINCT campaign_key) > 1
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'conflicting_spend_batch_identity');
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_to_recordset(p_rows) AS row_data(
        channel_key text, channel_name text, vendor text, channel_type text, buying_model text
      )
      JOIN public.marketing_channels channel_row USING (channel_key)
     WHERE channel_row.name IS DISTINCT FROM row_data.channel_name
        OR channel_row.vendor IS DISTINCT FROM row_data.vendor
        OR channel_row.channel_type IS DISTINCT FROM row_data.channel_type
        OR channel_row.buying_model IS DISTINCT FROM row_data.buying_model
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'existing_channel_identity_conflict');
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_to_recordset(p_rows) AS row_data(
        campaign_key text, channel_key text, campaign_name text,
        campaign_status text, external_campaign_id text,
        utm_source text, utm_medium text, utm_campaign text
      )
      JOIN public.marketing_campaigns campaign_row USING (campaign_key)
      JOIN public.marketing_channels channel_row ON channel_row.id = campaign_row.channel_id
     WHERE channel_row.channel_key IS DISTINCT FROM row_data.channel_key
        OR campaign_row.name IS DISTINCT FROM row_data.campaign_name
        OR campaign_row.status IS DISTINCT FROM row_data.campaign_status
        OR campaign_row.external_id IS DISTINCT FROM row_data.external_campaign_id
        OR campaign_row.utm_source IS DISTINCT FROM row_data.utm_source
        OR campaign_row.utm_medium IS DISTINCT FROM row_data.utm_medium
        OR campaign_row.utm_campaign IS DISTINCT FROM row_data.utm_campaign
  ) OR EXISTS (
    SELECT 1
      FROM jsonb_to_recordset(p_rows) AS row_data(
        channel_key text, campaign_key text, external_campaign_id text
      )
      JOIN public.marketing_channels channel_row USING (channel_key)
      JOIN public.marketing_campaigns campaign_row
        ON campaign_row.channel_id = channel_row.id
       AND campaign_row.external_id = row_data.external_campaign_id
     WHERE row_data.external_campaign_id IS NOT NULL
       AND campaign_row.campaign_key <> row_data.campaign_key
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'existing_campaign_identity_conflict');
  END IF;

  INSERT INTO public.marketing_channels(
    channel_key, name, vendor, channel_type, buying_model, active, metadata
  )
  SELECT DISTINCT ON (row_data.channel_key)
         row_data.channel_key,
         row_data.channel_name,
         row_data.vendor,
         row_data.channel_type,
         row_data.buying_model,
         true,
         jsonb_build_object(
           'created_by_import_version', 'marketing_spend_csv_v1',
           'created_by_batch_fingerprint', p_batch_fingerprint
         )
    FROM jsonb_to_recordset(p_rows) AS row_data(
      channel_key text, channel_name text, vendor text, channel_type text, buying_model text
    )
   ORDER BY row_data.channel_key
  ON CONFLICT (channel_key) DO NOTHING;

  INSERT INTO public.audit_logs(
    actor, action, resource_type, resource_id,
    before_state, after_state, metadata
  )
  SELECT btrim(p_actor),
         'growth.marketing_channel_created',
         'marketing_channel',
         channel_row.id,
         NULL,
         jsonb_build_object(
           'channel_key', channel_row.channel_key,
           'name', channel_row.name,
           'vendor', channel_row.vendor,
           'channel_type', channel_row.channel_type,
           'buying_model', channel_row.buying_model,
           'active', channel_row.active
         ),
         jsonb_build_object(
           'batch_fingerprint', p_batch_fingerprint,
           'approval_reference', btrim(p_approval_reference),
           'raw_csv_retained', false,
           'provider_call_performed', false,
           'budget_changed', false
         )
    FROM public.marketing_channels channel_row
   WHERE channel_row.metadata->>'created_by_import_version' = 'marketing_spend_csv_v1'
     AND channel_row.metadata->>'created_by_batch_fingerprint' = p_batch_fingerprint;

  INSERT INTO public.marketing_campaigns(
    channel_id, external_id, campaign_key, name, status,
    utm_source, utm_medium, utm_campaign, metadata
  )
  SELECT DISTINCT ON (row_data.campaign_key)
         channel_row.id,
         row_data.external_campaign_id,
         row_data.campaign_key,
         row_data.campaign_name,
         row_data.campaign_status,
         row_data.utm_source,
         row_data.utm_medium,
         row_data.utm_campaign,
         jsonb_build_object(
           'created_by_import_version', 'marketing_spend_csv_v1',
           'created_by_batch_fingerprint', p_batch_fingerprint
         )
    FROM jsonb_to_recordset(p_rows) AS row_data(
      campaign_key text, channel_key text, campaign_name text,
      campaign_status text, external_campaign_id text,
      utm_source text, utm_medium text, utm_campaign text
    )
    JOIN public.marketing_channels channel_row USING (channel_key)
   ORDER BY row_data.campaign_key
  ON CONFLICT (campaign_key) DO NOTHING;

  INSERT INTO public.audit_logs(
    actor, action, resource_type, resource_id,
    before_state, after_state, metadata
  )
  SELECT btrim(p_actor),
         'growth.marketing_campaign_created',
         'marketing_campaign',
         campaign_row.id,
         NULL,
         jsonb_build_object(
           'campaign_key', campaign_row.campaign_key,
           'channel_key', channel_row.channel_key,
           'name', campaign_row.name,
           'status', campaign_row.status,
           'external_id', campaign_row.external_id,
           'utm_source', campaign_row.utm_source,
           'utm_medium', campaign_row.utm_medium,
           'utm_campaign', campaign_row.utm_campaign
         ),
         jsonb_build_object(
           'batch_fingerprint', p_batch_fingerprint,
           'approval_reference', btrim(p_approval_reference),
           'raw_csv_retained', false,
           'provider_call_performed', false,
           'budget_changed', false
         )
    FROM public.marketing_campaigns campaign_row
    JOIN public.marketing_channels channel_row ON channel_row.id = campaign_row.channel_id
   WHERE campaign_row.metadata->>'created_by_import_version' = 'marketing_spend_csv_v1'
     AND campaign_row.metadata->>'created_by_batch_fingerprint' = p_batch_fingerprint;

  FOR v_row IN
    SELECT value
      FROM jsonb_array_elements(p_rows)
     ORDER BY value->>'campaign_key', value->>'spend_date'
  LOOP
    SELECT id INTO v_campaign_id
      FROM public.marketing_campaigns
     WHERE campaign_key = v_row->>'campaign_key';

    SELECT * INTO v_existing_spend
      FROM public.marketing_spend_daily
     WHERE campaign_id = v_campaign_id
       AND spend_date = (v_row->>'spend_date')::date
     FOR UPDATE;

    v_after := jsonb_build_object(
      'campaign_key', v_row->>'campaign_key',
      'spend_date', v_row->>'spend_date',
      'spend_usd', (v_row->>'spend_usd')::numeric,
      'impressions', (v_row->>'impressions')::bigint,
      'clicks', (v_row->>'clicks')::bigint,
      'platform_leads', (v_row->>'platform_leads')::bigint,
      'booked_appointments', (v_row->>'booked_appointments')::bigint,
      'source_system', v_row->>'source_system',
      'row_fingerprint', v_row->>'row_fingerprint'
    );

    IF NOT FOUND THEN
      INSERT INTO public.marketing_spend_daily(
        campaign_id, spend_date, spend_usd, impressions, clicks,
        platform_leads, booked_appointments, source_system,
        source_fingerprint, metadata
      ) VALUES (
        v_campaign_id,
        (v_row->>'spend_date')::date,
        (v_row->>'spend_usd')::numeric,
        (v_row->>'impressions')::bigint,
        (v_row->>'clicks')::bigint,
        (v_row->>'platform_leads')::bigint,
        (v_row->>'booked_appointments')::bigint,
        v_row->>'source_system',
        v_row->>'row_fingerprint',
        jsonb_build_object(
          'import_version', 'marketing_spend_csv_v1',
          'batch_fingerprint', p_batch_fingerprint,
          'raw_csv_retained', false
        )
      ) RETURNING id INTO v_spend_id;
      v_before := NULL;
      v_inserted := v_inserted + 1;
    ELSE
      v_spend_id := v_existing_spend.id;
      v_before := jsonb_build_object(
        'campaign_key', v_row->>'campaign_key',
        'spend_date', v_existing_spend.spend_date,
        'spend_usd', v_existing_spend.spend_usd,
        'impressions', v_existing_spend.impressions,
        'clicks', v_existing_spend.clicks,
        'platform_leads', v_existing_spend.platform_leads,
        'booked_appointments', v_existing_spend.booked_appointments,
        'source_system', v_existing_spend.source_system,
        'row_fingerprint', v_existing_spend.source_fingerprint
      );

      IF v_before = v_after THEN
        v_unchanged := v_unchanged + 1;
        CONTINUE;
      END IF;

      UPDATE public.marketing_spend_daily
         SET spend_usd = (v_row->>'spend_usd')::numeric,
             impressions = (v_row->>'impressions')::bigint,
             clicks = (v_row->>'clicks')::bigint,
             platform_leads = (v_row->>'platform_leads')::bigint,
             booked_appointments = (v_row->>'booked_appointments')::bigint,
             source_system = v_row->>'source_system',
             source_fingerprint = v_row->>'row_fingerprint',
             imported_at = now(),
             updated_at = now(),
             metadata = jsonb_build_object(
               'import_version', 'marketing_spend_csv_v1',
               'batch_fingerprint', p_batch_fingerprint,
               'raw_csv_retained', false
             )
       WHERE id = v_spend_id;
      v_updated := v_updated + 1;
    END IF;

    INSERT INTO public.audit_logs(
      actor, action, resource_type, resource_id,
      before_state, after_state, metadata
    ) VALUES (
      btrim(p_actor),
      CASE WHEN v_before IS NULL
        THEN 'growth.spend_row_inserted'
        ELSE 'growth.spend_row_revised'
      END,
      'marketing_spend_daily',
      v_spend_id,
      v_before,
      v_after,
      jsonb_build_object(
        'batch_fingerprint', p_batch_fingerprint,
        'approval_reference', btrim(p_approval_reference),
        'raw_csv_retained', false,
        'provider_call_performed', false,
        'budget_changed', false
      )
    );
  END LOOP;

  SELECT count(*)::integer,
         COALESCE(sum(spend_usd), 0)::numeric(14,2),
         COALESCE(sum(impressions), 0)::bigint,
         COALESCE(sum(clicks), 0)::bigint,
         COALESCE(sum(platform_leads), 0)::bigint,
         COALESCE(sum(booked_appointments), 0)::bigint,
         min(spend_date),
         max(spend_date),
         jsonb_agg(DISTINCT source_system ORDER BY source_system)
    INTO v_row_count, v_spend_total, v_impressions_total,
         v_clicks_total, v_platform_leads_total, v_booked_appointments_total,
         v_date_start, v_date_end, v_source_systems
    FROM jsonb_to_recordset(p_rows) AS row_data(
      spend_date date,
      spend_usd numeric,
      impressions bigint,
      clicks bigint,
      platform_leads bigint,
      booked_appointments bigint,
      source_system text
    );

  INSERT INTO public.audit_logs(
    actor, action, resource_type, resource_id,
    before_state, after_state, metadata
  ) VALUES (
    btrim(p_actor),
    'growth.spend_batch_imported',
    'marketing_spend_import_batch',
    v_batch_id,
    NULL,
    jsonb_build_object(
      'batch_fingerprint', p_batch_fingerprint,
      'row_count', v_row_count,
      'inserted_rows', v_inserted,
      'updated_rows', v_updated,
      'unchanged_rows', v_unchanged,
      'spend_usd_total', v_spend_total,
      'date_start', v_date_start,
      'date_end', v_date_end,
      'source_systems', v_source_systems
    ),
    jsonb_build_object(
      'import_version', 'marketing_spend_csv_v1',
      'approval_reference', btrim(p_approval_reference),
      'raw_csv_retained', false,
      'provider_call_performed', false,
      'budget_changed', false,
      'consumer_action_performed', false
    )
  ) RETURNING id INTO v_audit_id;

  INSERT INTO public.marketing_spend_import_batches(
    id, batch_fingerprint, import_version, row_count,
    inserted_rows, updated_rows, unchanged_rows,
    spend_usd_total, impressions_total, clicks_total,
    platform_leads_total, booked_appointments_total,
    date_start, date_end, source_systems,
    approval_reference, imported_by, audit_id, metadata
  ) VALUES (
    v_batch_id,
    p_batch_fingerprint,
    'marketing_spend_csv_v1',
    v_row_count,
    v_inserted,
    v_updated,
    v_unchanged,
    v_spend_total,
    v_impressions_total,
    v_clicks_total,
    v_platform_leads_total,
    v_booked_appointments_total,
    v_date_start,
    v_date_end,
    v_source_systems,
    btrim(p_approval_reference),
    btrim(p_actor),
    v_audit_id,
    jsonb_build_object(
      'raw_csv_retained', false,
      'provider_call_performed', false,
      'budget_changed', false
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'batch_id', v_batch_id,
    'audit_id', v_audit_id,
    'idempotent_replay', false,
    'row_count', v_row_count,
    'inserted_rows', v_inserted,
    'updated_rows', v_updated,
    'unchanged_rows', v_unchanged
  );
EXCEPTION
  WHEN check_violation OR invalid_text_representation OR
       numeric_value_out_of_range OR string_data_right_truncation OR
       datetime_field_overflow THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_spend_batch');
  WHEN unique_violation OR foreign_key_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'spend_identity_conflict');
END;
$$;

REVOKE ALL ON FUNCTION public.import_marketing_spend_batch_v1(
  text, jsonb, text, text, text
) FROM PUBLIC;

DO $marketing_spend_import_function_privileges$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.import_marketing_spend_batch_v1(text, jsonb, text, text, text) FROM %I',
        role_name
      );
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.import_marketing_spend_batch_v1(text, jsonb, text, text, text) FROM service_role';
  END IF;
END;
$marketing_spend_import_function_privileges$;

COMMENT ON TABLE public.marketing_spend_import_batches IS
  'Append-only minimized receipts for operator-approved spend imports. Source CSV content is never retained.';
COMMENT ON FUNCTION public.import_marketing_spend_batch_v1(
  text, jsonb, text, text, text
) IS
  'Atomically reconciles explicit marketing identities and daily spend with immutable audit evidence. It cannot call a provider, change a budget, or retain raw CSV.';

-- Functional rollback: disable GROWTH_SPEND_IMPORT_ENABLED and revert the
-- application. Preserve imported spend, receipts, and audit evidence. Removing
-- historical financial or audit rows is destructive and requires a separate
-- retention/recovery decision; it is intentionally not part of this migration.
