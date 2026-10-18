-- Additive extension of the existing jobs/review services. No schedule, remote
-- activation, delivery, canonical lead, permission or ownership mutation.
BEGIN;
ALTER TABLE public.ai_intelligence_jobs ALTER COLUMN lead_id DROP NOT NULL;
ALTER TABLE public.ai_intelligence_jobs
  ADD COLUMN r2_contract jsonb,
  ADD COLUMN r2_result jsonb,
  ADD COLUMN r2_lease_token uuid,
  ADD COLUMN r2_lease_until timestamptz,
  ADD COLUMN r2_deadline timestamptz;
ALTER TABLE public.ai_intelligence_jobs ADD CONSTRAINT ai_jobs_r2_shape CHECK ((
  (feature <> 'bounded_intelligence_v1' AND lead_id IS NOT NULL AND r2_contract IS NULL)
  OR (feature = 'bounded_intelligence_v1' AND r2_contract IS NOT NULL
    AND r2_contract->>'version' = 'amm.r2.workers.v1'
    AND r2_contract->>'tenant' = 'ask-magic-mike'
    AND r2_contract->>'actor' = requested_by
    AND r2_contract->>'role' IN ('source_steward','research_assistant','concierge_handoff','marketing_producer','quality_operations')
    AND r2_contract->>'approval' = 'human_required'
    AND r2_contract->>'risk' = 'read_draft_review'
    AND r2_contract->'budget'->>'costUsd' = '0'
    AND r2_contract->'budget'->>'tokens' = '0'
    AND (r2_contract->'budget'->>'steps')::integer BETWEEN 1 AND 8
    AND r2_deadline IS NOT NULL
    AND (r2_contract->>'role' <> 'concierge_handoff' OR lead_id IS NOT NULL))
) IS TRUE);
CREATE INDEX ai_jobs_r2_ready_idx ON public.ai_intelligence_jobs(not_before,created_at)
  WHERE feature='bounded_intelligence_v1' AND status IN ('queued','processing');

CREATE FUNCTION public.enqueue_r2_worker_v1(p_key text,p_lead uuid,p_actor text,p_contract jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE existing public.ai_intelligence_jobs%ROWTYPE; v_id uuid; v_deadline timestamptz;
BEGIN
  IF p_key !~ '^r2:[a-f0-9]{64}$' OR length(coalesce(p_actor,'')) NOT BETWEEN 1 AND 150
     OR p_contract->>'actor' IS DISTINCT FROM p_actor THEN
    RETURN jsonb_build_object('ok',false,'error','invalid_worker_contract');
  END IF;
  v_deadline := (p_contract->>'deadline')::timestamptz;
  IF v_deadline IS NULL OR v_deadline<=now() OR v_deadline>now()+interval '7 days' THEN
    RETURN jsonb_build_object('ok',false,'error','invalid_worker_deadline');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_key));
  SELECT * INTO existing FROM public.ai_intelligence_jobs WHERE request_key=p_key;
  IF FOUND THEN
    IF existing.feature<>'bounded_intelligence_v1' OR existing.lead_id IS DISTINCT FROM p_lead
       OR existing.requested_by IS DISTINCT FROM p_actor OR existing.r2_contract IS DISTINCT FROM p_contract THEN
      RETURN jsonb_build_object('ok',false,'error','worker_replay_conflict');
    END IF;
    RETURN jsonb_build_object('ok',true,'id',existing.id,'replay',true);
  END IF;
  INSERT INTO public.ai_intelligence_jobs(lead_id,feature,status,request_key,requested_by,max_attempts,r2_contract,r2_deadline)
    VALUES(p_lead,'bounded_intelligence_v1','queued',p_key,p_actor,2,p_contract,v_deadline) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'id',v_id,'replay',false);
END $$;

