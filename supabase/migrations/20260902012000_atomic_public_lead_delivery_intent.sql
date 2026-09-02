-- Make the canonical public lead, its complete attribution/consent evidence,
-- and the required internal-email delivery intent one atomic transaction.
--
-- The existing v1 function remains unchanged for rollback compatibility. The
-- v2 wrapper always invokes v1 with delivery disabled, so its legacy
-- agent-assignment audit row cannot send, and creates exactly one canonical
-- lead_alert outbox row for the configured internal recipient instead.

CREATE OR REPLACE FUNCTION public.capture_public_lead_v2(
  p_session JSONB,
  p_lead JSONB,
  p_attribution JSONB,
  p_notification_mode TEXT DEFAULT 'disabled',
  p_internal_notification JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_existing_lead RECORD;
  v_lead_id UUID;
  v_request_idempotency_key TEXT := NULLIF(BTRIM(p_lead->>'request_idempotency_key'), '');
  v_incoming_fingerprint TEXT := public.amm_public_lead_request_fingerprint(p_lead, p_attribution);
  v_idempotent_replay BOOLEAN := false;
  v_notification_mode TEXT;
  v_notification_status TEXT;
  v_notification_id UUID;
  v_template_version TEXT := COALESCE(
    NULLIF(BTRIM(p_internal_notification->>'template_version'), ''),
    'lead_alert_email_v3'
  );
  v_notification_metadata JSONB := CASE
    WHEN JSONB_TYPEOF(p_internal_notification->'metadata') = 'object'
      THEN p_internal_notification->'metadata'
    ELSE '{}'::JSONB
  END;
BEGIN
  -- Serialize source retries that reuse the same explicit idempotency key.
  -- This closes the concurrent different-session race before v1 creates a row.
  IF v_request_idempotency_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended('amm:request-idempotency:' || v_request_idempotency_key, 0)
    );

    SELECT id, session_id, widget_session_id, contact_id,
           duplicate_of_lead_id, assigned_agent_id, assignment_status,
           request_fingerprint
      INTO v_existing_lead
      FROM public.leads
     WHERE request_idempotency_key = v_request_idempotency_key
     LIMIT 1
     FOR UPDATE;

    IF FOUND THEN
      IF v_existing_lead.request_fingerprint IS DISTINCT FROM v_incoming_fingerprint THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error', 'idempotency_conflict',
          'session_id', v_existing_lead.session_id,
          'idempotent_replay', false
        );
      END IF;

      v_result := jsonb_build_object(
        'ok', true,
        'lead_id', v_existing_lead.id,
        'session_id', v_existing_lead.session_id,
        'widget_session_id', COALESCE(v_existing_lead.widget_session_id, v_existing_lead.session_id::TEXT),
        'contact_id', v_existing_lead.contact_id,
        'duplicate_of_lead_id', v_existing_lead.duplicate_of_lead_id,
        'assigned_agent_id', v_existing_lead.assigned_agent_id,
        'assignment_status', CASE
          WHEN v_existing_lead.duplicate_of_lead_id IS NOT NULL THEN 'duplicate'
          WHEN v_existing_lead.assignment_status = 'assigned' THEN 'assigned'
          ELSE 'unassigned'
        END,
        'idempotent_replay', true
      );
    END IF;
  END IF;

  IF v_result IS NULL THEN
    -- v1 still owns canonical contact resolution, dedupe, assignment, and its
    -- immutable audit events. Its legacy assignment notification is disabled.
    v_result := public.capture_public_lead_v1(
      p_session,
      p_lead,
      p_attribution,
      'disabled'
    );
  END IF;

  IF COALESCE((v_result->>'ok')::BOOLEAN, false) IS NOT TRUE THEN
    RETURN v_result;
  END IF;

  v_lead_id := (v_result->>'lead_id')::UUID;
  v_idempotent_replay := COALESCE((v_result->>'idempotent_replay')::BOOLEAN, false);

  -- These fields were formerly written by a second application request. New
  -- captures now keep the explainable score, suppression state, exact consent
  -- evidence, attribution envelope, and source idempotency key in this commit.
  IF NOT v_idempotent_replay THEN
    UPDATE public.leads
       SET city = COALESCE(NULLIF(p_lead->>'city', ''), city),
           score = COALESCE((NULLIF(p_lead->>'score', ''))::SMALLINT, score),
           score_factors = CASE
             WHEN JSONB_TYPEOF(p_lead->'score_factors') = 'array'
               THEN p_lead->'score_factors'
             ELSE score_factors
           END,
           score_version = COALESCE(NULLIF(p_lead->>'score_version', ''), score_version),
           is_test = COALESCE((NULLIF(p_lead->>'is_test', ''))::BOOLEAN, is_test),
           communication_suppressed = COALESCE(
             (NULLIF(p_lead->>'communication_suppressed', ''))::BOOLEAN,
             communication_suppressed
           ),
           email_suppressed = COALESCE(
             (NULLIF(p_lead->>'email_suppressed', ''))::BOOLEAN,
             email_suppressed
           ),
           sms_suppressed = COALESCE(
             (NULLIF(p_lead->>'sms_suppressed', ''))::BOOLEAN,
             sms_suppressed
           ),
           consent_language_text = COALESCE(
             NULLIF(p_lead->>'consent_language_text', ''),
             consent_language_text
           ),
           consent_ip_hash = COALESCE(NULLIF(p_lead->>'consent_ip_hash', ''), consent_ip_hash),
           consent_source = COALESCE(NULLIF(p_lead->>'consent_source', ''), consent_source),
           consent_user_agent = COALESCE(
             NULLIF(p_lead->>'consent_user_agent', ''),
             consent_user_agent
           ),
           routing_reason = COALESCE(NULLIF(p_lead->>'routing_reason', ''), routing_reason),
           target_geography = COALESCE(NULLIF(p_lead->>'target_geography', ''), target_geography),
           financing = COALESCE(NULLIF(p_lead->>'financing', ''), financing),
           preapproval = COALESCE((NULLIF(p_lead->>'preapproval', ''))::BOOLEAN, preapproval),
           request_idempotency_key = COALESCE(
             v_request_idempotency_key,
             request_idempotency_key
           )
     WHERE id = v_lead_id;

    UPDATE public.source_attribution
       SET first_touch = COALESCE(
             NULLIF(p_attribution->'first_touch', 'null'::JSONB),
             first_touch
           ),
           last_touch = COALESCE(
             NULLIF(p_attribution->'last_touch', 'null'::JSONB),
             last_touch
           ),
           click_ids = CASE
             WHEN JSONB_TYPEOF(p_attribution->'click_ids') = 'object'
               THEN p_attribution->'click_ids'
             ELSE click_ids
           END,
           placement_id = COALESCE(NULLIF(p_attribution->>'placement_id', ''), placement_id),
           page_title = COALESCE(NULLIF(p_attribution->>'page_title', ''), page_title),
           listing_id = COALESCE(NULLIF(p_attribution->>'listing_id', ''), listing_id),
           property_id = COALESCE(NULLIF(p_attribution->>'property_id', ''), property_id),
           agent_id = COALESCE(NULLIF(p_attribution->>'agent_id', ''), agent_id)
     WHERE lead_id = v_lead_id;

    INSERT INTO public.consents (
      lead_id, contact_id, consent_type, granted, language_version,
      language_text, user_agent, collected_at
    )
    SELECT
      v_lead_id,
      lead.contact_id,
      consent.consent_type,
      consent.granted,
      COALESCE(NULLIF(p_lead->>'consent_language_version', ''), 'canonical_v1'),
      NULLIF(p_lead->>'consent_language_text', ''),
      NULLIF(p_lead->>'consent_user_agent', ''),
      COALESCE((NULLIF(p_lead->>'consent_timestamp', ''))::TIMESTAMPTZ, NOW())
    FROM public.leads lead
    CROSS JOIN LATERAL (
      VALUES
        ('email'::TEXT, COALESCE((NULLIF(p_lead->>'consent_email', ''))::BOOLEAN, false)),
        ('call'::TEXT, COALESCE((NULLIF(p_lead->>'consent_call', ''))::BOOLEAN, false)),
        ('sms'::TEXT, COALESCE((NULLIF(p_lead->>'consent_sms', ''))::BOOLEAN, false))
    ) AS consent(consent_type, granted)
    WHERE lead.id = v_lead_id
      AND NOT EXISTS (
        SELECT 1
          FROM public.consents existing_consent
         WHERE existing_consent.lead_id = v_lead_id
           AND existing_consent.consent_type = consent.consent_type
      );
  END IF;

  v_notification_mode := CASE LOWER(COALESCE(NULLIF(p_notification_mode, ''), 'disabled'))
    WHEN 'console' THEN 'console'
    WHEN 'sandbox' THEN 'sandbox'
    WHEN 'production' THEN 'production'
    ELSE 'disabled'
  END;
  v_notification_status := CASE
    WHEN v_notification_mode = 'disabled' THEN 'skipped'
    ELSE 'pending'
  END;

  -- The row contains no recipient address, BCC, provider secret, or message
  -- body. The delivery worker resolves secure configuration at send time.
  INSERT INTO public.lead_notifications (
    lead_id, agent_id, assignment_audit_id, notification_type, channel,
    recipient_type, recipient_reference, template_version, idempotency_key,
    status, max_attempts, provider, error_code, error_summary, failed_at,
    metadata
  ) VALUES (
    v_lead_id,
    NULL,
    NULLIF(v_result->>'assignment_audit_id', '')::UUID,
    'lead_alert',
    'email',
    'internal',
    'email_configured',
    v_template_version,
    'lead_alert:' || v_lead_id::TEXT || ':' || v_template_version,
    v_notification_status,
    3,
    v_notification_mode,
    CASE WHEN v_notification_status = 'skipped' THEN 'notifications_disabled' ELSE NULL END,
    CASE WHEN v_notification_status = 'skipped' THEN 'Notification provider mode is disabled.' ELSE NULL END,
    CASE WHEN v_notification_status = 'skipped' THEN NOW() ELSE NULL END,
    v_notification_metadata || jsonb_build_object(
      'capture_transaction', 'capture_public_lead_v2'
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id, status INTO v_notification_id, v_notification_status;

  IF v_notification_id IS NULL THEN
    SELECT id, status
      INTO v_notification_id, v_notification_status
      FROM public.lead_notifications
     WHERE idempotency_key = 'lead_alert:' || v_lead_id::TEXT || ':' || v_template_version
       AND lead_id = v_lead_id
       AND notification_type = 'lead_alert'
       AND channel = 'email'
       AND recipient_type = 'internal'
       AND template_version = v_template_version
     LIMIT 1;
  END IF;

  IF v_notification_id IS NULL THEN
    RAISE EXCEPTION 'canonical_lead_alert_outbox_invariant_failed'
      USING ERRCODE = '23514';
  END IF;

  RETURN v_result || jsonb_build_object(
    'notification_id', v_notification_id,
    'notification_status', v_notification_status,
    'capture_version', 'v2'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.capture_public_lead_v2(JSONB, JSONB, JSONB, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_public_lead_v2(JSONB, JSONB, JSONB, TEXT, JSONB)
  TO service_role;

COMMENT ON FUNCTION public.capture_public_lead_v2(JSONB, JSONB, JSONB, TEXT, JSONB) IS
  'Atomically captures one public lead, full enrichment/consent evidence, and one canonical internal lead-alert outbox row. No provider send occurs inside the transaction.';

-- Rollback:
-- DROP FUNCTION IF EXISTS public.capture_public_lead_v2(JSONB, JSONB, JSONB, TEXT, JSONB);
