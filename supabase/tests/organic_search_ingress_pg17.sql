\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE organic_search_contract_results (
  label text PRIMARY KEY,
  result jsonb NOT NULL
);

INSERT INTO organic_search_contract_results(label, result)
SELECT 'initial', public.import_organic_search_batch_v1(
  repeat('a', 64),
  jsonb_build_array(jsonb_build_object(
    'start_date', to_char(current_date - 20, 'YYYY-MM-DD'),
    'end_date', to_char(current_date - 1, 'YYYY-MM-DD'),
    'site_property', 'sc-domain:askmagicmike.com',
    'search_type', 'web',
    'data_state', 'final',
    'country', 'ALL',
    'device', 'all',
    'page_url', 'https://www.askmagicmike.com/internal-local-organic-search-contract',
    'page_host', 'www.askmagicmike.com',
    'page_path', '/internal-local-organic-search-contract',
    'clicks', 12,
    'impressions', 1200,
    'ctr', '0.01000000',
    'position', '7.2000',
    'source_system', 'google_search_console_csv',
    'signal_external_id', 'gsc_page:' || repeat('1', 64),
    'signal_score', 62,
    'confidence', '0.8150',
    'opportunity_key', 'organic_search:' || encode(extensions.digest(
      'https://www.askmagicmike.com/internal-local-organic-search-contract', 'sha256'
    ), 'hex'),
    'opportunity_type', 'organic_click_capture_gap',
    'opportunity_title', 'Improve organic capture for local contract page',
    'opportunity_rationale', 'Google Search Console page evidence shows an explainable click-capture gap. Review title, description, answer alignment, and internal links before any publication.',
    'opportunity_score', 78,
    'policy_ctr_threshold', '0.02000000',
    'demand_points', 35,
    'accessibility_points', 30,
    'click_gap_points', 13,
    'row_fingerprint', repeat('2', 64)
  )),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL GSC CONTRACT — NO PRODUCTION DATA',
  'IMPORT REVIEWED ORGANIC SEARCH'
);

INSERT INTO organic_search_contract_results(label, result)
SELECT 'replay', public.import_organic_search_batch_v1(
  repeat('a', 64),
  jsonb_build_array(jsonb_build_object(
    'start_date', to_char(current_date - 20, 'YYYY-MM-DD'),
    'end_date', to_char(current_date - 1, 'YYYY-MM-DD'),
    'site_property', 'sc-domain:askmagicmike.com',
    'search_type', 'web',
    'data_state', 'final',
    'country', 'ALL',
    'device', 'all',
    'page_url', 'https://www.askmagicmike.com/internal-local-organic-search-contract',
    'page_host', 'www.askmagicmike.com',
    'page_path', '/internal-local-organic-search-contract',
    'clicks', 12,
    'impressions', 1200,
    'ctr', '0.01000000',
    'position', '7.2000',
    'source_system', 'google_search_console_csv',
    'signal_external_id', 'gsc_page:' || repeat('1', 64),
    'signal_score', 62,
    'confidence', '0.8150',
    'opportunity_key', 'organic_search:' || encode(extensions.digest(
      'https://www.askmagicmike.com/internal-local-organic-search-contract', 'sha256'
    ), 'hex'),
    'opportunity_type', 'organic_click_capture_gap',
    'opportunity_title', 'Improve organic capture for local contract page',
    'opportunity_rationale', 'Google Search Console page evidence shows an explainable click-capture gap. Review title, description, answer alignment, and internal links before any publication.',
    'opportunity_score', 78,
    'policy_ctr_threshold', '0.02000000',
    'demand_points', 35,
    'accessibility_points', 30,
    'click_gap_points', 13,
    'row_fingerprint', repeat('2', 64)
  )),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL GSC CONTRACT — NO PRODUCTION DATA',
  'IMPORT REVIEWED ORGANIC SEARCH'
);

