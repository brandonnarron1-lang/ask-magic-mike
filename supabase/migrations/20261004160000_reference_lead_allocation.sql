-- Additive, source-only. Depends on accepted PR286 and pending PR287.
-- No roster, provider activation, policy approval or production data import.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS allocation_version bigint NOT NULL DEFAULT 0;

CREATE TABLE public.lead_allocation_policy (
  id text PRIMARY KEY CHECK(id='staff_v1'), version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT false, approved_at timestamptz, approved_by text,
  starts_at timestamptz,
  fallback_agent_id uuid REFERENCES public.agents(id),
  mode text NOT NULL DEFAULT 'sequential' CHECK(mode IN ('sequential','first_claim')),
  max_fanout integer NOT NULL DEFAULT 1 CHECK(max_fanout BETWEEN 1 AND 4),
  max_rounds integer NOT NULL DEFAULT 3 CHECK(max_rounds BETWEEN 1 AND 5),
  offer_seconds integer NOT NULL DEFAULT 180 CHECK(offer_seconds BETWEEN 60 AND 900),
  daily_segment_budget integer NOT NULL DEFAULT 0 CHECK(daily_segment_budget BETWEEN 0 AND 500),
  daily_estimated_cost_micros bigint NOT NULL DEFAULT 0 CHECK(daily_estimated_cost_micros>=0),
  max_segments_per_message integer NOT NULL DEFAULT 3 CHECK(max_segments_per_message BETWEEN 1 AND 6),
  mms_enabled boolean NOT NULL DEFAULT false
);
INSERT INTO public.lead_allocation_policy(id) VALUES ('staff_v1');

