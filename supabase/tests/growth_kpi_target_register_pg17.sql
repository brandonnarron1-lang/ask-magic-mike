-- Executable local verification for the Phase 9 KPI target register on a
-- disposable PostgreSQL staging database. Every synthetic mutation rolls back.

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
    WHERE version = '20260821213000'
  ),
  'KPI target-register migration is recorded exactly once'
);

SELECT pg_temp.assert_true(
  to_regclass('public.growth_kpi_target_versions') IS NOT NULL,
  'KPI target-version table exists'
);

SELECT pg_temp.assert_true(
  (
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = 'public.growth_kpi_target_versions'::regclass
  ),
  'KPI target-version table has RLS enabled'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.growth_kpi_target_versions'::regclass
      AND tgname = 'growth_kpi_target_versions_reject_change'
      AND tgenabled <> 'D'
      AND NOT tgisinternal
      AND (tgtype & 2) = 2
      AND (tgtype & 8) = 8
      AND (tgtype & 16) = 16
  ),
  'KPI target versions reject update and delete'
);

SELECT pg_temp.assert_true(
  to_regprocedure(
    'public.record_growth_kpi_target_version_v1(text,text,text,text,numeric,text,text,numeric,text,integer,integer,text,text,timestamptz,text,boolean)'
  ) IS NOT NULL,
  'KPI target recording function exists'
);

SELECT pg_temp.assert_true(
  (
    SELECT NOT prosecdef
      AND proconfig @> ARRAY['search_path=public, pg_temp']::text[]
    FROM pg_proc
    WHERE oid = to_regprocedure(
      'public.record_growth_kpi_target_version_v1(text,text,text,text,numeric,text,text,numeric,text,integer,integer,text,text,timestamptz,text,boolean)'
    )
  ),
  'KPI target function is security invoker with locked search path'
);

SELECT pg_temp.assert_true(
  has_table_privilege('service_role', 'public.growth_kpi_target_versions', 'SELECT')
  AND has_table_privilege('service_role', 'public.growth_kpi_target_versions', 'INSERT')
  AND NOT has_table_privilege('service_role', 'public.growth_kpi_target_versions', 'UPDATE')
  AND NOT has_table_privilege('service_role', 'public.growth_kpi_target_versions', 'DELETE')
  AND NOT has_table_privilege('service_role', 'public.growth_kpi_target_versions', 'TRUNCATE'),
  'service role has only required KPI target privileges'
);

SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public.growth_kpi_target_versions', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.growth_kpi_target_versions', 'SELECT')
  AND NOT has_function_privilege(
    'anon',
    'public.record_growth_kpi_target_version_v1(text,text,text,text,numeric,text,text,numeric,text,integer,integer,text,text,timestamptz,text,boolean)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.record_growth_kpi_target_version_v1(text,text,text,text,numeric,text,text,numeric,text,integer,integer,text,text,timestamptz,text,boolean)',
    'EXECUTE'
  ),
  'browser roles cannot read or record KPI target versions'
);

CREATE TEMP TABLE growth_kpi_target_contract_results (
  sequence integer PRIMARY KEY,
  payload jsonb NOT NULL
) ON COMMIT DROP;

GRANT SELECT, INSERT ON pg_temp.growth_kpi_target_contract_results TO service_role;

SET LOCAL ROLE service_role;

INSERT INTO pg_temp.growth_kpi_target_contract_results(sequence, payload)
SELECT 1, public.record_growth_kpi_target_version_v1(
  repeat('a', 64),
  'useful_source_attribution_rate',
  'percentage',
  'higher_is_better',
  NULL,
  'draft',
  'insufficient_sample',
  NULL,
  repeat('b', 64),
  0,
  30,
  'INTERNAL QA draft records intent without claiming a measured target.',
  NULL,
  now(),
  'internal-qa-local',
  true
);

INSERT INTO pg_temp.growth_kpi_target_contract_results(sequence, payload)
SELECT 2, public.record_growth_kpi_target_version_v1(
  repeat('a', 64),
  'useful_source_attribution_rate',
  'percentage',
  'higher_is_better',
  NULL,
  'draft',
  'insufficient_sample',
  NULL,
  repeat('b', 64),
  0,
  30,
  'INTERNAL QA draft records intent without claiming a measured target.',
  NULL,
  now(),
  'internal-qa-local',
  true
);

INSERT INTO pg_temp.growth_kpi_target_contract_results(sequence, payload)
SELECT 3, public.record_growth_kpi_target_version_v1(
  repeat('c', 64),
  'useful_source_attribution_rate',
  'percentage',
  'higher_is_better',
  95,
  'approved',
  'insufficient_sample',
  NULL,
  repeat('d', 64),
  0,
  30,
  'INTERNAL QA invalid approval intentionally lacks a measured baseline.',
  'INTERNAL_QA_LOCAL_ONLY',
  now(),
  'internal-qa-local',
  true
);

