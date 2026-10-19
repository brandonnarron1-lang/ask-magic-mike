-- Staff-reviewed handoff on the existing jobs/draft/action-review stores.
-- No model, contact, task, ownership, consumer data or notification mutation.
BEGIN;
CREATE FUNCTION public.r2_handoff_context_v1(p_lead uuid,p_actor text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT jsonb_build_object(
    'fingerprint',encode(sha256(convert_to(jsonb_build_array(to_jsonb(l),cp.evidence,a.name)::text,'UTF8')),'hex'),
    'lead',jsonb_build_object('id',l.id,'version',l.updated_at::text,
      'owner',a.name,'intent',coalesce(l.primary_intent,l.lead_type,'Not recorded'),
      'propertyReference',coalesce(l.buyer_interest->'properties'->0->>'address_text',
        l.buyer_interest->'properties'->0->>'listing_url',l.address_raw),
      'missing',to_jsonb(array_remove(ARRAY[
        CASE WHEN l.address_raw IS NULL AND l.buyer_interest IS NULL THEN 'Property reference or search preference' END,
        CASE WHEN l.timeline_months IS NULL THEN 'Timeframe' END]::text[],NULL)),
      'permissions',cp.labels,'isTest',l.is_test,'suppressed',l.communication_suppressed,
      'status',l.status,'conversionStage',l.conversion_stage))
  FROM public.leads l
  JOIN public.lead_center_users u ON u.id=p_actor AND u.banned=false
    AND (u.role='administrator' OR (u.role IN ('primary_lead_owner','approved_agent') AND lower(u."agentId")=l.assigned_agent_id::text))
  LEFT JOIN public.agents a ON a.id=l.assigned_agent_id
  CROSS JOIN LATERAL (SELECT
    coalesce(jsonb_agg(jsonb_build_object('id',p.id,'channel',p.channel,'purpose',p.purpose,'state',p.state,
      'consentVersion',p.consent_version,'source',p.source,'at',p.evidence_at,'review',p.manual_review_required,'updated',p.updated_at) ORDER BY p.id),'[]'::jsonb) AS evidence,
    coalesce(jsonb_agg(p.channel||' / '||p.purpose||': '||p.state||CASE WHEN p.manual_review_required THEN ' (review required)' ELSE ' (recorded only)' END ORDER BY p.id),'[]'::jsonb) AS labels
    FROM public.communication_permissions p WHERE p.lead_id=l.id) cp
  WHERE l.id=p_lead
$$;

-- Target one operator's explicit request, never an unrelated queued inquiry.
-- Same store, two-worker lock, deadline, attempt and lease contracts as R2.
CREATE FUNCTION public.claim_r2_handoff_v1(p_id uuid,p_worker text,p_actor text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE job public.ai_intelligence_jobs%ROWTYPE;
BEGIN
  IF length(coalesce(p_worker,'')) NOT BETWEEN 8 AND 150 THEN RAISE EXCEPTION 'invalid_worker_identity'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('amm:r2:two-worker-limit'));
  SELECT * INTO job FROM public.ai_intelligence_jobs WHERE id=p_id AND feature='bounded_intelligence_v1'
    AND requested_by=p_actor AND r2_contract->>'role'='concierge_handoff' FOR UPDATE;
  IF NOT FOUND OR public.r2_handoff_context_v1(job.lead_id,p_actor) IS NULL THEN RETURN NULL; END IF;
  IF job.status='processing' AND job.r2_lease_until<=now() THEN
    UPDATE public.ai_intelligence_jobs SET status=CASE WHEN attempt_count>=max_attempts OR r2_deadline<=now() THEN 'failed' ELSE 'queued' END,
      not_before=now()+interval '30 seconds',r2_lease_token=NULL,r2_lease_until=NULL,last_error_code='worker_lease_expired',updated_at=now() WHERE id=p_id;
    RETURN NULL;
  END IF;
  IF job.status='queued' AND (job.r2_deadline<=now() OR job.attempt_count>=job.max_attempts) THEN
    UPDATE public.ai_intelligence_jobs SET status='failed',completed_at=now(),updated_at=now(),
      last_error_code='worker_deadline_or_attempts_exhausted' WHERE id=p_id;
    RETURN NULL;
  END IF;
  IF job.status<>'queued' OR job.not_before>now() OR job.r2_deadline<=now() OR job.attempt_count>=job.max_attempts
    OR (SELECT count(*) FROM public.ai_intelligence_jobs WHERE feature='bounded_intelligence_v1' AND status='processing' AND r2_lease_until>now())>=2 THEN RETURN NULL; END IF;
  UPDATE public.ai_intelligence_jobs SET status='processing',attempt_count=attempt_count+1,claimed_at=now(),
    r2_lease_until=least(now()+interval '30 seconds',r2_deadline),r2_lease_token=gen_random_uuid(),
    metadata=metadata||jsonb_build_object('worker',p_worker),updated_at=now() WHERE id=p_id RETURNING * INTO job;
  RETURN to_jsonb(job);
END $$;

-- Keep the original commit implementation and add a current-context guard.
ALTER FUNCTION public.complete_r2_worker_v1(uuid,uuid,jsonb) RENAME TO complete_r2_worker_base_v1;
CREATE FUNCTION public.complete_r2_worker_v1(p_id uuid,p_token uuid,p_result jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE job public.ai_intelligence_jobs%ROWTYPE; context jsonb;
BEGIN
  SELECT * INTO job FROM public.ai_intelligence_jobs WHERE id=p_id AND feature='bounded_intelligence_v1' FOR UPDATE;
  IF job.r2_contract->'input'->>'contextFingerprint' IS NOT NULL THEN
    PERFORM 1 FROM public.leads WHERE id=job.lead_id FOR UPDATE;
    PERFORM 1 FROM public.lead_center_users WHERE id=job.requested_by FOR SHARE;
    context:=public.r2_handoff_context_v1(job.lead_id,job.requested_by);
    IF context IS NULL OR context->>'fingerprint' IS DISTINCT FROM job.r2_contract->'input'->>'contextFingerprint'
       OR (context->'lead'->>'isTest')::boolean OR (context->'lead'->>'suppressed')::boolean THEN
      RETURN jsonb_build_object('ok',false,'error','handoff_context_changed');
    END IF;
  END IF;
  RETURN public.complete_r2_worker_base_v1(p_id,p_token,p_result);
END $$;

-- A handoff uses its full scoped context/permission snapshot, not the legacy
-- model-facts fingerprint. Approval still calls the existing immutable writer.
CREATE FUNCTION public.review_r2_handoff_v1(p_key uuid,p_version integer,p_action text,p_content text,p_hash text,p_actor text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE draft public.ai_draft_reviews%ROWTYPE; job public.ai_intelligence_jobs%ROWTYPE; context jsonb;
BEGIN
  SELECT * INTO draft FROM public.ai_draft_reviews WHERE draft_key=p_key ORDER BY version DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR draft.schema_version<>'amm.r2.workers.v1' THEN RETURN jsonb_build_object('ok',false,'error','draft_not_found'); END IF;
  PERFORM 1 FROM public.leads WHERE id=draft.lead_id FOR UPDATE;
  PERFORM 1 FROM public.lead_center_users WHERE id=p_actor FOR SHARE;
  context:=public.r2_handoff_context_v1(draft.lead_id,p_actor);
  IF context IS NULL THEN RETURN jsonb_build_object('ok',false,'error','draft_not_found'); END IF;
  SELECT * INTO job FROM public.ai_intelligence_jobs WHERE id=p_key AND lead_id=draft.lead_id AND feature='bounded_intelligence_v1';
  IF NOT FOUND OR job.r2_contract->'input'->>'contextFingerprint' IS NULL THEN RETURN jsonb_build_object('ok',false,'error','handoff_context_unavailable'); END IF;
  IF draft.version<>p_version THEN RETURN jsonb_build_object('ok',false,'error','stale_draft_version'); END IF;
  IF (context->'lead'->>'isTest')::boolean OR (context->'lead'->>'suppressed')::boolean THEN RETURN jsonb_build_object('ok',false,'error','draft_approval_blocked'); END IF;
  IF p_action<>'expire' AND (job.r2_deadline<=now()
    OR job.r2_contract->'input'->'source'->>'status' IS DISTINCT FROM 'active'
    OR (job.r2_contract->'input'->'source'->>'fetchedAt')::timestamptz
       + make_interval(hours=>(job.r2_contract->'input'->'source'->>'freshnessHours')::integer)<=now()
    OR context->>'fingerprint' IS DISTINCT FROM job.r2_contract->'input'->>'contextFingerprint'
    OR draft.source_fingerprint<>encode(sha256(convert_to(job.r2_contract::text,'UTF8')),'hex')) THEN
    RETURN public.mutate_ai_draft_review_v1(p_key,p_version,'expire','','',p_actor,now())||jsonb_build_object('ok',false,'error','stale_draft_facts','expired',true);
  END IF;
  RETURN public.mutate_ai_draft_review_v1(p_key,p_version,p_action,p_content,p_hash,p_actor,now());
END $$;

DO $$ DECLARE f text; r text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.r2_handoff_context_v1(uuid,text)','public.claim_r2_handoff_v1(uuid,text,text)',
    'public.complete_r2_worker_v1(uuid,uuid,jsonb)','public.review_r2_handoff_v1(uuid,integer,text,text,text,text)'] LOOP
    EXECUTE 'REVOKE ALL ON FUNCTION '||f||' FROM PUBLIC';
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I',f,r); END IF;
    END LOOP;
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN EXECUTE 'GRANT EXECUTE ON FUNCTION '||f||' TO service_role'; END IF;
  END LOOP;
END $$;
COMMIT;
