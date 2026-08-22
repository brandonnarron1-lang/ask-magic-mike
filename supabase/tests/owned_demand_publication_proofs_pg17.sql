-- Executable local verification for the Phase 9 owned-demand publication
-- proof ledger on Postgres 17. Run only against a disposable/local Supabase
-- database. Every synthetic mutation is rolled back.

\set ON_ERROR_STOP on

BEGIN;

SET LOCAL client_min_messages TO warning;
SET LOCAL timezone TO 'UTC';

CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT condition THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_raises(
  sql_text text,
  expected_state text,
  message text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE sql_text;
  RAISE EXCEPTION 'assertion failed: % did not raise', message;
EXCEPTION
  WHEN others THEN
    IF SQLSTATE <> expected_state THEN
      RAISE EXCEPTION
        'assertion failed: % raised %, expected %',
        message,
        SQLSTATE,
        expected_state;
    END IF;
END;
$$;

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20260821170000'
  ),
  'publication-proof migration is recorded exactly once'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20260822195000'
  ),
  'WordPress publication-proof scope migration is recorded exactly once'
);

SELECT pg_temp.assert_true(
  to_regclass('public.owned_demand_publication_proofs') IS NOT NULL,
  'publication-proof table exists'
);

SELECT pg_temp.assert_true(
  (
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = 'public.owned_demand_publication_proofs'::regclass
  ),
  'publication-proof table has RLS enabled'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.owned_demand_publication_proofs'::regclass
      AND tgname = 'owned_demand_publication_proofs_reject_change'
      AND tgenabled <> 'D'
      AND NOT tgisinternal
      AND (tgtype & 2) = 2
      AND (tgtype & 8) = 8
      AND (tgtype & 16) = 16
  ),
  'append-only update/delete trigger is enabled'
);

SELECT pg_temp.assert_true(
  to_regprocedure(
    'public.record_owned_demand_publication_proof_v1(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,text,boolean)'
  ) IS NOT NULL,
  'publication-proof function exists'
);

SELECT pg_temp.assert_true(
  (
    SELECT NOT prosecdef
      AND proconfig @> ARRAY['search_path=public, pg_temp']::text[]
    FROM pg_proc
    WHERE oid = to_regprocedure(
      'public.record_owned_demand_publication_proof_v1(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,text,boolean)'
    )
  ),
  'publication-proof function is security invoker with a locked search path'
);

SELECT pg_temp.assert_true(
  has_table_privilege(
    'service_role',
    'public.owned_demand_publication_proofs',
    'SELECT'
  )
  AND has_table_privilege(
    'service_role',
    'public.owned_demand_publication_proofs',
    'INSERT'
  )
  AND NOT has_table_privilege(
    'service_role',
    'public.owned_demand_publication_proofs',
    'UPDATE'
  )
  AND NOT has_table_privilege(
    'service_role',
    'public.owned_demand_publication_proofs',
    'DELETE'
  ),
  'service role has only required table privileges'
);

SELECT pg_temp.assert_true(
  has_function_privilege(
    'service_role',
    'public.record_owned_demand_publication_proof_v1(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,text,boolean)',
    'EXECUTE'
  ),
  'service role can execute the publication-proof function'
);

SELECT pg_temp.assert_true(
  NOT has_table_privilege(
    'anon',
    'public.owned_demand_publication_proofs',
    'SELECT'
  )
  AND NOT has_table_privilege(
    'anon',
    'public.owned_demand_publication_proofs',
    'INSERT'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.owned_demand_publication_proofs',
    'SELECT'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.owned_demand_publication_proofs',
    'INSERT'
  ),
  'browser roles have no publication-proof table access'
);

SELECT pg_temp.assert_true(
  NOT has_function_privilege(
    'anon',
    'public.record_owned_demand_publication_proof_v1(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,text,boolean)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.record_owned_demand_publication_proof_v1(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,text,boolean)',
    'EXECUTE'
  ),
  'browser roles cannot execute the publication-proof function'
);

CREATE TEMP TABLE publication_proof_contract_results (
  sequence integer PRIMARY KEY,
  payload jsonb NOT NULL
) ON COMMIT DROP;

GRANT SELECT, INSERT ON pg_temp.publication_proof_contract_results TO service_role;

SET LOCAL ROLE service_role;

