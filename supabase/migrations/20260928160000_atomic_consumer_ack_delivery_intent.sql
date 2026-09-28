-- Atomically add a permitted consumer-acknowledgment delivery intent to the
-- canonical public lead transaction. v2 remains intact as the rollback path.
-- No provider call, recipient address, message body, BCC, or secret is stored.

CREATE OR REPLACE FUNCTION public.capture_public_lead_v3(
  p_session JSONB,
  p_lead JSONB,
  p_attribution JSONB,
  p_notification_mode TEXT DEFAULT 'disabled',
  p_internal_notification JSONB DEFAULT '{}'::JSONB,
  p_consumer_notification JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_lead_id UUID;
  v_lead RECORD;
  v_consumer_requested BOOLEAN :=
    JSONB_TYPEOF(p_consumer_notification) = 'object'
    AND LOWER(COALESCE(p_consumer_notification->>'enabled', 'false')) = 'true';
  v_consumer_permitted BOOLEAN := false;
  v_notification_mode TEXT;
  v_notification_status TEXT;
  v_consumer_notification_id UUID;
  v_consumer_template_version CONSTANT TEXT := 'consumer_ack_email_v1';
  v_consumer_metadata JSONB := CASE
    WHEN JSONB_TYPEOF(p_consumer_notification->'metadata') = 'object'
      THEN p_consumer_notification->'metadata'
    ELSE '{}'::JSONB
  END;
BEGIN
  -- A function called by another PostgreSQL function participates in the same
  -- transaction. Any v3 invariant failure therefore rolls back v2's lead,
  -- attribution, consent, audit, and internal-alert outbox writes as one unit.
  v_result := public.capture_public_lead_v2(
    p_session,
    p_lead,
    p_attribution,
    p_notification_mode,
    p_internal_notification
  );

  IF COALESCE((v_result->>'ok')::BOOLEAN, false) IS NOT TRUE THEN
    RETURN v_result;
  END IF;

  v_lead_id := (v_result->>'lead_id')::UUID;

  IF v_consumer_requested THEN
    -- Eligibility comes from the canonical row written (or found on replay),
    -- never from the caller's consumer-notification metadata.
    SELECT
      email,
      consent_email,
      consent_timestamp,
      consent_language_version,
      consent_language_text,
      is_test,
      communication_suppressed,
      email_suppressed
      INTO v_lead
      FROM public.leads
     WHERE id = v_lead_id
     LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'canonical_consumer_ack_lead_invariant_failed'
        USING ERRCODE = '23514';
    END IF;

    v_consumer_permitted :=
      NULLIF(BTRIM(COALESCE(v_lead.email, '')), '') IS NOT NULL
      AND COALESCE(v_lead.consent_email, false) IS TRUE
      AND v_lead.consent_timestamp IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(v_lead.consent_language_version, '')), '') IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(v_lead.consent_language_text, '')), '') IS NOT NULL
      AND COALESCE(v_lead.is_test, false) IS FALSE
      AND COALESCE(v_lead.communication_suppressed, false) IS FALSE
      AND COALESCE(v_lead.email_suppressed, false) IS FALSE;
  END IF;

  IF v_consumer_requested AND v_consumer_permitted THEN
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

    INSERT INTO public.lead_notifications (
      lead_id, agent_id, assignment_audit_id, notification_type, channel,
      recipient_type, recipient_reference, template_version, idempotency_key,
      status, max_attempts, provider, error_code, error_summary, failed_at,
      metadata
    ) VALUES (
      v_lead_id,
      NULL,
      NULL,
      'consumer_ack',
      'email',
      'customer',
      'email_configured',
      v_consumer_template_version,
      'consumer_ack:' || v_lead_id::TEXT || ':' || v_consumer_template_version,
      v_notification_status,
      3,
      v_notification_mode,
      CASE WHEN v_notification_status = 'skipped' THEN 'notifications_disabled' ELSE NULL END,
      CASE WHEN v_notification_status = 'skipped' THEN 'Notification provider mode is disabled.' ELSE NULL END,
      CASE WHEN v_notification_status = 'skipped' THEN NOW() ELSE NULL END,
      v_consumer_metadata || jsonb_build_object(
        'capture_transaction', 'capture_public_lead_v3',
        'permission_basis', 'stored_email_consent'
      )
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id, status
      INTO v_consumer_notification_id, v_notification_status;

    IF v_consumer_notification_id IS NULL THEN
      SELECT id, status
        INTO v_consumer_notification_id, v_notification_status
        FROM public.lead_notifications
       WHERE idempotency_key =
             'consumer_ack:' || v_lead_id::TEXT || ':' || v_consumer_template_version
         AND lead_id = v_lead_id
         AND notification_type = 'consumer_ack'
         AND channel = 'email'
         AND recipient_type = 'customer'
         AND template_version = v_consumer_template_version
       LIMIT 1;
    END IF;

    IF v_consumer_notification_id IS NULL THEN
      RAISE EXCEPTION 'canonical_consumer_ack_outbox_invariant_failed'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN v_result || jsonb_build_object(
    'consumer_notification_id', v_consumer_notification_id,
    'consumer_notification_status', CASE
      WHEN v_consumer_notification_id IS NOT NULL THEN v_notification_status
      ELSE NULL
    END,
    'consumer_notification_seeded', v_consumer_notification_id IS NOT NULL,
    'capture_version', 'v3'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.capture_public_lead_v3(JSONB, JSONB, JSONB, TEXT, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_public_lead_v3(JSONB, JSONB, JSONB, TEXT, JSONB, JSONB)
  TO service_role;

COMMENT ON FUNCTION public.capture_public_lead_v3(JSONB, JSONB, JSONB, TEXT, JSONB, JSONB) IS
  'Atomically captures a public lead, required internal alert intent, and an optional release-gated consumer acknowledgment intent derived from stored consent and suppression state.';

-- Rollback: point the application back to capture_public_lead_v2, verify it,
-- then drop only this additive wrapper:
-- DROP FUNCTION IF EXISTS public.capture_public_lead_v3(JSONB, JSONB, JSONB, TEXT, JSONB, JSONB);