CREATE FUNCTION public.claim_r2_worker_v1(p_worker text,p_actor text,p_roles text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE job public.ai_intelligence_jobs%ROWTYPE;
BEGIN
  IF length(coalesce(p_worker,'')) NOT BETWEEN 8 AND 150 OR length(coalesce(p_actor,'')) NOT BETWEEN 1 AND 150
    OR coalesce(cardinality(p_roles),0) NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'invalid_worker_identity'; END IF;
  -- Serialize only the small claim transaction; never hold a DB lock across HTTP.
  PERFORM pg_advisory_xact_lock(hashtext('amm:r2:two-worker-limit'));
  UPDATE public.ai_intelligence_jobs SET status='failed',last_error_code='worker_deadline_or_attempts_exhausted',
    r2_lease_until=NULL,r2_lease_token=NULL,completed_at=now(),updated_at=now()
    WHERE feature='bounded_intelligence_v1' AND status IN ('queued','processing')
      AND (r2_deadline<=now() OR (status='processing' AND r2_lease_until<=now() AND attempt_count>=max_attempts));
  UPDATE public.ai_intelligence_jobs SET status='queued',r2_lease_until=NULL,r2_lease_token=NULL,
    not_before=now()+interval '30 seconds',last_error_code='worker_lease_expired',updated_at=now()
    WHERE feature='bounded_intelligence_v1' AND status='processing' AND r2_lease_until<=now();
  IF (SELECT count(*) FROM public.ai_intelligence_jobs WHERE feature='bounded_intelligence_v1'
      AND status='processing' AND r2_lease_until>now())>=2 THEN RETURN NULL; END IF;
  SELECT * INTO job FROM public.ai_intelligence_jobs WHERE feature='bounded_intelligence_v1'
    AND status='queued' AND requested_by=p_actor AND r2_contract->>'role'=ANY(p_roles)
    AND not_before<=now() AND r2_deadline>now() AND attempt_count<max_attempts
    ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.ai_intelligence_jobs SET status='processing',attempt_count=attempt_count+1,claimed_at=now(),
    r2_lease_until=least(now()+interval '30 seconds',r2_deadline),r2_lease_token=gen_random_uuid(),
    metadata=metadata||jsonb_build_object('worker',p_worker),updated_at=now()
    WHERE id=job.id RETURNING * INTO job;
  RETURN to_jsonb(job);
END $$;

CREATE FUNCTION public.complete_r2_worker_v1(p_id uuid,p_token uuid,p_result jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE job public.ai_intelligence_jobs%ROWTYPE;
BEGIN
  SELECT * INTO job FROM public.ai_intelligence_jobs WHERE id=p_id AND feature='bounded_intelligence_v1' FOR UPDATE;
  IF NOT FOUND OR job.status<>'processing' OR job.r2_lease_token IS DISTINCT FROM p_token
     OR job.r2_lease_until<=now() OR job.r2_deadline<=now() THEN
    RETURN jsonb_build_object('ok',false,'error','worker_lease_not_current');
  END IF;
  IF p_result->>'version' IS DISTINCT FROM 'amm.r2.workers.v1'
    OR p_result->>'role' IS DISTINCT FROM job.r2_contract->>'role'
    OR p_result->>'effects' IS DISTINCT FROM 'draft_only_no_send'
    OR coalesce(p_result->>'state','') NOT IN ('review_required','quarantined','blocked')
    OR coalesce((p_result->>'steps')::integer,999)>least(8,(job.r2_contract->'budget'->>'steps')::integer)
    OR length(coalesce(p_result->>'text','')) NOT BETWEEN 1 AND 5000 THEN
    RETURN jsonb_build_object('ok',false,'error','invalid_worker_result');
  END IF;
  -- Recheck version at the actual write, not only before draft generation.
  IF job.lead_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.leads
      WHERE id=job.lead_id AND updated_at::text=job.r2_contract->>'entityVersion') THEN
    RETURN jsonb_build_object('ok',false,'error','worker_entity_changed');
  END IF;
  IF job.lead_id IS NOT NULL AND job.r2_contract->>'role'='concierge_handoff'
    AND p_result->>'state'='review_required' THEN
    INSERT INTO public.lead_action_reviews(lead_id,action_key,status,actor_user_id,reason)
      VALUES(job.lead_id,'r2-review:'||job.id,'open',job.requested_by,'Read-only handoff draft; no contact, task, assignment or calendar action executed.')
      ON CONFLICT(lead_id,action_key) DO NOTHING;
    -- Existing immutable review reader can show this deterministic brief. No
    -- fictitious model response, generated task or approved/send state is added.
    INSERT INTO public.ai_draft_reviews(draft_key,version,lead_id,artifact_type,purpose,status,
      content,content_hash,source_fingerprint,evidence_references,missing_facts,limitations,
      schema_version,prompt_version,model,created_by)
      VALUES(job.id,1,job.lead_id,'lead_summary','lead_summary','generated',
        p_result->>'text',encode(sha256(convert_to(p_result->>'text','UTF8')),'hex'),
        encode(sha256(convert_to(job.r2_contract::text,'UTF8')),'hex'),
        coalesce(p_result->'evidence','[]'::jsonb),coalesce(p_result->'missing','[]'::jsonb),
        '["Deterministic reviewed-handoff draft, not a provider result or contact authorization.","Human review required; approval never sends."]'::jsonb,
        'amm.r2.workers.v1','amm.r2.workers.v1','none',job.requested_by);
  END IF;
  UPDATE public.ai_intelligence_jobs SET status=CASE WHEN p_result->>'state'='review_required' THEN 'completed' ELSE 'blocked' END,
    r2_result=p_result,completed_at=now(),updated_at=now(),r2_lease_token=NULL,r2_lease_until=NULL WHERE id=p_id;
  RETURN jsonb_build_object('ok',true,'reviewRequired',true);
END $$;

-- These lifetime caps are independent of provider soft budgets and do not reset
-- each day. Ambiguous/expired reservations remain charged at their full maximum.
CREATE FUNCTION public.reserve_r2_evaluation_v1(p_key text,p_lead uuid,p_model text,p_phase text,p_max numeric,p_actor text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE existing public.ai_budget_reservations%ROWTYPE; v_id uuid; total numeric; sentinel numeric; attempts integer;
BEGIN
  IF p_phase NOT IN ('sentinel','fixed') OR p_max IS NULL OR p_max<=0 OR p_max>0.16
    OR length(coalesce(p_key,'')) NOT BETWEEN 16 AND 180 OR length(coalesce(p_actor,'')) NOT BETWEEN 1 AND 150
    OR length(coalesce(p_model,'')) NOT BETWEEN 1 AND 100
    OR NOT EXISTS(SELECT 1 FROM public.leads WHERE id=p_lead AND is_test=true AND communication_suppressed=true) THEN
    RETURN jsonb_build_object('ok',false,'error','invalid_evaluation_reservation');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('amm:r2:evaluation:lifetime10:sentinel0.50'));
  SELECT * INTO existing FROM public.ai_budget_reservations WHERE request_key=p_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok',existing.lead_id=p_lead AND existing.model=p_model
      AND existing.feature='r2_evaluation_'||p_phase AND existing.actor_user_id=p_actor,
      'id',existing.id,'idempotent_replay',true);
  END IF;
  SELECT coalesce(sum(CASE WHEN status='finalized' THEN actual_cost_usd ELSE reserved_cost_usd END),0),
    coalesce(sum(CASE WHEN feature='r2_evaluation_sentinel' THEN CASE WHEN status='finalized' THEN actual_cost_usd ELSE reserved_cost_usd END ELSE 0 END),0),
    count(*) FILTER(WHERE feature='r2_evaluation_sentinel') INTO total,sentinel,attempts
    FROM public.ai_budget_reservations WHERE feature IN ('r2_evaluation_sentinel','r2_evaluation_fixed');
  IF total+p_max>10 OR (p_phase='sentinel' AND (attempts>=3 OR sentinel+p_max>0.50)) THEN
    RETURN jsonb_build_object('ok',false,'error','evaluation_lifetime_cap');
  END IF;
  INSERT INTO public.ai_budget_reservations(request_key,lead_id,feature,model,status,reserved_cost_usd,actor_user_id,expires_at)
    VALUES(p_key,p_lead,'r2_evaluation_'||p_phase,p_model,'reserved',p_max,p_actor,now()+interval '24 hours') RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'id',v_id,'idempotent_replay',false);
