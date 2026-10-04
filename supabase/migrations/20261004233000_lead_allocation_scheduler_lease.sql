-- Depends on PR288; operational singleton, NOT a second queue or lead store.
-- No cron installation, policy activation, roster, sends or historical drain.
CREATE TABLE public.lead_allocation_scheduler_lease (
  id text PRIMARY KEY CHECK (id = 'staff_v1'),
  token uuid,
  lease_until timestamptz,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  run_count bigint NOT NULL DEFAULT 0,
  last_result jsonb NOT NULL DEFAULT '{}'
);
ALTER TABLE public.lead_allocation_scheduler_lease ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_allocation_scheduler_lease FROM PUBLIC;

CREATE FUNCTION public.acquire_lead_allocation_scheduler_v1(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE acquired public.lead_allocation_scheduler_lease; previous_start timestamptz;
BEGIN
  IF p_token IS NULL THEN RETURN jsonb_build_object('acquired',false,'reason','invalid_token'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lead_allocation_policy WHERE id='staff_v1'
    AND active AND approved_at IS NOT NULL AND starts_at IS NOT NULL AND fallback_agent_id IS NOT NULL)
  THEN RETURN jsonb_build_object('acquired',false,'reason','policy_held'); END IF;
  -- First insert establishes the same row-lock contract as every later run.
  INSERT INTO public.lead_allocation_scheduler_lease(id) VALUES ('staff_v1') ON CONFLICT DO NOTHING;
  SELECT * INTO acquired FROM public.lead_allocation_scheduler_lease WHERE id='staff_v1' FOR UPDATE;
  IF acquired.lease_until > clock_timestamp() THEN
    RETURN jsonb_build_object('acquired',false,'reason','lease_busy');
  END IF;
  IF acquired.last_started_at > clock_timestamp()-interval '60 seconds' THEN
    RETURN jsonb_build_object('acquired',false,'reason','cadence_duplicate');
  END IF;
  previous_start := acquired.last_started_at;
  UPDATE public.lead_allocation_scheduler_lease SET token=p_token,
    lease_until=clock_timestamp()+interval '90 seconds',last_started_at=clock_timestamp(),run_count=run_count+1
    WHERE id='staff_v1' RETURNING * INTO acquired;
  RETURN jsonb_build_object('acquired',true,'lease_until',acquired.lease_until,
    'start_gap_seconds',CASE WHEN previous_start IS NULL THEN NULL ELSE extract(epoch FROM acquired.last_started_at-previous_start) END,
    'late_seconds',CASE WHEN previous_start IS NULL THEN NULL ELSE greatest(0,extract(epoch FROM acquired.last_started_at-previous_start)-60) END);
END $$;

-- Same canonical expiry implementation, with an explicit discovery hold.
-- Compatibility wrapper keeps PR288 callers intact. No parallel routing logic.
CREATE FUNCTION public.expire_lead_allocation_offers_v2(p_limit integer,p_discover boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE o record; candidate record; policy public.lead_allocation_policy; n integer:=0; escalation jsonb; escalated integer:=0; first_offered integer:=0;
BEGIN
  PERFORM pg_advisory_xact_lock(731042026);
  FOR o IN SELECT * FROM public.lead_allocation_offers WHERE state='offered' AND deadline<=clock_timestamp() ORDER BY deadline,id LIMIT LEAST(GREATEST(p_limit,1),50) LOOP
    PERFORM 1 FROM public.leads WHERE id=o.lead_id FOR UPDATE;
    PERFORM 1 FROM public.lead_allocation_offers WHERE id=o.id AND state='offered' FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;
    UPDATE public.lead_allocation_offers SET state='expired',resolved_at=now() WHERE id=o.id;
    UPDATE public.lead_notifications SET status='skipped',error_code='offer_expired' WHERE notification_type='allocation_offer' AND metadata->>'offer_id'=o.id::text AND status IN ('pending','retry_scheduled','failed') AND provider_message_id IS NULL;
    INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,metadata) VALUES('system/allocation_due','allocation.expired','lead',o.lead_id,jsonb_build_object('offer_id',o.id,'processing_delay_seconds',extract(epoch FROM clock_timestamp()-o.deadline)));
    INSERT INTO public.tasks(lead_id,agent_id,title,body,category,created_by,priority)
    SELECT o.lead_id,o.expected_owner,'Allocation fallback review','Offer expired; custodian retained. Review next eligible agent or manual assignment.','allocation_fallback','system/allocation_due','high'
    WHERE NOT EXISTS(SELECT 1 FROM public.tasks WHERE lead_id=o.lead_id AND category='allocation_fallback' AND status='open');
    n:=n+1;
  END LOOP;
  SELECT * INTO policy FROM public.lead_allocation_policy WHERE id='staff_v1';
  IF p_discover AND policy.active AND policy.approved_at IS NOT NULL AND policy.starts_at IS NOT NULL THEN
    FOR candidate IN SELECT l.id,l.allocation_version FROM public.leads l
      WHERE l.created_at>=policy.starts_at AND l.duplicate_of_lead_id IS NULL
        AND NOT l.is_test AND NOT l.communication_suppressed AND l.status NOT IN ('dead','converted','closed_won','closed_lost')
        AND (l.assigned_agent_id IS NULL OR l.assigned_agent_id=policy.fallback_agent_id)
        AND NOT EXISTS(SELECT 1 FROM public.lead_allocation_offers h WHERE h.lead_id=l.id)
        AND NOT EXISTS(SELECT 1 FROM public.tasks t WHERE t.lead_id=l.id AND t.category='allocation_fallback' AND t.status='open')
      ORDER BY l.created_at,l.id LIMIT LEAST(GREATEST(p_limit,1),25)
    LOOP
      escalation:=public.create_lead_allocation_offers_v1(candidate.id,candidate.allocation_version,policy.approved_by);
      IF escalation->>'ok'='true' THEN first_offered:=first_offered+1; END IF;
    END LOOP;
    FOR candidate IN SELECT DISTINCT l.id,l.allocation_version
      FROM public.leads l JOIN public.lead_allocation_offers previous ON previous.lead_id=l.id AND previous.version=l.allocation_version
      WHERE previous.state IN ('passed','expired') AND previous.policy_version=policy.version AND previous.created_at>=policy.starts_at AND NOT l.is_test AND NOT l.communication_suppressed
        AND NOT EXISTS(SELECT 1 FROM public.lead_allocation_offers current_offer WHERE current_offer.lead_id=l.id AND current_offer.state IN ('offered','accepted'))
        AND (SELECT max(round) FROM public.lead_allocation_offers history WHERE history.lead_id=l.id)<policy.max_rounds
      ORDER BY l.id LIMIT LEAST(GREATEST(p_limit,1),25)
    LOOP
      escalation:=public.create_lead_allocation_offers_v1(candidate.id,candidate.allocation_version,policy.approved_by);
      IF escalation->>'ok'='true' THEN escalated:=escalated+1; END IF;
    END LOOP;
  END IF;
  RETURN jsonb_build_object('ok',true,'expired',n,'escalated',escalated,'first_offered',first_offered,'discovery_held',NOT p_discover);
END $$;
CREATE OR REPLACE FUNCTION public.expire_lead_allocation_offers_v1(p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT public.expire_lead_allocation_offers_v2(p_limit,true);
$$;
REVOKE ALL ON FUNCTION public.expire_lead_allocation_offers_v2(integer,boolean) FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
  GRANT EXECUTE ON FUNCTION public.expire_lead_allocation_offers_v2(integer,boolean) TO service_role;
END IF; END $$;

REVOKE ALL ON FUNCTION public.acquire_lead_allocation_scheduler_v1(uuid) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON public.lead_allocation_scheduler_lease FROM anon; END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON public.lead_allocation_scheduler_lease FROM authenticated; END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    GRANT SELECT,INSERT,UPDATE ON public.lead_allocation_scheduler_lease TO service_role;
    GRANT EXECUTE ON FUNCTION public.acquire_lead_allocation_scheduler_v1(uuid) TO service_role;
  END IF;
END $$;
