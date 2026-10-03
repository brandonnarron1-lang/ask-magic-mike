-- Executable PostgreSQL 17 verification for the Agent Command Center.
-- Run only after the complete migration chain against a disposable/local DB.
-- Every synthetic mutation is rolled back and no provider is called.

\set ON_ERROR_STOP on

BEGIN;

SET LOCAL client_min_messages TO warning;
SET LOCAL timezone TO 'UTC';

CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_raises_like(
  sql_text text,
  expected_state text,
  expected_message_fragment text,
  message text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  caught_state text;
  caught_message text;
BEGIN
  BEGIN
    EXECUTE sql_text;
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS
      caught_state = RETURNED_SQLSTATE,
      caught_message = MESSAGE_TEXT;
  END;

  IF caught_state IS NULL THEN
    RAISE EXCEPTION 'assertion failed: % did not raise', message;
  END IF;
  IF caught_state <> expected_state THEN
    RAISE EXCEPTION 'assertion failed: % raised %, expected %', message, caught_state, expected_state;
  END IF;
  IF position(expected_message_fragment IN coalesce(caught_message, '')) = 0 THEN
    RAISE EXCEPTION 'assertion failed: % message % did not contain %',
      message, caught_message, expected_message_fragment;
  END IF;
END;
$$;

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM supabase_migrations.schema_migrations WHERE version = '20261002143000'),
  'Agent Command Center migration is recorded exactly once'
);

SELECT pg_temp.assert_true(
  to_regclass('public.lead_action_reviews') IS NOT NULL
  AND to_regclass('public.ai_budget_reservations') IS NOT NULL
  AND to_regclass('public.ai_draft_reviews') IS NOT NULL,
  'all three Agent Command Center tables exist'
);

SELECT pg_temp.assert_true(
  (SELECT bool_and(relrowsecurity)
     FROM pg_class
    WHERE oid IN (
      'public.lead_action_reviews'::regclass,
      'public.ai_budget_reservations'::regclass,
      'public.ai_draft_reviews'::regclass
    )),
  'RLS is enabled on all Agent Command Center tables'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.ai_draft_reviews'::regclass
       AND tgname = 'ai_draft_reviews_immutable'
       AND tgenabled <> 'D'
       AND NOT tgisinternal
  ),
  'AI draft immutable trigger is enabled'
);

DO $assert_acc_browser_privileges_denied$
DECLARE
  role_name text;
  table_name text;
  privilege_name text;
  function_signature text;
  function_signatures text[] := ARRAY[
    'public.mutate_lead_action_review_v1(uuid,text,text,text,timestamptz,integer,text,timestamptz)',
    'public.reserve_ai_budget_v1(text,uuid,text,text,numeric,numeric,text,timestamptz)',
    'public.finalize_ai_budget_reservation_v1(uuid,numeric,integer,integer,text,text,boolean,integer,timestamptz)',
    'public.persist_ai_intelligence_draft_v1(uuid,text,text,text,text,jsonb,text,boolean,text,text,text,text,text,text,jsonb,jsonb,jsonb,timestamptz)',
    'public.mutate_ai_draft_review_v1(uuid,integer,text,text,text,text,timestamptz)'
  ];
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH table_name IN ARRAY ARRAY[
      'public.lead_action_reviews',
      'public.ai_budget_reservations',
      'public.ai_draft_reviews'
    ] LOOP
      FOREACH privilege_name IN ARRAY ARRAY[
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
      ] LOOP
        IF has_table_privilege(role_name, table_name, privilege_name) THEN
          RAISE EXCEPTION '% unexpectedly has % on %', role_name, privilege_name, table_name;
        END IF;
      END LOOP;
    END LOOP;

    FOREACH function_signature IN ARRAY function_signatures LOOP
      IF has_function_privilege(role_name, function_signature, 'EXECUTE') THEN
        RAISE EXCEPTION '% unexpectedly has EXECUTE on %', role_name, function_signature;
      END IF;
    END LOOP;
  END LOOP;
END;
$assert_acc_browser_privileges_denied$;

