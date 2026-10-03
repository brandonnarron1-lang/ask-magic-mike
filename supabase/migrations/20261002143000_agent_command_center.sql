-- Agent Command Center additive persistence.
-- No table here replaces leads, assignments, tasks, appointments, notifications,
-- consent, attribution, outcomes, or audit history. These records only retain
-- operator queue decisions, bounded AI budget reservations, and immutable AI
-- draft-review versions.

CREATE TABLE IF NOT EXISTS public.lead_action_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  action_key text NOT NULL CHECK (length(action_key) BETWEEN 1 AND 180),
  status text NOT NULL CHECK (status IN ('open', 'snoozed', 'dismissed')),
  reason text CHECK (reason IS NULL OR length(reason) <= 500),
  snooze_until timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  actor_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, action_key),
  CHECK (status <> 'snoozed' OR snooze_until IS NOT NULL),
  CHECK (status <> 'dismissed' OR length(btrim(coalesce(reason, ''))) >= 3)
);

CREATE INDEX IF NOT EXISTS lead_action_reviews_queue_idx
  ON public.lead_action_reviews(lead_id, status, snooze_until);

CREATE TABLE IF NOT EXISTS public.ai_budget_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_key text NOT NULL UNIQUE CHECK (length(request_key) BETWEEN 16 AND 200),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  feature text NOT NULL,
  model text NOT NULL,
  status text NOT NULL CHECK (status IN ('reserved', 'finalized', 'released')),
  reserved_cost_usd numeric(12,6) NOT NULL CHECK (reserved_cost_usd >= 0),
  actual_cost_usd numeric(12,6) CHECK (actual_cost_usd IS NULL OR actual_cost_usd >= 0),
  input_tokens integer CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens integer CHECK (output_tokens IS NULL OR output_tokens >= 0),
  mode text,
  fallback_reason text,
  actor_user_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz
);

CREATE INDEX IF NOT EXISTS ai_budget_reservations_active_idx
  ON public.ai_budget_reservations(created_at, expires_at)
  WHERE status = 'reserved';

CREATE TABLE IF NOT EXISTS public.ai_draft_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_key uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  supersedes_id uuid REFERENCES public.ai_draft_reviews(id) ON DELETE RESTRICT,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  intelligence_id uuid REFERENCES public.ai_lead_intelligence(id) ON DELETE SET NULL,
  artifact_type text NOT NULL CHECK (artifact_type IN (
    'lead_summary', 'appointment_brief', 'clarifying_questions',
    'email_draft', 'sms_draft', 'call_script'
  )),
  channel text CHECK (channel IS NULL OR channel IN ('email', 'sms', 'phone')),
  purpose text NOT NULL CHECK (length(purpose) BETWEEN 1 AND 100),
  status text NOT NULL CHECK (status IN ('generated', 'edited', 'approved', 'rejected', 'expired')),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 12000),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  source_fingerprint text NOT NULL CHECK (source_fingerprint ~ '^[a-f0-9]{64}$'),
  evidence_references jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence_references) = 'array'),
  missing_facts jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(missing_facts) = 'array'),
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(limitations) = 'array'),
  schema_version text NOT NULL,
  prompt_version text NOT NULL,
  model text NOT NULL,
  created_by text NOT NULL,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (draft_key, version)
);

CREATE INDEX IF NOT EXISTS ai_draft_reviews_lead_latest_idx
  ON public.ai_draft_reviews(lead_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS ai_draft_reviews_key_version_idx
  ON public.ai_draft_reviews(draft_key, version DESC);

DROP TRIGGER IF EXISTS ai_draft_reviews_immutable ON public.ai_draft_reviews;
CREATE TRIGGER ai_draft_reviews_immutable
  BEFORE UPDATE OR DELETE ON public.ai_draft_reviews
  FOR EACH ROW EXECUTE FUNCTION public.amm_reject_immutable_change();

ALTER TABLE public.lead_action_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_budget_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_draft_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_action_reviews FROM PUBLIC;
REVOKE ALL ON public.ai_budget_reservations FROM PUBLIC;
REVOKE ALL ON public.ai_draft_reviews FROM PUBLIC;

DO $acc_privileges$
DECLARE
  role_name text;
  table_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      FOREACH table_name IN ARRAY ARRAY['lead_action_reviews', 'ai_budget_reservations', 'ai_draft_reviews'] LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, role_name);
      END LOOP;
    END IF;
  END LOOP;