INSERT INTO organic_search_contract_results(label, result)
SELECT 'revision', public.import_organic_search_batch_v1(
  repeat('b', 64),
  jsonb_build_array(jsonb_build_object(
    'start_date', to_char(current_date - 20, 'YYYY-MM-DD'),
    'end_date', to_char(current_date - 1, 'YYYY-MM-DD'),
    'site_property', 'sc-domain:askmagicmike.com',
    'search_type', 'web',
    'data_state', 'final',
    'country', 'ALL',
    'device', 'all',
    'page_url', 'https://www.askmagicmike.com/internal-local-organic-search-contract',
    'page_host', 'www.askmagicmike.com',
    'page_path', '/internal-local-organic-search-contract',
    'clicks', 18,
    'impressions', 1200,
    'ctr', '0.01500000',
    'position', '7.0000',
    'source_system', 'google_search_console_csv',
    'signal_external_id', 'gsc_page:' || repeat('1', 64),
    'signal_score', 62,
    'confidence', '0.8150',
    'opportunity_key', 'organic_search:' || encode(extensions.digest(
      'https://www.askmagicmike.com/internal-local-organic-search-contract', 'sha256'
    ), 'hex'),
    'opportunity_type', 'organic_click_capture_gap',
    'opportunity_title', 'Improve organic capture for local contract page',
    'opportunity_rationale', 'Revised Google Search Console page evidence still shows an explainable click-capture gap. Review title, description, answer alignment, and internal links before publication.',
    'opportunity_score', 71,
    'policy_ctr_threshold', '0.02000000',
    'demand_points', 35,
    'accessibility_points', 30,
    'click_gap_points', 6,
    'row_fingerprint', repeat('3', 64)
  )),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL GSC CONTRACT REVISION — NO PRODUCTION DATA',
  'IMPORT REVIEWED ORGANIC SEARCH'
);

INSERT INTO organic_search_contract_results(label, result)
SELECT 'raw_query_url_rejected', public.import_organic_search_batch_v1(
  repeat('c', 64),
  jsonb_build_array(jsonb_build_object(
    'start_date', to_char(current_date - 20, 'YYYY-MM-DD'),
    'end_date', to_char(current_date - 1, 'YYYY-MM-DD'),
    'site_property', 'sc-domain:askmagicmike.com',
    'search_type', 'web',
    'data_state', 'final',
    'country', 'ALL',
    'device', 'all',
    'page_url', 'https://www.askmagicmike.com/home-value?query=sell',
    'page_host', 'www.askmagicmike.com',
    'page_path', '/home-value?query=sell',
    'clicks', 1,
    'impressions', 100,
    'ctr', '0.01000000',
    'position', '7.0000',
    'source_system', 'google_search_console_csv',
    'signal_external_id', 'gsc_page:' || repeat('4', 64),
    'signal_score', 40,
    'confidence', '0.7500',
    'opportunity_key', null,
    'opportunity_type', null,
    'opportunity_title', null,
    'opportunity_rationale', null,
    'opportunity_score', null,
    'policy_ctr_threshold', null,
    'demand_points', null,
    'accessibility_points', null,
    'click_gap_points', null,
    'row_fingerprint', repeat('5', 64)
  )),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL GSC QUERY URL REJECTION',
  'IMPORT REVIEWED ORGANIC SEARCH'
);

INSERT INTO organic_search_contract_results(label, result)
SELECT 'synthetic_source_rejected', public.import_organic_search_batch_v1(
  repeat('d', 64),
  jsonb_build_array(jsonb_build_object(
    'start_date', to_char(current_date - 20, 'YYYY-MM-DD'),
    'end_date', to_char(current_date - 1, 'YYYY-MM-DD'),
    'site_property', 'sc-domain:askmagicmike.com',
    'search_type', 'web',
    'data_state', 'final',
    'country', 'ALL',
    'device', 'all',
    'page_url', 'https://www.askmagicmike.com/internal-qa-organic-search',
    'page_host', 'www.askmagicmike.com',
    'page_path', '/internal-qa-organic-search',
    'clicks', 1,
    'impressions', 100,
    'ctr', '0.01000000',
    'position', '7.0000',
    'source_system', 'synthetic_template',
    'signal_external_id', 'gsc_page:' || repeat('6', 64),
    'signal_score', 40,
    'confidence', '0.7500',
    'opportunity_key', null,
    'opportunity_type', null,
    'opportunity_title', null,
    'opportunity_rationale', null,
    'opportunity_score', null,
    'policy_ctr_threshold', null,
    'demand_points', null,
    'accessibility_points', null,
    'click_gap_points', null,
    'row_fingerprint', repeat('7', 64)
  )),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL SYNTHETIC REJECTION',
  'IMPORT REVIEWED ORGANIC SEARCH'
);

DO $assert_organic_search_contract$
DECLARE
  initial_result jsonb;
  replay_result jsonb;
  revision_result jsonb;