SELECT pg_temp.assert_true(
  has_table_privilege('service_role', 'public.lead_action_reviews', 'SELECT,INSERT,UPDATE')
  AND has_table_privilege('service_role', 'public.ai_budget_reservations', 'SELECT,INSERT,UPDATE')
  AND has_table_privilege('service_role', 'public.ai_draft_reviews', 'SELECT,INSERT')
  AND (SELECT bool_and(has_function_privilege('service_role', function_signature, 'EXECUTE'))
         FROM unnest(ARRAY[
           'public.mutate_lead_action_review_v1(uuid,text,text,text,timestamptz,integer,text,timestamptz)',
           'public.reserve_ai_budget_v1(text,uuid,text,text,numeric,numeric,text,timestamptz)',
           'public.finalize_ai_budget_reservation_v1(uuid,numeric,integer,integer,text,text,boolean,integer,timestamptz)',
           'public.persist_ai_intelligence_draft_v1(uuid,text,text,text,text,jsonb,text,boolean,text,text,text,text,text,text,jsonb,jsonb,jsonb,timestamptz)',
           'public.mutate_ai_draft_review_v1(uuid,integer,text,text,text,text,timestamptz)'
         ]) AS signatures(function_signature)),
  'server-side service role has the required least-privilege access'
);

SELECT pg_temp.assert_true(
  (SELECT bool_and(NOT prosecdef)
     FROM pg_proc
    WHERE oid IN (
      'public.mutate_lead_action_review_v1(uuid,text,text,text,timestamptz,integer,text,timestamptz)'::regprocedure,
      'public.reserve_ai_budget_v1(text,uuid,text,text,numeric,numeric,text,timestamptz)'::regprocedure,
      'public.finalize_ai_budget_reservation_v1(uuid,numeric,integer,integer,text,text,boolean,integer,timestamptz)'::regprocedure,
      'public.persist_ai_intelligence_draft_v1(uuid,text,text,text,text,jsonb,text,boolean,text,text,text,text,text,text,jsonb,jsonb,jsonb,timestamptz)'::regprocedure,
      'public.mutate_ai_draft_review_v1(uuid,integer,text,text,text,text,timestamptz)'::regprocedure
    )),
  'all Agent Command Center functions remain SECURITY INVOKER'
);

INSERT INTO public.sessions (id, created_at)
VALUES
  ('a1000000-0000-4000-8000-000000000001', '2026-10-02 12:00:00+00'),
  ('a1000000-0000-4000-8000-000000000002', '2026-10-02 12:00:00+00'),
  ('a1000000-0000-4000-8000-000000000003', '2026-10-02 12:00:00+00');

INSERT INTO public.leads (
  id, session_id, created_at, first_name, last_name, email, status, is_test,
  communication_suppressed, consent_language_version, widget_session_id
) VALUES
  (
    'a2000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    '2026-10-02 12:00:00+00',
    'INTERNAL', 'QA COMMAND CENTER', 'acc-live@example.test', 'new',
    false, false, 'qa-v1', 'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a2000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000002',
    '2026-10-02 12:00:00+00',
    'INTERNAL', 'QA SUPPRESSED', 'acc-suppressed@example.test', 'new',
    true, true, 'qa-v1', 'a1000000-0000-4000-8000-000000000002'
  ),
  (
    'a2000000-0000-4000-8000-000000000003',
    'a1000000-0000-4000-8000-000000000003',
    '2026-10-02 12:00:00+00',
    'INTERNAL', 'QA NO PERMISSION', 'acc-held@example.test', 'new',
    false, false, 'qa-v1', 'a1000000-0000-4000-8000-000000000003'
  );

INSERT INTO public.communication_permissions (
  lead_id, channel, purpose, state, consent_text, consent_version,
  source, evidence_at, manual_review_required
) VALUES (
  'a2000000-0000-4000-8000-000000000001', 'email',
  'requested_service_response', 'allowed', 'INTERNAL QA CONSENT', 'qa-v1',
  'postgres17_contract', '2026-10-02 12:00:00+00', false
);

-- The service role can use the reviewed action RPC, and each operator decision
-- receives optimistic concurrency protection plus an audit event.
SET LOCAL ROLE service_role;
SELECT public.mutate_lead_action_review_v1(
  'a2000000-0000-4000-8000-000000000001', 'follow_up_due', 'snoozed',
  'Awaiting requested documents', '2026-10-03 12:00:00+00', 0,
  'pg17-agent', '2026-10-02 12:05:00+00'
);
RESET ROLE;