END
$acc_privileges$;

CREATE OR REPLACE FUNCTION public.mutate_lead_action_review_v1(
  p_lead_id uuid,
  p_action_key text,
  p_status text,
  p_reason text,
  p_snooze_until timestamptz,
  p_expected_version integer,
  p_actor_user_id text,
  p_occurred_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current public.lead_action_reviews%ROWTYPE;
  v_row public.lead_action_reviews%ROWTYPE;
  v_next_version integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.leads WHERE id = p_lead_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;
  IF length(btrim(coalesce(p_action_key, ''))) NOT BETWEEN 1 AND 180
     OR p_status NOT IN ('open', 'snoozed', 'dismissed')
     OR length(btrim(coalesce(p_actor_user_id, ''))) < 1
     OR p_expected_version < 0
     OR (p_status = 'snoozed' AND (p_snooze_until IS NULL OR p_snooze_until <= p_occurred_at))
     OR (p_status = 'dismissed' AND length(btrim(coalesce(p_reason, ''))) < 3) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_action_review');
  END IF;

  SELECT * INTO v_current
    FROM public.lead_action_reviews
   WHERE lead_id = p_lead_id AND action_key = p_action_key
   FOR UPDATE;

  IF NOT FOUND THEN
    IF p_expected_version <> 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'stale_action_version');
    END IF;
    INSERT INTO public.lead_action_reviews(
      lead_id, action_key, status, reason, snooze_until, version,
      actor_user_id, created_at, updated_at
    ) VALUES (
      p_lead_id, p_action_key, p_status, nullif(btrim(coalesce(p_reason, '')), ''),
      p_snooze_until, 1, p_actor_user_id, p_occurred_at, p_occurred_at
    ) RETURNING * INTO v_row;
  ELSE
    IF v_current.version <> p_expected_version THEN
      RETURN jsonb_build_object('ok', false, 'error', 'stale_action_version');
    END IF;
    v_next_version := v_current.version + 1;
    UPDATE public.lead_action_reviews
       SET status = p_status,
           reason = nullif(btrim(coalesce(p_reason, '')), ''),
           snooze_until = CASE WHEN p_status = 'snoozed' THEN p_snooze_until ELSE NULL END,
           version = v_next_version,
           actor_user_id = p_actor_user_id,
           updated_at = p_occurred_at
     WHERE id = v_current.id AND version = p_expected_version
     RETURNING * INTO v_row;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'stale_action_version');
    END IF;
  END IF;

  INSERT INTO public.audit_logs(
    actor, action, resource_type, resource_id, before_state, after_state, metadata, created_at
  ) VALUES (
    'lead_center:' || p_actor_user_id,
    'lead.today_action_reviewed',
    'lead', p_lead_id,
    CASE WHEN v_current.id IS NULL THEN NULL ELSE jsonb_build_object(
      'action_key', v_current.action_key, 'status', v_current.status, 'version', v_current.version
    ) END,
    jsonb_build_object('action_key', v_row.action_key, 'status', v_row.status, 'version', v_row.version),
    jsonb_build_object('reason', v_row.reason, 'snooze_until', v_row.snooze_until, 'source', 'agent_command_center'),
    p_occurred_at
  );

  RETURN jsonb_build_object('ok', true, 'id', v_row.id, 'status', v_row.status, 'version', v_row.version);
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_ai_budget_v1(
  p_request_key text,
  p_lead_id uuid,
  p_feature text,
  p_model text,
  p_daily_limit_usd numeric,
  p_reserve_cost_usd numeric,
  p_actor_user_id text,
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.ai_budget_reservations%ROWTYPE;
  v_spent numeric := 0;
  v_reserved numeric := 0;
  v_id uuid;
BEGIN
  IF length(coalesce(p_request_key, '')) NOT BETWEEN 16 AND 200
     OR p_daily_limit_usd < 0 OR p_reserve_cost_usd < 0
     OR length(btrim(coalesce(p_actor_user_id, ''))) < 1
     OR NOT EXISTS (SELECT 1 FROM public.leads WHERE id = p_lead_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_budget_reservation');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('amm_ai_budget:' || (p_now AT TIME ZONE 'UTC')::date::text));
  SELECT * INTO v_existing FROM public.ai_budget_reservations WHERE request_key = p_request_key;
  IF FOUND THEN
    IF v_existing.lead_id <> p_lead_id
       OR v_existing.feature <> p_feature
       OR v_existing.model <> p_model THEN
      RETURN jsonb_build_object('ok', false, 'error', 'budget_request_key_conflict');
    END IF;
    IF v_existing.status = 'finalized'
       OR (v_existing.status = 'reserved' AND v_existing.expires_at > p_now) THEN
      RETURN jsonb_build_object(
        'ok', true,
        'id', v_existing.id,
        'status', v_existing.status,
        'reserved_cost_usd', v_existing.reserved_cost_usd,
        'idempotent_replay', true
      );
    END IF;
  END IF;

  SELECT coalesce(sum(estimated_cost_usd), 0) INTO v_spent
    FROM public.ai_usage_events
   WHERE created_at >= date_trunc('day', p_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  SELECT coalesce(sum(reserved_cost_usd), 0) INTO v_reserved
    FROM public.ai_budget_reservations
   WHERE status = 'reserved' AND expires_at > p_now
     AND created_at >= date_trunc('day', p_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

  IF p_daily_limit_usd = 0 OR v_spent + v_reserved + p_reserve_cost_usd > p_daily_limit_usd THEN
    RETURN jsonb_build_object('ok', false, 'error', 'daily_ai_cost_cap_reached', 'spent', v_spent, 'reserved', v_reserved);
  END IF;

  IF v_existing.id IS NOT NULL THEN
    UPDATE public.ai_budget_reservations
       SET lead_id = p_lead_id, feature = p_feature, model = p_model,
           status = 'reserved', reserved_cost_usd = p_reserve_cost_usd,
           actual_cost_usd = NULL, input_tokens = NULL, output_tokens = NULL,
           mode = NULL, fallback_reason = NULL, actor_user_id = p_actor_user_id,
           expires_at = p_now + interval '24 hours', created_at = p_now,
           finalized_at = NULL
     WHERE id = v_existing.id
     RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.ai_budget_reservations(
      request_key, lead_id, feature, model, status, reserved_cost_usd,
      actor_user_id, expires_at, created_at
    ) VALUES (
      p_request_key, p_lead_id, p_feature, p_model, 'reserved', p_reserve_cost_usd,
      p_actor_user_id, p_now + interval '24 hours', p_now
    ) RETURNING id INTO v_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'id', v_id, 'status', 'reserved', 'reserved_cost_usd', p_reserve_cost_usd, 'idempotent_replay', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_ai_budget_reservation_v1(
  p_reservation_id uuid,
  p_actual_cost_usd numeric,
  p_input_tokens integer,
  p_output_tokens integer,
  p_mode text,
  p_fallback_reason text,
  p_is_test boolean,
  p_latency_ms integer,
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reservation public.ai_budget_reservations%ROWTYPE;
  v_usage_id uuid;
BEGIN
  SELECT * INTO v_reservation FROM public.ai_budget_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'reservation_not_found'); END IF;
  IF v_reservation.status = 'finalized' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent_replay', true, 'usage_id', NULL);
  END IF;
  IF v_reservation.status <> 'reserved' OR p_actual_cost_usd < 0
     OR p_actual_cost_usd > v_reservation.reserved_cost_usd
     OR p_input_tokens < 0 OR p_output_tokens < 0 OR p_latency_ms < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_budget_finalization');
  END IF;

  INSERT INTO public.ai_usage_events(
    lead_id, feature, model, mode, input_tokens, output_tokens,
    estimated_cost_usd, latency_ms, fallback_reason, is_test, created_at
  ) VALUES (
    v_reservation.lead_id, v_reservation.feature, v_reservation.model, p_mode,
    p_input_tokens, p_output_tokens, p_actual_cost_usd, p_latency_ms,
    p_fallback_reason, p_is_test, p_now
  ) RETURNING id INTO v_usage_id;

  UPDATE public.ai_budget_reservations
     SET status = 'finalized', actual_cost_usd = p_actual_cost_usd,
         input_tokens = p_input_tokens, output_tokens = p_output_tokens,
         mode = p_mode, fallback_reason = p_fallback_reason, finalized_at = p_now
   WHERE id = p_reservation_id;
  RETURN jsonb_build_object('ok', true, 'idempotent_replay', false, 'usage_id', v_usage_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.persist_ai_intelligence_draft_v1(
  p_lead_id uuid,
  p_schema_version text,
  p_prompt_version text,
  p_mode text,
  p_model text,
  p_output jsonb,
  p_source_fingerprint text,
  p_is_test boolean,
  p_created_by text,
  p_artifact_type text,
  p_channel text,
  p_purpose text,
  p_content text,
  p_content_hash text,
  p_evidence_references jsonb,
  p_missing_facts jsonb,
  p_limitations jsonb,
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_intelligence_id uuid;
  v_draft_id uuid := gen_random_uuid();
  v_draft_key uuid := gen_random_uuid();
BEGIN
  IF p_mode NOT IN ('openai_responses', 'deterministic_fallback', 'blocked')
     OR p_artifact_type NOT IN ('lead_summary', 'appointment_brief', 'clarifying_questions', 'email_draft', 'sms_draft', 'call_script')
     OR (p_channel IS NOT NULL AND p_channel NOT IN ('email', 'sms', 'phone'))
     OR p_source_fingerprint !~ '^[a-f0-9]{64}$'
     OR p_content_hash !~ '^[a-f0-9]{64}$'
     OR length(coalesce(p_content, '')) NOT BETWEEN 1 AND 12000
     OR jsonb_typeof(p_evidence_references) <> 'array'
     OR jsonb_typeof(p_missing_facts) <> 'array'
     OR jsonb_typeof(p_limitations) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_ai_draft');
  END IF;

  INSERT INTO public.ai_lead_intelligence(
    lead_id, schema_version, prompt_version, mode, model, output,
    input_fingerprint, confidence, is_test, created_by, created_at
  ) VALUES (
    p_lead_id, p_schema_version, p_prompt_version, p_mode, p_model, p_output,
    p_source_fingerprint, NULL, p_is_test, p_created_by, p_now
  )
  ON CONFLICT (lead_id, schema_version, prompt_version, input_fingerprint)
  DO UPDATE SET mode = EXCLUDED.mode, model = EXCLUDED.model, output = EXCLUDED.output
  RETURNING id INTO v_intelligence_id;

  INSERT INTO public.ai_draft_reviews(
    id, draft_key, version, lead_id, intelligence_id, artifact_type, channel,
    purpose, status, content, content_hash, source_fingerprint,
    evidence_references, missing_facts, limitations, schema_version,
    prompt_version, model, created_by, created_at, updated_at
  ) VALUES (
    v_draft_id, v_draft_key, 1, p_lead_id, v_intelligence_id, p_artifact_type, p_channel,
    p_purpose, 'generated', p_content, p_content_hash, p_source_fingerprint,
    p_evidence_references, p_missing_facts, p_limitations, p_schema_version,
    p_prompt_version, p_model, p_created_by, p_now, p_now
  );

  INSERT INTO public.audit_logs(actor, action, resource_type, resource_id, after_state, metadata, created_at)
  VALUES (
    'lead_center:' || p_created_by, 'lead.ai_draft_generated', 'lead', p_lead_id,
    jsonb_build_object('draft_key', v_draft_key, 'version', 1, 'status', 'generated', 'artifact_type', p_artifact_type),
    jsonb_build_object('source_fingerprint', p_source_fingerprint, 'content_hash', p_content_hash, 'source', 'agent_command_center'),
    p_now
  );
  RETURN jsonb_build_object('ok', true, 'intelligence_id', v_intelligence_id, 'draft_id', v_draft_id, 'draft_key', v_draft_key, 'version', 1, 'status', 'generated');
END;
$$;

CREATE OR REPLACE FUNCTION public.mutate_ai_draft_review_v1(
  p_draft_key uuid,
  p_expected_version integer,
  p_action text,
  p_content text,
  p_content_hash text,
  p_actor_user_id text,
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current public.ai_draft_reviews%ROWTYPE;
  v_next_status text;
  v_new public.ai_draft_reviews%ROWTYPE;
BEGIN
  SELECT * INTO v_current
    FROM public.ai_draft_reviews
   WHERE draft_key = p_draft_key
   ORDER BY version DESC LIMIT 1
   FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'draft_not_found'); END IF;
  IF v_current.version <> p_expected_version THEN RETURN jsonb_build_object('ok', false, 'error', 'stale_draft_version'); END IF;
  IF p_action NOT IN ('edit', 'approve', 'reject', 'expire')
     OR length(btrim(coalesce(p_actor_user_id, ''))) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_draft_action');
  END IF;
  v_next_status := CASE p_action WHEN 'edit' THEN 'edited' WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' ELSE 'expired' END;
  IF p_action = 'edit' AND (v_current.status NOT IN ('generated', 'edited')
     OR length(coalesce(p_content, '')) NOT BETWEEN 1 AND 12000 OR p_content_hash !~ '^[a-f0-9]{64}$') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_draft_content');
  END IF;
  IF p_action = 'approve' AND v_current.status NOT IN ('generated', 'edited') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'draft_not_approvable');
  END IF;
  IF p_action = 'reject' AND v_current.status NOT IN ('generated', 'edited') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'draft_not_rejectable');
  END IF;
  IF p_action = 'approve' AND EXISTS (
    SELECT 1 FROM public.leads l
     WHERE l.id = v_current.lead_id
       AND (l.is_test = true OR l.communication_suppressed = true)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'draft_approval_blocked');
  END IF;
  IF p_action = 'approve' AND v_current.channel IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.communication_permissions cp
     WHERE cp.lead_id = v_current.lead_id
       AND cp.channel = v_current.channel
       AND cp.purpose = v_current.purpose
       AND cp.state = 'allowed'
       AND cp.manual_review_required = false
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'communication_permission_missing');
  END IF;

  INSERT INTO public.ai_draft_reviews(
    draft_key, version, supersedes_id, lead_id, intelligence_id,
    artifact_type, channel, purpose, status, content, content_hash,
    source_fingerprint, evidence_references, missing_facts, limitations,
    schema_version, prompt_version, model, created_by, reviewed_by,
    reviewed_at, created_at, updated_at
  ) VALUES (
    v_current.draft_key, v_current.version + 1, v_current.id, v_current.lead_id,
    v_current.intelligence_id, v_current.artifact_type, v_current.channel,
    v_current.purpose, v_next_status,
    CASE WHEN p_action = 'edit' THEN p_content ELSE v_current.content END,
    CASE WHEN p_action = 'edit' THEN p_content_hash ELSE v_current.content_hash END,
    v_current.source_fingerprint, v_current.evidence_references,
    v_current.missing_facts, v_current.limitations, v_current.schema_version,
    v_current.prompt_version, v_current.model, v_current.created_by,
    p_actor_user_id, p_now, p_now, p_now
  ) RETURNING * INTO v_new;

  INSERT INTO public.audit_logs(actor, action, resource_type, resource_id, before_state, after_state, metadata, created_at)
  VALUES (
    'lead_center:' || p_actor_user_id, 'lead.ai_draft_' || p_action, 'lead', v_current.lead_id,
    jsonb_build_object('draft_key', v_current.draft_key, 'version', v_current.version, 'status', v_current.status, 'content_hash', v_current.content_hash),
    jsonb_build_object('draft_key', v_new.draft_key, 'version', v_new.version, 'status', v_new.status, 'content_hash', v_new.content_hash),
    jsonb_build_object('source_fingerprint', v_new.source_fingerprint, 'source', 'agent_command_center'), p_now
  );
  RETURN jsonb_build_object('ok', true, 'draft_id', v_new.id, 'draft_key', v_new.draft_key, 'version', v_new.version, 'status', v_new.status);
END;
$$;

REVOKE ALL ON FUNCTION public.mutate_lead_action_review_v1(uuid, text, text, text, timestamptz, integer, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_ai_budget_v1(text, uuid, text, text, numeric, numeric, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_ai_budget_reservation_v1(uuid, numeric, integer, integer, text, text, boolean, integer, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_ai_intelligence_draft_v1(uuid, text, text, text, text, jsonb, text, boolean, text, text, text, text, text, text, jsonb, jsonb, jsonb, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mutate_ai_draft_review_v1(uuid, integer, text, text, text, text, timestamptz) FROM PUBLIC;

-- Supabase can provision explicit default EXECUTE grants to its API roles.
-- Revoking PUBLIC alone does not remove those grants, so fail closed for every
-- browser-facing role and grant only the server-side service role when present.
DO $acc_function_privileges$
DECLARE
  role_name text;
  function_signature text;
  function_signatures text[] := ARRAY[
    'public.mutate_lead_action_review_v1(uuid, text, text, text, timestamptz, integer, text, timestamptz)',
    'public.reserve_ai_budget_v1(text, uuid, text, text, numeric, numeric, text, timestamptz)',
    'public.finalize_ai_budget_reservation_v1(uuid, numeric, integer, integer, text, text, boolean, integer, timestamptz)',
    'public.persist_ai_intelligence_draft_v1(uuid, text, text, text, text, jsonb, text, boolean, text, text, text, text, text, text, jsonb, jsonb, jsonb, timestamptz)',
    'public.mutate_ai_draft_review_v1(uuid, integer, text, text, text, text, timestamptz)'
  ];
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      FOREACH function_signature IN ARRAY function_signatures LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I', function_signature, role_name);
      END LOOP;
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE ON public.lead_action_reviews TO service_role;
    GRANT SELECT, INSERT, UPDATE ON public.ai_budget_reservations TO service_role;
    GRANT SELECT, INSERT ON public.ai_draft_reviews TO service_role;
    FOREACH function_signature IN ARRAY function_signatures LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_signature);
    END LOOP;
  END IF;
END
$acc_function_privileges$;

COMMENT ON TABLE public.lead_action_reviews IS
  'Operator review state over deterministic Command Center projections; canonical tasks and lead state remain unchanged.';
COMMENT ON TABLE public.ai_budget_reservations IS
  'Shared, fail-closed cost reservations for bounded AI requests; no provider credentials are stored.';
COMMENT ON TABLE public.ai_draft_reviews IS
  'Immutable, human-review-only AI artifact versions. Approval is purpose/version specific and never sends communication.';