INSERT INTO pg_temp.growth_kpi_target_contract_results(sequence, payload)
SELECT 4, public.record_growth_kpi_target_version_v1(
  repeat('e', 64),
  'useful_source_attribution_rate',
  'percentage',
  'higher_is_better',
  95,
  'approved',
  'measured',
  90,
  repeat('f', 64),
  20,
  30,
  'INTERNAL QA approved version uses a measured baseline and explicit reference.',
  'INTERNAL_QA_LOCAL_ONLY',
  now(),
  'internal-qa-local',
  true
);

INSERT INTO pg_temp.growth_kpi_target_contract_results(sequence, payload)
SELECT 5, public.record_growth_kpi_target_version_v1(
  repeat('1', 64),
  'p75_largest_contentful_paint_ms',
  'milliseconds',
  'lower_is_better',
  2500,
  'approved',
  'measured',
  2800,
  repeat('2', 64),
  75,
  30,
  'INTERNAL QA LCP target uses the canonical production field-metric contract.',
  'INTERNAL_QA_LOCAL_ONLY',
  now(),
  'internal-qa-local',
  true
);

INSERT INTO pg_temp.growth_kpi_target_contract_results(sequence, payload)
SELECT 6, public.record_growth_kpi_target_version_v1(
  repeat('3', 64),
  'p75_cumulative_layout_shift',
  'score',
  'lower_is_better',
  0.1,
  'approved',
  'measured',
  0.14,
  repeat('4', 64),
  75,
  30,
  'INTERNAL QA CLS target uses the canonical production field-metric contract.',
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
      AND payload ->> 'version_id' IS NOT NULL
      AND payload ->> 'audit_id' IS NOT NULL
    FROM pg_temp.growth_kpi_target_contract_results
    WHERE sequence = 1
  ),
  'first draft call records one version and one audit event'
);

SELECT pg_temp.assert_true(
  (
    SELECT (payload ->> 'ok')::boolean
      AND (payload ->> 'idempotent_replay')::boolean
      AND payload ->> 'version_id' = (
        SELECT payload ->> 'version_id'
        FROM pg_temp.growth_kpi_target_contract_results
        WHERE sequence = 1
      )
      AND payload ->> 'audit_id' IS NULL
    FROM pg_temp.growth_kpi_target_contract_results
    WHERE sequence = 2
  ),
  'exact replay creates neither a duplicate version nor audit event'
);

SELECT pg_temp.assert_true(
  (
    SELECT payload = jsonb_build_object(
      'ok', false,
      'error', 'measured_kpi_baseline_and_approval_required'
    )
    FROM pg_temp.growth_kpi_target_contract_results
    WHERE sequence = 3
  ),
  'approval without a measured baseline is rejected'
);

SELECT pg_temp.assert_true(
  (
    SELECT (payload ->> 'ok')::boolean
      AND NOT (payload ->> 'idempotent_replay')::boolean
      AND payload ->> 'version_id' IS NOT NULL
      AND payload ->> 'audit_id' IS NOT NULL
    FROM pg_temp.growth_kpi_target_contract_results
    WHERE sequence = 4
  ),
  'measured and explicitly approved version is recorded'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 2
      AND bool_and((payload ->> 'ok')::boolean)
      AND bool_and(NOT (payload ->> 'idempotent_replay')::boolean)
      AND bool_and(payload ->> 'version_id' IS NOT NULL)
      AND bool_and(payload ->> 'audit_id' IS NOT NULL)
    FROM pg_temp.growth_kpi_target_contract_results
    WHERE sequence IN (5, 6)
  ),
  'millisecond and score metric contracts record measured approved versions'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 4
      AND bool_and(is_test)
      AND bool_and(recorded_by = 'internal-qa-local')
      AND bool_and(metadata ->> 'external_mutation_performed' = 'false')
      AND bool_and(metadata ->> 'browser_baseline_accepted' = 'false')
    FROM public.growth_kpi_target_versions
    WHERE idempotency_key IN (
      repeat('a', 64), repeat('c', 64), repeat('e', 64),
      repeat('1', 64), repeat('3', 64)
    )
  ),
  'only the valid draft and approved target versions exist'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 4
    FROM public.audit_logs
    WHERE action = 'growth.kpi_target_version_recorded'
      AND resource_type = 'growth_kpi_target'
      AND metadata ->> 'external_mutation_performed' = 'false'
      AND metadata ->> 'is_test' = 'true'
  ),
  'each new version has exactly one immutable audit event'
);

SELECT pg_temp.assert_raises(
  $sql$
    UPDATE public.growth_kpi_target_versions
       SET rationale = 'tampered'
     WHERE idempotency_key = repeat('a', 64)
  $sql$,
  '55000',
  'KPI target update is rejected'
);

SELECT pg_temp.assert_raises(
  $sql$
    DELETE FROM public.growth_kpi_target_versions
     WHERE idempotency_key = repeat('a', 64)
  $sql$,
  '55000',
  'KPI target delete is rejected'
);

SET LOCAL ROLE authenticated;

SELECT pg_temp.assert_raises(
  $sql$
    SELECT count(*) FROM public.growth_kpi_target_versions
  $sql$,
  '42501',
  'authenticated role cannot read KPI targets'
);

RESET ROLE;

ROLLBACK;

SELECT 'growth_kpi_target_register_pg17: ok' AS result;