INSERT INTO pg_temp.publication_proof_contract_results(sequence, payload)
SELECT 1, public.record_owned_demand_publication_proof_v1(
  repeat('a', 64),
  'facebook',
  'seller_review',
  'live',
  'public_url',
  'amm_owned_demand_2026',
  'facebook',
  'social_organic',
  'facebook_local_question_seller_review',
  'https://www.askmagicmike.com/home-value?utm_source=facebook&utm_medium=social_organic&utm_campaign=amm_owned_demand_2026&utm_content=facebook_local_question_seller_review',
  'https://www.facebook.com/ourtownproperties/posts/internal-qa-local-proof',
  NULL,
  repeat('b', 64),
  'internal_qa_local_asset',
  'INTERNAL_QA_LOCAL_ONLY',
  now(),
  'internal-qa-local',
  true
);

INSERT INTO pg_temp.publication_proof_contract_results(sequence, payload)
SELECT 2, public.record_owned_demand_publication_proof_v1(
  repeat('a', 64),
  'facebook',
  'seller_review',
  'live',
  'public_url',
  'amm_owned_demand_2026',
  'facebook',
  'social_organic',
  'facebook_local_question_seller_review',
  'https://www.askmagicmike.com/home-value?utm_source=facebook&utm_medium=social_organic&utm_campaign=amm_owned_demand_2026&utm_content=facebook_local_question_seller_review',
  'https://www.facebook.com/ourtownproperties/posts/internal-qa-local-proof',
  NULL,
  repeat('b', 64),
  'internal_qa_local_asset',
  'INTERNAL_QA_LOCAL_ONLY',
  now(),
  'internal-qa-local',
  true
);

INSERT INTO pg_temp.publication_proof_contract_results(sequence, payload)
SELECT 3, public.record_owned_demand_publication_proof_v1(
  repeat('c', 64),
  'facebook',
  'seller_review',
  'live',
  'public_url',
  'amm_owned_demand_2026',
  'facebook',
  'social_organic',
  'facebook_local_question_seller_review',
  'https://www.askmagicmike.com/home-value?utm_source=facebook&utm_medium=social_organic&utm_campaign=amm_owned_demand_2026&utm_content=facebook_local_question_seller_review',
  'https://unapproved.example.test/internal-qa-proof',
  NULL,
  repeat('d', 64),
  'internal_qa_local_asset',
  'INTERNAL_QA_LOCAL_ONLY',
  now(),
  'internal-qa-local',
  true
);

WITH wordpress_cases(
  sequence,
  placement_key,
  utm_content,
  destination_path
) AS (
  VALUES
    (10, 'general_question', 'wordpress_ask_magic_mike', '/ask'),
    (11, 'seller_review', 'wordpress_ask_magic_mike_seller_review', '/home-value'),
    (12, 'buyer_match', 'wordpress_ask_magic_mike_buyer_match', '/buy'),
    (13, 'renter_plan', 'wordpress_ask_magic_mike_renter_plan', '/rent'),
    (14, 'wordpress_homepage_ask_mike', 'wordpress_homepage_ask_mike', '/ask'),
    (15, 'wordpress_home_value', 'wordpress_home_value_page', '/home-value'),
    (16, 'wordpress_we_buy_homes', 'wordpress_we_buy_homes', '/sell'),
    (17, 'wordpress_mike_agent', 'wordpress_mike_agent_page', '/ask'),
    (18, 'wordpress_listing_buyer', 'wordpress_listing_buyer', '/buy'),
    (19, 'wordpress_rental_to_homeownership', 'wordpress_rental_to_homeownership', '/rent'),
    (20, 'wordpress_ask_magic_mike_embed', 'wordpress_ask_magic_mike_embed', '/ask')
)
INSERT INTO pg_temp.publication_proof_contract_results(sequence, payload)
SELECT sequence, public.record_owned_demand_publication_proof_v1(
  lpad(to_hex(sequence), 64, '0'),
  'ourtown_wordpress',
  placement_key,
  'live',
  'public_url',
  'amm_owned_demand_2026',
  'ourtownproperties',
  'owned_media',
  utm_content,
  'https://www.askmagicmike.com' || destination_path
    || '?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content='
    || utm_content,
  'https://www.ourtownproperties.com/internal-qa-wordpress-proof/' || placement_key || '/',
  NULL,
  repeat('e', 64),
  'internal_qa_local_wordpress_asset',
  'INTERNAL_QA_WORDPRESS_SCOPE',
  now(),
  'internal-qa-local',
  true
)
FROM wordpress_cases;

