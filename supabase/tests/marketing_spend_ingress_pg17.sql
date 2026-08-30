\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE spend_ingress_contract_results (
  label text PRIMARY KEY,
  result jsonb NOT NULL
);

INSERT INTO spend_ingress_contract_results(label, result)
SELECT 'initial', public.import_marketing_spend_batch_v1(
  repeat('a', 64),
  jsonb_build_array(jsonb_build_object(
    'spend_date', to_char(current_date - 1, 'YYYY-MM-DD'),
    'channel_key', 'local_google_ads',
    'channel_name', 'Local Google Ads',
    'vendor', 'google',
    'channel_type', 'search',
    'buying_model', 'cpc',
    'campaign_key', 'local_wilson_sellers',
    'campaign_name', 'Local Wilson Sellers',
    'campaign_status', 'active',
    'external_campaign_id', 'LOCAL-001',
    'utm_source', 'google',
    'utm_medium', 'cpc',
    'utm_campaign', 'local_wilson_sellers',
    'spend_usd', '125.45',
    'impressions', 2500,
    'clicks', 85,
    'platform_leads', 4,
    'booked_appointments', 1,
    'source_system', 'local_contract',
    'row_fingerprint', repeat('1', 64)
  )),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL CONTRACT — NO PRODUCTION DATA',
  'IMPORT REVIEWED SPEND'
);

INSERT INTO spend_ingress_contract_results(label, result)
SELECT 'replay', public.import_marketing_spend_batch_v1(
  repeat('a', 64),
  jsonb_build_array(jsonb_build_object(
    'spend_date', to_char(current_date - 1, 'YYYY-MM-DD'),
    'channel_key', 'local_google_ads',
    'channel_name', 'Local Google Ads',
    'vendor', 'google',
    'channel_type', 'search',
    'buying_model', 'cpc',
    'campaign_key', 'local_wilson_sellers',
    'campaign_name', 'Local Wilson Sellers',
    'campaign_status', 'active',
    'external_campaign_id', 'LOCAL-001',
    'utm_source', 'google',
    'utm_medium', 'cpc',
    'utm_campaign', 'local_wilson_sellers',
    'spend_usd', '125.45',
    'impressions', 2500,
    'clicks', 85,
    'platform_leads', 4,
    'booked_appointments', 1,
    'source_system', 'local_contract',
    'row_fingerprint', repeat('1', 64)
  )),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL CONTRACT — NO PRODUCTION DATA',
  'IMPORT REVIEWED SPEND'
);

INSERT INTO spend_ingress_contract_results(label, result)
SELECT 'revision', public.import_marketing_spend_batch_v1(
  repeat('b', 64),
  jsonb_build_array(jsonb_build_object(
    'spend_date', to_char(current_date - 1, 'YYYY-MM-DD'),
    'channel_key', 'local_google_ads',
    'channel_name', 'Local Google Ads',
    'vendor', 'google',
    'channel_type', 'search',
    'buying_model', 'cpc',
    'campaign_key', 'local_wilson_sellers',
    'campaign_name', 'Local Wilson Sellers',
    'campaign_status', 'active',
    'external_campaign_id', 'LOCAL-001',
    'utm_source', 'google',
    'utm_medium', 'cpc',
    'utm_campaign', 'local_wilson_sellers',
    'spend_usd', '150.00',
    'impressions', 2750,
    'clicks', 92,
    'platform_leads', 5,
    'booked_appointments', 2,
    'source_system', 'local_contract',
    'row_fingerprint', repeat('2', 64)
  )),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL CONTRACT REVISION — NO PRODUCTION DATA',
  'IMPORT REVIEWED SPEND'
);

INSERT INTO spend_ingress_contract_results(label, result)
SELECT 'identity_conflict', public.import_marketing_spend_batch_v1(
  repeat('c', 64),
  jsonb_build_array(jsonb_build_object(
    'spend_date', to_char(current_date - 2, 'YYYY-MM-DD'),
    'channel_key', 'local_google_ads',
    'channel_name', 'Local Google Ads',
    'vendor', 'google',
    'channel_type', 'search',
    'buying_model', 'cpc',
    'campaign_key', 'local_wilson_sellers',
    'campaign_name', 'Local Wilson Sellers',
    'campaign_status', 'active',
    'external_campaign_id', 'LOCAL-001',
    'utm_source', 'tampered_source',
    'utm_medium', 'cpc',
    'utm_campaign', 'local_wilson_sellers',
    'spend_usd', '10.00',
    'impressions', 10,
    'clicks', 1,
    'platform_leads', 0,
    'booked_appointments', 0,
    'source_system', 'local_contract',
    'row_fingerprint', repeat('3', 64)
  )),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL CONTRACT CONFLICT — NO PRODUCTION DATA',
  'IMPORT REVIEWED SPEND'
);