BEGIN
  SELECT result INTO initial_result FROM organic_search_contract_results WHERE label = 'initial';
  SELECT result INTO replay_result FROM organic_search_contract_results WHERE label = 'replay';
  SELECT result INTO revision_result FROM organic_search_contract_results WHERE label = 'revision';

  IF initial_result->>'ok' <> 'true' OR
     initial_result->>'idempotent_replay' <> 'false' OR
     initial_result->>'inserted_signals' <> '1' OR
     initial_result->>'inserted_opportunities' <> '1' THEN
    RAISE EXCEPTION 'initial organic-search import failed: %', initial_result;
  END IF;
  IF replay_result->>'ok' <> 'true' OR
     replay_result->>'idempotent_replay' <> 'true' OR
     replay_result->>'batch_id' <> initial_result->>'batch_id' THEN
    RAISE EXCEPTION 'organic-search replay contract failed: %', replay_result;
  END IF;
  IF revision_result->>'ok' <> 'true' OR
     revision_result->>'updated_signals' <> '1' OR
     revision_result->>'updated_opportunities' <> '1' THEN
    RAISE EXCEPTION 'organic-search revision contract failed: %', revision_result;
  END IF;
  IF (SELECT result->>'error' FROM organic_search_contract_results WHERE label = 'raw_query_url_rejected')
       <> 'invalid_organic_search_row' THEN
    RAISE EXCEPTION 'query-bearing URL did not fail closed';
  END IF;
  IF (SELECT result->>'error' FROM organic_search_contract_results WHERE label = 'synthetic_source_rejected')
       <> 'invalid_organic_search_row' THEN
    RAISE EXCEPTION 'synthetic source did not fail closed';
  END IF;
  IF (SELECT count(*) FROM public.organic_search_import_batches
       WHERE batch_fingerprint IN (repeat('a', 64), repeat('b', 64))) <> 2 THEN
    RAISE EXCEPTION 'unexpected organic-search receipt count';
  END IF;
  IF (SELECT (evidence->>'clicks')::integer FROM public.market_signals
       WHERE source_system = 'google_search_console'
         AND external_id = 'gsc_page:' || repeat('1', 64)) <> 18 THEN
    RAISE EXCEPTION 'revised organic-search signal was not committed';
  END IF;
  IF (SELECT score FROM public.market_opportunities
       WHERE opportunity_key = 'organic_search:' || encode(extensions.digest(
         'https://www.askmagicmike.com/internal-local-organic-search-contract', 'sha256'
       ), 'hex')) <> 71 THEN
    RAISE EXCEPTION 'revised opportunity score was not committed';
  END IF;
  IF (SELECT count(*) FROM public.audit_logs
       WHERE actor = 'INTERNAL_QA_LOCAL_ONLY'
         AND action = 'growth.organic_search_batch_imported') <> 2 THEN
    RAISE EXCEPTION 'organic-search batch audit count is incorrect';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.organic_search_import_batches
     WHERE metadata ? 'raw_csv' OR metadata ? 'raw_payload' OR metadata ? 'query'
  ) THEN
    RAISE EXCEPTION 'raw organic-search material was retained';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.market_signals
     WHERE source_system = 'google_search_console'
       AND (evidence ? 'query' OR evidence ? 'query_text' OR evidence ? 'raw_csv')
  ) THEN
    RAISE EXCEPTION 'query text or raw CSV leaked into signal evidence';
  END IF;
END;
$assert_organic_search_contract$;

DO $assert_organic_search_receipt_immutable$
BEGIN
  BEGIN
    UPDATE public.organic_search_import_batches
       SET approval_reference = 'tampered'
     WHERE batch_fingerprint = repeat('a', 64);
    RAISE EXCEPTION 'organic-search receipt update unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    NULL;
  END;
  BEGIN
    DELETE FROM public.organic_search_import_batches
     WHERE batch_fingerprint = repeat('a', 64);
    RAISE EXCEPTION 'organic-search receipt delete unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    NULL;
  END;
END;
$assert_organic_search_receipt_immutable$;

DO $assert_organic_search_browser_denied$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) AND
       has_function_privilege(
         role_name,
         'public.import_organic_search_batch_v1(text,jsonb,text,text,text)',
         'EXECUTE'
       ) THEN
      RAISE EXCEPTION '% unexpectedly has organic-search import execution', role_name;
    END IF;
  END LOOP;
END;
$assert_organic_search_browser_denied$;

ROLLBACK;
