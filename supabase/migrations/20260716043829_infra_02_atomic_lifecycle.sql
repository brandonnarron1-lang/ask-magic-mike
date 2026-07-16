-- INFRA-02: canonical local lifecycle transactions and concurrency controls.
--
-- This migration is additive. It preserves every existing table and history row,
-- keeps Supabase/PostgREST as the default access path, and uses standard
-- PostgreSQL functions so the transaction contract can also be exercised over a
-- direct PostgreSQL connection.

-- Normalize canonical contact identities in one place. These helpers are
-- immutable and provider-neutral; callers must not use an address as a person
-- identity.
CREATE OR REPLACE FUNCTION public.amm_normalize_email(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
RETURN NULLIF(LOWER(BTRIM(value)), '');

CREATE OR REPLACE FUNCTION public.amm_normalize_phone(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
RETURN CASE
  WHEN NULLIF(REGEXP_REPLACE(COALESCE(value, ''), '[^0-9]', '', 'g'), '') IS NULL THEN NULL
  WHEN LENGTH(REGEXP_REPLACE(value, '[^0-9]', '', 'g')) = 11
    AND LEFT(REGEXP_REPLACE(value, '[^0-9]', '', 'g'), 1) = '1'
    THEN SUBSTRING(REGEXP_REPLACE(value, '[^0-9]', '', 'g') FROM 2)
  ELSE REGEXP_REPLACE(value, '[^0-9]', '', 'g')
END;

CREATE OR REPLACE FUNCTION public.amm_normalize_property_identity(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
RETURN NULLIF(REGEXP_REPLACE(LOWER(BTRIM(COALESCE(value, ''))), '[^a-z0-9]+', ' ', 'g'), '');

CREATE OR REPLACE FUNCTION public.amm_public_lead_request_fingerprint(
  p_lead JSONB,
  p_attribution JSONB DEFAULT '{}'::JSONB
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
RETURN MD5(CONCAT_WS('|',
  'capture_public_lead_v1',
  COALESCE(public.amm_normalize_email(COALESCE(p_lead->>'normalized_email', p_lead->>'email')), ''),
  COALESCE(public.amm_normalize_phone(COALESCE(p_lead->>'normalized_phone', p_lead->>'phone_normalized', p_lead->>'phone')), ''),
  COALESCE(NULLIF(p_lead->>'lead_type', ''), ''),
  COALESCE(NULLIF(p_lead->>'primary_intent', ''), ''),
  COALESCE(public.amm_normalize_property_identity(COALESCE(p_lead->>'normalized_property_address', p_lead->>'address_raw')), ''),
  CASE
    WHEN COALESCE(NULLIF(p_lead->>'lead_type', ''), '') = 'general_question'
      THEN COALESCE(NULLIF(p_lead->>'question_raw', ''), '')
    ELSE ''
  END
));

-- An identity belongs to one canonical contact. Keeping identities in their own
-- table avoids a risky destructive merge of historical contact rows.
CREATE TABLE IF NOT EXISTS public.contact_identities (
  identity_type TEXT NOT NULL CHECK (identity_type IN ('email', 'phone')),
  normalized_value TEXT NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (identity_type, normalized_value)
);

CREATE INDEX IF NOT EXISTS contact_identities_contact_id_idx
  ON public.contact_identities(contact_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.contacts
    WHERE public.amm_normalize_email(email) IS NOT NULL
    GROUP BY public.amm_normalize_email(email)
    HAVING COUNT(DISTINCT id) > 1
  ) THEN
    RAISE EXCEPTION 'contact_identity_backfill_conflict: duplicate normalized email identities exist'
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contacts
    WHERE public.amm_normalize_phone(COALESCE(phone_normalized, phone)) IS NOT NULL
    GROUP BY public.amm_normalize_phone(COALESCE(phone_normalized, phone))
    HAVING COUNT(DISTINCT id) > 1
  ) THEN
    RAISE EXCEPTION 'contact_identity_backfill_conflict: duplicate normalized phone identities exist'
      USING ERRCODE = '23505';
  END IF;
END $$;

INSERT INTO public.contact_identities(identity_type, normalized_value, contact_id)
SELECT 'email', public.amm_normalize_email(email), id
FROM public.contacts
WHERE public.amm_normalize_email(email) IS NOT NULL
ORDER BY created_at, id
ON CONFLICT (identity_type, normalized_value) DO NOTHING;

INSERT INTO public.contact_identities(identity_type, normalized_value, contact_id)
SELECT 'phone', public.amm_normalize_phone(COALESCE(phone_normalized, phone)), id
FROM public.contacts
WHERE public.amm_normalize_phone(COALESCE(phone_normalized, phone)) IS NOT NULL
ORDER BY created_at, id
ON CONFLICT (identity_type, normalized_value) DO NOTHING;

ALTER TABLE public.contact_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_identities_deny_public ON public.contact_identities;
CREATE POLICY contact_identities_deny_public
  ON public.contact_identities
  FOR ALL
  TO PUBLIC
  USING (false)
  WITH CHECK (false);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_identities TO service_role;

-- Core lifecycle tables predate the repository's deny-public policy pattern.
-- Enabling RLS now closes that ambiguity without affecting the service role,
-- which remains the server-only PostgREST principal.
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_routing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessions_deny_public ON public.sessions;
CREATE POLICY sessions_deny_public ON public.sessions FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS leads_deny_public ON public.leads;
CREATE POLICY leads_deny_public ON public.leads FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS agents_deny_public ON public.agents;
CREATE POLICY agents_deny_public ON public.agents FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS lead_routing_deny_public ON public.lead_routing;
CREATE POLICY lead_routing_deny_public ON public.lead_routing FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

-- Stable assignment-event keys make assignment history retry-safe without
-- collapsing legitimate future reassignments.
ALTER TABLE public.agent_assignments
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS agent_assignments_idempotency_key_idx
  ON public.agent_assignments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;

UPDATE public.leads
   SET request_fingerprint = public.amm_public_lead_request_fingerprint(
     jsonb_build_object(
       'normalized_email', normalized_email,
       'email', email,
       'normalized_phone', normalized_phone,
       'phone_normalized', phone_normalized,
       'phone', phone,
       'lead_type', lead_type,
       'primary_intent', primary_intent,
       'normalized_property_address', normalized_property_address,
       'address_raw', address_raw,
       'question_raw', question_raw
     ),
     '{}'::JSONB
   )
 WHERE request_fingerprint IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_request_fingerprint
  ON public.leads(request_fingerprint)
  WHERE request_fingerprint IS NOT NULL;

-- Existing rules silently ignored mutations. A hard failure is safer and makes
-- immutability machine-verifiable to callers.
DROP RULE IF EXISTS audit_logs_no_update ON public.audit_logs;
DROP RULE IF EXISTS audit_logs_no_delete ON public.audit_logs;
DROP RULE IF EXISTS consents_no_update ON public.consents;
DROP RULE IF EXISTS consents_no_delete ON public.consents;

CREATE OR REPLACE FUNCTION public.amm_reject_immutable_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_reject_change ON public.audit_logs;
CREATE TRIGGER audit_logs_reject_change
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.amm_reject_immutable_change();

DROP TRIGGER IF EXISTS consents_reject_change ON public.consents;
CREATE TRIGGER consents_reject_change
  BEFORE UPDATE OR DELETE ON public.consents
  FOR EACH ROW EXECUTE FUNCTION public.amm_reject_immutable_change();

-- Capture session, canonical contact, lead, attribution, qualification result,
-- assignment, assignment history, audit, and notification outbox in one short
-- transaction. PostgreSQL serializes the same session/contact identities and
-- the assignment-capacity decision with transaction-scoped advisory locks.
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
    request_fingerprint
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
    v_request_fingerprint
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

-- Appointment, lead lifecycle projection, audit, and confirmation task are one
-- transaction. The lead-scoped advisory lock makes retries and concurrent
-- requests deterministic.
CREATE OR REPLACE FUNCTION public.request_public_appointment_v1(
  p_lead_id UUID,
  p_session_id UUID,
  p_request_surface TEXT DEFAULT NULL,
  p_requested_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead RECORD;
  v_appointment RECORD;
  v_task_id UUID;
  v_task_created BOOLEAN := false;
  v_audit_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('amm:appointment:' || p_lead_id::TEXT, 0));

  SELECT id, session_id, widget_session_id, assigned_agent_id, status,
         source, source_detail, lead_type
    INTO v_lead
    FROM public.leads
   WHERE id = p_lead_id
     AND (session_id = p_session_id OR widget_session_id = p_session_id::TEXT)
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'appointment_request_not_found');
  END IF;

  SELECT * INTO v_appointment
    FROM public.lead_appointments
   WHERE lead_id = p_lead_id
     AND status IN ('requested','scheduled','confirmed','reschedule_requested')
   ORDER BY created_at DESC, id
   LIMIT 1
   FOR UPDATE;

  SELECT id INTO v_task_id
    FROM public.tasks
   WHERE lead_id = p_lead_id
     AND category = 'followup:appointment_confirmation'
     AND status IN ('open','in_progress')
   ORDER BY created_at, id
   LIMIT 1;

  IF v_task_id IS NULL THEN
    BEGIN
      INSERT INTO public.tasks(
        lead_id, agent_id, created_by, title, body, due_at, status, priority, category
      ) VALUES (
        p_lead_id, v_lead.assigned_agent_id, 'public_appointment_request',
        'Confirm appointment request',
        'Public appointment request received. Confirm time and details before marking scheduled.',
        p_requested_at + INTERVAL '2 hours', 'open', 'high',
        'followup:appointment_confirmation'
      ) RETURNING id INTO v_task_id;
      v_task_created := true;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_task_id
        FROM public.tasks
       WHERE lead_id = p_lead_id
         AND category = 'followup:appointment_confirmation'
         AND status IN ('open','in_progress')
       ORDER BY created_at, id
       LIMIT 1;
    END;
  END IF;

  IF v_appointment.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'already_requested',
      'appointment_id', v_appointment.id,
      'appointment_status', v_appointment.status,
      'followup_status', CASE WHEN v_task_created THEN 'created' ELSE 'existing' END
    );
  END IF;

  INSERT INTO public.lead_appointments(
    lead_id, assigned_agent_id, status, requested_at, timezone,
    location_type, location_label, created_by
  ) VALUES (
    p_lead_id, v_lead.assigned_agent_id, 'requested', p_requested_at,
    'America/New_York', 'office',
    COALESCE(NULLIF(LEFT(p_request_surface, 120), ''), 'Public appointment request'),
    'public_appointment_request'
  ) RETURNING * INTO v_appointment;

  UPDATE public.leads
     SET status = 'appointment_requested',
         appointment_requested = true,
         conversion_stage = 'appointment_requested',
         converted_at = NULL,
         closed_won_at = NULL,
         closed_lost_at = NULL,
         closed_lost_reason = NULL
   WHERE id = p_lead_id;

  INSERT INTO public.audit_logs(
    actor, action, resource_type, resource_id, before_state, after_state, metadata
  ) VALUES (
    'public_appointment_request', 'lead.appointment_requested_public', 'lead', p_lead_id,
    jsonb_build_object('status', v_lead.status),
    jsonb_build_object('status', 'appointment_requested', 'appointment_id', v_appointment.id),
    jsonb_build_object(
      'source', 'public_appointment_request',
      'session_id', p_session_id,
      'lead_source', v_lead.source,
      'source_detail', v_lead.source_detail,
      'lead_type', v_lead.lead_type
    )
  ) RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'requested',
    'appointment_id', v_appointment.id,
    'appointment_status', v_appointment.status,
    'followup_status', CASE WHEN v_task_created THEN 'created' ELSE 'existing' END,
    'audit_id', v_audit_id
  );
