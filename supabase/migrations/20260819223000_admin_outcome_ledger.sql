-- Phase 9 operating-intelligence gap closure.
-- Keep the existing v1 lifecycle function for application rollback. The v2
-- contract atomically projects lifecycle state, immutable audit evidence, and
-- the canonical growth outcome used by the Growth command center.

CREATE OR REPLACE FUNCTION public.mutate_admin_lead_status_v2(
  p_lead_id UUID,
  p_expected_status TEXT,
  p_next_status TEXT,
  p_patch JSONB,
  p_reason TEXT DEFAULT NULL,
  p_outcome_amount_usd NUMERIC DEFAULT NULL,
  p_actor TEXT DEFAULT 'system/admin_basic_auth',
  p_occurred_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead RECORD;
  v_audit_id UUID;
  v_outcome_id UUID;
  v_outcome_type TEXT;
  v_idempotent_replay BOOLEAN := FALSE;
  v_external_id TEXT;
BEGIN
  IF p_outcome_amount_usd IS NOT NULL AND (
    p_next_status <> 'converted' OR
    p_outcome_amount_usd < 0 OR
    p_outcome_amount_usd > 99999999.99
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_outcome_amount');
  END IF;

  SELECT id, status, is_test, communication_suppressed
    INTO v_lead
    FROM public.leads
   WHERE id = p_lead_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;
  IF v_lead.status IS DISTINCT FROM p_expected_status THEN
    RETURN jsonb_build_object('ok', false, 'error', 'concurrent_status_update');
  END IF;

  v_idempotent_replay := v_lead.status = p_next_status;

  IF NOT v_idempotent_replay THEN
    UPDATE public.leads
       SET status = p_next_status,
           appointment_requested = CASE
             WHEN p_patch ? 'appointment_requested' THEN (p_patch->>'appointment_requested')::BOOLEAN
             ELSE appointment_requested
           END,
           last_contacted_at = CASE
             WHEN p_patch ? 'last_contacted_at' THEN (p_patch->>'last_contacted_at')::TIMESTAMPTZ
             ELSE last_contacted_at
           END,
           conversion_stage = CASE
             WHEN p_patch ? 'conversion_stage' THEN NULLIF(p_patch->>'conversion_stage', '')
             ELSE conversion_stage
           END,
           converted_at = CASE
             WHEN p_patch ? 'converted_at' THEN (p_patch->>'converted_at')::TIMESTAMPTZ
             ELSE converted_at
           END,
           closed_won_at = CASE
             WHEN p_patch ? 'closed_won_at' THEN (p_patch->>'closed_won_at')::TIMESTAMPTZ
             ELSE closed_won_at
           END,
           closed_lost_at = CASE
             WHEN p_patch ? 'closed_lost_at' THEN (p_patch->>'closed_lost_at')::TIMESTAMPTZ
             ELSE closed_lost_at
           END,
           closed_lost_reason = CASE
             WHEN p_patch ? 'closed_lost_reason' THEN NULLIF(p_patch->>'closed_lost_reason', '')
             ELSE closed_lost_reason
           END
     WHERE id = p_lead_id;

    INSERT INTO public.audit_logs(
      actor, action, resource_type, resource_id, before_state, after_state, metadata
    ) VALUES (
      p_actor, 'lead.lifecycle_changed', 'lead', p_lead_id,
      jsonb_build_object('status', p_expected_status),
      jsonb_build_object('status', p_next_status, 'reason', p_reason),
      jsonb_build_object(
        'source', 'admin_leads',
        'action_route', '/admin/leads',
        'occurred_at', p_occurred_at,
        'outcome_ledger_version', 'v2'
      )
    ) RETURNING id INTO v_audit_id;
  END IF;

  v_outcome_type := CASE p_next_status
    WHEN 'qualified' THEN 'qualified'
    WHEN 'appointment_set' THEN 'appointment'
    WHEN 'converted' THEN 'closed'
    WHEN 'dead' THEN 'lost'
    WHEN 'spam' THEN 'disqualified'
    ELSE NULL
  END;

  IF v_outcome_type IS NOT NULL THEN
    v_external_id := format('admin_lifecycle:%s:%s', p_lead_id, v_outcome_type);
    INSERT INTO public.lead_outcomes(
      lead_id,
      outcome_type,
      amount_usd,
      occurred_at,
      source_system,
      external_id,
      is_test,
      communication_suppressed,
      metadata
    ) VALUES (
      p_lead_id,
      v_outcome_type,
      CASE WHEN v_outcome_type = 'closed' THEN p_outcome_amount_usd ELSE NULL END,
      p_occurred_at,
      'admin_lead_lifecycle',
      v_external_id,
      v_lead.is_test,
      v_lead.communication_suppressed,
      jsonb_build_object(
        'lifecycle_status', p_next_status,
        'reason', p_reason,
        'actor', p_actor,
        'audit_id', v_audit_id,
        'idempotent_replay', v_idempotent_replay
      )
    )
    ON CONFLICT (source_system, external_id) WHERE external_id IS NOT NULL
    DO UPDATE SET
      amount_usd = CASE
        WHEN EXCLUDED.outcome_type = 'closed' AND EXCLUDED.amount_usd IS NOT NULL
          THEN EXCLUDED.amount_usd
        ELSE lead_outcomes.amount_usd
      END,
      is_test = EXCLUDED.is_test,
      communication_suppressed = EXCLUDED.communication_suppressed,
      metadata = CASE
        WHEN v_idempotent_replay THEN
          -- A same-state replay may repair revenue, but it must not rewrite the
          -- original transition actor, reason, or audit evidence. Record replay
          -- provenance under separate keys instead.
          lead_outcomes.metadata || jsonb_build_object(
            'last_replay_actor', p_actor,
            'last_replay_at', p_occurred_at,
            'idempotent_replay', true
          )
        ELSE lead_outcomes.metadata || EXCLUDED.metadata
      END,
      updated_at = NOW()
    RETURNING id INTO v_outcome_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', p_next_status,
    'audit_id', v_audit_id,
    'outcome_id', v_outcome_id,
    'idempotent_replay', v_idempotent_replay
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mutate_admin_lead_status_v2(
  UUID, TEXT, TEXT, JSONB, TEXT, NUMERIC, TEXT, TIMESTAMPTZ
) FROM PUBLIC;

-- Canonical Neon has a server-only service_role but may not define the
-- Supabase browser roles. Revoke them when present without making either role
-- a migration prerequisite.
DO $phase9_outcome_function_privileges$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.mutate_admin_lead_status_v2(uuid, text, text, jsonb, text, numeric, text, timestamptz) FROM %I',
        role_name
      );
    END IF;
  END LOOP;
END
$phase9_outcome_function_privileges$;

GRANT EXECUTE ON FUNCTION public.mutate_admin_lead_status_v2(
  UUID, TEXT, TEXT, JSONB, TEXT, NUMERIC, TEXT, TIMESTAMPTZ
) TO service_role;

COMMENT ON FUNCTION public.mutate_admin_lead_status_v2(
  UUID, TEXT, TEXT, JSONB, TEXT, NUMERIC, TEXT, TIMESTAMPTZ
) IS 'Atomically records an AdminOps lifecycle transition, immutable audit event, and idempotent canonical growth outcome. Optional amount is actual closed brokerage revenue only.';

-- Historical reconciliation is deliberately deterministic and non-destructive.
-- It creates at most one lifecycle-derived outcome per lead and stage, copies
-- test/suppression state, and never invents revenue.
INSERT INTO public.lead_outcomes(
  lead_id,
  outcome_type,
  amount_usd,
  occurred_at,
  source_system,
  external_id,
  is_test,
  communication_suppressed,
  metadata
)
SELECT
  l.id,
  mapped.outcome_type,
  NULL,
  mapped.occurred_at,
  'admin_lead_lifecycle',
  format('admin_lifecycle:%s:%s', l.id, mapped.outcome_type),
  l.is_test,
  l.communication_suppressed,
  jsonb_build_object(
    'lifecycle_status', l.status,
    'backfilled', true,
    'migration', '20260819223000_admin_outcome_ledger'
  )
FROM public.leads l
CROSS JOIN LATERAL (
  SELECT
    CASE l.status
      WHEN 'qualified' THEN 'qualified'
      WHEN 'appointment_set' THEN 'appointment'
      WHEN 'converted' THEN 'closed'
      WHEN 'dead' THEN 'lost'
      WHEN 'spam' THEN 'disqualified'
      ELSE NULL
    END AS outcome_type,
    CASE l.status
      WHEN 'converted' THEN COALESCE(l.closed_won_at, l.converted_at, l.updated_at, l.created_at)
      WHEN 'dead' THEN COALESCE(l.closed_lost_at, l.updated_at, l.created_at)
      ELSE COALESCE(l.updated_at, l.created_at)
    END AS occurred_at
) mapped
WHERE mapped.outcome_type IS NOT NULL
ON CONFLICT (source_system, external_id) WHERE external_id IS NOT NULL DO NOTHING;

-- Rollback: deploy application code that calls mutate_admin_lead_status_v1.
-- Preserve lead_outcomes for audit and attribution. Dropping v2 is optional and
-- should occur only after rollback validation:
-- DROP FUNCTION public.mutate_admin_lead_status_v2(UUID, TEXT, TEXT, JSONB, TEXT, NUMERIC, TEXT, TIMESTAMPTZ);