SELECT pg_temp.assert_true(
  (SELECT status = 'snoozed' AND version = 1
     FROM public.lead_action_reviews
    WHERE lead_id = 'a2000000-0000-4000-8000-000000000001'
      AND action_key = 'follow_up_due'),
  'Today action review was persisted at version 1'
);

CREATE TEMP TABLE acc_results (
  label text PRIMARY KEY,
  result jsonb NOT NULL
);

INSERT INTO acc_results(label, result)
SELECT 'action_stale', public.mutate_lead_action_review_v1(
  'a2000000-0000-4000-8000-000000000001', 'follow_up_due', 'open',
  NULL, NULL, 0, 'pg17-agent', '2026-10-02 12:06:00+00'
);

INSERT INTO acc_results(label, result)
SELECT 'action_dismissed', public.mutate_lead_action_review_v1(
  'a2000000-0000-4000-8000-000000000001', 'follow_up_due', 'dismissed',
  'No longer actionable', NULL, 1, 'pg17-agent', '2026-10-02 12:07:00+00'
);

SELECT pg_temp.assert_true(
  (SELECT result->>'error' = 'stale_action_version' FROM acc_results WHERE label = 'action_stale')
  AND (SELECT (result->>'version')::integer = 2 AND result->>'status' = 'dismissed'
         FROM acc_results WHERE label = 'action_dismissed')
  AND (SELECT count(*) = 2 FROM public.audit_logs
        WHERE resource_id = 'a2000000-0000-4000-8000-000000000001'
          AND action = 'lead.today_action_reviewed'),
  'stale action writes fail and accepted reviews produce exactly one audit event each'
);

-- Zero means zero: no reservation row is created, and replay/collision/cap
-- behavior stays deterministic under the transaction-scoped advisory lock.
INSERT INTO acc_results(label, result)
SELECT 'budget_zero', public.reserve_ai_budget_v1(
  'acc-budget-zero-00000001', 'a2000000-0000-4000-8000-000000000001',
  'follow_up_draft', 'gpt-6-luna', 0, 0.001, 'pg17-agent', '2026-10-02 12:10:00+00'
);

INSERT INTO acc_results(label, result)
SELECT 'budget_reserved', public.reserve_ai_budget_v1(
  'acc-budget-request-000001', 'a2000000-0000-4000-8000-000000000001',
  'follow_up_draft', 'gpt-6-luna', 0.010, 0.006, 'pg17-agent', '2026-10-02 12:10:00+00'
);

INSERT INTO acc_results(label, result)
SELECT 'budget_replay', public.reserve_ai_budget_v1(
  'acc-budget-request-000001', 'a2000000-0000-4000-8000-000000000001',
  'follow_up_draft', 'gpt-6-luna', 0.010, 0.006, 'pg17-agent', '2026-10-02 12:10:01+00'
);

INSERT INTO acc_results(label, result)
SELECT 'budget_conflict', public.reserve_ai_budget_v1(
  'acc-budget-request-000001', 'a2000000-0000-4000-8000-000000000001',
  'appointment_brief', 'gpt-6-luna', 0.010, 0.006, 'pg17-agent', '2026-10-02 12:10:02+00'
);

INSERT INTO acc_results(label, result)
SELECT 'budget_cap', public.reserve_ai_budget_v1(
  'acc-budget-request-000002', 'a2000000-0000-4000-8000-000000000001',
  'follow_up_draft', 'gpt-6-luna', 0.010, 0.005, 'pg17-agent', '2026-10-02 12:10:03+00'
);

SELECT pg_temp.assert_true(
  (SELECT result->>'error' = 'daily_ai_cost_cap_reached' FROM acc_results WHERE label = 'budget_zero')
  AND NOT EXISTS (SELECT 1 FROM public.ai_budget_reservations WHERE request_key = 'acc-budget-zero-00000001')
  AND (SELECT result->>'status' = 'reserved' AND (result->>'idempotent_replay')::boolean = false
         FROM acc_results WHERE label = 'budget_reserved')
  AND (SELECT (result->>'idempotent_replay')::boolean = true FROM acc_results WHERE label = 'budget_replay')
  AND (SELECT result->>'error' = 'budget_request_key_conflict' FROM acc_results WHERE label = 'budget_conflict')
  AND (SELECT result->>'error' = 'daily_ai_cost_cap_reached' FROM acc_results WHERE label = 'budget_cap')
  AND (SELECT count(*) = 1 FROM public.ai_budget_reservations
        WHERE request_key LIKE 'acc-budget-request-%'),
  'budget reservations fail closed, replay safely, reject collisions, and enforce the shared cap'
);

