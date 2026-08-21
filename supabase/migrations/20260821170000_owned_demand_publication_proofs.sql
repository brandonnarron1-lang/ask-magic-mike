-- Phase 9 owned-demand publication proof ledger.
-- Additive, append-only, and server-only. This migration records evidence after
-- an authorized human uses a native platform. It cannot publish, schedule,
-- message, spend, target an audience, or call an external provider.

CREATE TABLE IF NOT EXISTS public.owned_demand_publication_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  channel_key text NOT NULL CHECK (channel_key IN (
    'google_business_profile', 'facebook', 'instagram', 'linkedin',
    'email_signature', 'qr_print'
  )),
  placement_key text NOT NULL CHECK (placement_key IN (
    'general_question', 'seller_review', 'buyer_match', 'renter_plan'
  )),
  platform_state text NOT NULL CHECK (platform_state IN (
    'live', 'scheduled', 'pending_review', 'not_approved',
    'configured', 'distributed', 'removed'
  )),
  proof_type text NOT NULL CHECK (proof_type IN (
    'public_url', 'platform_reference', 'screenshot_reference',
    'configuration_reference', 'scan_test_reference', 'removal_reference'
  )),
  campaign_key text NOT NULL CHECK (campaign_key = 'amm_owned_demand_2026'),
  utm_source text NOT NULL,
  utm_medium text NOT NULL,
  utm_content text NOT NULL,
  tracked_url text NOT NULL CHECK (
    tracked_url ~ '^https://www\.askmagicmike\.com/'
  ),
  evidence_url text,
  evidence_reference text,
  final_copy_sha256 text NOT NULL CHECK (final_copy_sha256 ~ '^[0-9a-f]{64}$'),
  creative_asset_key text,
  approval_reference text NOT NULL,
  observed_at timestamptz NOT NULL,
  recorded_by text NOT NULL,
  is_test boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(idempotency_key) = 64),
  CHECK (length(utm_source) BETWEEN 1 AND 80),
  CHECK (length(utm_medium) BETWEEN 1 AND 80),
  CHECK (length(utm_content) BETWEEN 1 AND 160),
  CHECK (length(tracked_url) <= 2048),
  CHECK (evidence_url IS NULL OR length(evidence_url) <= 2048),
  CHECK (
    evidence_url IS NULL OR (
      position('@' IN evidence_url) = 0
      AND evidence_url !~* '[?&](access[_-]?token|api[_-]?key|authorization|code|credential|key|password|secret|signature|token)='
      AND (
        (channel_key = 'google_business_profile' AND evidence_url ~* '^https://([a-z0-9-]+\.)*(google\.com|goo\.gl)/')
        OR (channel_key = 'facebook' AND evidence_url ~* '^https://([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.watch)/')
        OR (channel_key = 'instagram' AND evidence_url ~* '^https://([a-z0-9-]+\.)*instagram\.com/')
        OR (channel_key = 'linkedin' AND evidence_url ~* '^https://([a-z0-9-]+\.)*linkedin\.com/')
      )
    )
  ),
  CHECK (evidence_reference IS NULL OR length(evidence_reference) BETWEEN 4 AND 180),
  CHECK (creative_asset_key IS NULL OR length(creative_asset_key) <= 240),
  CHECK (length(approval_reference) BETWEEN 4 AND 160),
  CHECK (length(recorded_by) BETWEEN 1 AND 180),
  CHECK (observed_at <= created_at + interval '5 minutes'),
  CHECK (jsonb_typeof(metadata) = 'object'),
  CHECK (
    (channel_key = 'google_business_profile' AND utm_source = 'google_business_profile' AND utm_medium = 'organic_local')
    OR (channel_key = 'facebook' AND utm_source = 'facebook' AND utm_medium = 'social_organic')
    OR (channel_key = 'instagram' AND utm_source = 'instagram' AND utm_medium = 'social_organic')
    OR (channel_key = 'linkedin' AND utm_source = 'linkedin' AND utm_medium = 'social_organic')
    OR (channel_key = 'email_signature' AND utm_source = 'email' AND utm_medium = 'owned_media')
    OR (channel_key = 'qr_print' AND utm_source = 'qr' AND utm_medium = 'owned_media')
  ),
  CHECK (
    (channel_key = 'google_business_profile' AND utm_content = ('gbp_update' || CASE WHEN placement_key = 'general_question' THEN '' ELSE '_' || placement_key END))
    OR (channel_key = 'facebook' AND utm_content = ('facebook_local_question' || CASE WHEN placement_key = 'general_question' THEN '' ELSE '_' || placement_key END))
    OR (channel_key = 'instagram' AND utm_content = ('instagram_story_question' || CASE WHEN placement_key = 'general_question' THEN '' ELSE '_' || placement_key END))
    OR (channel_key = 'linkedin' AND utm_content = ('linkedin_local_guidance' || CASE WHEN placement_key = 'general_question' THEN '' ELSE '_' || placement_key END))
    OR (channel_key = 'email_signature' AND utm_content = ('email_signature_ask_mike' || CASE WHEN placement_key = 'general_question' THEN '' ELSE '_' || placement_key END))
    OR (channel_key = 'qr_print' AND utm_content = ('qr_local_question' || CASE WHEN placement_key = 'general_question' THEN '' ELSE '_' || placement_key END))
  ),
  CHECK (
    (channel_key = 'google_business_profile' AND platform_state IN ('live', 'scheduled', 'pending_review', 'not_approved', 'removed'))
    OR (channel_key IN ('facebook', 'instagram', 'linkedin') AND platform_state IN ('live', 'scheduled', 'removed'))
    OR (channel_key = 'email_signature' AND platform_state IN ('configured', 'removed'))
    OR (channel_key = 'qr_print' AND platform_state IN ('distributed', 'removed'))
  ),
  CHECK (
    (platform_state = 'live' AND proof_type IN ('public_url', 'screenshot_reference'))
    OR (platform_state IN ('scheduled', 'pending_review', 'not_approved') AND proof_type = 'platform_reference')
    OR (platform_state = 'configured' AND proof_type = 'configuration_reference')
    OR (platform_state = 'distributed' AND proof_type = 'scan_test_reference')
    OR (platform_state = 'removed' AND proof_type = 'removal_reference')
  ),
  CHECK (
    (proof_type = 'public_url' AND evidence_url IS NOT NULL AND evidence_reference IS NULL)
    OR
    (proof_type <> 'public_url' AND evidence_url IS NULL AND evidence_reference IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS owned_demand_publication_proofs_channel_idx
  ON public.owned_demand_publication_proofs(channel_key, observed_at DESC);
CREATE INDEX IF NOT EXISTS owned_demand_publication_proofs_campaign_idx
  ON public.owned_demand_publication_proofs(
    campaign_key, utm_source, utm_medium, utm_content, observed_at DESC
  );
CREATE INDEX IF NOT EXISTS owned_demand_publication_proofs_live_idx
  ON public.owned_demand_publication_proofs(observed_at DESC)
  WHERE is_test = false;

ALTER TABLE public.owned_demand_publication_proofs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.owned_demand_publication_proofs FROM PUBLIC;

DROP TRIGGER IF EXISTS owned_demand_publication_proofs_reject_change
  ON public.owned_demand_publication_proofs;
CREATE TRIGGER owned_demand_publication_proofs_reject_change
  BEFORE UPDATE OR DELETE ON public.owned_demand_publication_proofs
  FOR EACH ROW EXECUTE FUNCTION public.amm_reject_immutable_change();

DO $owned_demand_publication_proof_table_privileges$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE public.owned_demand_publication_proofs FROM %I',
        role_name
      );
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.owned_demand_publication_proofs FROM service_role';
    EXECUTE 'GRANT USAGE ON SCHEMA public TO service_role';
    EXECUTE 'GRANT SELECT, INSERT ON TABLE public.owned_demand_publication_proofs TO service_role';
  END IF;
END;
$owned_demand_publication_proof_table_privileges$;

CREATE OR REPLACE FUNCTION public.record_owned_demand_publication_proof_v1(
  p_idempotency_key text,
  p_channel_key text,
  p_placement_key text,
  p_platform_state text,
  p_proof_type text,
  p_campaign_key text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_content text,
  p_tracked_url text,
  p_evidence_url text,
  p_evidence_reference text,
  p_final_copy_sha256 text,
  p_creative_asset_key text,
  p_approval_reference text,
  p_observed_at timestamptz,
  p_actor text,
  p_is_test boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proof_id uuid;
  v_audit_id uuid;
  v_existing boolean := false;
BEGIN
  IF p_idempotency_key !~ '^[0-9a-f]{64}$' OR
     p_final_copy_sha256 !~ '^[0-9a-f]{64}$' OR
     p_campaign_key <> 'amm_owned_demand_2026' OR
     p_tracked_url !~ '^https://www\.askmagicmike\.com/' OR
     p_observed_at IS NULL OR p_observed_at > now() + interval '5 minutes' OR
     p_actor IS NULL OR btrim(p_actor) = '' OR
     p_approval_reference IS NULL OR length(btrim(p_approval_reference)) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_publication_proof');
  END IF;

  INSERT INTO public.owned_demand_publication_proofs(
    idempotency_key,
    channel_key,
    placement_key,
    platform_state,
    proof_type,
    campaign_key,
    utm_source,
    utm_medium,
    utm_content,
    tracked_url,
    evidence_url,
    evidence_reference,
    final_copy_sha256,
    creative_asset_key,
    approval_reference,
    observed_at,
    recorded_by,
    is_test,
    metadata
  ) VALUES (
    p_idempotency_key,
    p_channel_key,
    p_placement_key,
    p_platform_state,
    p_proof_type,
    p_campaign_key,
    p_utm_source,
    p_utm_medium,
    p_utm_content,
    p_tracked_url,
    NULLIF(btrim(p_evidence_url), ''),
    NULLIF(btrim(p_evidence_reference), ''),
    p_final_copy_sha256,
    NULLIF(btrim(p_creative_asset_key), ''),
    btrim(p_approval_reference),
    p_observed_at,
    p_actor,
    COALESCE(p_is_test, false),
    jsonb_build_object(
      'recording_version', 'v1',
      'external_mutation_performed', false,
      'raw_copy_retained', false
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_proof_id;

  IF v_proof_id IS NULL THEN
    SELECT id INTO v_proof_id
      FROM public.owned_demand_publication_proofs
     WHERE idempotency_key = p_idempotency_key;
    v_existing := true;
  ELSE
    INSERT INTO public.audit_logs(
      actor,
      action,
      resource_type,
      resource_id,
      before_state,
      after_state,
      metadata
    ) VALUES (
      p_actor,
      'growth.publication_proof_recorded',
      'owned_demand_publication',
      v_proof_id,
      NULL,
      jsonb_build_object(
        'channel_key', p_channel_key,
        'placement_key', p_placement_key,
        'platform_state', p_platform_state,
        'proof_type', p_proof_type,
        'is_test', COALESCE(p_is_test, false)
      ),
      jsonb_build_object(
        'campaign_key', p_campaign_key,
        'utm_source', p_utm_source,
        'utm_medium', p_utm_medium,
        'utm_content', p_utm_content,
        'final_copy_sha256', p_final_copy_sha256,
        'external_mutation_performed', false
      )
    ) RETURNING id INTO v_audit_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'proof_id', v_proof_id,
    'audit_id', v_audit_id,
    'idempotent_replay', v_existing
  );
EXCEPTION
  WHEN check_violation OR invalid_text_representation OR string_data_right_truncation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_publication_proof');
END;
$$;

REVOKE ALL ON FUNCTION public.record_owned_demand_publication_proof_v1(
  text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, timestamptz, text, boolean
) FROM PUBLIC;

DO $owned_demand_publication_proof_function_privileges$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.record_owned_demand_publication_proof_v1(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, timestamptz, text, boolean) FROM %I',
        role_name
      );
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE
      'GRANT EXECUTE ON FUNCTION public.record_owned_demand_publication_proof_v1(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, timestamptz, text, boolean) TO service_role';
  END IF;
END;
$owned_demand_publication_proof_function_privileges$;

COMMENT ON TABLE public.owned_demand_publication_proofs IS
  'Append-only, server-only evidence that an authorized operator observed a native-platform placement state. A proof record is not provider verification and cannot publish or send anything.';
COMMENT ON FUNCTION public.record_owned_demand_publication_proof_v1(
  text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, timestamptz, text, boolean
) IS
  'Idempotently records minimized placement evidence plus an immutable audit event. No external provider call or publication occurs.';
