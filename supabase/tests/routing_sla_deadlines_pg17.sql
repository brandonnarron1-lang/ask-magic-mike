-- Executable local verification for migration 00005 on Postgres 17.
-- Run only against a disposable/local Supabase database.

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

CREATE OR REPLACE FUNCTION pg_temp.assert_raises(sql_text text, expected_state text, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE sql_text;
  RAISE EXCEPTION 'assertion failed: % did not raise', message;
EXCEPTION
  WHEN others THEN
    IF SQLSTATE <> expected_state THEN
      RAISE EXCEPTION 'assertion failed: % raised %, expected %', message, SQLSTATE, expected_state;
    END IF;
END;
$$;

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lead_routing'
      AND column_name = 'accept_deadline'
      AND data_type = 'timestamp with time zone'
      AND is_generated = 'NEVER'
  ),
  'accept_deadline is an ordinary timestamptz column'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lead_routing'
      AND column_name = 'contact_deadline'
      AND data_type = 'timestamp with time zone'
      AND is_generated = 'NEVER'
  ),
  'contact_deadline is an ordinary timestamptz column'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*)
    FROM pg_trigger
    WHERE tgrelid = 'public.lead_routing'::regclass
      AND tgname = 'lead_routing_sla_deadlines_biu'
      AND NOT tgisinternal
  ) = 1,
  'lead_routing SLA trigger exists once'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*)
    FROM pg_proc
    WHERE oid = 'public.set_lead_routing_sla_deadlines()'::regprocedure
  ) = 1,
  'lead_routing SLA trigger function exists once'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'lead_routing'
      AND indexname = 'idx_lead_routing_accept_deadline'
  ),
  'accept deadline index exists'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'lead_routing'
      AND indexname = 'idx_lead_routing_contact_deadline'
  ),
  'contact deadline index exists'
);

INSERT INTO sessions (id, status)
VALUES ('10000000-0000-4000-8000-000000000001', 'active');

INSERT INTO agents (id, name, email, phone, role, is_active, priority_score)
VALUES (
  '20000000-0000-4000-8000-000000000001',
  'Routing SLA PG17 Agent',
  'routing-sla-agent@example.test',
  '+15550101010',
  'primary',
  true,
  75
);

INSERT INTO leads (
  id,
  session_id,
  first_name,
  last_name,
  email,
  phone,
  primary_intent,
  status
)
VALUES (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Routing',
  'SLA',
  'routing-sla-lead@example.test',
  '+15550101011',
  'sell',
  'new'
);

INSERT INTO lead_routing (
  id,
  lead_id,
  agent_id,
  assigned_at,
  assignment_reason,
  agent_priority_score
)
VALUES (
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '2026-01-15 12:00:00+00',
  'routing SLA test',
  75
);

SELECT pg_temp.assert_true(
  (
    SELECT accept_deadline = '2026-01-15 12:02:00+00'::timestamptz
      AND contact_deadline = '2026-01-15 12:05:00+00'::timestamptz
      AND extract(epoch FROM accept_deadline - assigned_at) = 120
      AND extract(epoch FROM contact_deadline - assigned_at) = 300
    FROM lead_routing
    WHERE id = '40000000-0000-4000-8000-000000000001'
  ),
  'insert computes 2-minute accept and 5-minute contact deadlines'
);

UPDATE lead_routing
SET assigned_at = '2026-01-15 13:30:00+00'
WHERE id = '40000000-0000-4000-8000-000000000001';

SELECT pg_temp.assert_true(
  (
    SELECT accept_deadline = '2026-01-15 13:32:00+00'::timestamptz
      AND contact_deadline = '2026-01-15 13:35:00+00'::timestamptz
    FROM lead_routing
    WHERE id = '40000000-0000-4000-8000-000000000001'
  ),
  'assigned_at update recomputes both deadlines'
);

UPDATE lead_routing
SET assignment_reason = 'unrelated update'
WHERE id = '40000000-0000-4000-8000-000000000001';