INSERT INTO acc_results(label, result)
SELECT 'budget_overage', public.finalize_ai_budget_reservation_v1(
  ((SELECT result->>'id' FROM acc_results WHERE label = 'budget_reserved'))::uuid,
  0.007, 100, 50, 'openai_responses', NULL, false, 250,
  '2026-10-02 12:11:00+00'
);

INSERT INTO acc_results(label, result)
SELECT 'budget_finalized', public.finalize_ai_budget_reservation_v1(
  ((SELECT result->>'id' FROM acc_results WHERE label = 'budget_reserved'))::uuid,
  0.005, 100, 50, 'openai_responses', NULL, false, 250,
  '2026-10-02 12:11:01+00'
);

INSERT INTO acc_results(label, result)
SELECT 'budget_finalize_replay', public.finalize_ai_budget_reservation_v1(
  ((SELECT result->>'id' FROM acc_results WHERE label = 'budget_reserved'))::uuid,
  0.005, 100, 50, 'openai_responses', NULL, false, 250,
  '2026-10-02 12:11:02+00'
);

SELECT pg_temp.assert_true(
  (SELECT result->>'error' = 'invalid_budget_finalization' FROM acc_results WHERE label = 'budget_overage')
  AND (SELECT (result->>'idempotent_replay')::boolean = false FROM acc_results WHERE label = 'budget_finalized')
  AND (SELECT (result->>'idempotent_replay')::boolean = true FROM acc_results WHERE label = 'budget_finalize_replay')
  AND (SELECT count(*) = 1 AND sum(estimated_cost_usd) = 0.005
         FROM public.ai_usage_events
        WHERE lead_id = 'a2000000-0000-4000-8000-000000000001'),
  'finalization cannot exceed its reservation and replay creates one usage event'
);

INSERT INTO acc_results(label, result)
SELECT 'draft_live', public.persist_ai_intelligence_draft_v1(
  'a2000000-0000-4000-8000-000000000001', 'acc-v1', 'acc-prompt-v1',
  'deterministic_fallback', 'deterministic', '{"summary":"INTERNAL QA"}'::jsonb,
  repeat('a', 64), false, 'pg17-agent', 'email_draft', 'email',
  'requested_service_response', 'Draft one', repeat('b', 64),
  '["lead:qa"]'::jsonb, '[]'::jsonb, '["No send performed"]'::jsonb,
  '2026-10-02 12:20:00+00'
);

INSERT INTO acc_results(label, result)
SELECT 'draft_edited', public.mutate_ai_draft_review_v1(
  ((SELECT result->>'draft_key' FROM acc_results WHERE label = 'draft_live'))::uuid,
  1, 'edit', 'Reviewed draft', repeat('c', 64), 'pg17-reviewer',
  '2026-10-02 12:21:00+00'
);

INSERT INTO acc_results(label, result)
SELECT 'draft_stale', public.mutate_ai_draft_review_v1(
  ((SELECT result->>'draft_key' FROM acc_results WHERE label = 'draft_live'))::uuid,
  1, 'edit', 'Stale edit', repeat('d', 64), 'pg17-reviewer',
  '2026-10-02 12:21:01+00'
);

INSERT INTO acc_results(label, result)
SELECT 'draft_approved', public.mutate_ai_draft_review_v1(
  ((SELECT result->>'draft_key' FROM acc_results WHERE label = 'draft_live'))::uuid,
  2, 'approve', NULL, NULL, 'pg17-reviewer', '2026-10-02 12:22:00+00'
);