INSERT INTO pg_temp.publication_proof_contract_results(sequence, payload)
SELECT 21, public.record_owned_demand_publication_proof_v1(
  lpad(to_hex(21), 64, '0'),
  'ourtown_wordpress',
  'wordpress_homepage_ask_mike',
  'configured',
  'configuration_reference',
  'amm_owned_demand_2026',
  'ourtownproperties',
  'owned_media',
  'wordpress_homepage_ask_mike',
  'https://www.askmagicmike.com/ask?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_homepage_ask_mike',
  NULL,
  'INTERNAL QA WordPress configuration proof',
  repeat('f', 64),
  'internal_qa_local_wordpress_asset',
  'INTERNAL_QA_WORDPRESS_SCOPE',
  now(),
  'internal-qa-local',
  true
);

INSERT INTO pg_temp.publication_proof_contract_results(sequence, payload)
SELECT 22, public.record_owned_demand_publication_proof_v1(
  lpad(to_hex(22), 64, '0'),
  'ourtown_wordpress',
  'wordpress_homepage_ask_mike',
  'removed',
  'removal_reference',
  'amm_owned_demand_2026',
  'ourtownproperties',
  'owned_media',
  'wordpress_homepage_ask_mike',
  'https://www.askmagicmike.com/ask?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_homepage_ask_mike',
  NULL,
  'INTERNAL QA WordPress removal proof',
  repeat('1', 64),
  'internal_qa_local_wordpress_asset',
  'INTERNAL_QA_WORDPRESS_SCOPE',
  now(),
  'internal-qa-local',
  true
);

INSERT INTO pg_temp.publication_proof_contract_results(sequence, payload)
SELECT 30, public.record_owned_demand_publication_proof_v1(
  lpad(to_hex(10), 64, '0'),
  'ourtown_wordpress',
  'general_question',
  'live',
  'public_url',
  'amm_owned_demand_2026',
  'ourtownproperties',
  'owned_media',
  'wordpress_ask_magic_mike',
  'https://www.askmagicmike.com/ask?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_ask_magic_mike',
  'https://www.ourtownproperties.com/internal-qa-wordpress-proof/general_question/',
  NULL,
  repeat('e', 64),
  'internal_qa_local_wordpress_asset',
  'INTERNAL_QA_WORDPRESS_SCOPE',
  now(),
  'internal-qa-local',
  true
);

INSERT INTO pg_temp.publication_proof_contract_results(sequence, payload)
SELECT 31, public.record_owned_demand_publication_proof_v1(
  lpad(to_hex(31), 64, '0'),
  'ourtown_wordpress',
  'wordpress_we_buy_homes',
  'live',
  'public_url',
  'amm_owned_demand_2026',
  'ourtownproperties',
  'owned_media',
  'wordpress_we_buy_homes',
  'https://www.askmagicmike.com/sell?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_we_buy_homes',
  'https://unapproved.example.test/internal-qa-wordpress-proof',
  NULL,
  repeat('2', 64),
  'internal_qa_local_wordpress_asset',
  'INTERNAL_QA_WORDPRESS_SCOPE',
  now(),
  'internal-qa-local',
  true
);

INSERT INTO pg_temp.publication_proof_contract_results(sequence, payload)
SELECT 32, public.record_owned_demand_publication_proof_v1(
  lpad(to_hex(32), 64, '0'),
  'facebook',
  'wordpress_home_value',
  'live',
  'public_url',
  'amm_owned_demand_2026',
  'facebook',
  'social_organic',
  'facebook_local_question_wordpress_home_value',
  'https://www.askmagicmike.com/home-value?utm_source=facebook&utm_medium=social_organic&utm_campaign=amm_owned_demand_2026&utm_content=facebook_local_question_wordpress_home_value',
  'https://www.facebook.com/ourtownproperties/posts/internal-qa-cross-channel-placement',
  NULL,
  repeat('3', 64),
  'internal_qa_local_asset',
  'INTERNAL_QA_WORDPRESS_SCOPE',
  now(),
  'internal-qa-local',
  true
);

RESET ROLE;

SELECT pg_temp.assert_true(
  (
    SELECT (payload ->> 'ok')::boolean
      AND NOT (payload ->> 'idempotent_replay')::boolean
      AND payload ->> 'proof_id' IS NOT NULL
      AND payload ->> 'audit_id' IS NOT NULL
    FROM pg_temp.publication_proof_contract_results
    WHERE sequence = 1
  ),
  'first service-role call creates one proof and one audit event'
);

SELECT pg_temp.assert_true(
  (
    SELECT (payload ->> 'ok')::boolean
      AND (payload ->> 'idempotent_replay')::boolean
      AND payload ->> 'proof_id' = (
        SELECT payload ->> 'proof_id'
        FROM pg_temp.publication_proof_contract_results
        WHERE sequence = 1
      )
      AND payload ->> 'audit_id' IS NULL
    FROM pg_temp.publication_proof_contract_results
    WHERE sequence = 2
  ),
  'replay returns the existing proof without a second audit event'
);

