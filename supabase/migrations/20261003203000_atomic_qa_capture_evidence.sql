-- Additive P0: preserve v1 signature, locking, fingerprint and outbox policy.
-- Predecessor: 20260716043829_infra_02_atomic_lifecycle.sql.
-- PR #279's optional v2 delegates to v1 and must retain this invariant.
BEGIN;

CREATE OR REPLACE FUNCTION public.capture_public_lead_v1(
  p_session JSONB,
  p_lead JSONB,
  p_attribution JSONB,
  p_notification_mode TEXT DEFAULT 'disabled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session_id UUID := (p_session->>'id')::UUID;
  v_lead_id UUID;
  v_existing_lead RECORD;
  v_contact_id UUID;
  v_identity_contact UUID;
  v_email_contact UUID;
  v_phone_contact UUID;
  v_email TEXT := public.amm_normalize_email(p_lead->>'normalized_email');
  v_phone TEXT := public.amm_normalize_phone(p_lead->>'normalized_phone');
  v_request_fingerprint TEXT := public.amm_public_lead_request_fingerprint(p_lead, p_attribution);
  v_duplicate_id UUID;
  v_agent RECORD;
  v_agent_id UUID;
  v_active_count INTEGER := 0;
  v_assigned_at TIMESTAMPTZ;
  v_capture_audit_id UUID;
  v_assignment_audit_id UUID;
  v_notification_id UUID;
  v_notification_status TEXT;
  v_lock_key TEXT;
  -- Derived by the existing server classifier; this RPC is not browser-callable.
  v_is_qa BOOLEAN := COALESCE((p_lead->>'is_test')::BOOLEAN, false);
BEGIN
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'session id is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('amm:session:' || v_session_id::TEXT, 0));

  SELECT id, session_id, widget_session_id, duplicate_of_lead_id,
         request_fingerprint,
         assigned_agent_id, assignment_status
    INTO v_existing_lead
    FROM public.leads
   WHERE session_id = v_session_id
   FOR UPDATE;

  IF FOUND THEN
    IF v_existing_lead.request_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'idempotency_conflict',
        'session_id', v_session_id,
        'idempotent_replay', false
      );
    END IF;
    RETURN jsonb_build_object(
      'ok', true,
      'lead_id', v_existing_lead.id,
      'session_id', v_existing_lead.session_id,
      'widget_session_id', v_existing_lead.widget_session_id,
      'duplicate_of_lead_id', v_existing_lead.duplicate_of_lead_id,
      'assigned_agent_id', v_existing_lead.assigned_agent_id,
      'assignment_status', COALESCE(v_existing_lead.assignment_status, 'unassigned'),
      'idempotent_replay', true
    );
  END IF;

  PERFORM 1
    FROM public.sessions
   WHERE id = v_session_id
   FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'idempotency_conflict',
      'session_id', v_session_id,
      'idempotent_replay', false
    );
  END IF;

  FOR v_lock_key IN
    SELECT key FROM (
      VALUES
        (CASE WHEN v_email IS NULL THEN NULL ELSE 'amm:identity:email:' || v_email END),
        (CASE WHEN v_phone IS NULL THEN NULL ELSE 'amm:identity:phone:' || v_phone END)
    ) identities(key)
    WHERE key IS NOT NULL
    ORDER BY key
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));
  END LOOP;

  IF v_email IS NOT NULL THEN
    SELECT contact_id INTO v_email_contact
      FROM public.contact_identities
     WHERE identity_type = 'email' AND normalized_value = v_email;
  END IF;
  IF v_phone IS NOT NULL THEN
    SELECT contact_id INTO v_phone_contact
      FROM public.contact_identities
     WHERE identity_type = 'phone' AND normalized_value = v_phone;
  END IF;
  IF v_email_contact IS NOT NULL
     AND v_phone_contact IS NOT NULL
     AND v_email_contact <> v_phone_contact THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'identity_conflict',
      'session_id', v_session_id,
      'idempotent_replay', false
    );
  END IF;

  v_contact_id := COALESCE(v_email_contact, v_phone_contact);

  BEGIN
  IF v_contact_id IS NULL AND (v_email IS NOT NULL OR v_phone IS NOT NULL) THEN
    INSERT INTO public.contacts(first_name, last_name, email, phone, phone_normalized)
    VALUES (
      NULLIF(p_lead->>'first_name', ''),
      NULLIF(p_lead->>'last_name', ''),
      v_email,
      NULLIF(p_lead->>'phone', ''),
      v_phone
    )
    RETURNING id INTO v_contact_id;
  END IF;

  IF v_contact_id IS NOT NULL AND v_email IS NOT NULL THEN
    INSERT INTO public.contact_identities(identity_type, normalized_value, contact_id)
    VALUES ('email', v_email, v_contact_id)
    ON CONFLICT (identity_type, normalized_value) DO NOTHING;
    SELECT contact_id INTO v_identity_contact
      FROM public.contact_identities
     WHERE identity_type = 'email' AND normalized_value = v_email;
    IF v_identity_contact IS NOT NULL AND v_identity_contact <> v_contact_id THEN
      RAISE EXCEPTION 'identity_conflict' USING ERRCODE = 'AMM01';
    END IF;
  END IF;
  IF v_contact_id IS NOT NULL AND v_phone IS NOT NULL THEN
    INSERT INTO public.contact_identities(identity_type, normalized_value, contact_id)
    VALUES ('phone', v_phone, v_contact_id)
    ON CONFLICT (identity_type, normalized_value) DO NOTHING;
    SELECT contact_id INTO v_identity_contact
      FROM public.contact_identities
     WHERE identity_type = 'phone' AND normalized_value = v_phone;
    IF v_identity_contact IS NOT NULL AND v_identity_contact <> v_contact_id THEN
      RAISE EXCEPTION 'identity_conflict' USING ERRCODE = 'AMM01';
    END IF;
  END IF;

  SELECT l.id INTO v_duplicate_id
    FROM public.leads l
   WHERE l.is_duplicate = false
     AND (
       (v_email IS NOT NULL AND l.normalized_email = v_email) OR
       (v_phone IS NOT NULL AND public.amm_normalize_phone(COALESCE(l.normalized_phone, l.phone_normalized, l.phone)) = v_phone)
     )
   ORDER BY
     CASE WHEN v_email IS NOT NULL AND l.normalized_email = v_email THEN 0 ELSE 1 END,
     l.created_at,
     l.id
   LIMIT 1;

  INSERT INTO public.sessions(
    id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    referrer_url, referrer_type, landing_page, user_agent, device_type,
    initial_question, initial_address, status, step_reached
  ) VALUES (
    v_session_id,
    NULLIF(p_session->>'utm_source', ''), NULLIF(p_session->>'utm_medium', ''),
    NULLIF(p_session->>'utm_campaign', ''), NULLIF(p_session->>'utm_content', ''),
    NULLIF(p_session->>'utm_term', ''), NULLIF(p_session->>'referrer_url', ''),
    NULLIF(p_session->>'referrer_type', ''), NULLIF(p_session->>'landing_page', ''),
    NULLIF(p_session->>'user_agent', ''), NULLIF(p_session->>'device_type', ''),
    NULLIF(p_session->>'initial_question', ''), NULLIF(p_session->>'initial_address', ''),
    COALESCE(NULLIF(p_session->>'status', ''), 'completed'),
    COALESCE((p_session->>'step_reached')::SMALLINT, 5)
  );

  INSERT INTO public.leads(
    session_id, contact_id, first_name, last_name, email, phone,
    phone_normalized, normalized_email, normalized_phone,
    normalized_property_address, spam_score, spam_reasons, is_duplicate,
    duplicate_of_lead_id, state, address_raw, primary_intent, question_raw,
    timeline_months, consent_sms, consent_call, consent_email,
    consent_timestamp, consent_language_version, status, lead_type, lead_grade,
    conversion_stage, source, source_detail, page_url, widget_session_id,
    request_fingerprint, is_test, communication_suppressed,
    email_suppressed, sms_suppressed
  ) VALUES (
    v_session_id, v_contact_id, NULLIF(p_lead->>'first_name', ''),
    NULLIF(p_lead->>'last_name', ''), NULLIF(p_lead->>'email', ''),
    NULLIF(p_lead->>'phone', ''), NULLIF(p_lead->>'phone_normalized', ''),
    v_email, v_phone, NULLIF(p_lead->>'normalized_property_address', ''),
    COALESCE((p_lead->>'spam_score')::SMALLINT, 0),
    COALESCE(p_lead->'spam_reasons', '[]'::JSONB), v_duplicate_id IS NOT NULL,
    v_duplicate_id, COALESCE(NULLIF(p_lead->>'state', ''), 'NC'),
    NULLIF(p_lead->>'address_raw', ''),
    COALESCE(NULLIF(p_lead->>'primary_intent', ''), 'unknown'),
    NULLIF(p_lead->>'question_raw', ''), (p_lead->>'timeline_months')::SMALLINT,
    COALESCE((p_lead->>'consent_sms')::BOOLEAN, false),
    COALESCE((p_lead->>'consent_call')::BOOLEAN, false),
    COALESCE((p_lead->>'consent_email')::BOOLEAN, false),
    (p_lead->>'consent_timestamp')::TIMESTAMPTZ,
    COALESCE(NULLIF(p_lead->>'consent_language_version', ''), 'canonical_v1'),
    CASE WHEN v_duplicate_id IS NOT NULL THEN 'new' ELSE COALESCE(NULLIF(p_lead->>'status', ''), 'new') END,
    COALESCE(NULLIF(p_lead->>'lead_type', ''), 'unknown'),
    CASE WHEN v_duplicate_id IS NOT NULL THEN 'D' ELSE NULLIF(p_lead->>'lead_grade', '') END,
    CASE WHEN v_duplicate_id IS NOT NULL THEN 'duplicate' ELSE NULLIF(p_lead->>'conversion_stage', '') END,
    NULLIF(p_lead->>'source', ''), NULLIF(p_lead->>'source_detail', ''),
    NULLIF(p_lead->>'page_url', ''), COALESCE(NULLIF(p_lead->>'widget_session_id', ''), v_session_id::TEXT),
    v_request_fingerprint, v_is_qa, v_is_qa, v_is_qa, v_is_qa
  )
  RETURNING id INTO v_lead_id;

  INSERT INTO public.source_attribution(
    session_id, lead_id, utm_source, utm_medium, utm_campaign, utm_content,
    utm_term, referrer_url, referrer_type, landing_page, is_paid
  ) VALUES (
    v_session_id, v_lead_id, NULLIF(p_attribution->>'utm_source', ''),
    NULLIF(p_attribution->>'utm_medium', ''), NULLIF(p_attribution->>'utm_campaign', ''),
    NULLIF(p_attribution->>'utm_content', ''), NULLIF(p_attribution->>'utm_term', ''),
    NULLIF(p_attribution->>'referrer_url', ''), NULLIF(p_attribution->>'referrer_type', ''),
    NULLIF(p_attribution->>'landing_page', ''), COALESCE((p_attribution->>'is_paid')::BOOLEAN, false)
  );

  INSERT INTO public.audit_logs(
    actor, action, resource_type, resource_id, before_state, after_state, metadata
  ) VALUES (
    'system/public_lead_capture', 'lead.created', 'lead', v_lead_id, NULL,
    jsonb_build_object(
      'status', CASE WHEN v_duplicate_id IS NULL THEN COALESCE(NULLIF(p_lead->>'status', ''), 'new') ELSE 'new' END,
      'duplicate_of_lead_id', v_duplicate_id,
      'contact_id', v_contact_id
    ),
    jsonb_build_object('source', 'api_leads', 'session_id', v_session_id)
  ) RETURNING id INTO v_capture_audit_id;

  IF v_is_qa THEN
    -- Required commit effect, not best-effort enrichment. Failure rolls back
    -- contact linkage, lead, attribution, assignment and outbox together.
    -- Exact replays return above under the existing session advisory lock.
    INSERT INTO public.audit_logs(
      actor, action, resource_type, resource_id, before_state, after_state, metadata
    ) VALUES (
      'system/public_lead_capture', 'lead.qa_suppressed', 'lead', v_lead_id, NULL,
      jsonb_build_object(
        'is_test', true, 'communication_suppressed', true,
        'email_suppressed', true, 'sms_suppressed', true
      ),
      jsonb_build_object(
        'source', 'api_leads', 'session_id', v_session_id,
        'classification_policy', 'qa_marker_pair_v1'
      )
    );
  END IF;

  IF v_duplicate_id IS NULL THEN
    -- Serialize capacity selection across every lifecycle writer using this
    -- contract. The selected agent row is also locked before the count is
    -- rechecked and the assignment is written.
    PERFORM pg_advisory_xact_lock(hashtextextended('amm:assignment-capacity', 0));

    SELECT a.* INTO v_agent
      FROM public.agents a
     WHERE a.is_active = true
       AND (
         a.max_daily_leads <= 0 OR
         (
           SELECT COUNT(*)
             FROM public.leads capacity_lead
            WHERE capacity_lead.assigned_agent_id = a.id
              AND capacity_lead.assignment_status = 'assigned'
              AND capacity_lead.status IN (
                'new','scored','assigned','contacted','qualified',
                'appointment_requested','appointment_set','nurture','escalated'
              )
         ) < a.max_daily_leads
       )
     ORDER BY
       a.priority_score DESC,
       (
         SELECT COUNT(*)
           FROM public.leads load_lead
          WHERE load_lead.assigned_agent_id = a.id
            AND load_lead.assignment_status = 'assigned'
            AND load_lead.status IN (
              'new','scored','assigned','contacted','qualified',
              'appointment_requested','appointment_set','nurture','escalated'
            )
       ) ASC,
       a.current_load ASC,
       a.id
     LIMIT 1
     FOR UPDATE;

    IF FOUND THEN
      v_agent_id := v_agent.id;
      SELECT COUNT(*) INTO v_active_count
        FROM public.leads
       WHERE assigned_agent_id = v_agent.id
         AND assignment_status = 'assigned'
         AND status IN (
           'new','scored','assigned','contacted','qualified',
           'appointment_requested','appointment_set','nurture','escalated'
         );

      IF v_agent.max_daily_leads <= 0 OR v_active_count < v_agent.max_daily_leads THEN
        v_assigned_at := NOW();

        UPDATE public.leads
           SET assigned_agent_id = v_agent.id,
               assigned_at = v_assigned_at,
               assignment_status = 'assigned',
               status = 'assigned',
               conversion_stage = 'assigned'
         WHERE id = v_lead_id;

        INSERT INTO public.lead_routing(
          lead_id, agent_id, assigned_at, assignment_reason,
          agent_priority_score, accept_deadline, contact_deadline, status, notes
        ) VALUES (
          v_lead_id, v_agent.id, v_assigned_at,
          'Public lead routed to highest-priority eligible agent.',
          v_agent.priority_score,
          v_assigned_at + INTERVAL '2 minutes',
          v_assigned_at + INTERVAL '5 minutes',
          'pending', 'Created by capture_public_lead_v1.'
        );

        INSERT INTO public.agent_assignments(
          lead_id, agent_id, assigned_by, assignment_reason, status,
          accept_deadline, contact_deadline, idempotency_key, notes
        ) VALUES (
          v_lead_id, v_agent.id, 'system',
          'Public lead routed to highest-priority eligible agent.', 'pending',
          v_assigned_at + INTERVAL '2 minutes',
          v_assigned_at + INTERVAL '5 minutes',
          'public-capture:' || v_lead_id::TEXT,
          'Atomic assignment from capture_public_lead_v1.'
        );

        INSERT INTO public.audit_logs(
          actor, action, resource_type, resource_id, before_state, after_state, metadata
        ) VALUES (
          'system/public_lead_capture', 'lead.assigned', 'lead', v_lead_id,
          jsonb_build_object('assigned_agent_id', NULL),
          jsonb_build_object('assigned_agent_id', v_agent.id, 'assignment_status', 'assigned'),
          jsonb_build_object('source', 'api_leads', 'action_route', '/api/leads')
        ) RETURNING id INTO v_assignment_audit_id;

        v_notification_status := CASE
          WHEN LOWER(COALESCE(p_notification_mode, 'disabled')) = 'disabled' THEN 'skipped'
          ELSE 'pending'
        END;

        IF COALESCE(v_agent.notification_email, false) THEN
          INSERT INTO public.lead_notifications(
            lead_id, agent_id, assignment_audit_id, assignment_event_at,
            notification_type, channel, recipient_type, recipient_reference,
            template_version, idempotency_key, status, max_attempts, provider,
            error_code, error_summary, failed_at, metadata
          ) VALUES (
            v_lead_id, v_agent.id, v_assignment_audit_id, v_assigned_at,
            'agent_assignment', 'email', 'agent', 'agent:' || v_agent.id::TEXT,
            'agent_assignment_email_v1',
            'lead_assignment:' || v_lead_id::TEXT || ':' || v_agent.id::TEXT || ':email:agent_assignment_email_v1',
            v_notification_status, 3, LOWER(COALESCE(p_notification_mode, 'disabled')),
            CASE WHEN v_notification_status = 'skipped' THEN 'notifications_disabled' ELSE NULL END,
            CASE WHEN v_notification_status = 'skipped' THEN 'Notification provider mode is disabled.' ELSE NULL END,
            CASE WHEN v_notification_status = 'skipped' THEN NOW() ELSE NULL END,
            jsonb_build_object('assignment_route', '/api/leads', 'actor', 'system/public_lead_capture')
          )
          ON CONFLICT (idempotency_key) DO UPDATE
            SET idempotency_key = EXCLUDED.idempotency_key
          RETURNING id INTO v_notification_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'lead_id', v_lead_id,
    'session_id', v_session_id,
    'widget_session_id', COALESCE(NULLIF(p_lead->>'widget_session_id', ''), v_session_id::TEXT),
    'contact_id', v_contact_id,
    'duplicate_of_lead_id', v_duplicate_id,
    'assigned_agent_id', v_agent_id,
    'assignment_status', CASE
      WHEN v_duplicate_id IS NOT NULL THEN 'duplicate'
      WHEN v_agent_id IS NULL THEN 'no_eligible_agent'
      ELSE 'assigned'
    END,
    'capture_audit_id', v_capture_audit_id,
    'assignment_audit_id', v_assignment_audit_id,
    'notification_id', v_notification_id,
    'notification_status', v_notification_status,
    'idempotent_replay', false
  );
  EXCEPTION WHEN SQLSTATE 'AMM01' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'identity_conflict',
      'session_id', v_session_id,
      'idempotent_replay', false
    );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_public_lead_v1(JSONB, JSONB, JSONB, TEXT) FROM PUBLIC;
DO $grants$
DECLARE v_role TEXT;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.capture_public_lead_v1(jsonb,jsonb,jsonb,text) FROM %I',
        v_role
      );
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.capture_public_lead_v1(JSONB, JSONB, JSONB, TEXT) TO service_role;
  END IF;
END;
$grants$;
COMMIT;