-- Agent directory owns destinations. This is channel enrollment/evidence,
-- not a second agent/contact table. Fingerprint changes revoke the binding.
CREATE TABLE public.agent_operational_enrollment (
  agent_id uuid PRIMARY KEY REFERENCES public.agents(id),
  user_id text NOT NULL UNIQUE REFERENCES public.lead_center_users(id),
  approved_at timestamptz, approved_by text,
  phone_fingerprint text UNIQUE, possession_verified_at timestamptz,
  consent_at timestamptz, consent_version text, revoked_at timestamptz,
  paused boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  sms_enabled boolean NOT NULL DEFAULT false,
  mms_enabled boolean NOT NULL DEFAULT false,
  towns text[] NOT NULL DEFAULT '{}', intents text[] NOT NULL DEFAULT '{}',
  weight integer NOT NULL DEFAULT 1 CHECK(weight BETWEEN 1 AND 100),
  daily_cap integer NOT NULL DEFAULT 1 CHECK(daily_cap BETWEEN 0 AND 100),
  concurrent_cap integer NOT NULL DEFAULT 1 CHECK(concurrent_cap BETWEEN 0 AND 20),
  last_offered_at timestamptz,
  challenge_hash text, challenge_expires_at timestamptz,
  challenge_attempts integer NOT NULL DEFAULT 0 CHECK(challenge_attempts BETWEEN 0 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lead_allocation_offers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL REFERENCES public.leads(id), agent_id uuid NOT NULL REFERENCES public.agents(id),
  version bigint NOT NULL, policy_version integer NOT NULL,
  round integer NOT NULL CHECK(round BETWEEN 1 AND 5),
  reference text NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'offered' CHECK(state IN ('offered','accepted','passed','expired','cancelled','blocked')),
  expected_owner uuid, expected_assigned_at timestamptz,
  deadline timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz,
  binding_fingerprint text, reason text NOT NULL,
  UNIQUE(lead_id,version,agent_id)
);
CREATE INDEX lead_allocation_offers_due_idx ON public.lead_allocation_offers(deadline) WHERE state='offered';
CREATE UNIQUE INDEX lead_allocation_one_winner_idx ON public.lead_allocation_offers(lead_id,version) WHERE state='accepted';
CREATE TABLE public.lead_allocation_command_receipts (
  receipt_key text PRIMARY KEY, offer_id uuid REFERENCES public.lead_allocation_offers(id),
  actor_user_id text NOT NULL, request_hash text NOT NULL, result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lead_allocation_send_reservations (
  notification_id uuid PRIMARY KEY REFERENCES public.lead_notifications(id),
  offer_id uuid NOT NULL REFERENCES public.lead_allocation_offers(id),
  agent_id uuid NOT NULL REFERENCES public.agents(id), day date NOT NULL,
  segments integer NOT NULL CHECK(segments BETWEEN 0 AND 6),
  estimated_cost_micros bigint NOT NULL CHECK(estimated_cost_micros>=0),
  state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','accepted','ambiguous','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.verify_staff_allocation_possession_v1(p_agent uuid,p_user text,p_binding text,p_code_hash text,p_receipt text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE e public.agent_operational_enrollment; previous public.lead_allocation_command_receipts; result jsonb; verified boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(731042026);
 SELECT * INTO previous FROM public.lead_allocation_command_receipts WHERE receipt_key=p_receipt;
 IF FOUND THEN
  IF previous.actor_user_id IS DISTINCT FROM p_user OR previous.request_hash IS DISTINCT FROM p_code_hash THEN RETURN jsonb_build_object('ok',false,'error','command_receipt_conflict'); END IF;
  RETURN previous.result||jsonb_build_object('replayed',true);
 END IF;
 SELECT * INTO e FROM public.agent_operational_enrollment WHERE agent_id=p_agent FOR UPDATE;
 IF e.agent_id IS NULL OR e.user_id IS DISTINCT FROM p_user OR e.phone_fingerprint IS DISTINCT FROM p_binding OR e.revoked_at IS NOT NULL OR e.approved_at IS NULL
   OR NOT EXISTS(SELECT 1 FROM public.lead_center_users WHERE id=p_user AND banned IS NOT TRUE AND role IN ('approved_agent','primary_lead_owner') AND "agentId"=p_agent::text) THEN RETURN jsonb_build_object('ok',false,'error','staff_binding_revoked'); END IF;
 verified:=e.challenge_hash=p_code_hash AND e.challenge_expires_at>clock_timestamp() AND e.challenge_attempts<5;
 verified:=COALESCE(verified,false);
 UPDATE public.agent_operational_enrollment SET challenge_attempts=LEAST(5,challenge_attempts+1),
   possession_verified_at=CASE WHEN verified THEN now() ELSE possession_verified_at END,
   challenge_hash=CASE WHEN verified THEN NULL ELSE challenge_hash END,updated_at=now() WHERE agent_id=p_agent;
 result:=jsonb_build_object('ok',verified,'verified',verified);
 INSERT INTO public.lead_allocation_command_receipts(receipt_key,actor_user_id,request_hash,result) VALUES(p_receipt,p_user,p_code_hash,result);
 INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,metadata) VALUES(p_user,'allocation.possession_verification','agent',p_agent,jsonb_build_object('verified',verified));
 RETURN result;
END $$;

CREATE FUNCTION public.create_lead_allocation_offers_v1(p_lead uuid,p_version bigint,p_actor text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE l public.leads; p public.lead_allocation_policy; a record; offer_id uuid; round_no int;
        created_ids jsonb:='[]'; owner uuid; v bigint;
BEGIN
  -- One lock order for creation/claim/expiry/budget, then lead then agent.
  PERFORM pg_advisory_xact_lock(731042026);
  SELECT * INTO p FROM public.lead_allocation_policy WHERE id='staff_v1' FOR UPDATE;
  IF NOT p.active OR p.approved_at IS NULL OR p.starts_at IS NULL OR p.fallback_agent_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','allocation_policy_held'); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.lead_center_users WHERE id=p_actor AND role='administrator' AND banned IS NOT TRUE) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  SELECT * INTO l FROM public.leads WHERE id=p_lead FOR UPDATE;
  IF NOT FOUND OR l.created_at<p.starts_at OR l.duplicate_of_lead_id IS NOT NULL OR l.is_test OR l.communication_suppressed OR l.status IN ('dead','converted','closed_won','closed_lost') THEN RETURN jsonb_build_object('ok',false,'error','lead_ineligible'); END IF;
  IF l.allocation_version<>p_version THEN RETURN jsonb_build_object('ok',false,'error','stale_assignment_version'); END IF;
  -- Trusted/explicit existing owner is retained, not offered away.
  IF l.assigned_agent_id IS NOT NULL AND l.assigned_agent_id<>p.fallback_agent_id THEN RETURN jsonb_build_object('ok',false,'error','existing_owner_retained'); END IF;
  IF EXISTS(SELECT 1 FROM public.lead_allocation_offers WHERE lead_id=p_lead AND state='offered') THEN RETURN jsonb_build_object('ok',false,'error','offer_already_open'); END IF;
  SELECT COALESCE(max(round),0)+1 INTO round_no FROM public.lead_allocation_offers WHERE lead_id=p_lead;
  IF round_no>p.max_rounds THEN RETURN jsonb_build_object('ok',false,'error','escalation_limit'); END IF;
  owner:=l.assigned_agent_id; v:=l.allocation_version+1;
  FOR a IN
    SELECT e.*,g.current_load,g.max_daily_leads,g.notification_email AS directory_email,g.notification_sms AS directory_sms FROM public.agent_operational_enrollment e
    JOIN public.agents g ON g.id=e.agent_id JOIN public.lead_center_users u ON u.id=e.user_id
    WHERE e.approved_at IS NOT NULL AND e.revoked_at IS NULL AND NOT e.paused AND g.is_active
      AND u.banned IS NOT TRUE AND u.role IN ('primary_lead_owner','approved_agent') AND u."agentId"=g.id::text
      AND l.city=ANY(e.towns) AND l.lead_type=ANY(e.intents)
      AND ((e.email_enabled AND g.notification_email) OR (e.sms_enabled AND g.notification_sms AND e.consent_at IS NOT NULL AND e.possession_verified_at IS NOT NULL AND e.phone_fingerprint IS NOT NULL))
      AND EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=g.timezone)
      AND (g.availability->lower(to_char(now() AT TIME ZONE g.timezone,'Dy'))->>0)::int <= extract(hour FROM now() AT TIME ZONE g.timezone)
      AND (g.availability->lower(to_char(now() AT TIME ZONE g.timezone,'Dy'))->>1)::int > extract(hour FROM now() AT TIME ZONE g.timezone)
      AND g.current_load + (SELECT count(*) FROM public.lead_allocation_offers o WHERE o.agent_id=g.id AND o.state='offered') < e.concurrent_cap
      AND (SELECT count(*) FROM public.agent_assignments aa WHERE aa.agent_id=g.id AND aa.created_at >= date_trunc('day',now()))
        + (SELECT count(*) FROM public.lead_allocation_offers o WHERE o.agent_id=g.id AND o.state='offered') < LEAST(e.daily_cap,g.max_daily_leads)
      AND NOT EXISTS(SELECT 1 FROM public.lead_allocation_offers o WHERE o.lead_id=p_lead AND o.agent_id=g.id)
    ORDER BY (g.current_load + (SELECT count(*) FROM public.lead_allocation_offers o WHERE o.agent_id=g.id AND o.state='offered'))::numeric / e.weight,
      e.last_offered_at NULLS FIRST,g.id
    LIMIT CASE WHEN p.mode='sequential' THEN 1 ELSE p.max_fanout END
    FOR UPDATE OF e,g
  LOOP
    offer_id:=uuid_generate_v4();
    INSERT INTO public.lead_allocation_offers(id,lead_id,agent_id,version,policy_version,round,reference,expected_owner,expected_assigned_at,deadline,binding_fingerprint,reason)
    VALUES(offer_id,p_lead,a.agent_id,v,p.version,round_no,'AMM-'||upper(substr(offer_id::text,1,8)),owner,l.assigned_at,now()+make_interval(secs=>p.offer_seconds),a.phone_fingerprint,'Approved coverage, least weighted load, capacity reservation; UUID tie-break');
    UPDATE public.agent_operational_enrollment SET last_offered_at=now(),updated_at=now() WHERE agent_id=a.agent_id;
    IF a.email_enabled AND a.directory_email THEN
    INSERT INTO public.lead_notifications(lead_id,agent_id,notification_type,channel,recipient_type,recipient_reference,template_version,idempotency_key,status,metadata)
    VALUES(p_lead,a.agent_id,'allocation_offer','email','agent','agent:'||a.agent_id,'reference_cards_v1','allocation:'||offer_id||':v'||v||':email','pending',jsonb_build_object('offer_id',offer_id,'offer_version',v,'allocation_only',true));
    END IF;
    IF a.sms_enabled AND a.directory_sms AND a.consent_at IS NOT NULL AND a.possession_verified_at IS NOT NULL AND a.phone_fingerprint IS NOT NULL THEN
    INSERT INTO public.lead_notifications(lead_id,agent_id,notification_type,channel,recipient_type,recipient_reference,template_version,idempotency_key,status,metadata)
    VALUES(p_lead,a.agent_id,'allocation_offer','sms','agent','agent:'||a.agent_id,'reference_cards_v1','allocation:'||offer_id||':v'||v||':sms','pending',jsonb_build_object('offer_id',offer_id,'offer_version',v,'allocation_only',true));
    END IF;
    created_ids:=created_ids||jsonb_build_array(offer_id);
  END LOOP;
  IF jsonb_array_length(created_ids)=0 THEN
    INSERT INTO public.tasks(lead_id,agent_id,title,body,category,created_by,priority)
    SELECT p_lead,owner,'Allocation fallback review','No approved recipient / channel / capacity. Custodian unchanged.','allocation_fallback',p_actor,'high'
    WHERE NOT EXISTS(SELECT 1 FROM public.tasks WHERE lead_id=p_lead AND category='allocation_fallback' AND status='open');
    RETURN jsonb_build_object('ok',false,'error','no_eligible_agent','custodian_retained',true);
  END IF;
  UPDATE public.leads SET allocation_version=v WHERE id=p_lead;
  INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,metadata) VALUES(p_actor,'allocation.offered','lead',p_lead,jsonb_build_object('version',v,'policy_version',p.version,'offers',created_ids));
  RETURN jsonb_build_object('ok',true,'offers',created_ids,'version',v);
END $$;

CREATE FUNCTION public.resolve_lead_allocation_offer_v1(p_offer uuid,p_version bigint,p_user text,p_action text,p_receipt text,p_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE o public.lead_allocation_offers; l public.leads; a public.agents; e public.agent_operational_enrollment;
        u public.lead_center_users; previous public.lead_allocation_command_receipts; audit_id uuid; result jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(731042026);
  SELECT * INTO previous FROM public.lead_allocation_command_receipts WHERE receipt_key=p_receipt;
  IF FOUND THEN
    IF previous.actor_user_id<>p_user OR previous.request_hash<>p_hash THEN RETURN jsonb_build_object('ok',false,'error','command_receipt_conflict'); END IF;
    RETURN previous.result||jsonb_build_object('replayed',true);
  END IF;
  IF p_action NOT IN ('claim','pass') OR length(p_receipt)>200 OR length(p_hash)<>64 THEN RETURN jsonb_build_object('ok',false,'error','invalid_command'); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.lead_allocation_policy WHERE id='staff_v1' AND active AND approved_at IS NOT NULL) THEN RETURN jsonb_build_object('ok',false,'error','allocation_policy_held'); END IF;
  SELECT * INTO o FROM public.lead_allocation_offers WHERE id=p_offer;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','offer_not_found'); END IF;
  SELECT * INTO l FROM public.leads WHERE id=o.lead_id FOR UPDATE;
  SELECT * INTO o FROM public.lead_allocation_offers WHERE id=p_offer FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.lead_allocation_policy WHERE id='staff_v1' AND version=o.policy_version AND starts_at<=o.created_at) THEN RETURN jsonb_build_object('ok',false,'error','stale_policy_version'); END IF;
  SELECT * INTO u FROM public.lead_center_users WHERE id=p_user;
  SELECT * INTO e FROM public.agent_operational_enrollment WHERE agent_id=o.agent_id FOR UPDATE;
  SELECT * INTO a FROM public.agents WHERE id=o.agent_id FOR UPDATE;
  IF u.id IS NULL OR u.banned IS TRUE OR u.role NOT IN ('primary_lead_owner','approved_agent') OR u."agentId" IS DISTINCT FROM o.agent_id::text OR e.user_id IS DISTINCT FROM p_user OR e.approved_at IS NULL OR e.revoked_at IS NOT NULL OR NOT a.is_active THEN RETURN jsonb_build_object('ok',false,'error','offer_actor_forbidden'); END IF;
  IF o.state<>'offered' OR o.version<>p_version OR l.allocation_version<>p_version OR o.deadline<=clock_timestamp() OR l.assigned_agent_id IS DISTINCT FROM o.expected_owner OR l.assigned_at IS DISTINCT FROM o.expected_assigned_at THEN RETURN jsonb_build_object('ok',false,'error','offer_stale_or_expired'); END IF;
  IF l.is_test OR l.communication_suppressed OR e.paused THEN RETURN jsonb_build_object('ok',false,'error','lead_or_agent_suppressed'); END IF;
  IF p_action='claim' THEN
    IF a.current_load>=e.concurrent_cap OR (SELECT count(*) FROM public.agent_assignments WHERE agent_id=a.id AND created_at>=date_trunc('day',now()))>=LEAST(a.max_daily_leads,e.daily_cap) THEN RETURN jsonb_build_object('ok',false,'error','capacity_unavailable'); END IF;
    UPDATE public.lead_allocation_offers SET state='accepted',resolved_at=now() WHERE id=o.id;
    UPDATE public.leads SET assigned_agent_id=a.id,assigned_at=now(),assignment_status='assigned',allocation_version=allocation_version+1 WHERE id=l.id;
    UPDATE public.agents SET current_load=current_load+1 WHERE id=a.id;
    IF l.assigned_agent_id IS NOT NULL AND l.assigned_agent_id<>a.id THEN UPDATE public.agents SET current_load=GREATEST(0,current_load-1) WHERE id=l.assigned_agent_id; END IF;
    UPDATE public.agent_assignments SET status='reassigned' WHERE lead_id=l.id AND status IN ('pending','accepted');
    INSERT INTO public.lead_routing(lead_id,agent_id,assigned_at,assignment_reason,agent_priority_score,accept_deadline,contact_deadline,status,accepted_at,notes)
    VALUES(l.id,a.id,now(),o.reason,a.priority_score,o.deadline,now()+interval '15 minutes','accepted',now(),'Canonical cross-channel offer claim')
    ON CONFLICT(lead_id) DO UPDATE SET agent_id=EXCLUDED.agent_id,assigned_at=EXCLUDED.assigned_at,assignment_reason=EXCLUDED.assignment_reason,agent_priority_score=EXCLUDED.agent_priority_score,accept_deadline=EXCLUDED.accept_deadline,contact_deadline=EXCLUDED.contact_deadline,status='accepted',accepted_at=EXCLUDED.accepted_at,contacted_at=NULL,reassigned_to=NULL,notes=EXCLUDED.notes;
    INSERT INTO public.agent_assignments(lead_id,agent_id,assigned_by,assignment_reason,status,accepted_at) VALUES(l.id,a.id,'agent',o.reason,'accepted',now());
    INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,before_state,after_state,metadata)
    VALUES(p_user,'allocation.claimed','lead',l.id,jsonb_build_object('agent_id',l.assigned_agent_id),jsonb_build_object('agent_id',a.id),jsonb_build_object('offer_id',o.id,'offer_version',o.version)) RETURNING id INTO audit_id;
    INSERT INTO public.tasks(lead_id,agent_id,title,body,due_at,priority,category,created_by) VALUES(l.id,a.id,'Review new assignment','Verify facts and channel permission; delivery is not human contact.',now()+interval '15 minutes','high','allocation_followup',p_user);
    IF e.email_enabled AND a.notification_email THEN
    INSERT INTO public.lead_notifications(lead_id,agent_id,assignment_audit_id,notification_type,channel,recipient_type,recipient_reference,template_version,idempotency_key,status,metadata)
    VALUES(l.id,a.id,audit_id,'allocation_confirmation','email','agent','agent:'||a.id,'reference_cards_v1','allocation:'||o.id||':accepted:email','pending',jsonb_build_object('offer_id',o.id,'offer_version',o.version,'allocation_only',true));
    END IF;
    IF e.sms_enabled AND a.notification_sms AND e.consent_at IS NOT NULL AND e.possession_verified_at IS NOT NULL AND e.phone_fingerprint IS NOT NULL THEN
    INSERT INTO public.lead_notifications(lead_id,agent_id,assignment_audit_id,notification_type,channel,recipient_type,recipient_reference,template_version,idempotency_key,status,metadata)
    VALUES(l.id,a.id,audit_id,'allocation_confirmation','sms','agent','agent:'||a.id,'reference_cards_v1','allocation:'||o.id||':accepted:sms','pending',jsonb_build_object('offer_id',o.id,'offer_version',o.version,'allocation_only',true));
    END IF;
    UPDATE public.lead_allocation_offers SET state=CASE WHEN id=o.id THEN 'accepted' ELSE 'cancelled' END,resolved_at=now() WHERE lead_id=l.id AND version=o.version AND state='offered';
  ELSE
    UPDATE public.lead_allocation_offers SET state='passed',resolved_at=now() WHERE id=o.id;
    INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,metadata) VALUES(p_user,'allocation.passed','lead',l.id,jsonb_build_object('offer_id',o.id));
  END IF;
  UPDATE public.lead_notifications SET status='skipped',error_code='offer_resolved',error_summary='Offer is no longer actionable.' WHERE notification_type='allocation_offer' AND metadata->>'offer_id' IN (SELECT id::text FROM public.lead_allocation_offers WHERE lead_id=l.id AND version=o.version AND state<>'offered') AND status IN ('pending','retry_scheduled','failed') AND provider_message_id IS NULL;
  result:=jsonb_build_object('ok',true,'state',CASE WHEN p_action='claim' THEN 'accepted' ELSE 'passed' END,'offer_id',o.id);
  INSERT INTO public.lead_allocation_command_receipts VALUES(p_receipt,o.id,p_user,p_hash,result,now());
  RETURN result;
