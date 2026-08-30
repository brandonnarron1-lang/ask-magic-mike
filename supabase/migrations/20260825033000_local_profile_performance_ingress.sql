-- Phase 9 privacy-minimized Google Business Profile performance ingress.
-- Additive, owner-connected, and disabled at the application boundary by default.
-- Raw CSV, search-keyword text, provider location IDs, OAuth material, and
-- provider payloads are never retained. This contract cannot edit or publish a
-- Business Profile and cannot call Google.

CREATE TABLE IF NOT EXISTS public.local_profile_performance_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_fingerprint text NOT NULL UNIQUE CHECK (batch_fingerprint ~ '^[0-9a-f]{64}$'),
  import_version text NOT NULL CHECK (
    import_version = 'google_business_profile_performance_csv_v1'
  ),
  row_count integer NOT NULL CHECK (row_count BETWEEN 1 AND 32),
  inserted_signals integer NOT NULL CHECK (inserted_signals >= 0),
  updated_signals integer NOT NULL CHECK (updated_signals >= 0),
  unchanged_signals integer NOT NULL CHECK (unchanged_signals >= 0),
  inserted_opportunities integer NOT NULL CHECK (inserted_opportunities BETWEEN 0 AND 1),
  updated_opportunities integer NOT NULL CHECK (updated_opportunities BETWEEN 0 AND 1),
  unchanged_opportunities integer NOT NULL CHECK (unchanged_opportunities BETWEEN 0 AND 1),
  impressions_total bigint NOT NULL CHECK (impressions_total >= 0),
  interactions_total bigint NOT NULL CHECK (interactions_total >= 0),
  interaction_rate numeric(20,8) NOT NULL CHECK (interaction_rate >= 0),
  website_clicks bigint NOT NULL CHECK (website_clicks >= 0),
  call_clicks bigint NOT NULL CHECK (call_clicks >= 0),
  direction_requests bigint NOT NULL CHECK (direction_requests >= 0),
  conversations bigint NOT NULL CHECK (conversations >= 0),
  bookings bigint NOT NULL CHECK (bookings >= 0),
  date_start date NOT NULL,
  date_end date NOT NULL CHECK (date_end >= date_start),
  profile_key text NOT NULL CHECK (profile_key = 'ourtown_properties_primary'),
  data_state text NOT NULL CHECK (data_state IN ('final', 'partial')),
  approval_reference text NOT NULL CHECK (length(approval_reference) BETWEEN 4 AND 160),
  imported_by text NOT NULL CHECK (length(imported_by) BETWEEN 1 AND 180),
  audit_id uuid NOT NULL REFERENCES public.audit_logs(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (inserted_signals + updated_signals + unchanged_signals = row_count),
  CHECK (
    inserted_opportunities + updated_opportunities + unchanged_opportunities BETWEEN 0 AND 1
  ),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS local_profile_performance_import_batches_created_idx
  ON public.local_profile_performance_import_batches(created_at DESC);

ALTER TABLE public.local_profile_performance_import_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.local_profile_performance_import_batches FROM PUBLIC;

DROP TRIGGER IF EXISTS local_profile_performance_import_batches_reject_change
  ON public.local_profile_performance_import_batches;
CREATE TRIGGER local_profile_performance_import_batches_reject_change
  BEFORE UPDATE OR DELETE ON public.local_profile_performance_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.amm_reject_immutable_change();

DO $local_profile_performance_table_privileges$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE public.local_profile_performance_import_batches FROM %I',
        role_name
      );
    END IF;
  END LOOP;
END;
$local_profile_performance_table_privileges$;