SELECT pg_temp.assert_true(
  (
    SELECT accept_deadline = '2026-01-15 13:32:00+00'::timestamptz
      AND contact_deadline = '2026-01-15 13:35:00+00'::timestamptz
    FROM lead_routing
    WHERE id = '40000000-0000-4000-8000-000000000001'
  ),
  'unrelated update preserves deadlines'
);

UPDATE lead_routing
SET accept_deadline = '2027-01-01 00:00:00+00'
WHERE id = '40000000-0000-4000-8000-000000000001';

SELECT pg_temp.assert_true(
  (
    SELECT accept_deadline = assigned_at + interval '2 minutes'
      AND contact_deadline = assigned_at + interval '5 minutes'
    FROM lead_routing
    WHERE id = '40000000-0000-4000-8000-000000000001'
  ),
  'explicit deadline override is recomputed from assigned_at'
);

SELECT pg_temp.assert_raises(
  $sql$
    INSERT INTO lead_routing (
      id, lead_id, agent_id, assigned_at, assignment_reason, agent_priority_score
    ) VALUES (
      '40000000-0000-4000-8000-000000000099',
      '30000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      NULL,
      'null assigned_at test',
      75
    )
  $sql$,
  '23502',
  'null assigned_at is rejected'
);

SET LOCAL timezone TO 'America/New_York';

UPDATE lead_routing
SET assigned_at = '2026-03-08 01:59:30-05'
WHERE id = '40000000-0000-4000-8000-000000000001';

SELECT pg_temp.assert_true(
  (
    SELECT extract(epoch FROM accept_deadline - assigned_at) = 120
      AND extract(epoch FROM contact_deadline - assigned_at) = 300
      AND contact_deadline = '2026-03-08 07:04:30+00'::timestamptz
    FROM lead_routing
    WHERE id = '40000000-0000-4000-8000-000000000001'
  ),
  'spring DST transition keeps exact elapsed deadlines'
);

UPDATE lead_routing
SET assigned_at = '2026-11-01 01:59:30-04'
WHERE id = '40000000-0000-4000-8000-000000000001';

SELECT pg_temp.assert_true(
  (
    SELECT extract(epoch FROM accept_deadline - assigned_at) = 120
      AND extract(epoch FROM contact_deadline - assigned_at) = 300
      AND contact_deadline = '2026-11-01 06:04:30+00'::timestamptz
    FROM lead_routing
    WHERE id = '40000000-0000-4000-8000-000000000001'
  ),
  'fall DST transition keeps exact elapsed deadlines'
);

SET LOCAL timezone TO 'America/Los_Angeles';

SELECT pg_temp.assert_true(
  (
    SELECT contact_deadline = '2026-11-01 06:04:30+00'::timestamptz
    FROM lead_routing
    WHERE id = '40000000-0000-4000-8000-000000000001'
  ),
  'session timezone change does not alter stored absolute deadline'
);

INSERT INTO sessions (id, status)
VALUES ('10000000-0000-4000-8000-000000000002', 'active');

INSERT INTO leads (id, session_id, first_name, email, primary_intent, status)
VALUES (
  '30000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  'Default',
  'routing-sla-default@example.test',
  'sell',
  'new'
);

INSERT INTO lead_routing (lead_id, agent_id, assignment_reason, agent_priority_score)
VALUES (
  '30000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  'default timestamp test',
  75
);

SELECT pg_temp.assert_true(
  (
    SELECT assigned_at IS NOT NULL
      AND accept_deadline IS NOT NULL
      AND contact_deadline IS NOT NULL
      AND extract(epoch FROM accept_deadline - assigned_at) = 120
      AND extract(epoch FROM contact_deadline - assigned_at) = 300
    FROM lead_routing
    WHERE lead_id = '30000000-0000-4000-8000-000000000002'
  ),
  'default assigned_at computes non-null deadlines'
);

ROLLBACK;

SELECT 'routing_sla_deadlines_pg17: ok' AS result;
