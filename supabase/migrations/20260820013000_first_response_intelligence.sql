-- Phase 9 first-human-response intelligence.
-- Additive and server-only. This migration records an immutable first human
-- response milestone; it does not send a message, contact a consumer, change
-- provider configuration, or infer a response from an internal workflow step.

CREATE TABLE IF NOT EXISTS public.lead_response_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  first_human_response_at timestamptz NOT NULL,
  source_system text NOT NULL,
  actor text NOT NULL,
  responder_user_id text,
  responder_agent_id uuid,
  assigned_agent_id_at_response uuid,
  evidence_audit_id uuid REFERENCES public.audit_logs(id) ON DELETE SET NULL,
  is_test boolean NOT NULL DEFAULT false,
  communication_suppressed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS lead_response_milestones_response_idx
  ON public.lead_response_milestones(first_human_response_at DESC);
CREATE INDEX IF NOT EXISTS lead_response_milestones_responder_agent_idx
  ON public.lead_response_milestones(responder_agent_id, first_human_response_at DESC)
  WHERE responder_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lead_response_milestones_assigned_agent_idx
  ON public.lead_response_milestones(assigned_agent_id_at_response, first_human_response_at DESC)
  WHERE assigned_agent_id_at_response IS NOT NULL;

ALTER TABLE public.lead_response_milestones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_response_milestones FROM PUBLIC;

DROP TRIGGER IF EXISTS lead_response_milestones_reject_change
  ON public.lead_response_milestones;
CREATE TRIGGER lead_response_milestones_reject_change
  BEFORE UPDATE ON public.lead_response_milestones
  FOR EACH ROW EXECUTE FUNCTION public.amm_reject_immutable_change();

DO $phase9_first_response_privileges$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE public.lead_response_milestones FROM %I',
        role_name
      );
    END IF;
  END LOOP;
END
$phase9_first_response_privileges$;

