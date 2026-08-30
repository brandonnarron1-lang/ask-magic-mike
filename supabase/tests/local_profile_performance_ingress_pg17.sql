\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.local_profile_contract_row(
  p_metric text,
  p_value bigint,
  p_end_days_ago integer
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date text := to_char(current_date - 20, 'YYYY-MM-DD');
  v_end_date text := to_char(current_date - p_end_days_ago, 'YYYY-MM-DD');
  v_profile_key text := 'ourtown_properties_primary';
  v_geography text := 'Wilson, NC';
  v_data_state text := 'final';
  v_source_system text := 'google_business_profile_report';
  v_signal_type text;
  v_scale integer;
  v_external_id text;
  v_signal_score integer;
  v_confidence numeric;
  v_row_fingerprint text;
BEGIN
  v_signal_type := CASE WHEN p_metric IN (
    'business_impressions_desktop_search',
    'business_impressions_mobile_search',
    'business_impressions_desktop_maps',
    'business_impressions_mobile_maps'
  ) THEN 'search_demand' ELSE 'engagement' END;
  v_scale := CASE WHEN v_signal_type = 'search_demand' THEN 5 ELSE 3 END;
  v_external_id := 'gbp_performance:' || encode(extensions.digest(concat_ws(
    '|', v_profile_key, v_start_date, v_end_date, p_metric
  ), 'sha256'), 'hex');
  v_signal_score := LEAST(
    100,
    round((log(10, p_value::numeric + 1) / v_scale) * 100)::integer
  );
  v_confidence := round(LEAST(
    0.95,
    0.45 + 0.25 + LEAST(
      0.25,
      (log(10, p_value::numeric + 1) / v_scale) * 0.25
    )
  ), 4);
  v_row_fingerprint := encode(extensions.digest(concat_ws(
    '|',
    'google_business_profile_performance_csv_v1',
    v_start_date, v_end_date, v_profile_key, v_geography,
    v_data_state, p_metric, p_value::text, v_source_system,
    v_signal_type, v_external_id, v_signal_score::text,
    to_char(v_confidence, 'FM0.0000')
  ), 'sha256'), 'hex');

  RETURN jsonb_build_object(
    'start_date', v_start_date,
    'end_date', v_end_date,
    'profile_key', v_profile_key,
    'geography', v_geography,
    'data_state', v_data_state,
    'metric', p_metric,
    'value', p_value,
    'source_system', v_source_system,
    'signal_type', v_signal_type,
    'signal_external_id', v_external_id,
    'signal_score', v_signal_score,
    'confidence', to_char(v_confidence, 'FM0.0000'),
    'row_fingerprint', v_row_fingerprint
  );
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.local_profile_contract_summary(
  p_rows jsonb,
  p_rationale text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_impressions bigint;
  v_interactions bigint;
  v_rate numeric(20,8);
  v_website bigint;
  v_calls bigint;
  v_directions bigint;
  v_conversations bigint;
  v_bookings bigint;
  v_demand_points integer;
  v_gap_points integer;
  v_score integer;
BEGIN
  SELECT
    COALESCE(sum(value) FILTER (WHERE metric LIKE 'business_impressions_%'), 0),
    COALESCE(sum(value) FILTER (WHERE metric IN (
      'website_clicks', 'call_clicks', 'business_direction_requests',
      'business_conversations', 'business_bookings'
    )), 0),
    COALESCE(max(value) FILTER (WHERE metric = 'website_clicks'), 0),
    COALESCE(max(value) FILTER (WHERE metric = 'call_clicks'), 0),
    COALESCE(max(value) FILTER (WHERE metric = 'business_direction_requests'), 0),
    COALESCE(max(value) FILTER (WHERE metric = 'business_conversations'), 0),
    COALESCE(max(value) FILTER (WHERE metric = 'business_bookings'), 0)
  INTO v_impressions, v_interactions, v_website, v_calls, v_directions,
       v_conversations, v_bookings
  FROM jsonb_to_recordset(p_rows) AS row_data(metric text, value bigint);
  v_rate := CASE WHEN v_impressions = 0 THEN 0
    ELSE round(v_interactions::numeric / v_impressions::numeric, 8)
  END;
  v_demand_points := LEAST(
    55,
    round((log(10, v_impressions::numeric + 1) / 5) * 55)::integer
  );
  v_gap_points := GREATEST(
    0,
    LEAST(35, round(35 * (1 - v_rate / 0.01))::integer)
  );
  v_score := LEAST(100, v_demand_points + v_gap_points + 10);

  RETURN jsonb_build_object(
    'impressions_total', v_impressions,
    'interactions_total', v_interactions,
    'interaction_rate', v_rate::text,
    'website_clicks', v_website,
    'call_clicks', v_calls,
    'direction_requests', v_directions,
    'conversations', v_conversations,
    'bookings', v_bookings,
    'opportunity_key', 'local_profile:' || encode(extensions.digest(
      'ourtown_properties_primary', 'sha256'
    ), 'hex'),
    'opportunity_type', 'local_profile_interaction_gap',
    'opportunity_title', 'Improve Google Business Profile handoff',
    'opportunity_rationale', p_rationale,
    'opportunity_score', v_score,
    'policy_interaction_rate_threshold', '0.01000000',
    'demand_points', v_demand_points,
    'interaction_gap_points', v_gap_points,
    'completeness_points', 10
  );
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.local_profile_contract_fingerprint(
  p_rows jsonb,
  p_summary jsonb
)
RETURNS text
LANGUAGE sql
AS $$
  SELECT encode(extensions.digest(concat_ws(
    '|',
    'google_business_profile_performance_csv_v1',
    string_agg(row_fingerprint, '|' ORDER BY metric),
    p_summary->>'impressions_total',
    p_summary->>'interactions_total',
    p_summary->>'interaction_rate',
    p_summary->>'website_clicks',
    p_summary->>'call_clicks',
    p_summary->>'direction_requests',
    p_summary->>'conversations',
    p_summary->>'bookings',
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
  FROM jsonb_to_recordset(p_rows) AS row_data(metric text, row_fingerprint text);
$$;

CREATE TEMP TABLE local_profile_contract_payloads (
  label text PRIMARY KEY,
  rows jsonb NOT NULL,
  summary jsonb NOT NULL,
  fingerprint text NOT NULL
);

WITH report AS (
  SELECT jsonb_build_array(
    pg_temp.local_profile_contract_row('business_impressions_mobile_search', 1200, 1),
    pg_temp.local_profile_contract_row('business_impressions_desktop_search', 300, 1),
    pg_temp.local_profile_contract_row('website_clicks', 3, 1),
    pg_temp.local_profile_contract_row('call_clicks', 2, 1),
    pg_temp.local_profile_contract_row('business_direction_requests', 1, 1)
  ) AS rows
), summarized AS (
  SELECT rows, pg_temp.local_profile_contract_summary(
    rows,
    'Reviewed aggregate Google Business Profile performance evidence shows a bounded interaction gap. Verify profile identity, owned website destination, approved services, and conversion handoff before any edit or publication.'
  ) AS summary
  FROM report
)
INSERT INTO local_profile_contract_payloads(label, rows, summary, fingerprint)
SELECT 'initial', rows, summary,
       pg_temp.local_profile_contract_fingerprint(rows, summary)
FROM summarized;

WITH report AS (
  SELECT jsonb_build_array(
    pg_temp.local_profile_contract_row('business_impressions_mobile_search', 1200, 1),
    pg_temp.local_profile_contract_row('business_impressions_desktop_search', 300, 2),
    pg_temp.local_profile_contract_row('website_clicks', 3, 1),
    pg_temp.local_profile_contract_row('call_clicks', 2, 1),
    pg_temp.local_profile_contract_row('business_direction_requests', 1, 1)
  ) AS rows
)
INSERT INTO local_profile_contract_payloads(label, rows, summary, fingerprint)
SELECT 'mixed_identity', report.rows, initial.summary, repeat('e', 64)
FROM report
CROSS JOIN local_profile_contract_payloads initial
WHERE initial.label = 'initial';

CREATE TEMP TABLE local_profile_contract_results (
  label text PRIMARY KEY,
  result jsonb NOT NULL
);

INSERT INTO local_profile_contract_results(label, result)
SELECT 'initial', public.import_local_profile_performance_batch_v1(
  fingerprint, rows, summary,
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL GBP CONTRACT — NO PRODUCTION DATA',
  'IMPORT REVIEWED LOCAL PROFILE PERFORMANCE'
)
FROM local_profile_contract_payloads WHERE label = 'initial';

INSERT INTO local_profile_contract_results(label, result)
SELECT 'replay', public.import_local_profile_performance_batch_v1(
  fingerprint, rows, summary,
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL GBP CONTRACT — NO PRODUCTION DATA',
  'IMPORT REVIEWED LOCAL PROFILE PERFORMANCE'
)
FROM local_profile_contract_payloads WHERE label = 'initial';

INSERT INTO local_profile_contract_results(label, result)
SELECT 'forged_summary', public.import_local_profile_performance_batch_v1(
  fingerprint,
  rows,
  jsonb_set(summary, '{impressions_total}', '1499'::jsonb),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL GBP FORGED SUMMARY',
  'IMPORT REVIEWED LOCAL PROFILE PERFORMANCE'
)
FROM local_profile_contract_payloads WHERE label = 'initial';

INSERT INTO local_profile_contract_results(label, result)
SELECT 'forged_fingerprint', public.import_local_profile_performance_batch_v1(
  repeat('f', 64), rows, summary,
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL GBP FORGED FINGERPRINT',
  'IMPORT REVIEWED LOCAL PROFILE PERFORMANCE'
)
FROM local_profile_contract_payloads WHERE label = 'initial';

INSERT INTO local_profile_contract_results(label, result)
SELECT 'malformed_summary', public.import_local_profile_performance_batch_v1(
  fingerprint,
  rows,
  jsonb_set(summary, '{interaction_rate}', '"not-a-number"'::jsonb),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL GBP MALFORMED SUMMARY',
  'IMPORT REVIEWED LOCAL PROFILE PERFORMANCE'
)
FROM local_profile_contract_payloads WHERE label = 'initial';

INSERT INTO local_profile_contract_results(label, result)
SELECT 'impossible_date', public.import_local_profile_performance_batch_v1(
  repeat('c', 64),
  jsonb_set(rows, '{0,start_date}', '"2026-99-99"'::jsonb),
  summary,
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL GBP IMPOSSIBLE DATE',
  'IMPORT REVIEWED LOCAL PROFILE PERFORMANCE'
)
FROM local_profile_contract_payloads WHERE label = 'initial';

INSERT INTO local_profile_contract_results(label, result)
SELECT 'mixed_identity', public.import_local_profile_performance_batch_v1(
  fingerprint, rows, summary,
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL GBP MIXED IDENTITY',
  'IMPORT REVIEWED LOCAL PROFILE PERFORMANCE'
)
FROM local_profile_contract_payloads WHERE label = 'mixed_identity';

INSERT INTO local_profile_contract_results(label, result)
SELECT 'synthetic_source_rejected', public.import_local_profile_performance_batch_v1(
  repeat('d', 64),
  jsonb_build_array(jsonb_set(rows->0, '{source_system}', '"synthetic_template"'::jsonb)),
  summary,
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL GBP SYNTHETIC REJECTION',
  'IMPORT REVIEWED LOCAL PROFILE PERFORMANCE'
)
FROM local_profile_contract_payloads WHERE label = 'initial';

DO $assert_local_profile_contract$
DECLARE
  initial_result jsonb;
  replay_result jsonb;
BEGIN
  SELECT result INTO initial_result FROM local_profile_contract_results WHERE label = 'initial';
  SELECT result INTO replay_result FROM local_profile_contract_results WHERE label = 'replay';

  IF initial_result->>'ok' <> 'true' OR
     initial_result->>'idempotent_replay' <> 'false' OR
     initial_result->>'inserted_signals' <> '5' OR
     initial_result->>'inserted_opportunities' <> '1' THEN
    RAISE EXCEPTION 'initial local-profile import failed: %', initial_result;
  END IF;
  IF replay_result->>'ok' <> 'true' OR
     replay_result->>'idempotent_replay' <> 'true' OR
     replay_result->>'batch_id' <> initial_result->>'batch_id' THEN
    RAISE EXCEPTION 'local-profile replay contract failed: %', replay_result;
  END IF;
  IF (SELECT result->>'error' FROM local_profile_contract_results WHERE label = 'forged_summary')
       <> 'invalid_local_profile_performance_summary' THEN
    RAISE EXCEPTION 'forged local-profile summary did not fail closed';
  END IF;
  IF (SELECT result->>'error' FROM local_profile_contract_results WHERE label = 'forged_fingerprint')
       <> 'conflicting_local_profile_performance_fingerprint' THEN
    RAISE EXCEPTION 'forged local-profile fingerprint did not fail closed';
  END IF;
  IF (SELECT result->>'error' FROM local_profile_contract_results WHERE label = 'malformed_summary')
       <> 'invalid_local_profile_performance_summary' THEN
    RAISE EXCEPTION 'malformed local-profile summary did not fail closed';
  END IF;
  IF (SELECT result->>'error' FROM local_profile_contract_results WHERE label = 'impossible_date')
       <> 'invalid_local_profile_performance_row' THEN
    RAISE EXCEPTION 'impossible local-profile date did not fail closed';
  END IF;
  IF (SELECT result->>'error' FROM local_profile_contract_results WHERE label = 'mixed_identity')
       <> 'conflicting_local_profile_performance_identity' THEN
    RAISE EXCEPTION 'mixed local-profile identity did not fail closed';
  END IF;
  IF (SELECT result->>'error' FROM local_profile_contract_results WHERE label = 'synthetic_source_rejected')
       <> 'invalid_local_profile_performance_row' THEN
    RAISE EXCEPTION 'synthetic local-profile source did not fail closed';
  END IF;
  IF (SELECT count(*) FROM public.local_profile_performance_import_batches
       WHERE batch_fingerprint = (
         SELECT fingerprint FROM local_profile_contract_payloads WHERE label = 'initial'
       )) <> 1 THEN
    RAISE EXCEPTION 'unexpected local-profile receipt count';
  END IF;
  IF (SELECT count(*) FROM public.market_signals
       WHERE source_system = 'google_business_profile'
         AND segment = 'business_profile:ourtown_properties_primary') <> 5 THEN
    RAISE EXCEPTION 'local-profile signals were not reconciled';
  END IF;
  IF (SELECT count(*) FROM public.market_opportunities
       WHERE opportunity_type = 'local_profile_interaction_gap'
         AND segment = 'business_profile:ourtown_properties_primary') <> 1 THEN
    RAISE EXCEPTION 'local-profile advisory opportunity was not reconciled';
  END IF;
  IF (SELECT count(*) FROM public.audit_logs
       WHERE actor = 'INTERNAL_QA_LOCAL_ONLY'
         AND action = 'growth.local_profile_performance_batch_imported') <> 1 THEN
    RAISE EXCEPTION 'local-profile batch audit count is incorrect';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.local_profile_performance_import_batches
     WHERE metadata ?| ARRAY['raw_csv', 'raw_payload', 'search_keyword', 'location_id']
  ) THEN
    RAISE EXCEPTION 'raw local-profile material was retained';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.market_signals
     WHERE source_system = 'google_business_profile'
       AND evidence ?| ARRAY['raw_csv', 'raw_payload', 'search_keyword', 'location_id']
  ) THEN
    RAISE EXCEPTION 'search terms or provider identity leaked into local-profile evidence';
  END IF;
END;
$assert_local_profile_contract$;

DO $assert_local_profile_receipt_immutable$
BEGIN
  BEGIN
    UPDATE public.local_profile_performance_import_batches
       SET approval_reference = 'tampered'
     WHERE batch_fingerprint = (
       SELECT fingerprint FROM local_profile_contract_payloads WHERE label = 'initial'
     );
    RAISE EXCEPTION 'local-profile receipt update unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    NULL;
  END;
  BEGIN
    DELETE FROM public.local_profile_performance_import_batches
     WHERE batch_fingerprint = (
       SELECT fingerprint FROM local_profile_contract_payloads WHERE label = 'initial'
     );
    RAISE EXCEPTION 'local-profile receipt delete unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    NULL;
  END;
END;
$assert_local_profile_receipt_immutable$;

DO $assert_local_profile_browser_denied$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) AND
       has_function_privilege(
         role_name,
         'public.import_local_profile_performance_batch_v1(text,jsonb,jsonb,text,text,text)',
         'EXECUTE'
       ) THEN
      RAISE EXCEPTION '% unexpectedly has local-profile import execution', role_name;
    END IF;
  END LOOP;
END;
$assert_local_profile_browser_denied$;

ROLLBACK;
