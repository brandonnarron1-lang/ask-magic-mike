-- Executable local verification for the AdminOps outcome ledger on Postgres 17.
-- Run only after all migrations against a disposable/local database.

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

INSERT INTO public.sessions (id)
VALUES ('91000000-0000-4000-8000-000000000001');

INSERT INTO public.leads (
  id, session_id, first_name, last_name, email, status, is_test,
  communication_suppressed, consent_language_version, widget_session_id
) VALUES (
  '92000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  'INTERNAL', 'QA OUTCOME', 'outcome-ledger@example.test', 'qualified',
  true, true, 'qa-v1', '91000000-0000-4000-8000-000000000001'
);

SELECT public.mutate_admin_lead_status_v2(
  '92000000-0000-4000-8000-000000000001'::uuid,
  'qualified',
  'appointment_set',
  jsonb_build_object(
    'status', 'appointment_set',
    'appointment_requested', true,
    'conversion_stage', 'appointment_set'
  ),
  NULL,
  NULL,
  'system/pg17_outcome_qa',
  '2026-08-19 20:00:00+00'
);

SELECT public.mutate_admin_lead_status_v2(
  '92000000-0000-4000-8000-000000000001'::uuid,
  'appointment_set',
  'converted',
  jsonb_build_object(
    'status', 'converted',
    'conversion_stage', 'converted',
    'converted_at', '2026-08-19 20:05:00+00',
    'closed_won_at', '2026-08-19 20:05:00+00',
    'closed_lost_at', NULL,
    'closed_lost_reason', NULL
  ),
  NULL,
  12345.67,
  'system/pg17_outcome_qa',
  '2026-08-19 20:05:00+00'
);

SELECT pg_temp.assert_true(
  (SELECT status = 'converted' FROM public.leads WHERE id = '92000000-0000-4000-8000-000000000001'),
  'lead lifecycle projection committed'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 2
      AND bool_or(outcome_type = 'appointment')
      AND bool_or(outcome_type = 'closed')
      AND bool_and(is_test AND communication_suppressed)
    FROM public.lead_outcomes
    WHERE lead_id = '92000000-0000-4000-8000-000000000001'
  ),
  'appointment and close outcomes are durable and retain test suppression'
);

SELECT pg_temp.assert_true(
  (
    SELECT amount_usd = 12345.67
    FROM public.lead_outcomes
    WHERE lead_id = '92000000-0000-4000-8000-000000000001'
      AND outcome_type = 'closed'
  ),
  'actual closed brokerage revenue is recorded'
);

-- Same-state replay repairs or updates the outcome without duplicating audit or
-- lifecycle records.
SELECT public.mutate_admin_lead_status_v2(
  '92000000-0000-4000-8000-000000000001'::uuid,
  'converted',
  'converted',
  jsonb_build_object('status', 'converted'),
  NULL,
  15000.25,
  'system/pg17_outcome_qa',
  '2026-08-19 20:10:00+00'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1 AND max(amount_usd) = 15000.25
    FROM public.lead_outcomes
    WHERE lead_id = '92000000-0000-4000-8000-000000000001'
      AND outcome_type = 'closed'
  ),
  'idempotent replay updates revenue without duplicate outcomes'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 2
    FROM public.audit_logs
    WHERE resource_id = '92000000-0000-4000-8000-000000000001'::uuid
      AND action = 'lead.lifecycle_changed'
  ),
  'only real lifecycle transitions create immutable audit events'
);

SELECT pg_temp.assert_true(
  (
    public.mutate_admin_lead_status_v2(
      '92000000-0000-4000-8000-000000000001'::uuid,
      'converted',
      'qualified',
      jsonb_build_object('status', 'qualified'),
      NULL,
      25,
      'system/pg17_outcome_qa',
      '2026-08-19 20:15:00+00'
    )->>'error'
  ) = 'invalid_outcome_amount',
  'revenue is rejected for non-close outcomes'
);

ROLLBACK;