END;
$$;

-- Admin lifecycle projection and its immutable audit event commit together.
-- The application owns transition/reason validation; this function owns row
-- serialization, optimistic concurrency, column allowlisting, and atomicity.
CREATE OR REPLACE FUNCTION public.mutate_admin_lead_status_v1(
  p_lead_id UUID,
  p_expected_status TEXT,
  p_next_status TEXT,
  p_patch JSONB,
  p_reason TEXT DEFAULT NULL,
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
BEGIN
  SELECT id, status INTO v_lead
    FROM public.leads
   WHERE id = p_lead_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;
  IF v_lead.status IS DISTINCT FROM p_expected_status THEN
    RETURN jsonb_build_object('ok', false, 'error', 'concurrent_status_update');
  END IF;
  IF v_lead.status = p_next_status THEN
    RETURN jsonb_build_object('ok', true, 'status', p_next_status, 'idempotent_replay', true);
  END IF;

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
      'occurred_at', p_occurred_at
    )
  ) RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', p_next_status,
    'audit_id', v_audit_id,
    'idempotent_replay', false
  );
END;
$$;

-- Manual assignment uses the same global capacity serialization key as public
-- capture. Lead state, the current routing projection, assignment history,
-- immutable audit, and notification outbox therefore commit or roll back as a
-- unit. Delivery remains asynchronous and is never attempted here.
CREATE OR REPLACE FUNCTION public.mutate_admin_assignment_v1(
  p_lead_id UUID,
  p_agent_id UUID,
  p_expected_agent_id UUID,
  p_action TEXT,
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
  v_lead RECORD;
  v_agent RECORD;
  v_active_count INTEGER := 0;
  v_audit_id UUID;
  v_notification_id UUID;
  v_notification_status TEXT;
BEGIN
  IF p_action NOT IN ('assigned', 'reassigned', 'unassigned') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_assignment_action');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('amm:assignment-capacity', 0));

  SELECT id, assigned_agent_id, assignment_status INTO v_lead
    FROM public.leads
   WHERE id = p_lead_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;
  IF v_lead.assigned_agent_id IS DISTINCT FROM p_expected_agent_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'assignment_conflict');
  END IF;
  IF p_agent_id IS NOT NULL
     AND v_lead.assigned_agent_id = p_agent_id
     AND v_lead.assignment_status = 'assigned' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'action', 'assigned',
      'idempotent_replay', true
    );
  END IF;
  IF p_agent_id IS NULL
     AND v_lead.assigned_agent_id IS NULL
     AND COALESCE(v_lead.assignment_status, 'unassigned') = 'unassigned' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'action', 'unassigned',
      'idempotent_replay', true
    );
  END IF;

  IF p_agent_id IS NOT NULL THEN
    SELECT id, is_active, max_daily_leads, priority_score, notification_email
      INTO v_agent
      FROM public.agents
     WHERE id = p_agent_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'agent_not_found');
    END IF;
    IF NOT v_agent.is_active THEN
      RETURN jsonb_build_object('ok', false, 'error', 'agent_inactive');
    END IF;

    SELECT COUNT(*) INTO v_active_count
      FROM public.leads
     WHERE assigned_agent_id = p_agent_id
       AND id <> p_lead_id
       AND assignment_status = 'assigned'
       AND status IN (
         'new','scored','assigned','contacted','qualified',
         'appointment_requested','appointment_set','nurture','escalated'
       );
    IF v_agent.max_daily_leads > 0 AND v_active_count >= v_agent.max_daily_leads THEN
      RETURN jsonb_build_object('ok', false, 'error', 'agent_at_capacity');
    END IF;
  END IF;

  UPDATE public.leads
     SET assigned_agent_id = p_agent_id,
         assigned_at = CASE WHEN p_agent_id IS NULL THEN NULL ELSE p_occurred_at END,
         assignment_status = CASE WHEN p_agent_id IS NULL THEN 'unassigned' ELSE 'assigned' END
   WHERE id = p_lead_id;

  IF p_agent_id IS NOT NULL THEN
    INSERT INTO public.lead_routing(
      lead_id, agent_id, assigned_at, assignment_reason, agent_priority_score,
      accept_deadline, contact_deadline, status, notes
    ) VALUES (
      p_lead_id, p_agent_id, p_occurred_at,
      'Manual AdminOps assignment.', v_agent.priority_score,
      p_occurred_at + INTERVAL '2 minutes', p_occurred_at + INTERVAL '5 minutes',
      'pending', 'Atomic assignment from mutate_admin_assignment_v1.'
    )
    ON CONFLICT (lead_id) DO UPDATE
      SET agent_id = EXCLUDED.agent_id,
          assigned_at = EXCLUDED.assigned_at,
          assignment_reason = EXCLUDED.assignment_reason,
          agent_priority_score = EXCLUDED.agent_priority_score,
          accept_deadline = EXCLUDED.accept_deadline,
          contact_deadline = EXCLUDED.contact_deadline,
          accepted_at = NULL,
          contacted_at = NULL,
          status = 'pending',
          reassigned_to = NULL,
          notes = EXCLUDED.notes;

    UPDATE public.agent_assignments
       SET status = 'reassigned'
     WHERE id = (
       SELECT id FROM public.agent_assignments
        WHERE lead_id = p_lead_id AND status IN ('pending','accepted')
        ORDER BY created_at DESC, id DESC
        LIMIT 1
     );
  ELSE
    UPDATE public.lead_routing
       SET status = 'reassigned', notes = 'Unassigned by mutate_admin_assignment_v1.'
     WHERE lead_id = p_lead_id;
    UPDATE public.agent_assignments
       SET status = 'reassigned'
     WHERE id = (
       SELECT id FROM public.agent_assignments
        WHERE lead_id = p_lead_id AND status IN ('pending','accepted')
        ORDER BY created_at DESC, id DESC
        LIMIT 1
     );
  END IF;

  INSERT INTO public.audit_logs(
    actor, action, resource_type, resource_id, before_state, after_state, metadata
  ) VALUES (
    p_actor,
    CASE p_action
      WHEN 'reassigned' THEN 'lead.reassigned'
      WHEN 'unassigned' THEN 'lead.unassigned'
      ELSE 'lead.assigned'
    END,
    'lead', p_lead_id,
    jsonb_build_object('assigned_agent_id', v_lead.assigned_agent_id),
    jsonb_build_object(
      'assigned_agent_id', p_agent_id,
      'assignment_status', CASE WHEN p_agent_id IS NULL THEN 'unassigned' ELSE 'assigned' END
    ),
    jsonb_build_object(
      'source', 'admin_allocation',
      'assignment_action', p_action,
      'action_route', '/admin/allocation',
      'warning_flags', '[]'::JSONB
    )
  ) RETURNING id INTO v_audit_id;

  IF p_agent_id IS NOT NULL THEN
    INSERT INTO public.agent_assignments(
      lead_id, agent_id, assigned_by, assignment_reason, status,
      accept_deadline, contact_deadline, idempotency_key, notes
    ) VALUES (
      p_lead_id, p_agent_id, 'admin', 'Manual AdminOps assignment.', 'pending',
      p_occurred_at + INTERVAL '2 minutes', p_occurred_at + INTERVAL '5 minutes',
      'admin-assignment:' || v_audit_id::TEXT,
      'Atomic assignment from mutate_admin_assignment_v1.'
    );

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
        p_lead_id, p_agent_id, v_audit_id, p_occurred_at,
        'agent_assignment', 'email', 'agent', 'agent:' || p_agent_id::TEXT,
        'agent_assignment_email_v1',
        'admin-assignment:' || v_audit_id::TEXT || ':email:agent_assignment_email_v1',
        v_notification_status, 3, LOWER(COALESCE(p_notification_mode, 'disabled')),
        CASE WHEN v_notification_status = 'skipped' THEN 'agent_notifications_disabled' ELSE NULL END,
        CASE WHEN v_notification_status = 'skipped' THEN 'Notification provider mode is disabled.' ELSE NULL END,
        CASE WHEN v_notification_status = 'skipped' THEN NOW() ELSE NULL END,
        jsonb_build_object('assignment_route', '/admin/allocation', 'actor', p_actor)
      ) RETURNING id INTO v_notification_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'action', p_action,
    'audit_id', v_audit_id,
    'notification_id', v_notification_id,
    'notification_status', v_notification_status,
    'idempotent_replay', false
  );
