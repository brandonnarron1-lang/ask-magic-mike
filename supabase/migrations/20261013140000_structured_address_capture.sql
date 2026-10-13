-- Additive successor to accepted capture_public_lead_v2. No old-row backfill,
-- function-body replacement, provider lookup, routing change or outbox rewrite.
BEGIN;

DO $predecessor$
BEGIN
  IF to_regprocedure('public.capture_public_lead_v2(jsonb,jsonb,jsonb,text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'accepted_public_capture_v2_required';
  END IF;
END;
$predecessor$;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address_entry JSONB;
COMMENT ON COLUMN public.leads.address_entry IS
  'Versioned user-entered and explicitly accepted address context. Confirmation and reported Places identifiers are user assertions, not postal/property/provider validation. NULL for legacy captures; never backfilled.';

CREATE OR REPLACE FUNCTION public.capture_public_lead_v3(
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
  v_entry JSONB := p_lead->'address_entry';
  v_components JSONB;
  v_session_id UUID := (p_session->>'id')::UUID;
  v_request_key TEXT := NULLIF(BTRIM(p_lead->>'request_idempotency_key'), '');
  v_existing RECORD;
  v_has_existing BOOLEAN := false;
  v_result JSONB;
  v_field TEXT;
  v_limit INTEGER;
  v_formatted TEXT;
  v_rows INTEGER;
BEGIN
  -- Defense in depth at the server-only SQL boundary. Never downgrade a forged
  -- validation flag to a verified address or warehouse a raw provider response.
  IF JSONB_TYPEOF(v_entry) IS DISTINCT FROM 'object'
     OR v_entry->'version' IS DISTINCT FROM '1'::JSONB
     OR v_entry->>'validation' IS DISTINCT FROM 'not_performed'
     OR COALESCE(v_entry->>'confirmation', '') NOT IN
       ('manual', 'user_confirmed_suggestion', 'user_edited')
     OR JSONB_TYPEOF(v_entry->'components') IS DISTINCT FROM 'object'
     OR OCTET_LENGTH(v_entry::TEXT) > 8192 THEN
    RAISE EXCEPTION 'invalid_address_entry' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(v_entry) AS fields(key)
      WHERE key NOT IN ('version', 'enteredText', 'acceptedText', 'components',
        'confirmation', 'validation', 'reportedProvider', 'reportedPlaceId')) THEN
    RAISE EXCEPTION 'invalid_address_entry' USING ERRCODE = '22023';
  END IF;
  v_components := v_entry->'components';
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(v_components) AS fields(key)
      WHERE key NOT IN ('line1', 'line2', 'locality', 'region', 'postalCode', 'country')) THEN
    RAISE EXCEPTION 'invalid_address_entry' USING ERRCODE = '22023';
  END IF;
  FOR v_field, v_limit IN SELECT * FROM (VALUES
      ('line1', 200), ('line2', 100), ('locality', 100),
      ('region', 80), ('postalCode', 24), ('country', 2)) AS bounds(field, maximum)
  LOOP
    IF JSONB_TYPEOF(v_components->v_field) IS DISTINCT FROM 'string'
       OR CHAR_LENGTH(v_components->>v_field) > v_limit
       OR v_components->>v_field IS DISTINCT FROM BTRIM(v_components->>v_field)
       OR TRANSLATE(v_components->>v_field, CHR(9)||CHR(10)||CHR(13), '') ~ '[[:cntrl:]]' THEN
      RAISE EXCEPTION 'invalid_address_entry' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  IF v_components->>'country' <> '' AND v_components->>'country' !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid_address_entry' USING ERRCODE = '22023';
  END IF;
  IF JSONB_TYPEOF(v_entry->'enteredText') IS DISTINCT FROM 'string'
     OR CHAR_LENGTH(v_entry->>'enteredText') > 500
     OR CHAR_LENGTH(BTRIM(v_entry->>'enteredText')) < 5
     OR TRANSLATE(v_entry->>'enteredText', CHR(9)||CHR(10)||CHR(13), '') ~ '[[:cntrl:]]'
     OR JSONB_TYPEOF(v_entry->'acceptedText') IS DISTINCT FROM 'string'
     OR CHAR_LENGTH(v_entry->>'acceptedText') NOT BETWEEN 5 AND 500
     OR v_entry->>'acceptedText' IS DISTINCT FROM BTRIM(v_entry->>'acceptedText')
     OR TRANSLATE(v_entry->>'acceptedText', CHR(9)||CHR(10)||CHR(13), '') ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'invalid_address_entry' USING ERRCODE = '22023';
  END IF;
  IF (v_entry ? 'reportedProvider' AND v_entry->>'reportedProvider' IS DISTINCT FROM 'google_places_new')
     OR (v_entry ? 'reportedPlaceId' AND
       (JSONB_TYPEOF(v_entry->'reportedPlaceId') IS DISTINCT FROM 'string'
        OR CHAR_LENGTH(v_entry->>'reportedPlaceId') NOT BETWEEN 1 AND 256
        OR v_entry->>'reportedPlaceId' !~ '^[A-Za-z0-9_-]+$'))
     OR ((v_entry ? 'reportedProvider' OR v_entry ? 'reportedPlaceId') AND
       (v_entry->>'confirmation' <> 'user_confirmed_suggestion'
        OR v_entry->>'reportedProvider' IS DISTINCT FROM 'google_places_new')) THEN
    RAISE EXCEPTION 'invalid_address_entry' USING ERRCODE = '22023';
  END IF;

  -- Match the version-one formatAddress contract without parsing or guessing
  -- locality, unit, region or ZIP. An unstructured manual entry remains valid.
  v_formatted := CASE WHEN v_components->>'line1' = '' THEN v_entry->>'acceptedText'
    ELSE CONCAT_WS(', ', NULLIF(v_components->>'line1', ''),
      NULLIF(v_components->>'line2', ''), NULLIF(v_components->>'locality', ''),
      NULLIF(CONCAT_WS(' ', NULLIF(v_components->>'region', ''),
        NULLIF(v_components->>'postalCode', '')), ''),
      CASE WHEN v_components->>'country' IN ('', 'US') THEN NULL
        ELSE v_components->>'country' END) END;
  IF v_entry->>'acceptedText' IS DISTINCT FROM v_formatted
     OR p_lead->>'address_raw' IS DISTINCT FROM v_entry->>'acceptedText' THEN
    RAISE EXCEPTION 'invalid_address_entry' USING ERRCODE = '22023';
  END IF;
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'session id is required' USING ERRCODE = '22023';
  END IF;

  -- Same identities and order as v2 -> v1: request key first, session second.
  -- Transaction-scoped locks remain held through v2 and the address UPDATE.
  IF v_request_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended('amm:request-idempotency:' || v_request_key, 0));
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('amm:session:' || v_session_id::TEXT, 0));

  IF v_request_key IS NOT NULL THEN
    SELECT id, session_id, address_entry INTO v_existing FROM public.leads
      WHERE request_idempotency_key = v_request_key LIMIT 1 FOR UPDATE;
    v_has_existing := FOUND;
  END IF;
  -- A key hit is authoritative in v2, including a replay from another session.
  -- Only inspect the session row when the key did not resolve a lead; this also
  -- avoids acquiring two unrelated lead row locks for a mismatched key/session.
  IF NOT v_has_existing THEN
    SELECT id, session_id, address_entry INTO v_existing FROM public.leads
      WHERE session_id = v_session_id LIMIT 1 FOR UPDATE;
    v_has_existing := FOUND;
  END IF;
  IF v_has_existing AND v_existing.address_entry IS DISTINCT FROM v_entry THEN
    -- NULL legacy context is deliberately a conflict, not a silent upgrade.
    RETURN jsonb_build_object('ok', false, 'error', 'idempotency_conflict',
      'session_id', v_existing.session_id, 'idempotent_replay', false);
  END IF;

  -- One outer transaction; unchanged v2 alone owns capture/contact/deduplication,
  -- routing, consent, attribution, audits and the original notification version.
  v_result := public.capture_public_lead_v2(p_session, p_lead, p_attribution,
    p_notification_mode, p_internal_notification);
  IF COALESCE((v_result->>'ok')::BOOLEAN, false) IS NOT TRUE THEN RETURN v_result; END IF;
  IF COALESCE((v_result->>'idempotent_replay')::BOOLEAN, false) THEN RETURN v_result; END IF;

  UPDATE public.leads
    SET address_entry = v_entry,
        address_line1 = NULLIF(v_components->>'line1', ''),
        address_line2 = NULLIF(v_components->>'line2', ''),
        city = NULLIF(v_components->>'locality', ''),
        state = v_components->>'region',
        zip = NULLIF(v_components->>'postalCode', '')
    WHERE id = (v_result->>'lead_id')::UUID;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'required_address_enrichment_failed' USING ERRCODE = '23514';
  END IF;
  -- address_raw and the existing v1 request fingerprint are never rewritten.
  -- An enrichment exception rolls back every earlier v1/v2 commit effect.
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_public_lead_v3(JSONB, JSONB, JSONB, TEXT, JSONB) FROM PUBLIC;
DO $roles$
DECLARE v_role TEXT;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
      EXECUTE FORMAT('REVOKE ALL ON FUNCTION public.capture_public_lead_v3(jsonb,jsonb,jsonb,text,jsonb) FROM %I', v_role);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.capture_public_lead_v3(JSONB, JSONB, JSONB, TEXT, JSONB) TO service_role;
  END IF;
END;
$roles$;
COMMENT ON FUNCTION public.capture_public_lead_v3(JSONB, JSONB, JSONB, TEXT, JSONB) IS
  'Server-only invoker: validates user-asserted structured address context, serializes key/session replays, delegates unchanged v2 and enriches only the new inquiry in the same transaction. No lookup or send.';

COMMIT;

-- App-only rollback: restore the legacy caller/adapter v2 path. Keep this
-- nullable column, v3 function and captured data; do not delete/backfill/rewrite
-- evidence, re-key a saved request, or regenerate historical notifications.
