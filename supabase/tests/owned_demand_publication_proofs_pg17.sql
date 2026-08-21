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