INSERT INTO spend_ingress_contract_results(label, result)
SELECT 'synthetic_rejected', public.import_marketing_spend_batch_v1(
  repeat('d', 64),
  jsonb_build_array(jsonb_build_object(
    'spend_date', to_char(current_date - 1, 'YYYY-MM-DD'),
    'channel_key', 'local_demo',
    'channel_name', 'Local Demo',
    'vendor', 'sample_vendor',
    'channel_type', 'other',
    'buying_model', 'free',
    'campaign_key', 'local_demo_campaign',
    'campaign_name', 'Local Demo Campaign',
    'campaign_status', 'paused',
    'external_campaign_id', null,
    'utm_source', 'local_demo',
    'utm_medium', 'free',
    'utm_campaign', 'local_demo_campaign',
    'spend_usd', '0.00',
    'impressions', 0,
    'clicks', 0,
    'platform_leads', 0,
    'booked_appointments', 0,
    'source_system', 'internal_qa',
    'row_fingerprint', repeat('4', 64)
  )),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL SYNTHETIC REJECTION',
  'IMPORT REVIEWED SPEND'
);

INSERT INTO spend_ingress_contract_results(label, result)
SELECT 'invalid_calendar_date', public.import_marketing_spend_batch_v1(
  repeat('f', 64),
  jsonb_build_array(jsonb_build_object(
    'spend_date', '2026-02-30',
    'channel_key', 'local_google_ads',
    'channel_name', 'Local Google Ads',
    'vendor', 'google',
    'channel_type', 'search',
    'buying_model', 'cpc',
    'campaign_key', 'local_wilson_sellers',
    'campaign_name', 'Local Wilson Sellers',
    'campaign_status', 'active',
    'external_campaign_id', 'LOCAL-001',
    'utm_source', 'google',
    'utm_medium', 'cpc',
    'utm_campaign', 'local_wilson_sellers',
    'spend_usd', '1.00',
    'impressions', 1,
    'clicks', 1,
    'platform_leads', 0,
    'booked_appointments', 0,
    'source_system', 'local_contract',
    'row_fingerprint', repeat('5', 64)
  )),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL INVALID DATE — NO PRODUCTION DATA',
  'IMPORT REVIEWED SPEND'
);

INSERT INTO spend_ingress_contract_results(label, result)
SELECT 'synthetic_identity_rejected', public.import_marketing_spend_batch_v1(
  repeat('0', 64),
  jsonb_build_array(jsonb_build_object(
    'spend_date', to_char(current_date - 3, 'YYYY-MM-DD'),
    'channel_key', 'local_google_ads',
    'channel_name', 'Local Google Ads',
    'vendor', 'google',
    'channel_type', 'search',
    'buying_model', 'cpc',
    'campaign_key', 'local_test_campaign',
    'campaign_name', 'Local Test Campaign',
    'campaign_status', 'paused',
    'external_campaign_id', 'LOCAL-TEST-001',
    'utm_source', 'google',
    'utm_medium', 'cpc',
    'utm_campaign', 'local_test_campaign',
    'spend_usd', '1.00',
    'impressions', 1,
    'clicks', 1,
    'platform_leads', 0,
    'booked_appointments', 0,
    'source_system', 'local_contract',
    'row_fingerprint', repeat('6', 64)
  )),
  'INTERNAL_QA_LOCAL_ONLY',
  'LOCAL SYNTHETIC IDENTITY REJECTION',
  'IMPORT REVIEWED SPEND'
);

DO $assert_spend_contract$
DECLARE
  initial_result jsonb;
  replay_result jsonb;
  revision_result jsonb;