SELECT pg_temp.assert_true(
  (SELECT (result->>'version')::integer = 2 AND result->>'status' = 'edited'
     FROM acc_results WHERE label = 'draft_edited')
  AND (SELECT result->>'error' = 'stale_draft_version' FROM acc_results WHERE label = 'draft_stale')
  AND (SELECT (result->>'version')::integer = 3 AND result->>'status' = 'approved'
         FROM acc_results WHERE label = 'draft_approved')
  AND (SELECT count(*) = 3 FROM public.ai_draft_reviews
        WHERE draft_key = ((SELECT result->>'draft_key' FROM acc_results WHERE label = 'draft_live'))::uuid)
  AND (SELECT bool_and(confidence IS NULL) FROM public.ai_lead_intelligence
        WHERE lead_id = 'a2000000-0000-4000-8000-000000000001'),
  'draft versions are immutable, optimistic, permission-bound, and do not fabricate confidence'
);

SELECT pg_temp.assert_raises_like(
  format(
    'UPDATE public.ai_draft_reviews SET content = %L WHERE id = %L::uuid',
    'forbidden rewrite',
    (SELECT result->>'draft_id' FROM acc_results WHERE label = 'draft_live')
  ),
  '55000', 'append-only', 'AI draft update is rejected'
);

SELECT pg_temp.assert_raises_like(
  format(
    'DELETE FROM public.ai_draft_reviews WHERE id = %L::uuid',
    (SELECT result->>'draft_id' FROM acc_results WHERE label = 'draft_live')
  ),
  '55000', 'append-only', 'AI draft delete is rejected'
);

INSERT INTO acc_results(label, result)
SELECT 'draft_suppressed', public.persist_ai_intelligence_draft_v1(
  'a2000000-0000-4000-8000-000000000002', 'acc-v1', 'acc-prompt-v1',
  'deterministic_fallback', 'deterministic', '{"summary":"INTERNAL QA SUPPRESSED"}'::jsonb,
  repeat('e', 64), true, 'pg17-agent', 'email_draft', 'email',
  'requested_service_response', 'Suppressed draft', repeat('f', 64),
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '2026-10-02 12:30:00+00'
);

INSERT INTO acc_results(label, result)
SELECT 'draft_suppressed_approve', public.mutate_ai_draft_review_v1(
  ((SELECT result->>'draft_key' FROM acc_results WHERE label = 'draft_suppressed'))::uuid,
  1, 'approve', NULL, NULL, 'pg17-reviewer', '2026-10-02 12:31:00+00'
);

INSERT INTO acc_results(label, result)
SELECT 'draft_no_permission', public.persist_ai_intelligence_draft_v1(
  'a2000000-0000-4000-8000-000000000003', 'acc-v1', 'acc-prompt-v1',
  'deterministic_fallback', 'deterministic', '{"summary":"INTERNAL QA HELD"}'::jsonb,
  repeat('1', 64), false, 'pg17-agent', 'email_draft', 'email',
  'requested_service_response', 'Held draft', repeat('2', 64),
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '2026-10-02 12:32:00+00'
);

INSERT INTO acc_results(label, result)
SELECT 'draft_no_permission_approve', public.mutate_ai_draft_review_v1(
  ((SELECT result->>'draft_key' FROM acc_results WHERE label = 'draft_no_permission'))::uuid,
  1, 'approve', NULL, NULL, 'pg17-reviewer', '2026-10-02 12:33:00+00'
);

SELECT pg_temp.assert_true(
  (SELECT result->>'error' = 'draft_approval_blocked'
     FROM acc_results WHERE label = 'draft_suppressed_approve')
  AND (SELECT result->>'error' = 'communication_permission_missing'
         FROM acc_results WHERE label = 'draft_no_permission_approve')
  AND NOT EXISTS (
    SELECT 1 FROM public.ai_draft_reviews
     WHERE lead_id IN (
       'a2000000-0000-4000-8000-000000000002',
       'a2000000-0000-4000-8000-000000000003'
     ) AND status = 'approved'
  ),
  'test/suppressed and permissionless leads cannot receive approved drafts'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1 FROM public.lead_notifications
     WHERE lead_id IN (
       'a2000000-0000-4000-8000-000000000001',
       'a2000000-0000-4000-8000-000000000002',
       'a2000000-0000-4000-8000-000000000003'
     )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.communication_events
     WHERE lead_id IN (
       'a2000000-0000-4000-8000-000000000001',
       'a2000000-0000-4000-8000-000000000002',
       'a2000000-0000-4000-8000-000000000003'
     )
  ),
  'draft generation and approval do not enqueue or send communication'
);

ROLLBACK;

SELECT 'agent_command_center_pg17_passed' AS result;