END;
$$;

-- Agent operational settings and their audit record are also inseparable.
CREATE OR REPLACE FUNCTION public.mutate_admin_agent_operations_v1(
  p_agent_id UUID,
  p_patch JSONB,
  p_actor TEXT DEFAULT 'system/admin_basic_auth'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
  v_audit_id UUID;
BEGIN
  SELECT jsonb_build_object(
    'is_active', is_active,
    'max_daily_leads', max_daily_leads,
    'current_load', current_load,
    'priority_score', priority_score,
    'notification_email', notification_email,
    'notification_sms', notification_sms
  ) INTO v_before
    FROM public.agents
   WHERE id = p_agent_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'agent_not_found');
  END IF;

  v_after := jsonb_build_object(
    'is_active', (p_patch->>'is_active')::BOOLEAN,
    'max_daily_leads', (p_patch->>'max_daily_leads')::INTEGER,
    'current_load', (p_patch->>'current_load')::INTEGER,
    'priority_score', (p_patch->>'priority_score')::INTEGER,
    'notification_email', (p_patch->>'notification_email')::BOOLEAN,
    'notification_sms', (p_patch->>'notification_sms')::BOOLEAN
  );

  UPDATE public.agents
     SET is_active = (v_after->>'is_active')::BOOLEAN,
         max_daily_leads = (v_after->>'max_daily_leads')::INTEGER,
         current_load = (v_after->>'current_load')::INTEGER,
         priority_score = (v_after->>'priority_score')::INTEGER,
         notification_email = (v_after->>'notification_email')::BOOLEAN,
         notification_sms = (v_after->>'notification_sms')::BOOLEAN
   WHERE id = p_agent_id;

  INSERT INTO public.audit_logs(
    actor, action, resource_type, resource_id, before_state, after_state, metadata
  ) VALUES (
    p_actor, 'agent.operations_updated', 'agent', p_agent_id, v_before, v_after,
    jsonb_build_object('source', 'admin_allocation', 'action_route', '/admin/allocation')
  ) RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object('ok', true, 'audit_id', v_audit_id);