BEGIN
  SELECT result INTO initial_result FROM spend_ingress_contract_results WHERE label = 'initial';
  SELECT result INTO replay_result FROM spend_ingress_contract_results WHERE label = 'replay';
  SELECT result INTO revision_result FROM spend_ingress_contract_results WHERE label = 'revision';

  IF initial_result->>'ok' <> 'true' OR
     initial_result->>'idempotent_replay' <> 'false' OR
     initial_result->>'inserted_rows' <> '1' THEN
    RAISE EXCEPTION 'initial spend import contract failed: %', initial_result;
  END IF;
  IF replay_result->>'ok' <> 'true' OR
     replay_result->>'idempotent_replay' <> 'true' OR
     replay_result->>'batch_id' <> initial_result->>'batch_id' THEN
    RAISE EXCEPTION 'spend replay contract failed: %', replay_result;
  END IF;
  IF revision_result->>'ok' <> 'true' OR revision_result->>'updated_rows' <> '1' THEN
    RAISE EXCEPTION 'spend revision contract failed: %', revision_result;
  END IF;
  IF (SELECT result->>'error' FROM spend_ingress_contract_results WHERE label = 'identity_conflict')
       <> 'existing_campaign_identity_conflict' THEN
    RAISE EXCEPTION 'campaign identity conflict was not rejected';
  END IF;
  IF (SELECT result->>'error' FROM spend_ingress_contract_results WHERE label = 'synthetic_rejected')
       <> 'invalid_spend_row' THEN
    RAISE EXCEPTION 'synthetic source was not rejected';
  END IF;
  IF (SELECT result->>'error' FROM spend_ingress_contract_results WHERE label = 'invalid_calendar_date')
       <> 'invalid_spend_batch' THEN
    RAISE EXCEPTION 'invalid calendar date did not fail closed';
  END IF;
  IF (SELECT result->>'error' FROM spend_ingress_contract_results WHERE label = 'synthetic_identity_rejected')
       <> 'invalid_spend_row' THEN
    RAISE EXCEPTION 'synthetic campaign identity was not rejected';
  END IF;
  IF (SELECT count(*) FROM public.marketing_spend_import_batches
       WHERE batch_fingerprint IN (repeat('a', 64), repeat('b', 64))) <> 2 THEN
    RAISE EXCEPTION 'unexpected durable spend batch count';
  END IF;
  IF (SELECT spend_usd FROM public.marketing_spend_daily spend
       JOIN public.marketing_campaigns campaign ON campaign.id = spend.campaign_id
       WHERE campaign.campaign_key = 'local_wilson_sellers') <> 150.00 THEN
    RAISE EXCEPTION 'revised spend value was not committed';
  END IF;
  IF (SELECT count(*) FROM public.audit_logs
       WHERE actor = 'INTERNAL_QA_LOCAL_ONLY'
         AND action = 'growth.spend_batch_imported') <> 2 THEN
    RAISE EXCEPTION 'batch audit count is incorrect';
  END IF;
  IF (SELECT count(*) FROM public.audit_logs
       WHERE actor = 'INTERNAL_QA_LOCAL_ONLY'
         AND action = 'growth.marketing_channel_created') <> 1 THEN
    RAISE EXCEPTION 'new channel creation audit is missing or duplicated';
  END IF;
  IF (SELECT count(*) FROM public.audit_logs
       WHERE actor = 'INTERNAL_QA_LOCAL_ONLY'
         AND action = 'growth.marketing_campaign_created') <> 1 THEN
    RAISE EXCEPTION 'new campaign creation audit is missing or duplicated';
  END IF;
  IF (SELECT count(*) FROM public.audit_logs
       WHERE actor = 'INTERNAL_QA_LOCAL_ONLY'
         AND action = 'growth.spend_row_revised'
         AND before_state->>'spend_usd' = '125.45'
         AND after_state->>'spend_usd' = '150.00') <> 1 THEN
    RAISE EXCEPTION 'row revision before/after audit is missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.marketing_spend_import_batches
     WHERE metadata ? 'raw_csv' OR metadata ? 'raw_payload'
  ) THEN
    RAISE EXCEPTION 'raw upload material was retained';
  END IF;
END;
$assert_spend_contract$;

DO $assert_receipt_immutable$
BEGIN
  BEGIN
    UPDATE public.marketing_spend_import_batches
       SET approval_reference = 'tampered'
     WHERE batch_fingerprint = repeat('a', 64);
    RAISE EXCEPTION 'receipt update unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    NULL;
  END;
  BEGIN
    DELETE FROM public.marketing_spend_import_batches
     WHERE batch_fingerprint = repeat('a', 64);
    RAISE EXCEPTION 'receipt delete unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    NULL;
  END;
END;
$assert_receipt_immutable$;

SET LOCAL ROLE authenticated;
DO $assert_browser_denied$
BEGIN
  BEGIN
    PERFORM public.import_marketing_spend_batch_v1(
      repeat('e', 64), '[]'::jsonb, 'browser', 'blocked', 'IMPORT REVIEWED SPEND'
    );
    RAISE EXCEPTION 'authenticated browser function execution unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$assert_browser_denied$;
RESET ROLE;

ROLLBACK;