SELECT pg_temp.assert_true(
  (
    SELECT payload = jsonb_build_object(
      'ok', false,
      'error', 'invalid_publication_proof'
    )
    FROM pg_temp.publication_proof_contract_results
    WHERE sequence = 3
  ),
  'unapproved evidence host is rejected without an insert'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 13
      AND bool_and((payload ->> 'ok')::boolean)
      AND bool_and(NOT (payload ->> 'idempotent_replay')::boolean)
      AND bool_and(payload ->> 'proof_id' IS NOT NULL)
      AND bool_and(payload ->> 'audit_id' IS NOT NULL)
    FROM pg_temp.publication_proof_contract_results
    WHERE sequence BETWEEN 10 AND 22
  ),
  'all WordPress generic, offer, named-placement, configured, and removed proofs are accepted'
);

SELECT pg_temp.assert_true(
  (
    SELECT (payload ->> 'ok')::boolean
      AND (payload ->> 'idempotent_replay')::boolean
      AND payload ->> 'proof_id' = (
        SELECT payload ->> 'proof_id'
        FROM pg_temp.publication_proof_contract_results
        WHERE sequence = 10
      )
      AND payload ->> 'audit_id' IS NULL
    FROM pg_temp.publication_proof_contract_results
    WHERE sequence = 30
  ),
  'WordPress proof replay returns the original immutable record'
);

SELECT pg_temp.assert_true(
  (
    SELECT payload = jsonb_build_object(
      'ok', false,
      'error', 'invalid_publication_proof'
    )
    FROM pg_temp.publication_proof_contract_results
    WHERE sequence = 31
  ),
  'WordPress proof rejects a foreign evidence host'
);

SELECT pg_temp.assert_true(
  (
    SELECT payload = jsonb_build_object(
      'ok', false,
      'error', 'invalid_publication_proof'
    )
    FROM pg_temp.publication_proof_contract_results
    WHERE sequence = 32
  ),
  'non-WordPress channels reject WordPress-only placements'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 13
      AND bool_and(is_test)
      AND bool_and(recorded_by = 'internal-qa-local')
      AND bool_and(metadata ->> 'external_mutation_performed' = 'false')
      AND bool_and(metadata ->> 'raw_copy_retained' = 'false')
    FROM public.owned_demand_publication_proofs
    WHERE channel_key = 'ourtown_wordpress'
  ),
  'WordPress scope records only minimized synthetic proof rows'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 13
    FROM public.audit_logs
    WHERE action = 'growth.publication_proof_recorded'
      AND resource_type = 'owned_demand_publication'
      AND after_state ->> 'channel_key' = 'ourtown_wordpress'
  ),
  'every new WordPress proof has one immutable audit event'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
      AND bool_and(is_test)
      AND bool_and(recorded_by = 'internal-qa-local')
      AND bool_and(metadata ->> 'external_mutation_performed' = 'false')
      AND bool_and(metadata ->> 'raw_copy_retained' = 'false')
    FROM public.owned_demand_publication_proofs
    WHERE idempotency_key IN (repeat('a', 64), repeat('c', 64))
  ),
  'only one minimized test proof is present'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM public.audit_logs
    WHERE action = 'growth.publication_proof_recorded'
      AND resource_type = 'owned_demand_publication'
      AND resource_id = (
        SELECT (payload ->> 'proof_id')::uuid
        FROM pg_temp.publication_proof_contract_results
        WHERE sequence = 1
      )
      AND metadata ->> 'external_mutation_performed' = 'false'
  ),
  'exactly one immutable audit event accompanies the proof'
);

SELECT pg_temp.assert_raises(
  $sql$
    UPDATE public.owned_demand_publication_proofs
    SET recorded_by = 'tampered'
    WHERE idempotency_key = repeat('a', 64)
  $sql$,
  '55000',
  'publication-proof update is rejected'
);

SELECT pg_temp.assert_raises(
  $sql$
    DELETE FROM public.owned_demand_publication_proofs
    WHERE idempotency_key = repeat('a', 64)
  $sql$,
  '55000',
  'publication-proof delete is rejected'
);

SET LOCAL ROLE authenticated;

SELECT pg_temp.assert_raises(
  $sql$
    SELECT count(*) FROM public.owned_demand_publication_proofs
  $sql$,
  '42501',
  'authenticated role cannot read publication proofs'
);

RESET ROLE;

ROLLBACK;

SELECT 'owned_demand_publication_proofs_pg17: ok' AS result;