END;
$$;

-- Concurrent cron/manual SLA sweeps must not create duplicate unresolved
-- compliance flags for the same lead and breach type. An advisory lock avoids
-- rewriting historical rows or requiring a risky uniqueness migration over
-- unknown existing data.
CREATE OR REPLACE FUNCTION public.record_sla_breach_v1(
  p_lead_id UUID,
  p_flag_type TEXT,
  p_severity TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_flag_type NOT IN ('sla_accept_breached', 'sla_contact_breached') THEN
    RAISE EXCEPTION 'invalid SLA breach type' USING ERRCODE = '22023';
  END IF;
  IF p_severity NOT IN ('warn', 'critical') THEN
    RAISE EXCEPTION 'invalid SLA breach severity' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('amm:sla-breach:' || p_lead_id::TEXT || ':' || p_flag_type, 0)
  );

  IF EXISTS (
    SELECT 1 FROM public.compliance_flags
     WHERE lead_id = p_lead_id
       AND flag_type = p_flag_type
       AND resolved = false
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.compliance_flags(
    lead_id, flag_type, severity, notes
  ) VALUES (
    p_lead_id, p_flag_type, p_severity, p_notes
  );
  RETURN true;
END;
$$;

-- The RPC surface is server-only. SECURITY INVOKER preserves RLS/role checks;
-- the service role receives only EXECUTE, not a database superuser credential.
REVOKE ALL ON FUNCTION public.amm_normalize_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.amm_normalize_phone(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.amm_normalize_property_identity(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.amm_public_lead_request_fingerprint(JSONB, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.amm_reject_immutable_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_public_lead_v1(JSONB, JSONB, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_public_appointment_v1(UUID, UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mutate_admin_lead_status_v1(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mutate_admin_assignment_v1(UUID, UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mutate_admin_agent_operations_v1(UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_sla_breach_v1(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_public_lead_v1(JSONB, JSONB, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.amm_normalize_email(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.amm_normalize_phone(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.amm_normalize_property_identity(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.amm_public_lead_request_fingerprint(JSONB, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_public_appointment_v1(UUID, UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.mutate_admin_lead_status_v1(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.mutate_admin_assignment_v1(UUID, UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.mutate_admin_agent_operations_v1(UUID, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_sla_breach_v1(UUID, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.capture_public_lead_v1(JSONB, JSONB, JSONB, TEXT) IS
  'Atomic provider-neutral public lead lifecycle contract. PostgREST is the default adapter, not part of the domain behavior.';
COMMENT ON FUNCTION public.request_public_appointment_v1(UUID, UUID, TEXT, TIMESTAMPTZ) IS
  'Atomic appointment intent, lead projection, immutable audit, and follow-up task contract.';
COMMENT ON FUNCTION public.mutate_admin_lead_status_v1(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ) IS
  'Atomic AdminOps lead projection and immutable lifecycle audit contract.';
COMMENT ON FUNCTION public.mutate_admin_assignment_v1(UUID, UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) IS
  'Atomic capacity-locked AdminOps assignment, routing, history, audit, and notification-outbox contract.';
COMMENT ON FUNCTION public.mutate_admin_agent_operations_v1(UUID, JSONB, TEXT) IS
  'Atomic AdminOps agent settings and immutable audit contract.';
COMMENT ON FUNCTION public.record_sla_breach_v1(UUID, TEXT, TEXT, TEXT) IS
  'Concurrency-safe idempotent insertion of one unresolved SLA compliance flag per lead and breach type.';

-- Rollback guidance (local/reviewed migration only):
--   DROP FUNCTION public.amm_public_lead_request_fingerprint(JSONB, JSONB);
--   DROP FUNCTION public.amm_normalize_property_identity(TEXT);
--   DROP FUNCTION public.request_public_appointment_v1(UUID, UUID, TEXT, TIMESTAMPTZ);
--   DROP FUNCTION public.capture_public_lead_v1(JSONB, JSONB, JSONB, TEXT);
--   DROP FUNCTION public.mutate_admin_lead_status_v1(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ);
--   DROP FUNCTION public.mutate_admin_assignment_v1(UUID, UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ);
--   DROP FUNCTION public.mutate_admin_agent_operations_v1(UUID, JSONB, TEXT);
--   DROP FUNCTION public.record_sla_breach_v1(UUID, TEXT, TEXT, TEXT);
--   DROP TRIGGER audit_logs_reject_change ON public.audit_logs;
--   DROP TRIGGER consents_reject_change ON public.consents;
--   Recreate the prior append-only rules if rolling back the hard-failure form.
--   DROP TABLE public.contact_identities;
--   ALTER TABLE public.leads DROP COLUMN request_fingerprint;
--   ALTER TABLE public.agent_assignments DROP COLUMN idempotency_key;
-- RLS should remain enabled during rollback; do not restore public access.