END $$;

CREATE FUNCTION public.cancel_r2_worker_v1(p_id uuid,p_actor text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  UPDATE public.ai_intelligence_jobs SET status='cancelled',r2_lease_token=NULL,r2_lease_until=NULL,
    completed_at=now(),updated_at=now(),last_error_code='cancelled_by_requestor'
    WHERE id=p_id AND feature='bounded_intelligence_v1' AND requested_by=p_actor AND status IN ('queued','processing');
  RETURN FOUND;
END $$;

DO $$ DECLARE signature text; role_name text;
BEGIN
  FOREACH signature IN ARRAY ARRAY['public.enqueue_r2_worker_v1(text,uuid,text,jsonb)',
    'public.claim_r2_worker_v1(text,text,text[])','public.complete_r2_worker_v1(uuid,uuid,jsonb)',
    'public.cancel_r2_worker_v1(uuid,text)','public.reserve_r2_evaluation_v1(text,uuid,text,text,numeric,text)'] LOOP
    EXECUTE 'REVOKE ALL ON FUNCTION '||signature||' FROM PUBLIC';
    FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I',signature,role_name);
      END IF;
    END LOOP;
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN EXECUTE 'GRANT EXECUTE ON FUNCTION '||signature||' TO service_role'; END IF;
  END LOOP;
END $$;
COMMIT;