END $$;

CREATE FUNCTION public.reserve_lead_allocation_send_v1(p_notification uuid,p_segments integer,p_cost bigint,p_mms boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE n public.lead_notifications; o public.lead_allocation_offers; e public.agent_operational_enrollment; p public.lead_allocation_policy; l public.leads; day_key date;
BEGIN
 PERFORM pg_advisory_xact_lock(731042026);
 SELECT * INTO p FROM public.lead_allocation_policy WHERE id='staff_v1' FOR UPDATE;
 SELECT * INTO n FROM public.lead_notifications WHERE id=p_notification FOR UPDATE;
 IF n.id IS NULL OR n.notification_type NOT IN ('allocation_offer','allocation_confirmation') OR n.status<>'pending' OR n.attempt_count<>0 OR n.provider_message_id IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error','send_reconciliation_required'); END IF;
 SELECT * INTO o FROM public.lead_allocation_offers WHERE id=(n.metadata->>'offer_id')::uuid;
 SELECT * INTO e FROM public.agent_operational_enrollment WHERE agent_id=n.agent_id;
 SELECT * INTO l FROM public.leads WHERE id=n.lead_id;
 IF p.id IS NULL OR o.id IS NULL OR p.starts_at IS NULL OR o.created_at<p.starts_at OR o.policy_version IS DISTINCT FROM p.version OR e.agent_id IS NULL OR l.id IS NULL OR n.agent_id IS DISTINCT FROM o.agent_id OR n.lead_id IS DISTINCT FROM o.lead_id OR n.channel NOT IN ('email','sms') OR NOT p.active OR p.approved_at IS NULL OR e.approved_at IS NULL OR e.revoked_at IS NOT NULL OR e.paused OR l.is_test OR l.communication_suppressed OR
    NOT EXISTS(SELECT 1 FROM public.agents g JOIN public.lead_center_users u ON u.id=e.user_id WHERE g.id=e.agent_id AND g.is_active AND u.banned IS NOT TRUE AND u.role IN ('approved_agent','primary_lead_owner') AND u."agentId"=g.id::text AND ((n.channel='sms' AND g.notification_sms) OR (n.channel='email' AND g.notification_email))) THEN RETURN jsonb_build_object('ok',false,'error','recipient_or_policy_held'); END IF;
 IF (n.notification_type='allocation_offer' AND (o.state<>'offered' OR o.deadline<=clock_timestamp() OR l.allocation_version<>o.version OR l.assigned_agent_id IS DISTINCT FROM o.expected_owner OR l.assigned_at IS DISTINCT FROM o.expected_assigned_at)) OR (n.notification_type='allocation_confirmation' AND (o.state<>'accepted' OR l.assigned_agent_id<>o.agent_id)) THEN RETURN jsonb_build_object('ok',false,'error','offer_not_deliverable'); END IF;
 IF (n.channel='email' AND NOT e.email_enabled) OR (n.channel='sms' AND (NOT e.sms_enabled OR e.consent_at IS NULL OR e.possession_verified_at IS NULL OR e.phone_fingerprint IS NULL OR e.phone_fingerprint IS DISTINCT FROM o.binding_fingerprint)) THEN RETURN jsonb_build_object('ok',false,'error','channel_not_enrolled'); END IF;
 IF p_mms AND (NOT p.mms_enabled OR NOT e.mms_enabled) THEN RETURN jsonb_build_object('ok',false,'error','mms_held'); END IF;
 IF p_segments<0 OR p_segments>p.max_segments_per_message OR p_cost<0 OR (n.channel='sms' AND p_segments<1) THEN RETURN jsonb_build_object('ok',false,'error','invalid_send_estimate'); END IF;
 day_key:=(now() AT TIME ZONE 'America/New_York')::date;
 IF p_segments+(SELECT COALESCE(sum(segments),0) FROM public.lead_allocation_send_reservations WHERE day=day_key)>p.daily_segment_budget OR p_cost+(SELECT COALESCE(sum(estimated_cost_micros),0) FROM public.lead_allocation_send_reservations WHERE day=day_key)>p.daily_estimated_cost_micros THEN RETURN jsonb_build_object('ok',false,'error','send_budget_exhausted'); END IF;
 IF (SELECT count(*) FROM public.lead_allocation_send_reservations WHERE agent_id=e.agent_id AND day=day_key)>=20 THEN RETURN jsonb_build_object('ok',false,'error','recipient_daily_send_limit'); END IF;
 INSERT INTO public.lead_allocation_send_reservations(notification_id,offer_id,agent_id,day,segments,estimated_cost_micros) VALUES(n.id,o.id,o.agent_id,day_key,p_segments,p_cost);
 UPDATE public.lead_notifications SET status='processing',attempt_count=attempt_count+1 WHERE id=n.id;
 RETURN jsonb_build_object('ok',true,'notification_id',n.id,'reservation_committed',true);
END $$;

-- Existing manual assignment remains authoritative. Every real ownership
-- change invalidates outstanding offers, without replacing its transaction.
CREATE FUNCTION public.invalidate_lead_allocation_on_assignment_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at THEN
   NEW.allocation_version:=GREATEST(NEW.allocation_version,OLD.allocation_version+1);
   UPDATE public.lead_allocation_offers SET state='cancelled',resolved_at=now() WHERE lead_id=NEW.id AND state='offered';
   UPDATE public.lead_notifications SET status='skipped',error_code='assignment_changed' WHERE lead_id=NEW.id AND notification_type='allocation_offer' AND status IN ('pending','retry_scheduled','failed') AND provider_message_id IS NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER invalidate_lead_allocation_on_assignment BEFORE UPDATE OF assigned_agent_id,assigned_at ON public.leads FOR EACH ROW EXECUTE FUNCTION public.invalidate_lead_allocation_on_assignment_v1();

-- Allocation-only due processing. It never selects general failed/pending
-- notifications. Restart-safe resolved rows and fallback tasks persist.
CREATE FUNCTION public.expire_lead_allocation_offers_v1(p_limit integer DEFAULT 25)
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
  IF policy.active AND policy.approved_at IS NOT NULL AND policy.starts_at IS NOT NULL THEN
    -- Durable discovery of newly committed canonical leads; no capture-side
    -- provider call, browser timer or second routing database. An earlier
    -- record/replay cannot cross the reviewed policy's start boundary.
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
  RETURN jsonb_build_object('ok',true,'expired',n,'escalated',escalated,'first_offered',first_offered);
END $$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['lead_allocation_policy','agent_operational_enrollment','lead_allocation_offers','lead_allocation_command_receipts','lead_allocation_send_reservations'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC',t);
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON public.%I FROM anon',t); END IF;
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON public.%I FROM authenticated',t); END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.create_lead_allocation_offers_v1(uuid,bigint,text),public.resolve_lead_allocation_offer_v1(uuid,bigint,text,text,text,text),public.expire_lead_allocation_offers_v1(integer),public.reserve_lead_allocation_send_v1(uuid,integer,bigint,boolean),public.invalidate_lead_allocation_on_assignment_v1() FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
 GRANT SELECT,INSERT,UPDATE,DELETE ON public.lead_allocation_policy,public.agent_operational_enrollment,public.lead_allocation_offers,public.lead_allocation_command_receipts,public.lead_allocation_send_reservations TO service_role;
 GRANT EXECUTE ON FUNCTION public.create_lead_allocation_offers_v1(uuid,bigint,text),public.resolve_lead_allocation_offer_v1(uuid,bigint,text,text,text,text),public.expire_lead_allocation_offers_v1(integer),public.reserve_lead_allocation_send_v1(uuid,integer,bigint,boolean),public.invalidate_lead_allocation_on_assignment_v1() TO service_role;
END IF; END $$;
REVOKE ALL ON FUNCTION public.verify_staff_allocation_possession_v1(uuid,text,text,text,text) FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN GRANT EXECUTE ON FUNCTION public.verify_staff_allocation_possession_v1(uuid,text,text,text,text) TO service_role; END IF; END $$;