CREATE OR REPLACE FUNCTION public.import_local_profile_performance_batch_v1(
  p_batch_fingerprint text,
  p_rows jsonb,
  p_summary jsonb,
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
  v_signal_id uuid;
  v_opportunity_id uuid;
  v_existing_batch public.local_profile_performance_import_batches%ROWTYPE;
  v_existing_signal public.market_signals%ROWTYPE;
  v_existing_opportunity public.market_opportunities%ROWTYPE;
  v_inserted_signals integer := 0;
  v_updated_signals integer := 0;
  v_unchanged_signals integer := 0;
  v_inserted_opportunities integer := 0;
  v_updated_opportunities integer := 0;
  v_unchanged_opportunities integer := 0;
  v_row_count integer;
  v_impressions_total bigint;
  v_interactions_total bigint;
  v_interaction_rate numeric(20,8);
  v_website_clicks bigint;
  v_call_clicks bigint;
  v_direction_requests bigint;
  v_conversations bigint;
  v_bookings bigint;
  v_date_start date;
  v_date_end date;
  v_profile_key text;
  v_data_state text;
  v_core_interaction_metrics integer;
  v_opportunity_confidence numeric(5,4);
  v_observed_at timestamptz;
  v_signal_evidence jsonb;
  v_opportunity_evidence jsonb;
  v_before jsonb;
  v_after jsonb;
  v_expected_demand_points integer;
  v_expected_interaction_gap_points integer;
  v_expected_batch_fingerprint text;
BEGIN
  IF p_batch_fingerprint !~ '^[0-9a-f]{64}$' OR
     jsonb_typeof(p_rows) <> 'array' OR
     jsonb_array_length(p_rows) NOT BETWEEN 1 AND 32 OR
     jsonb_typeof(p_summary) <> 'object' OR
     (SELECT count(*) FROM jsonb_object_keys(p_summary)) <> 17 OR
     NOT (p_summary ?& ARRAY[
       'impressions_total', 'interactions_total', 'interaction_rate',
       'website_clicks', 'call_clicks', 'direction_requests',
       'conversations', 'bookings', 'opportunity_key', 'opportunity_type',
       'opportunity_title', 'opportunity_rationale', 'opportunity_score',
       'policy_interaction_rate_threshold', 'demand_points',
       'interaction_gap_points', 'completeness_points'
     ]) OR
     p_actor IS NULL OR length(btrim(p_actor)) NOT BETWEEN 1 AND 180 OR
     p_approval_reference IS NULL OR length(btrim(p_approval_reference)) NOT BETWEEN 4 AND 160 OR
     p_confirmation IS DISTINCT FROM 'IMPORT REVIEWED LOCAL PROFILE PERFORMANCE' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_local_profile_performance_batch');
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    IF jsonb_typeof(v_row) <> 'object' OR
       (SELECT count(*) FROM jsonb_object_keys(v_row)) <> 13 OR
       NOT (v_row ?& ARRAY[
         'start_date', 'end_date', 'profile_key', 'geography', 'data_state',
         'metric', 'value', 'source_system', 'signal_type',
         'signal_external_id', 'signal_score', 'confidence', 'row_fingerprint'
       ]) OR
       v_row->>'start_date' !~ '^\d{4}-\d{2}-\d{2}$' OR
       v_row->>'end_date' !~ '^\d{4}-\d{2}-\d{2}$' OR
       v_row->>'profile_key' IS DISTINCT FROM 'ourtown_properties_primary' OR
       v_row->>'geography' IS DISTINCT FROM 'Wilson, NC' OR
       v_row->>'data_state' NOT IN ('final', 'partial') OR
       v_row->>'metric' NOT IN (
         'business_impressions_desktop_search',
         'business_impressions_mobile_search',
         'business_impressions_desktop_maps',
         'business_impressions_mobile_maps',
         'website_clicks',
         'call_clicks',
         'business_direction_requests',
         'business_conversations',
         'business_bookings'
       ) OR
       v_row->>'value' !~ '^(0|[1-9][0-9]{0,9})$' OR
       v_row->>'source_system' IS DISTINCT FROM 'google_business_profile_report' OR
       v_row->>'signal_type' IS DISTINCT FROM (CASE
         WHEN v_row->>'metric' IN (
           'business_impressions_desktop_search',
           'business_impressions_mobile_search',
           'business_impressions_desktop_maps',
           'business_impressions_mobile_maps'
         ) THEN 'search_demand'
         ELSE 'engagement'
       END) OR
       v_row->>'signal_external_id' !~ '^gbp_performance:[0-9a-f]{64}$' OR
       v_row->>'signal_score' !~ '^(0|[1-9][0-9]?|100)$' OR
       v_row->>'confidence' !~ '^(0(\.[0-9]{1,4})?|1(\.0{1,4})?)$' OR
       v_row->>'row_fingerprint' !~ '^[0-9a-f]{64}$' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_local_profile_performance_row');
    END IF;

    BEGIN
      IF (v_row->>'start_date')::date > (v_row->>'end_date')::date OR
         (v_row->>'end_date')::date > current_date OR
         (v_row->>'start_date')::date < current_date - interval '550 days' OR
         (v_row->>'end_date')::date - (v_row->>'start_date')::date > 550 OR
         (v_row->>'value')::bigint > 2147483647 OR
         (v_row->>'confidence')::numeric <= 0 OR
         v_row->>'signal_external_id' IS DISTINCT FROM (
           'gbp_performance:' || encode(extensions.digest(concat_ws(
             '|', v_row->>'profile_key', v_row->>'start_date',
             v_row->>'end_date', v_row->>'metric'
           ), 'sha256'), 'hex')
         ) OR
         (v_row->>'signal_score')::integer IS DISTINCT FROM LEAST(
           100,
           round(
             (log(10, (v_row->>'value')::numeric + 1) / CASE
               WHEN v_row->>'metric' IN (
                 'business_impressions_desktop_search',
                 'business_impressions_mobile_search',
                 'business_impressions_desktop_maps',
                 'business_impressions_mobile_maps'
               ) THEN 5 ELSE 3
             END) * 100
           )::integer
         ) OR
         (v_row->>'confidence')::numeric IS DISTINCT FROM round(LEAST(
           0.95,
           0.45 + CASE WHEN v_row->>'data_state' = 'final' THEN 0.25 ELSE 0.08 END +
           LEAST(
             0.25,
             (
               log(10, (v_row->>'value')::numeric + 1) / CASE
                 WHEN v_row->>'metric' IN (
                   'business_impressions_desktop_search',
                   'business_impressions_mobile_search',
                   'business_impressions_desktop_maps',
                   'business_impressions_mobile_maps'
                 ) THEN 5 ELSE 3
               END
             ) * 0.25
           )
         ), 4) OR
         v_row->>'row_fingerprint' IS DISTINCT FROM encode(extensions.digest(concat_ws(
           '|',
           'google_business_profile_performance_csv_v1',
           v_row->>'start_date', v_row->>'end_date', v_row->>'profile_key',
           v_row->>'geography', v_row->>'data_state', v_row->>'metric',
           v_row->>'value', v_row->>'source_system', v_row->>'signal_type',
           v_row->>'signal_external_id', v_row->>'signal_score',
           to_char((v_row->>'confidence')::numeric, 'FM0.0000')
         ), 'sha256'), 'hex') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_local_profile_performance_row');
      END IF;
    EXCEPTION
      WHEN invalid_datetime_format OR datetime_field_overflow OR
           invalid_text_representation OR numeric_value_out_of_range THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_local_profile_performance_row');
    END;
  END LOOP;

  IF (
    SELECT count(DISTINCT concat_ws(
      chr(31), start_date, end_date, profile_key, data_state, source_system
    ))
      FROM jsonb_to_recordset(p_rows) AS row_data(
        start_date text,
        end_date text,
        profile_key text,
        data_state text,
        source_system text
      )
  ) <> 1 OR EXISTS (
    SELECT 1
      FROM jsonb_to_recordset(p_rows) AS row_data(metric text)
     GROUP BY metric
    HAVING count(*) > 1
  ) OR NOT EXISTS (
    SELECT 1
      FROM jsonb_to_recordset(p_rows) AS row_data(metric text)
     WHERE metric IN (
       'business_impressions_desktop_search',
       'business_impressions_mobile_search',
       'business_impressions_desktop_maps',
       'business_impressions_mobile_maps'
     )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'conflicting_local_profile_performance_identity');
  END IF;

  SELECT
    count(*)::integer,
    COALESCE(sum(value) FILTER (WHERE metric IN (
      'business_impressions_desktop_search',
      'business_impressions_mobile_search',
      'business_impressions_desktop_maps',
      'business_impressions_mobile_maps'
    )), 0)::bigint,
    COALESCE(sum(value) FILTER (WHERE metric IN (
      'website_clicks', 'call_clicks', 'business_direction_requests',
      'business_conversations', 'business_bookings'
    )), 0)::bigint,
    COALESCE(max(value) FILTER (WHERE metric = 'website_clicks'), 0)::bigint,
    COALESCE(max(value) FILTER (WHERE metric = 'call_clicks'), 0)::bigint,
    COALESCE(max(value) FILTER (WHERE metric = 'business_direction_requests'), 0)::bigint,
    COALESCE(max(value) FILTER (WHERE metric = 'business_conversations'), 0)::bigint,
    COALESCE(max(value) FILTER (WHERE metric = 'business_bookings'), 0)::bigint,
    min(start_date), max(end_date), min(profile_key), min(data_state),
    count(*) FILTER (WHERE metric IN (
      'website_clicks', 'call_clicks', 'business_direction_requests'
    ))::integer,
    round(avg(confidence), 4)
  INTO
    v_row_count, v_impressions_total, v_interactions_total,
    v_website_clicks, v_call_clicks, v_direction_requests,
    v_conversations, v_bookings, v_date_start, v_date_end,
    v_profile_key, v_data_state, v_core_interaction_metrics,
    v_opportunity_confidence
  FROM jsonb_to_recordset(p_rows) AS row_data(
    start_date date,
    end_date date,
    profile_key text,
    data_state text,
    metric text,
    value bigint,
    confidence numeric
  );

  v_interaction_rate := CASE WHEN v_impressions_total = 0 THEN 0
    ELSE round(v_interactions_total::numeric / v_impressions_total::numeric, 8)
  END;

  IF p_summary->>'impressions_total' !~ '^(0|[1-9][0-9]{0,10})$' OR
     p_summary->>'interactions_total' !~ '^(0|[1-9][0-9]{0,10})$' OR
     p_summary->>'interaction_rate' !~ '^(0|[1-9][0-9]{0,10})(\.[0-9]{1,8})?$' OR
     p_summary->>'website_clicks' !~ '^(0|[1-9][0-9]{0,9})$' OR
     p_summary->>'call_clicks' !~ '^(0|[1-9][0-9]{0,9})$' OR
     p_summary->>'direction_requests' !~ '^(0|[1-9][0-9]{0,9})$' OR
     p_summary->>'conversations' !~ '^(0|[1-9][0-9]{0,9})$' OR
     p_summary->>'bookings' !~ '^(0|[1-9][0-9]{0,9})$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_local_profile_performance_summary');
  END IF;

  IF p_summary->>'impressions_total' IS DISTINCT FROM v_impressions_total::text OR
     p_summary->>'interactions_total' IS DISTINCT FROM v_interactions_total::text OR
     (p_summary->>'interaction_rate')::numeric IS DISTINCT FROM v_interaction_rate OR
     p_summary->>'website_clicks' IS DISTINCT FROM v_website_clicks::text OR
     p_summary->>'call_clicks' IS DISTINCT FROM v_call_clicks::text OR
     p_summary->>'direction_requests' IS DISTINCT FROM v_direction_requests::text OR
     p_summary->>'conversations' IS DISTINCT FROM v_conversations::text OR
     p_summary->>'bookings' IS DISTINCT FROM v_bookings::text THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_local_profile_performance_summary');
  END IF;

  IF p_summary->>'opportunity_key' IS NULL THEN
    IF p_summary->>'opportunity_type' IS NOT NULL OR
       p_summary->>'opportunity_title' IS NOT NULL OR
       p_summary->>'opportunity_rationale' IS NOT NULL OR
       p_summary->>'opportunity_score' IS NOT NULL OR
       p_summary->>'policy_interaction_rate_threshold' IS NOT NULL OR
       p_summary->>'demand_points' IS NOT NULL OR
       p_summary->>'interaction_gap_points' IS NOT NULL OR
       p_summary->>'completeness_points' IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_local_profile_performance_opportunity');
    END IF;
  ELSE
    v_expected_demand_points := LEAST(
      55,
      round((log(10, v_impressions_total::numeric + 1) / 5) * 55)::integer
    );
    v_expected_interaction_gap_points := GREATEST(
      0,
      LEAST(35, round(35 * (1 - v_interaction_rate / 0.01))::integer)
    );
    IF p_summary->>'opportunity_type' IS NULL OR
       p_summary->>'opportunity_title' IS NULL OR
       p_summary->>'opportunity_rationale' IS NULL OR
       p_summary->>'opportunity_score' IS NULL OR
       p_summary->>'policy_interaction_rate_threshold' IS NULL OR
       p_summary->>'demand_points' IS NULL OR
       p_summary->>'interaction_gap_points' IS NULL OR
       p_summary->>'completeness_points' IS NULL OR
       p_summary->>'opportunity_key' IS DISTINCT FROM (
         'local_profile:' || encode(extensions.digest(v_profile_key, 'sha256'), 'hex')
       ) OR
       p_summary->>'opportunity_type' IS DISTINCT FROM 'local_profile_interaction_gap' OR
       p_summary->>'opportunity_title' IS DISTINCT FROM 'Improve Google Business Profile handoff' OR
       length(p_summary->>'opportunity_rationale') NOT BETWEEN 80 AND 800 OR
       p_summary->>'opportunity_rationale' ~ '[[:cntrl:]]' OR
       p_summary->>'opportunity_rationale' ~ '^[=+@-]' OR
       p_summary->>'opportunity_rationale' ~* '(@|https?://)' OR
       p_summary->>'opportunity_score' !~ '^(0|[1-9][0-9]?|100)$' OR
       p_summary->>'policy_interaction_rate_threshold' !~ '^0\.01000000$' OR
       p_summary->>'demand_points' !~ '^(0|[1-4]?[0-9]|5[0-5])$' OR
       p_summary->>'interaction_gap_points' !~ '^(0|[1-2]?[0-9]|3[0-5])$' OR
       p_summary->>'completeness_points' !~ '^(0|10)$' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_local_profile_performance_opportunity');
    END IF;

    IF v_data_state <> 'final' OR
       v_core_interaction_metrics <> 3 OR
       v_impressions_total < 250 OR
       v_interaction_rate >= 0.01 OR
       (p_summary->>'policy_interaction_rate_threshold')::numeric IS DISTINCT FROM 0.01 OR
       (p_summary->>'demand_points')::integer IS DISTINCT FROM v_expected_demand_points OR
       (p_summary->>'interaction_gap_points')::integer IS DISTINCT FROM v_expected_interaction_gap_points OR
       (p_summary->>'completeness_points')::integer IS DISTINCT FROM 10 OR
       (p_summary->>'opportunity_score')::integer IS DISTINCT FROM LEAST(
         100, v_expected_demand_points + v_expected_interaction_gap_points + 10
       ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_local_profile_performance_opportunity');
    END IF;
  END IF;

  SELECT encode(extensions.digest(concat_ws(
    '|',
    'google_business_profile_performance_csv_v1',
    string_agg(row_fingerprint, '|' ORDER BY metric),
    v_impressions_total::text,
    v_interactions_total::text,
    v_interaction_rate::text,
    v_website_clicks::text,
    v_call_clicks::text,
    v_direction_requests::text,
    v_conversations::text,
    v_bookings::text,
    COALESCE(p_summary->>'opportunity_key', ''),
    COALESCE(p_summary->>'opportunity_type', ''),
    COALESCE(p_summary->>'opportunity_title', ''),
    COALESCE(p_summary->>'opportunity_rationale', ''),
    COALESCE(p_summary->>'opportunity_score', ''),
    COALESCE(p_summary->>'policy_interaction_rate_threshold', ''),
    COALESCE(p_summary->>'demand_points', ''),
    COALESCE(p_summary->>'interaction_gap_points', ''),
    COALESCE(p_summary->>'completeness_points', '')
  ), 'sha256'), 'hex')
  INTO v_expected_batch_fingerprint
  FROM jsonb_to_recordset(p_rows) AS row_data(metric text, row_fingerprint text);

  IF p_batch_fingerprint IS DISTINCT FROM v_expected_batch_fingerprint THEN
    RETURN jsonb_build_object('ok', false, 'error', 'conflicting_local_profile_performance_fingerprint');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('amm_local_profile_performance_import_v1', 0));

  SELECT * INTO v_existing_batch
    FROM public.local_profile_performance_import_batches
   WHERE batch_fingerprint = p_batch_fingerprint;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'batch_id', v_existing_batch.id,
      'audit_id', v_existing_batch.audit_id,
      'idempotent_replay', true,
      'row_count', v_existing_batch.row_count,
      'inserted_signals', v_existing_batch.inserted_signals,
      'updated_signals', v_existing_batch.updated_signals,
      'unchanged_signals', v_existing_batch.unchanged_signals,
      'inserted_opportunities', v_existing_batch.inserted_opportunities,
      'updated_opportunities', v_existing_batch.updated_opportunities,
      'unchanged_opportunities', v_existing_batch.unchanged_opportunities
    );
  END IF;

  v_observed_at := (v_date_end + interval '1 day' - interval '1 second') AT TIME ZONE 'UTC';

  FOR v_row IN
    SELECT value FROM jsonb_array_elements(p_rows) ORDER BY value->>'metric'
  LOOP
    v_signal_evidence := jsonb_build_object(
      'profile_key', v_row->>'profile_key',
      'metric', v_row->>'metric',
      'value', (v_row->>'value')::bigint,
      'data_state', v_row->>'data_state',
      'date_start', v_row->>'start_date',
      'date_end', v_row->>'end_date',
      'row_fingerprint', v_row->>'row_fingerprint',
      'scoring_version', 'google_business_profile_performance_csv_v1',
      'source_coverage', 'operator_reviewed_aggregate_report',
      'raw_csv_retained', false,
      'raw_search_terms_retained', false,
      'provider_location_id_retained', false,
      'provider_call_performed', false
    );
    v_after := jsonb_build_object(
      'signal_type', v_row->>'signal_type',
      'geography', v_row->>'geography',
      'segment', 'business_profile:' || (v_row->>'profile_key'),
      'score', (v_row->>'signal_score')::numeric,
      'confidence', (v_row->>'confidence')::numeric,
      'observed_at', v_observed_at,
      'source_system', 'google_business_profile',
      'external_id', v_row->>'signal_external_id',
      'evidence', v_signal_evidence,
      'is_test', false
    );

    SELECT * INTO v_existing_signal
      FROM public.market_signals
     WHERE source_system = 'google_business_profile'
       AND external_id = v_row->>'signal_external_id'
     FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO public.market_signals(
        signal_type, geography, segment, score, confidence, observed_at,
        source_system, external_id, evidence, is_test
      ) VALUES (
        v_row->>'signal_type', v_row->>'geography',
        'business_profile:' || (v_row->>'profile_key'),
        (v_row->>'signal_score')::numeric, (v_row->>'confidence')::numeric,
        v_observed_at, 'google_business_profile', v_row->>'signal_external_id',
        v_signal_evidence, false
      ) RETURNING id INTO v_signal_id;
      v_before := NULL;
      v_inserted_signals := v_inserted_signals + 1;
    ELSE
      v_signal_id := v_existing_signal.id;
      v_before := jsonb_build_object(
        'signal_type', v_existing_signal.signal_type,
        'geography', v_existing_signal.geography,
        'segment', v_existing_signal.segment,
        'score', v_existing_signal.score,
        'confidence', v_existing_signal.confidence,
        'observed_at', v_existing_signal.observed_at,
        'source_system', v_existing_signal.source_system,
        'external_id', v_existing_signal.external_id,
        'evidence', v_existing_signal.evidence,
        'is_test', v_existing_signal.is_test
      );
      IF v_before = v_after THEN
        v_unchanged_signals := v_unchanged_signals + 1;
      ELSE
        UPDATE public.market_signals
           SET signal_type = v_row->>'signal_type',
               geography = v_row->>'geography',
               segment = 'business_profile:' || (v_row->>'profile_key'),
               score = (v_row->>'signal_score')::numeric,
               confidence = (v_row->>'confidence')::numeric,
               observed_at = v_observed_at,
               evidence = v_signal_evidence,
               is_test = false
         WHERE id = v_signal_id;
        v_updated_signals := v_updated_signals + 1;
      END IF;
    END IF;

    IF v_before IS NULL OR v_before <> v_after THEN
      INSERT INTO public.audit_logs(
        actor, action, resource_type, resource_id,
        before_state, after_state, metadata
      ) VALUES (
        btrim(p_actor),
        CASE WHEN v_before IS NULL
          THEN 'growth.local_profile_signal_inserted'
          ELSE 'growth.local_profile_signal_revised'
        END,
        'market_signal', v_signal_id, v_before, v_after,
        jsonb_build_object(
          'batch_fingerprint', p_batch_fingerprint,
          'approval_reference', btrim(p_approval_reference),
          'raw_csv_retained', false,
          'raw_search_terms_retained', false,
          'provider_location_id_retained', false,
          'provider_call_performed', false,
          'profile_mutation_performed', false,
          'content_published', false
        )
      );
    END IF;
  END LOOP;

  IF p_summary->>'opportunity_key' IS NOT NULL THEN
    v_opportunity_evidence := jsonb_build_object(
      'profile_key', v_profile_key,
      'date_start', v_date_start,
      'date_end', v_date_end,
      'data_state', v_data_state,
      'impressions_total', v_impressions_total,
      'interactions_total', v_interactions_total,
      'interaction_rate', v_interaction_rate,
      'website_clicks', v_website_clicks,
      'call_clicks', v_call_clicks,
      'direction_requests', v_direction_requests,
      'conversations', v_conversations,
      'bookings', v_bookings,
      'policy_interaction_rate_threshold', 0.01,
      'demand_points', v_expected_demand_points,
      'interaction_gap_points', v_expected_interaction_gap_points,
      'completeness_points', 10,
      'source_coverage', 'operator_reviewed_aggregate_report',
      'raw_csv_retained', false,
      'raw_search_terms_retained', false,
      'provider_location_id_retained', false,
      'provider_call_performed', false
    );

    SELECT * INTO v_existing_opportunity
      FROM public.market_opportunities
     WHERE opportunity_key = p_summary->>'opportunity_key'
     FOR UPDATE;

    IF NOT FOUND THEN
      v_after := jsonb_build_object(
        'opportunity_key', p_summary->>'opportunity_key',
        'opportunity_type', p_summary->>'opportunity_type',
        'geography', 'Wilson, NC',
        'segment', 'business_profile:' || v_profile_key,
        'title', p_summary->>'opportunity_title',
        'rationale', p_summary->>'opportunity_rationale',
        'score', (p_summary->>'opportunity_score')::numeric,
        'confidence', v_opportunity_confidence,
        'action_class', 'recommend',
        'status', 'detected',
        'evidence', v_opportunity_evidence
      );
      INSERT INTO public.market_opportunities(
        opportunity_key, opportunity_type, geography, segment,
        title, rationale, score, confidence, action_class, status,
        evidence, detected_at, metadata
      ) VALUES (
        p_summary->>'opportunity_key', p_summary->>'opportunity_type',
        'Wilson, NC', 'business_profile:' || v_profile_key,
        p_summary->>'opportunity_title', p_summary->>'opportunity_rationale',
        (p_summary->>'opportunity_score')::numeric, v_opportunity_confidence,
        'recommend', 'detected', v_opportunity_evidence, v_observed_at,
        jsonb_build_object(
          'import_version', 'google_business_profile_performance_csv_v1',
          'batch_fingerprint', p_batch_fingerprint,
          'profile_mutation_performed', false,
          'content_published', false
        )
      ) RETURNING id INTO v_opportunity_id;
      v_before := NULL;
      v_inserted_opportunities := 1;
    ELSE
      v_opportunity_id := v_existing_opportunity.id;
      v_before := jsonb_build_object(
        'opportunity_key', v_existing_opportunity.opportunity_key,
        'opportunity_type', v_existing_opportunity.opportunity_type,
        'geography', v_existing_opportunity.geography,
        'segment', v_existing_opportunity.segment,
        'title', v_existing_opportunity.title,
        'rationale', v_existing_opportunity.rationale,
        'score', v_existing_opportunity.score,
        'confidence', v_existing_opportunity.confidence,
        'action_class', v_existing_opportunity.action_class,
        'status', v_existing_opportunity.status,
        'evidence', v_existing_opportunity.evidence
      );
      v_after := jsonb_build_object(
        'opportunity_key', v_existing_opportunity.opportunity_key,
        'opportunity_type', p_summary->>'opportunity_type',
        'geography', 'Wilson, NC',
        'segment', 'business_profile:' || v_profile_key,
        'title', p_summary->>'opportunity_title',
        'rationale', p_summary->>'opportunity_rationale',
        'score', (p_summary->>'opportunity_score')::numeric,
        'confidence', v_opportunity_confidence,
        'action_class', v_existing_opportunity.action_class,
        'status', v_existing_opportunity.status,
        'evidence', v_opportunity_evidence
      );
      IF v_before = v_after THEN
        v_unchanged_opportunities := 1;
      ELSE
        UPDATE public.market_opportunities
           SET opportunity_type = p_summary->>'opportunity_type',
               geography = 'Wilson, NC',
               segment = 'business_profile:' || v_profile_key,
               title = p_summary->>'opportunity_title',
               rationale = p_summary->>'opportunity_rationale',
               score = (p_summary->>'opportunity_score')::numeric,
               confidence = v_opportunity_confidence,
               evidence = v_opportunity_evidence,
               metadata = v_existing_opportunity.metadata || jsonb_build_object(
                 'last_import_version', 'google_business_profile_performance_csv_v1',
                 'last_batch_fingerprint', p_batch_fingerprint,
                 'profile_mutation_performed', false,
                 'content_published', false
               ),
               updated_at = now()
         WHERE id = v_opportunity_id;
        v_updated_opportunities := 1;
      END IF;
    END IF;

    IF v_before IS NULL OR v_before <> v_after THEN
      INSERT INTO public.audit_logs(
        actor, action, resource_type, resource_id,
        before_state, after_state, metadata
      ) VALUES (
        btrim(p_actor),
        CASE WHEN v_before IS NULL
          THEN 'growth.local_profile_opportunity_inserted'
          ELSE 'growth.local_profile_opportunity_revised'
        END,
        'market_opportunity', v_opportunity_id, v_before, v_after,
        jsonb_build_object(
          'batch_fingerprint', p_batch_fingerprint,
          'approval_reference', btrim(p_approval_reference),
          'raw_csv_retained', false,
          'raw_search_terms_retained', false,
          'provider_location_id_retained', false,
          'provider_call_performed', false,
          'profile_mutation_performed', false,
          'content_published', false,
          'operator_status_preserved', v_before IS NOT NULL
        )
      );
    END IF;
  END IF;

  INSERT INTO public.audit_logs(
    actor, action, resource_type, resource_id,
    before_state, after_state, metadata
  ) VALUES (
    btrim(p_actor),
    'growth.local_profile_performance_batch_imported',
    'local_profile_performance_import_batch',
    v_batch_id,
    NULL,
    jsonb_build_object(
      'batch_fingerprint', p_batch_fingerprint,
      'row_count', v_row_count,
      'inserted_signals', v_inserted_signals,
      'updated_signals', v_updated_signals,
      'unchanged_signals', v_unchanged_signals,
      'inserted_opportunities', v_inserted_opportunities,
      'updated_opportunities', v_updated_opportunities,
      'unchanged_opportunities', v_unchanged_opportunities,
      'impressions_total', v_impressions_total,
      'interactions_total', v_interactions_total,
      'interaction_rate', v_interaction_rate,
      'date_start', v_date_start,
      'date_end', v_date_end,
      'profile_key', v_profile_key,
      'data_state', v_data_state
    ),
    jsonb_build_object(
      'import_version', 'google_business_profile_performance_csv_v1',
      'approval_reference', btrim(p_approval_reference),
      'source_coverage', 'operator_reviewed_aggregate_report',
      'raw_csv_retained', false,
      'raw_search_terms_retained', false,
      'provider_location_id_retained', false,
      'provider_call_performed', false,
      'profile_mutation_performed', false,
      'content_published', false,
      'consumer_action_performed', false
    )
  ) RETURNING id INTO v_audit_id;

  INSERT INTO public.local_profile_performance_import_batches(
    id, batch_fingerprint, import_version, row_count,
    inserted_signals, updated_signals, unchanged_signals,
    inserted_opportunities, updated_opportunities, unchanged_opportunities,
    impressions_total, interactions_total, interaction_rate,
    website_clicks, call_clicks, direction_requests, conversations, bookings,
    date_start, date_end, profile_key, data_state,
    approval_reference, imported_by, audit_id, metadata
  ) VALUES (
    v_batch_id, p_batch_fingerprint, 'google_business_profile_performance_csv_v1',
    v_row_count, v_inserted_signals, v_updated_signals, v_unchanged_signals,
    v_inserted_opportunities, v_updated_opportunities, v_unchanged_opportunities,
    v_impressions_total, v_interactions_total, v_interaction_rate,
    v_website_clicks, v_call_clicks, v_direction_requests, v_conversations, v_bookings,
    v_date_start, v_date_end, v_profile_key, v_data_state,
    btrim(p_approval_reference), btrim(p_actor), v_audit_id,
    jsonb_build_object(
      'source_system', 'google_business_profile_report',
      'raw_csv_retained', false,
      'raw_search_terms_retained', false,
      'provider_location_id_retained', false,
      'provider_call_performed', false,
      'profile_mutation_performed', false,
      'content_published', false
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'batch_id', v_batch_id,
    'audit_id', v_audit_id,
    'idempotent_replay', false,
    'row_count', v_row_count,
    'inserted_signals', v_inserted_signals,
    'updated_signals', v_updated_signals,
    'unchanged_signals', v_unchanged_signals,
    'inserted_opportunities', v_inserted_opportunities,
    'updated_opportunities', v_updated_opportunities,
    'unchanged_opportunities', v_unchanged_opportunities
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_local_profile_performance_batch_v1(
  text, jsonb, jsonb, text, text, text
) FROM PUBLIC;

DO $local_profile_performance_function_privileges$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.import_local_profile_performance_batch_v1(text,jsonb,jsonb,text,text,text) FROM %I',
        role_name
      );
    END IF;
  END LOOP;
END;
$local_profile_performance_function_privileges$;

COMMENT ON TABLE public.local_profile_performance_import_batches IS
  'Immutable receipts for operator-reviewed aggregate Google Business Profile performance imports; no raw CSV, search terms, provider location IDs, credentials, or provider payloads.';

COMMENT ON FUNCTION public.import_local_profile_performance_batch_v1(
  text, jsonb, jsonb, text, text, text
) IS
  'Owner-connected transactional local-profile performance reconciliation with strict aggregate validation, idempotency, immutable audit evidence, and no provider/profile/publication side effect.';
