-- Canonical Neon persistence for the secondary Lead Center REST surface.
--
-- These functions replace the former Supabase-only route implementations and
-- make a successful HTTP response mean that both the business row and its
-- audit row were committed in the same PostgreSQL transaction.

CREATE OR REPLACE FUNCTION public.patch_admin_lead_v1(
  p_lead_id UUID,
  p_patch JSONB,
  p_actor TEXT DEFAULT 'system/admin_api',
  p_occurred_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
  v_effective_patch JSONB := p_patch;
  v_audit_id UUID;
  v_prior_status TEXT;
  v_updated_at TIMESTAMPTZ;
BEGIN
  IF p_patch IS NULL
     OR jsonb_typeof(p_patch) <> 'object'
     OR p_patch = '{}'::JSONB THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_patch');
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_object_keys(p_patch) AS field_name
     WHERE field_name NOT IN (
       'status', 'lead_type', 'lead_grade', 'next_follow_up_at',
       'last_contacted_at', 'closed_lost_reason',
       'restore_status_before_spam'
     )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_patch_field');
  END IF;

  IF p_patch ? 'restore_status_before_spam'
     AND (
       jsonb_typeof(p_patch->'restore_status_before_spam') <> 'boolean'
       OR (p_patch->>'restore_status_before_spam')::BOOLEAN IS NOT TRUE
       OR p_patch ? 'status'
     ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_patch_value');
  END IF;

  IF p_patch ? 'status' AND COALESCE(p_patch->>'status', '') NOT IN (
    'new', 'scored', 'qualified', 'assigned', 'contacted',
    'appointment_requested', 'appointment_set', 'nurture', 'dead',
    'converted', 'spam', 'escalated'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_patch_value');
  END IF;
  IF p_patch ? 'lead_type' AND COALESCE(p_patch->>'lead_type', '') NOT IN (
    'buyer', 'seller', 'seller_cash_offer', 'investor', 'listing_inquiry',
    'home_value', 'relocation', 'renter', 'agent_referral',
    'general_question', 'unknown'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_patch_value');
  END IF;
  IF p_patch ? 'lead_grade'
     AND p_patch->>'lead_grade' IS NOT NULL
     AND p_patch->>'lead_grade' NOT IN ('A+', 'A', 'B', 'C', 'D') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_patch_value');
  END IF;
  IF p_patch ? 'closed_lost_reason'
     AND LENGTH(COALESCE(p_patch->>'closed_lost_reason', '')) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_patch_value');
  END IF;

  SELECT jsonb_build_object(
    'status', status,
    'lead_type', lead_type,
    'lead_grade', lead_grade,
    'next_follow_up_at', next_follow_up_at,
    'last_contacted_at', last_contacted_at,
    'closed_lost_reason', closed_lost_reason
  )
    INTO v_before
    FROM public.leads
   WHERE id = p_lead_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;

  -- Restore the last durable pre-spam status from immutable audit history.
  -- The fallback is "new" only for legacy spam rows with no usable history.
  IF COALESCE((p_patch->>'restore_status_before_spam')::BOOLEAN, false) THEN
    SELECT before_state->>'status'
      INTO v_prior_status
      FROM public.audit_logs
     WHERE resource_type = 'lead'
       AND resource_id = p_lead_id
       AND action = 'lead.updated'
       AND after_state->>'status' = 'spam'
       AND before_state->>'status' IN (
         'new', 'scored', 'qualified', 'assigned', 'contacted',
         'appointment_requested', 'appointment_set', 'nurture', 'dead',
         'converted', 'escalated'
       )
     ORDER BY created_at DESC, id DESC
     LIMIT 1;
    v_prior_status := COALESCE(v_prior_status, 'new');
    v_effective_patch := (p_patch - 'restore_status_before_spam')
      || jsonb_build_object('status', v_prior_status);
  END IF;

  BEGIN
    UPDATE public.leads
       SET status = CASE
             WHEN v_effective_patch ? 'status' THEN v_effective_patch->>'status'
             ELSE status
           END,
           lead_type = CASE
             WHEN v_effective_patch ? 'lead_type' THEN v_effective_patch->>'lead_type'
             ELSE lead_type
           END,
           lead_grade = CASE
             WHEN v_effective_patch ? 'lead_grade' THEN NULLIF(v_effective_patch->>'lead_grade', '')
             ELSE lead_grade
           END,
           next_follow_up_at = CASE
             WHEN v_effective_patch ? 'next_follow_up_at'
               THEN NULLIF(v_effective_patch->>'next_follow_up_at', '')::TIMESTAMPTZ
             ELSE next_follow_up_at
           END,
           last_contacted_at = CASE
             WHEN v_effective_patch ? 'last_contacted_at'
               THEN NULLIF(v_effective_patch->>'last_contacted_at', '')::TIMESTAMPTZ
             ELSE last_contacted_at
           END,
           closed_lost_reason = CASE
             WHEN v_effective_patch ? 'closed_lost_reason'
               THEN NULLIF(v_effective_patch->>'closed_lost_reason', '')
             ELSE closed_lost_reason
           END
     WHERE id = p_lead_id
     RETURNING updated_at,
       jsonb_build_object(
         'status', status,
         'lead_type', lead_type,
         'lead_grade', lead_grade,
         'next_follow_up_at', next_follow_up_at,
         'last_contacted_at', last_contacted_at,
         'closed_lost_reason', closed_lost_reason
       )
       INTO v_updated_at, v_after;
  EXCEPTION
    WHEN invalid_text_representation OR datetime_field_overflow OR check_violation THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_patch_value');
  END;

  INSERT INTO public.audit_logs(
    created_at, actor, action, resource_type, resource_id,
    before_state, after_state, metadata
  ) VALUES (
    COALESCE(p_occurred_at, NOW()),
    COALESCE(NULLIF(BTRIM(p_actor), ''), 'system/admin_api'),
    'lead.updated',
    'lead',
    p_lead_id,
    v_before,
    v_after,
    jsonb_build_object(
      'source', 'admin_lead_api',
      'changed_fields', to_jsonb(ARRAY(SELECT jsonb_object_keys(v_effective_patch)))
    )
  ) RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'lead_id', p_lead_id,
    'audit_id', v_audit_id,
    'updated_at', v_updated_at,
    'patch', v_effective_patch,
    'resolved_status', CASE
      WHEN p_patch ? 'restore_status_before_spam' THEN v_after->>'status'
      ELSE NULL
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.add_admin_lead_note_v1(
  p_lead_id UUID,
  p_content TEXT,
  p_agent_id UUID DEFAULT NULL,
  p_actor TEXT DEFAULT 'system/admin_api',
  p_occurred_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_message_id UUID;
  v_audit_id UUID;
  v_created_at TIMESTAMPTZ;
  v_content TEXT := BTRIM(COALESCE(p_content, ''));
BEGIN
  IF v_content = '' OR LENGTH(v_content) > 5000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_note');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.leads WHERE id = p_lead_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;
  IF p_agent_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.agents WHERE id = p_agent_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'agent_not_found');
  END IF;

  INSERT INTO public.messages(
    created_at, lead_id, role, content, content_type, agent_id
  ) VALUES (
    COALESCE(p_occurred_at, NOW()), p_lead_id, 'agent', v_content, 'text', p_agent_id
  ) RETURNING id, created_at INTO v_message_id, v_created_at;

  INSERT INTO public.audit_logs(
    created_at, actor, action, resource_type, resource_id, after_state, metadata
  ) VALUES (
    COALESCE(p_occurred_at, NOW()),
    COALESCE(NULLIF(BTRIM(p_actor), ''), 'system/admin_api'),
    'lead.note_added',
    'lead',
    p_lead_id,
    jsonb_build_object(
      'message_id', v_message_id,
      'content_length', LENGTH(v_content),
      'agent_id', p_agent_id
    ),
    jsonb_build_object('source', 'admin_lead_api')
  ) RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'message_id', v_message_id,
    'audit_id', v_audit_id,
    'created_at', v_created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_admin_lead_task_v1(
  p_lead_id UUID,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_due_at TIMESTAMPTZ DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_category TEXT DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL,
  p_actor TEXT DEFAULT 'system/admin_api',
  p_occurred_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_task_id UUID;
  v_audit_id UUID;
  v_created_at TIMESTAMPTZ;
  v_title TEXT := BTRIM(COALESCE(p_title, ''));
BEGIN
  IF v_title = '' OR LENGTH(v_title) > 200
     OR LENGTH(COALESCE(p_body, '')) > 5000
     OR LENGTH(COALESCE(p_category, '')) > 100
     OR p_priority NOT IN ('low', 'normal', 'high', 'urgent') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_task');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.leads WHERE id = p_lead_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;
  IF p_agent_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.agents WHERE id = p_agent_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'agent_not_found');
  END IF;

  INSERT INTO public.tasks(
    created_at, updated_at, lead_id, agent_id, created_by,
    title, body, due_at, priority, category
  ) VALUES (
    COALESCE(p_occurred_at, NOW()),
    COALESCE(p_occurred_at, NOW()),
    p_lead_id,
    p_agent_id,
    COALESCE(NULLIF(BTRIM(p_actor), ''), 'system/admin_api'),
    v_title,
    NULLIF(BTRIM(COALESCE(p_body, '')), ''),
    p_due_at,
    p_priority,
    NULLIF(BTRIM(COALESCE(p_category, '')), '')
  ) RETURNING id, created_at INTO v_task_id, v_created_at;

  INSERT INTO public.audit_logs(
    created_at, actor, action, resource_type, resource_id, after_state, metadata
  ) VALUES (
    COALESCE(p_occurred_at, NOW()),
    COALESCE(NULLIF(BTRIM(p_actor), ''), 'system/admin_api'),
    'lead.task_created',
    'lead',
    p_lead_id,
    jsonb_build_object(
      'task_id', v_task_id,
      'title_length', LENGTH(v_title),
      'due_at', p_due_at,
      'priority', p_priority,
      'category', NULLIF(BTRIM(COALESCE(p_category, '')), ''),
      'agent_id', p_agent_id
    ),
    jsonb_build_object('source', 'admin_lead_api')
  ) RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'task_id', v_task_id,
    'audit_id', v_audit_id,
    'created_at', v_created_at
  );
END;
$$;

-- Preserve the proven atomic assignment implementation while recording the
-- operator-provided routing reason in the current routing row, assignment row,
-- and a dedicated immutable audit event.
CREATE OR REPLACE FUNCTION public.mutate_admin_assignment_v2(
  p_lead_id UUID,
  p_agent_id UUID,
  p_expected_agent_id UUID,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL,
  p_notification_mode TEXT DEFAULT 'disabled',
  p_actor TEXT DEFAULT 'system/admin_basic_auth',
  p_occurred_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_assignment_audit_id UUID;
  v_reason_audit_id UUID;
  v_reason TEXT := COALESCE(NULLIF(BTRIM(p_reason), ''), 'manual_admin_assignment');
BEGIN
  IF LENGTH(v_reason) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_assignment_action');
  END IF;

  v_result := public.mutate_admin_assignment_v1(
    p_lead_id,
    p_agent_id,
    p_expected_agent_id,
    p_action,
    p_notification_mode,
    p_actor,
    p_occurred_at
  );

  IF v_result->>'ok' <> 'true' OR COALESCE((v_result->>'idempotent_replay')::BOOLEAN, false) THEN
    RETURN v_result;
  END IF;

  v_assignment_audit_id := NULLIF(v_result->>'audit_id', '')::UUID;
  IF p_agent_id IS NOT NULL THEN
    UPDATE public.lead_routing
       SET assignment_reason = v_reason
     WHERE lead_id = p_lead_id;
    UPDATE public.agent_assignments
       SET assignment_reason = v_reason
     WHERE idempotency_key = 'admin-assignment:' || v_assignment_audit_id::TEXT;
  END IF;

  INSERT INTO public.audit_logs(
    created_at, actor, action, resource_type, resource_id, after_state, metadata
  ) VALUES (
    COALESCE(p_occurred_at, NOW()),
    COALESCE(NULLIF(BTRIM(p_actor), ''), 'system/admin_basic_auth'),
    'lead.assignment_reason_recorded',
    'lead',
    p_lead_id,
    jsonb_build_object(
      'assigned_agent_id', p_agent_id,
      'assignment_reason', v_reason
    ),
    jsonb_build_object(
      'source', 'admin_lead_api',
      'assignment_audit_id', v_assignment_audit_id
    )
  ) RETURNING id INTO v_reason_audit_id;

  RETURN v_result || jsonb_build_object(
    'assignment_reason', v_reason,
    'reason_audit_id', v_reason_audit_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.patch_admin_lead_v1(UUID, JSONB, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_admin_lead_note_v1(UUID, TEXT, UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_admin_lead_task_v1(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mutate_admin_assignment_v2(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;

DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.patch_admin_lead_v1(uuid, jsonb, text, timestamptz) FROM %I',
        role_name
      );
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.add_admin_lead_note_v1(uuid, text, uuid, text, timestamptz) FROM %I',
        role_name
      );
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.create_admin_lead_task_v1(uuid, text, text, timestamptz, text, text, uuid, text, timestamptz) FROM %I',
        role_name
      );
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.mutate_admin_assignment_v2(uuid, uuid, uuid, text, text, text, text, timestamptz) FROM %I',
        role_name
      );
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.patch_admin_lead_v1(uuid, jsonb, text, timestamptz) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.add_admin_lead_note_v1(uuid, text, uuid, text, timestamptz) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_admin_lead_task_v1(uuid, text, text, timestamptz, text, text, uuid, text, timestamptz) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.mutate_admin_assignment_v2(uuid, uuid, uuid, text, text, text, text, timestamptz) TO service_role';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.patch_admin_lead_v1(UUID, JSONB, TEXT, TIMESTAMPTZ) IS
  'Atomically patches allowlisted Lead Center fields and records an immutable audit row.';
COMMENT ON FUNCTION public.add_admin_lead_note_v1(UUID, TEXT, UUID, TEXT, TIMESTAMPTZ) IS
  'Atomically stores an internal lead note and its privacy-minimized audit evidence.';
COMMENT ON FUNCTION public.create_admin_lead_task_v1(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ) IS
  'Atomically stores a Lead Center task and its immutable audit evidence.';
COMMENT ON FUNCTION public.mutate_admin_assignment_v2(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) IS
  'Extends atomic assignment with a durable operator-supplied routing reason.';