CREATE OR REPLACE FUNCTION public.record_admin_first_response_v1(
  p_lead_id uuid,
  p_actor text DEFAULT 'system/admin_basic_auth',
  p_occurred_at timestamptz DEFAULT now(),
  p_source_system text DEFAULT 'admin_lead_detail'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead record;
  v_existing record;
  v_after_status text;
  v_audit_id uuid;
  v_milestone_id uuid;
  v_responder_user_id text;
  v_responder_agent_id uuid;
BEGIN
  IF p_actor IS NULL OR btrim(p_actor) = '' OR
     p_source_system NOT IN ('admin_lead_detail', 'admin_lead_lifecycle') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_response_evidence');
  END IF;

  SELECT id, status, created_at, last_contacted_at, is_test,
         communication_suppressed, assigned_agent_id
    INTO v_lead
    FROM public.leads
   WHERE id = p_lead_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;
  IF p_occurred_at < v_lead.created_at OR p_occurred_at > now() + interval '1 minute' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_response_time');
  END IF;

  SELECT id, first_human_response_at, evidence_audit_id
    INTO v_existing
    FROM public.lead_response_milestones
   WHERE lead_id = p_lead_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', v_lead.status,
      'milestone_id', v_existing.id,
      'audit_id', v_existing.evidence_audit_id,
      'first_human_response_at', v_existing.first_human_response_at,
      'idempotent_replay', true
    );
  END IF;

  -- Resolve the authenticated Lead Center actor without trusting a browser-
  -- supplied agent ID. A user may be an administrator without an agent link;
  -- that remains a truthful user-attributed response rather than being
  -- silently credited to the lead's current owner.
  IF p_actor LIKE 'lead_center:%' THEN
    SELECT u.id, a.id
      INTO v_responder_user_id, v_responder_agent_id
      FROM public.lead_center_users u
      LEFT JOIN public.agents a ON a.id::text = u."agentId"
     WHERE u.id = substring(p_actor FROM length('lead_center:') + 1)
     LIMIT 1;
  END IF;

  v_after_status := CASE
    WHEN v_lead.status IN ('new', 'scored', 'assigned', 'escalated') THEN 'contacted'
    ELSE v_lead.status
  END;

  UPDATE public.leads
     SET status = v_after_status,
         conversion_stage = CASE
           WHEN v_after_status = 'contacted' THEN 'contacted'
           ELSE conversion_stage
         END,
         last_contacted_at = CASE
           WHEN last_contacted_at IS NULL OR last_contacted_at < p_occurred_at
             THEN p_occurred_at
           ELSE last_contacted_at
         END,
         updated_at = now()
   WHERE id = p_lead_id;

  INSERT INTO public.audit_logs(
    actor, action, resource_type, resource_id, before_state, after_state, metadata
  ) VALUES (
    p_actor,
    'lead.first_human_response_recorded',
    'lead',
    p_lead_id,
    jsonb_build_object(
      'status', v_lead.status,
      'last_contacted_at', v_lead.last_contacted_at
    ),
    jsonb_build_object(
      'status', v_after_status,
      'first_human_response_at', p_occurred_at
    ),
    jsonb_build_object(
      'source', p_source_system,
      'measurement', 'first_human_response',
      'occurred_at', p_occurred_at
    )
  ) RETURNING id INTO v_audit_id;

  INSERT INTO public.lead_response_milestones(
    lead_id,
    first_human_response_at,
    source_system,
    actor,
    responder_user_id,
    responder_agent_id,
    assigned_agent_id_at_response,
    evidence_audit_id,
    is_test,
    communication_suppressed,
    metadata
  ) VALUES (
    p_lead_id,
    p_occurred_at,
    p_source_system,
    p_actor,
    v_responder_user_id,
    v_responder_agent_id,
    v_lead.assigned_agent_id,
    v_audit_id,
    v_lead.is_test,
    v_lead.communication_suppressed,
    jsonb_build_object(
      'recording_version', 'v1',
      'response_owner_evidence', CASE
        WHEN v_responder_agent_id IS NOT NULL THEN 'responder_agent'
        WHEN v_responder_user_id IS NOT NULL THEN 'responder_user'
        WHEN v_lead.assigned_agent_id IS NOT NULL THEN 'assigned_owner_snapshot'
        ELSE 'unattributed'
      END
    )
  ) RETURNING id INTO v_milestone_id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', v_after_status,
    'milestone_id', v_milestone_id,
    'audit_id', v_audit_id,
    'first_human_response_at', p_occurred_at,
    'idempotent_replay', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_admin_first_response_v1(
  uuid, text, timestamptz, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_admin_first_response_v1(
  uuid, text, timestamptz, text
) TO service_role;

-- Wrapper versioning keeps the complete v2 outcome-ledger transaction as the
-- rollback boundary while adding the first-response milestone atomically when
-- the explicit lifecycle action is "contacted".
CREATE OR REPLACE FUNCTION public.mutate_admin_lead_status_v3(
  p_lead_id uuid,
  p_expected_status text,
  p_next_status text,
  p_patch jsonb,
  p_reason text DEFAULT NULL,
  p_outcome_amount_usd numeric DEFAULT NULL,
  p_actor text DEFAULT 'system/admin_basic_auth',
  p_occurred_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_response jsonb;
BEGIN
  v_result := public.mutate_admin_lead_status_v2(
    p_lead_id,
    p_expected_status,
    p_next_status,
    p_patch,
    p_reason,
    p_outcome_amount_usd,
    p_actor,
    p_occurred_at
  );

  IF COALESCE((v_result->>'ok')::boolean, false) = false THEN
    RETURN v_result;
  END IF;

  IF p_next_status = 'contacted' THEN
    v_response := public.record_admin_first_response_v1(
      p_lead_id,
      p_actor,
      p_occurred_at,
      'admin_lead_lifecycle'
    );
    IF COALESCE((v_response->>'ok')::boolean, false) = false THEN
      RAISE EXCEPTION 'first response milestone failed: %', v_response->>'error';
    END IF;
    v_result := v_result || jsonb_build_object(
      'response_milestone_id', v_response->>'milestone_id',
      'response_idempotent_replay', (v_response->>'idempotent_replay')::boolean
    );
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.mutate_admin_lead_status_v3(
  uuid, text, text, jsonb, text, numeric, text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mutate_admin_lead_status_v3(
  uuid, text, text, jsonb, text, numeric, text, timestamptz
) TO service_role;

-- Backfill only explicit, immutable Lead Center contact evidence. A mutable
-- legacy last_contacted_at value alone is not treated as proof of first response.
WITH first_contact_audit AS (
  SELECT DISTINCT ON (a.resource_id)
         a.resource_id::uuid AS lead_id,
         a.id AS audit_id,
         a.actor,
         u.id AS responder_user_id,
         ra.id AS responder_agent_id,
         a.created_at AS occurred_at
    FROM public.audit_logs a
    LEFT JOIN public.lead_center_users u
      ON a.actor = 'lead_center:' || u.id
    LEFT JOIN public.agents ra
      ON ra.id::text = u."agentId"
   WHERE a.resource_type = 'lead'
     AND a.action = 'lead.lifecycle_changed'
     AND a.after_state->>'status' = 'contacted'
     AND a.resource_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   ORDER BY a.resource_id, a.created_at ASC, a.id ASC
)
INSERT INTO public.lead_response_milestones(
  lead_id,
  first_human_response_at,
  source_system,
  actor,
  responder_user_id,
  responder_agent_id,
  assigned_agent_id_at_response,
  evidence_audit_id,
  is_test,
  communication_suppressed,
  metadata
)
SELECT
  l.id,
  a.occurred_at,
  'admin_lead_lifecycle',
  a.actor,
  a.responder_user_id,
  a.responder_agent_id,
  NULL,
  a.audit_id,
  l.is_test,
  l.communication_suppressed,
  jsonb_build_object(
    'recording_version', 'v1',
    'backfilled', true,
    'response_owner_evidence', CASE
      WHEN a.responder_agent_id IS NOT NULL THEN 'responder_agent'
      WHEN a.responder_user_id IS NOT NULL THEN 'responder_user'
      ELSE 'unattributed'
    END,
    'assigned_owner_snapshot_available', false,
    'migration', '20260820013000_first_response_intelligence'
  )
FROM first_contact_audit a
JOIN public.leads l ON l.id = a.lead_id
WHERE a.occurred_at >= l.created_at
ON CONFLICT (lead_id) DO NOTHING;

COMMENT ON TABLE public.lead_response_milestones IS
  'Immutable first-human-response and server-resolved responder/assignment evidence for truthful speed-to-lead percentiles. Test and suppressed rows are excluded from business reporting.';
COMMENT ON FUNCTION public.record_admin_first_response_v1(
  uuid, text, timestamptz, text
) IS 'Records one server-only first-human-response milestone and audit event; never sends a consumer message.';
COMMENT ON FUNCTION public.mutate_admin_lead_status_v3(
  uuid, text, text, jsonb, text, numeric, text, timestamptz
) IS 'Extends lifecycle/outcome v2 with an atomic first-human-response milestone for the explicit contacted state.';

-- Application rollback: deploy code that calls mutate_admin_lead_status_v2.
-- Preserve lead_response_milestones and audits. The v3 and dedicated response
-- functions may remain dormant until a separately reviewed cleanup.
