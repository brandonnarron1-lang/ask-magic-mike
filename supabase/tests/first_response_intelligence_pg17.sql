-- Executable local verification for immutable first-response intelligence on PostgreSQL 17.
-- Run only after the complete migration chain against a disposable/local database.

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

INSERT INTO public.sessions (id, created_at)
VALUES
  ('93000000-0000-4000-8000-000000000001', '2026-08-19 21:00:00+00'),
  ('93000000-0000-4000-8000-000000000002', '2026-08-19 21:00:00+00'),
  ('93000000-0000-4000-8000-000000000003', '2026-08-19 21:00:00+00');

INSERT INTO public.leads (
  id, session_id, created_at, first_name, last_name, email, status, is_test,
  communication_suppressed, consent_language_version, widget_session_id
) VALUES
  (
    '94000000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000001',
    '2026-08-19 21:00:00+00',
    'INTERNAL', 'QA RESPONSE', 'response-ledger@example.test', 'new',
    true, true, 'qa-v1', '93000000-0000-4000-8000-000000000001'
  ),
  (
    '94000000-0000-4000-8000-000000000002',
    '93000000-0000-4000-8000-000000000002',
    '2026-08-19 21:00:00+00',
    'INTERNAL', 'QA LATE STAGE', 'response-late@example.test', 'qualified',
    true, true, 'qa-v1', '93000000-0000-4000-8000-000000000002'
  ),
  (
    '94000000-0000-4000-8000-000000000003',
    '93000000-0000-4000-8000-000000000003',
    '2026-08-19 21:00:00+00',
    'INTERNAL', 'QA INVALID TIME', 'response-invalid@example.test', 'new',
    true, true, 'qa-v1', '93000000-0000-4000-8000-000000000003'
  );

SELECT public.mutate_admin_lead_status_v3(
  '94000000-0000-4000-8000-000000000001'::uuid,
  'new',
  'contacted',
  jsonb_build_object(
    'status', 'contacted',
    'last_contacted_at', '2026-08-19 21:07:00+00',
    'conversion_stage', 'contacted'
  ),
  NULL,
  NULL,
  'lead_center:pg17-response-qa',
  '2026-08-19 21:07:00+00'
);

SELECT pg_temp.assert_true(
  (
    SELECT status = 'contacted'
       AND last_contacted_at = '2026-08-19 21:07:00+00'::timestamptz
    FROM public.leads
    WHERE id = '94000000-0000-4000-8000-000000000001'
  ),
  'contacted lifecycle projection committed'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
       AND min(first_human_response_at) = '2026-08-19 21:07:00+00'::timestamptz
       AND bool_and(is_test AND communication_suppressed)
    FROM public.lead_response_milestones
    WHERE lead_id = '94000000-0000-4000-8000-000000000001'
  ),
  'one immutable first-response milestone preserves test suppression'
);

SELECT pg_temp.assert_true(
  (
    SELECT EXTRACT(EPOCH FROM (m.first_human_response_at - l.created_at)) = 420
    FROM public.lead_response_milestones m
    JOIN public.leads l ON l.id = m.lead_id
    WHERE m.lead_id = '94000000-0000-4000-8000-000000000001'
  ),
  'response duration derives from canonical lead creation time'
);

CREATE OR REPLACE FUNCTION pg_temp.milestone_update_rejected()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.lead_response_milestones
     SET first_human_response_at = first_human_response_at + interval '1 minute'
   WHERE lead_id = '94000000-0000-4000-8000-000000000001';
  RETURN false;
EXCEPTION WHEN SQLSTATE '55000' THEN
  RETURN true;
END;
$$;

SELECT pg_temp.assert_true(
  pg_temp.milestone_update_rejected(),
  'milestone timestamps reject overwrite while lead-level deletion remains available for approved retention workflows'
);

-- Same-state replay must not overwrite the original response or duplicate its audit.
SELECT public.mutate_admin_lead_status_v3(
  '94000000-0000-4000-8000-000000000001'::uuid,
  'contacted',
  'contacted',
  jsonb_build_object('status', 'contacted'),
  NULL,
  NULL,
  'lead_center:pg17-response-qa',
  '2026-08-19 21:20:00+00'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
       AND min(first_human_response_at) = '2026-08-19 21:07:00+00'::timestamptz
    FROM public.lead_response_milestones
    WHERE lead_id = '94000000-0000-4000-8000-000000000001'
  ),
  'idempotent replay preserves the original response'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM public.audit_logs
    WHERE resource_id = '94000000-0000-4000-8000-000000000001'::uuid
      AND action = 'lead.first_human_response_recorded'
  ),
  'first-response evidence creates one immutable audit event'
);

-- A later-stage lead may record real outreach without regressing lifecycle state.
SELECT public.record_admin_first_response_v1(
  '94000000-0000-4000-8000-000000000002'::uuid,
  'lead_center:pg17-response-qa',
  '2026-08-19 21:11:00+00',
  'admin_lead_detail'
);

SELECT pg_temp.assert_true(
  (
    SELECT status = 'qualified' AND last_contacted_at = '2026-08-19 21:11:00+00'::timestamptz
    FROM public.leads
    WHERE id = '94000000-0000-4000-8000-000000000002'
  ),
  'dedicated response action preserves later lifecycle state'
);

SELECT pg_temp.assert_true(
  (
    public.record_admin_first_response_v1(
      '94000000-0000-4000-8000-000000000003'::uuid,
      'lead_center:pg17-response-qa',
      '2026-08-19 20:59:00+00',
      'admin_lead_detail'
    )->>'error'
  ) = 'invalid_response_time',
  'pre-creation response evidence is rejected'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM public.lead_response_milestones
    WHERE lead_id = '94000000-0000-4000-8000-000000000003'
  ),
  'invalid response creates no milestone'
);

ROLLBACK;
