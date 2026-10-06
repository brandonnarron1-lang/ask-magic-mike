-- Separate successor to PR289. NO rows, enrollment, activation or sends.
-- The envelope is operational policy, not a lead store or another outbox.
CREATE TABLE public.lead_allocation_pilots (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), active boolean NOT NULL DEFAULT false,
 approved_by text REFERENCES public.lead_center_users(id), approved_at timestamptz,
 approval_reference text, reviewed_tree text CHECK(reviewed_tree ~ '^[0-9a-f]{40}$'),
 pricing_reference text, pricing_verified_at timestamptz,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 allowed_agents uuid[] NOT NULL CHECK(cardinality(allowed_agents) BETWEEN 1 AND 2),
 lead_ids uuid[] NOT NULL DEFAULT '{}' CHECK(cardinality(lead_ids)<=3),
 fallback_agent_id uuid NOT NULL REFERENCES public.agents(id),
 max_outbound_messages integer NOT NULL DEFAULT 0 CHECK(max_outbound_messages BETWEEN 0 AND 22),
 per_agent_messages integer NOT NULL DEFAULT 0 CHECK(per_agent_messages BETWEEN 0 AND 12),
 max_segments integer NOT NULL DEFAULT 0 CHECK(max_segments BETWEEN 0 AND 66),
 max_cost_micros bigint NOT NULL DEFAULT 0 CHECK(max_cost_micros BETWEEN 0 AND 2000000),
 segment_cost_micros bigint NOT NULL DEFAULT 0 CHECK(segment_cost_micros>=0),
 max_actions integer NOT NULL DEFAULT 0 CHECK(max_actions BETWEEN 0 AND 32),
 actions_used integer NOT NULL DEFAULT 0 CHECK(actions_used>=0),
 CHECK(array_position(allowed_agents,NULL) IS NULL
   AND (cardinality(allowed_agents)=1 OR allowed_agents[1]<>allowed_agents[2])),
 CHECK(ends_at>starts_at AND ends_at<=starts_at+interval '1 hour'),
 CHECK(NOT active OR (approved_at IS NOT NULL AND approved_by IS NOT NULL
   AND length(approval_reference)>0 AND reviewed_tree IS NOT NULL
   AND length(pricing_reference)>0 AND pricing_verified_at IS NOT NULL
   AND segment_cost_micros>0 AND max_cost_micros>0 AND max_segments>0
   AND max_outbound_messages>0 AND per_agent_messages>0 AND max_actions>0))
);
CREATE UNIQUE INDEX lead_allocation_one_active_pilot ON public.lead_allocation_pilots(active) WHERE active;
ALTER TABLE public.lead_allocation_offers ADD COLUMN pilot_id uuid REFERENCES public.lead_allocation_pilots(id);
ALTER TABLE public.lead_allocation_send_reservations ADD COLUMN pilot_id uuid REFERENCES public.lead_allocation_pilots(id);
ALTER TABLE public.lead_allocation_send_reservations ALTER COLUMN offer_id DROP NOT NULL;
ALTER TABLE public.lead_allocation_send_reservations ADD CONSTRAINT allocation_reservation_scope CHECK(offer_id IS NOT NULL OR pilot_id IS NOT NULL);

-- A source string / QA flag alone cannot open this exception. An approved,
-- unexpired, private envelope must explicitly register the suppressed fixture.
CREATE FUNCTION public.staff_allocation_pilot_v1(p_lead uuid)
RETURNS SETOF public.lead_allocation_pilots LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT p.* FROM public.lead_allocation_pilots p JOIN public.leads l ON l.id=p_lead
 JOIN public.lead_center_users u ON u.id=p.approved_by
 WHERE p.active AND p.approved_at IS NOT NULL AND u.role='administrator' AND u.banned IS NOT TRUE
   AND clock_timestamp()>=p.starts_at AND clock_timestamp()<p.ends_at
   AND p_lead=ANY(p.lead_ids) AND l.source='staff_allocation_pilot_v1'
   AND l.created_at>=p.starts_at AND l.source_detail LIKE p.id::text||':%'
   AND EXISTS(SELECT 1 FROM public.audit_logs a WHERE a.resource_id=l.id AND a.action='allocation.pilot_fixture'
     AND a.actor=p.approved_by AND a.metadata->>'pilot_id'=p.id::text)
   AND l.is_test AND l.communication_suppressed AND l.email_suppressed AND l.sms_suppressed
   AND l.first_name='INTERNAL QA — DO NOT CONTACT' AND l.email IS NULL AND l.phone IS NULL
$$;
CREATE FUNCTION public.effective_lead_allocation_policy_v1(p_lead uuid)
RETURNS SETOF public.lead_allocation_policy LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE p public.lead_allocation_policy; pilot public.lead_allocation_pilots;
BEGIN
 SELECT * INTO p FROM public.lead_allocation_policy WHERE id='staff_v1';
 SELECT * INTO pilot FROM public.staff_allocation_pilot_v1(p_lead);
 IF pilot.id IS NOT NULL THEN
   p.active:=true; p.approved_at:=pilot.approved_at; p.approved_by:=pilot.approved_by;
   p.version:=pilot.version; p.starts_at:=pilot.starts_at; p.fallback_agent_id:=pilot.fallback_agent_id;
   p.mode:='first_claim'; p.max_fanout:=cardinality(pilot.allowed_agents); p.max_rounds:=2; p.offer_seconds:=180;
   p.daily_segment_budget:=pilot.max_segments; p.daily_estimated_cost_micros:=pilot.max_cost_micros;
   p.max_segments_per_message:=3; p.mms_enabled:=false;
 END IF;
 RETURN NEXT p;
END $$;

-- Reuse the EXACT canonical create/claim/reserve functions, not parallel pilot
-- routing. Fail the migration atomically on predecessor drift. Each replacement
-- is explicit and must occur exactly once; no accepted migration is edited.
DO $$ DECLARE fn text; source text; old text; new text; pair text[]; replacements text[][];
BEGIN
 FOR fn IN SELECT unnest(ARRAY['create_lead_allocation_offers_v1(uuid,bigint,text)',
   'resolve_lead_allocation_offer_v1(uuid,bigint,text,text,text,text)',
   'reserve_lead_allocation_send_v1(uuid,integer,bigint,boolean)']) LOOP
  source:=pg_get_functiondef(('public.'||fn)::regprocedure);
  IF fn LIKE 'create_%' THEN replacements:=ARRAY[
   ARRAY['SELECT * INTO p FROM public.lead_allocation_policy WHERE id=''staff_v1'' FOR UPDATE;', 'PERFORM 1 FROM public.lead_allocation_policy WHERE id=''staff_v1'' FOR UPDATE; SELECT * INTO p FROM public.effective_lead_allocation_policy_v1(p_lead);'],
   ARRAY['OR l.is_test OR l.communication_suppressed OR l.status', 'OR ((l.is_test OR l.communication_suppressed) AND NOT EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1(l.id))) OR l.status'],
   ARRAY['WHERE e.approved_at IS NOT NULL AND e.revoked_at IS NULL', 'WHERE (NOT EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1(l.id)) OR EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1(l.id) WHERE e.agent_id=ANY(allowed_agents))) AND e.approved_at IS NOT NULL AND e.revoked_at IS NULL'],
   ARRAY['IF a.email_enabled AND a.directory_email THEN', 'IF a.email_enabled AND a.directory_email AND NOT EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1(l.id)) THEN'],
   ARRAY['AND g.current_load + (SELECT count(*) FROM public.lead_allocation_offers o WHERE o.agent_id=g.id AND o.state=''offered'') < e.concurrent_cap', 'AND g.current_load + (SELECT count(*) FROM public.lead_allocation_offers o WHERE o.agent_id=g.id AND o.state=''offered'' AND o.pilot_id IS NOT DISTINCT FROM (SELECT id FROM public.staff_allocation_pilot_v1(l.id))) < e.concurrent_cap'],
   ARRAY['(SELECT count(*) FROM public.agent_assignments aa WHERE aa.agent_id=g.id AND aa.created_at >= date_trunc(''day'',now()))', '(SELECT count(*) FROM public.agent_assignments aa JOIN public.leads assigned ON assigned.id=aa.lead_id WHERE aa.agent_id=g.id AND NOT assigned.is_test AND aa.created_at >= date_trunc(''day'',now()))'],
   ARRAY['+ (SELECT count(*) FROM public.lead_allocation_offers o WHERE o.agent_id=g.id AND o.state=''offered'') < LEAST', '+ (SELECT count(*) FROM public.lead_allocation_offers o WHERE o.agent_id=g.id AND o.state=''offered'' AND o.pilot_id IS NOT DISTINCT FROM (SELECT id FROM public.staff_allocation_pilot_v1(l.id))) < LEAST'],
   ARRAY['ORDER BY (g.current_load + (SELECT count(*) FROM public.lead_allocation_offers o WHERE o.agent_id=g.id AND o.state=''offered''))::numeric', 'ORDER BY (g.current_load + (SELECT count(*) FROM public.lead_allocation_offers o WHERE o.agent_id=g.id AND o.state=''offered'' AND o.pilot_id IS NOT DISTINCT FROM (SELECT id FROM public.staff_allocation_pilot_v1(l.id))))::numeric'],
   ARRAY['UPDATE public.agent_operational_enrollment SET last_offered_at=now(),updated_at=now() WHERE agent_id=a.agent_id;', 'IF NOT EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1(l.id)) THEN UPDATE public.agent_operational_enrollment SET last_offered_at=now(),updated_at=now() WHERE agent_id=a.agent_id; END IF;']
  ];
  ELSIF fn LIKE 'resolve_%' THEN replacements:=ARRAY[
   ARRAY['IF NOT EXISTS(SELECT 1 FROM public.lead_allocation_policy WHERE id=''staff_v1'' AND active AND approved_at IS NOT NULL) THEN', 'IF NOT EXISTS(SELECT 1 FROM public.effective_lead_allocation_policy_v1((SELECT lead_id FROM public.lead_allocation_offers WHERE id=p_offer)) WHERE active AND approved_at IS NOT NULL) THEN'],
   ARRAY['SELECT 1 FROM public.lead_allocation_policy WHERE id=''staff_v1'' AND version=o.policy_version AND starts_at<=o.created_at', 'SELECT 1 FROM public.effective_lead_allocation_policy_v1(l.id) WHERE version=o.policy_version AND starts_at<=o.created_at'],
   ARRAY['IF l.is_test OR l.communication_suppressed OR e.paused THEN', 'IF ((l.is_test OR l.communication_suppressed) AND NOT EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1(l.id) WHERE o.pilot_id=id AND o.agent_id=ANY(allowed_agents))) OR e.paused THEN'],
   ARRAY['IF e.email_enabled AND a.notification_email THEN', 'IF e.email_enabled AND a.notification_email AND o.pilot_id IS NULL THEN'],
   ARRAY['UPDATE public.agents SET current_load=current_load+1 WHERE id=a.id;', 'IF o.pilot_id IS NULL THEN UPDATE public.agents SET current_load=current_load+1 WHERE id=a.id; END IF;'],
   ARRAY['IF l.assigned_agent_id IS NOT NULL AND l.assigned_agent_id<>a.id THEN', 'IF o.pilot_id IS NULL AND l.assigned_agent_id IS NOT NULL AND l.assigned_agent_id<>a.id THEN'],
   ARRAY['(SELECT count(*) FROM public.agent_assignments WHERE agent_id=a.id AND created_at>=date_trunc(''day'',now()))', '(SELECT count(*) FROM public.agent_assignments aa JOIN public.leads assigned ON assigned.id=aa.lead_id WHERE aa.agent_id=a.id AND NOT assigned.is_test AND aa.created_at>=date_trunc(''day'',now()))']
  ];
  ELSE replacements:=ARRAY[
   ARRAY['SELECT * INTO p FROM public.lead_allocation_policy WHERE id=''staff_v1'' FOR UPDATE;', 'PERFORM 1 FROM public.lead_allocation_policy WHERE id=''staff_v1'' FOR UPDATE; SELECT * INTO p FROM public.effective_lead_allocation_policy_v1((SELECT lead_id FROM public.lead_notifications WHERE id=p_notification));'],
   ARRAY['OR l.is_test OR l.communication_suppressed OR', 'OR ((l.is_test OR l.communication_suppressed) AND NOT EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1(l.id) WHERE o.pilot_id=id AND o.agent_id=ANY(allowed_agents))) OR'],
   ARRAY['INSERT INTO public.lead_allocation_send_reservations(notification_id,offer_id,agent_id,day,segments,estimated_cost_micros) VALUES(n.id,o.id,o.agent_id,day_key,p_segments,p_cost);', 'INSERT INTO public.lead_allocation_send_reservations(notification_id,offer_id,agent_id,day,segments,estimated_cost_micros,pilot_id) VALUES(n.id,o.id,o.agent_id,day_key,p_segments,p_cost,o.pilot_id);'],
   ARRAY['(SELECT COALESCE(sum(segments),0) FROM public.lead_allocation_send_reservations WHERE day=day_key)', '(SELECT COALESCE(sum(segments),0) FROM public.lead_allocation_send_reservations WHERE ((o.pilot_id IS NULL AND pilot_id IS NULL AND day=day_key) OR (o.pilot_id IS NOT NULL AND pilot_id=o.pilot_id)))'],
   ARRAY['(SELECT COALESCE(sum(estimated_cost_micros),0) FROM public.lead_allocation_send_reservations WHERE day=day_key)', '(SELECT COALESCE(sum(estimated_cost_micros),0) FROM public.lead_allocation_send_reservations WHERE ((o.pilot_id IS NULL AND pilot_id IS NULL AND day=day_key) OR (o.pilot_id IS NOT NULL AND pilot_id=o.pilot_id)))'],
   ARRAY['(SELECT count(*) FROM public.lead_allocation_send_reservations WHERE agent_id=e.agent_id AND day=day_key)', '(SELECT count(*) FROM public.lead_allocation_send_reservations WHERE agent_id=e.agent_id AND ((o.pilot_id IS NULL AND pilot_id IS NULL AND day=day_key) OR (o.pilot_id IS NOT NULL AND pilot_id=o.pilot_id)))']
  ]; END IF;
  FOREACH pair SLICE 1 IN ARRAY replacements LOOP
   old:=pair[1];new:=pair[2];
   IF (length(source)-length(replace(source,old,'')))/length(old)<>1 THEN RAISE EXCEPTION 'canonical predecessor drift: %',fn; END IF;
   source:=replace(source,old,new);
  END LOOP;
  EXECUTE source;
 END LOOP;
END $$;

CREATE FUNCTION public.fence_staff_allocation_pilot_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE pilot public.lead_allocation_pilots; lead_ref uuid; agent_ref uuid; used integer; seg bigint; cost bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(731042026);
 IF TG_TABLE_NAME='lead_allocation_offers' THEN
  SELECT * INTO pilot FROM public.staff_allocation_pilot_v1(NEW.lead_id);
  IF pilot.id IS NULL THEN RETURN NEW; END IF;
  IF NOT NEW.agent_id=ANY(pilot.allowed_agents) OR pilot.actions_used>=pilot.max_actions THEN RAISE EXCEPTION 'pilot action held'; END IF;
  NEW.pilot_id:=pilot.id;
  UPDATE public.lead_allocation_pilots SET actions_used=actions_used+1 WHERE id=pilot.id;
 ELSE
  IF NEW.pilot_id IS NULL THEN RETURN NEW; END IF;
  SELECT n.lead_id,n.agent_id INTO lead_ref,agent_ref FROM public.lead_notifications n WHERE n.id=NEW.notification_id;
  SELECT * INTO pilot FROM public.staff_allocation_pilot_v1(lead_ref);
  IF pilot.id IS DISTINCT FROM NEW.pilot_id OR NOT agent_ref=ANY(pilot.allowed_agents) THEN RAISE EXCEPTION 'pilot scope held'; END IF;
  SELECT count(*),COALESCE(sum(segments),0),COALESCE(sum(estimated_cost_micros),0) INTO used,seg,cost FROM public.lead_allocation_send_reservations WHERE pilot_id=pilot.id;
  IF NEW.segments NOT BETWEEN 1 AND 3 OR NEW.estimated_cost_micros<NEW.segments*pilot.segment_cost_micros
    OR used>=pilot.max_outbound_messages OR seg+NEW.segments>pilot.max_segments OR cost+NEW.estimated_cost_micros>pilot.max_cost_micros
    OR (SELECT count(*) FROM public.lead_allocation_send_reservations WHERE pilot_id=pilot.id AND agent_id=agent_ref)>=pilot.per_agent_messages THEN RAISE EXCEPTION 'pilot send cap held'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER fence_staff_pilot_offer BEFORE INSERT ON public.lead_allocation_offers FOR EACH ROW EXECUTE FUNCTION public.fence_staff_allocation_pilot_v1();
CREATE TRIGGER fence_staff_pilot_reservation BEFORE INSERT ON public.lead_allocation_send_reservations FOR EACH ROW EXECUTE FUNCTION public.fence_staff_allocation_pilot_v1();

CREATE FUNCTION public.fence_staff_pilot_command_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE pilot public.lead_allocation_pilots;
BEGIN
 PERFORM pg_advisory_xact_lock(731042026);
 -- STOP and exact receipt replay remain available after caps/expiry/pause.
 IF NEW.result->>'action'='stop' OR EXISTS(SELECT 1 FROM public.lead_allocation_command_receipts WHERE receipt_key=NEW.receipt_key) THEN RETURN NEW; END IF;
 SELECT p.* INTO pilot FROM public.lead_allocation_pilots p JOIN public.agent_operational_enrollment e ON e.agent_id=ANY(p.allowed_agents)
 WHERE e.user_id=NEW.actor_user_id AND p.active AND clock_timestamp()>=p.starts_at AND clock_timestamp()<p.ends_at
   AND (NEW.offer_id IS NULL OR EXISTS(SELECT 1 FROM public.lead_allocation_offers WHERE id=NEW.offer_id AND pilot_id=p.id)) FOR UPDATE OF p;
 IF pilot.id IS NULL THEN RETURN NEW; END IF;
 IF pilot.actions_used>=pilot.max_actions THEN RAISE EXCEPTION 'pilot action cap held'; END IF;
 UPDATE public.lead_allocation_pilots SET actions_used=actions_used+1 WHERE id=pilot.id;
 RETURN NEW;
END $$;
CREATE TRIGGER fence_staff_pilot_command BEFORE INSERT ON public.lead_allocation_command_receipts FOR EACH ROW EXECUTE FUNCTION public.fence_staff_pilot_command_v1();

-- Generalize the existing expiry body once. Ordinary cadence cannot select
-- pilot offers; the protected pilot action cannot discover ordinary leads.
DO $$ DECLARE source text; old text; BEGIN
 source:=pg_get_functiondef('public.expire_lead_allocation_offers_v2(integer,boolean)'::regprocedure);
 old:='WHERE state=''offered'' AND deadline<=clock_timestamp()';
 IF (length(source)-length(replace(source,old,'')))/length(old)<>1 THEN RAISE EXCEPTION 'expiry predecessor drift'; END IF;
 source:=replace(source,old,old||' AND ((p_pilot IS NULL AND pilot_id IS NULL) OR pilot_id=p_pilot)');
 old:='IF p_discover AND policy.active';
 IF position(old IN source)=0 THEN RAISE EXCEPTION 'expiry discovery predecessor drift'; END IF;
 source:=replace(source,old,'IF p_pilot IS NULL AND p_discover AND policy.active');
 source:=regexp_replace(source,'expire_lead_allocation_offers_v2\([^\n]+\)',
   'expire_lead_allocation_offers_core_v3(p_limit integer, p_discover boolean, p_pilot uuid)');
 EXECUTE source;
END $$;
CREATE OR REPLACE FUNCTION public.expire_lead_allocation_offers_v2(p_limit integer DEFAULT 25,p_discover boolean DEFAULT true)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT public.expire_lead_allocation_offers_core_v3(p_limit,p_discover,NULL);
$$;
CREATE FUNCTION public.expire_staff_allocation_pilot_v1(p_pilot uuid,p_actor text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.lead_allocation_pilots p JOIN public.lead_center_users u ON u.id=p.approved_by
   WHERE p.id=p_pilot AND p.approved_by=p_actor AND u.role='administrator' AND u.banned IS NOT TRUE)
 THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
 RETURN public.expire_lead_allocation_offers_core_v3(25,false,p_pilot);
END $$;

-- Canonical QA capture; no contact endpoints, claimed consumer consent, or
-- consumer/provider delivery. No public API can register a fixture in scope.
CREATE FUNCTION public.seed_staff_allocation_fixture_v1(p_pilot uuid,p_index integer,p_actor text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE pilot public.lead_allocation_pilots; result jsonb; session_ref uuid; lead_ref uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(731042026);
 SELECT * INTO pilot FROM public.lead_allocation_pilots WHERE id=p_pilot FOR UPDATE;
 IF pilot.id IS NULL OR NOT pilot.active OR pilot.approved_by IS DISTINCT FROM p_actor OR clock_timestamp()<pilot.starts_at OR clock_timestamp()>=pilot.ends_at
 OR NOT EXISTS(SELECT 1 FROM public.lead_center_users WHERE id=p_actor AND role='administrator' AND banned IS NOT TRUE)
 OR p_index NOT BETWEEN 1 AND 3 THEN RETURN jsonb_build_object('ok',false,'error','pilot_scope_held'); END IF;
 IF p_index<=cardinality(pilot.lead_ids) THEN RETURN jsonb_build_object('ok',true,'lead_id',pilot.lead_ids[p_index],'replayed',true); END IF;
 IF p_index<>cardinality(pilot.lead_ids)+1 OR pilot.actions_used>=pilot.max_actions THEN RETURN jsonb_build_object('ok',false,'error','pilot_action_cap'); END IF;
 session_ref:=uuid_generate_v4();
 result:=public.capture_public_lead_v2(jsonb_build_object('id',session_ref),jsonb_build_object(
  'is_test',true,'first_name','INTERNAL QA — DO NOT CONTACT','question_raw','STAFF-ONLY ALLOCATION PILOT — DO NOT CONTACT',
  'source','staff_allocation_pilot_v1','source_detail',pilot.id::text||':'||p_index,'widget_session_id',session_ref,
  'city','Wilson','state','NC','lead_type','buyer','primary_intent','buy',
  'consent_email',false,'consent_sms',false,'consent_call',false,'consent_language_version','staff_fixture_no_consumer_consent_v1'),
  '{}'::jsonb,'disabled','{}'::jsonb);
 lead_ref:=(result->>'lead_id')::uuid;
 IF lead_ref IS NULL OR NOT EXISTS(SELECT 1 FROM public.leads WHERE id=lead_ref AND is_test AND communication_suppressed AND email_suppressed AND sms_suppressed) THEN RAISE EXCEPTION 'canonical QA capture failed'; END IF;
 UPDATE public.lead_allocation_pilots SET lead_ids=array_append(lead_ids,lead_ref),actions_used=actions_used+1 WHERE id=pilot.id;
 INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,metadata) VALUES(p_actor,'allocation.pilot_fixture','lead',lead_ref,jsonb_build_object('pilot_id',pilot.id,'index',p_index));
 RETURN jsonb_build_object('ok',true,'lead_id',lead_ref,'is_test',true,'consumer_sends',false);
END $$;

CREATE FUNCTION public.queue_staff_allocation_reply_v1(p_agent uuid,p_user text,p_receipt text,p_hash text,p_action text,p_state text,p_provider_replied boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE pilot public.lead_allocation_pilots; e public.agent_operational_enrollment; previous public.lead_allocation_command_receipts; notification_ref uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(731042026);
 SELECT * INTO pilot FROM public.lead_allocation_pilots WHERE active AND p_agent=ANY(allowed_agents)
  AND clock_timestamp()>=starts_at AND clock_timestamp()<ends_at AND cardinality(lead_ids)>0 FOR UPDATE;
 IF pilot.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1(pilot.lead_ids[1])) THEN RETURN jsonb_build_object('replyQueued',false,'reason','staff_reply_scope_held'); END IF;
 SELECT * INTO e FROM public.agent_operational_enrollment WHERE agent_id=p_agent;
 IF e.user_id IS DISTINCT FROM p_user OR e.revoked_at IS NOT NULL OR e.approved_at IS NULL OR e.consent_at IS NULL OR e.possession_verified_at IS NULL OR e.phone_fingerprint IS NULL
  OR (NOT e.sms_enabled AND p_action<>'verify')
  OR NOT EXISTS(SELECT 1 FROM public.agents g JOIN public.lead_center_users u ON u.id=p_user WHERE g.id=p_agent AND g.is_active AND g.notification_sms AND u.banned IS NOT TRUE AND u.role IN ('primary_lead_owner','approved_agent') AND u."agentId"=g.id::text)
  OR p_action NOT IN ('help','status','verify','pause','resume','claim','pass')
  OR p_state NOT IN ('ok','offered','accepted','passed','expired','cancelled','blocked') OR length(p_hash)<>64 OR length(p_receipt)>200
 THEN RETURN jsonb_build_object('replyQueued',false,'reason','staff_reply_held'); END IF;
 SELECT * INTO previous FROM public.lead_allocation_command_receipts WHERE receipt_key=p_receipt;
 IF FOUND AND (previous.actor_user_id<>p_user OR previous.request_hash<>p_hash) THEN RETURN jsonb_build_object('replyQueued',false,'reason','command_receipt_conflict'); END IF;
 IF NOT FOUND THEN
  IF pilot.actions_used>=pilot.max_actions THEN RETURN jsonb_build_object('replyQueued',false,'reason','pilot_action_cap'); END IF;
  INSERT INTO public.lead_allocation_command_receipts(receipt_key,actor_user_id,request_hash,result) VALUES(p_receipt,p_user,p_hash,jsonb_build_object('ok',true,'action',p_action,'state',p_state));
 END IF;
 IF p_provider_replied THEN RETURN jsonb_build_object('replyQueued',false,'reason','provider_already_replied'); END IF;
 INSERT INTO public.lead_notifications(lead_id,agent_id,notification_type,channel,recipient_type,recipient_reference,template_version,idempotency_key,status,metadata)
 VALUES(pilot.lead_ids[1],p_agent,'allocation_command_reply','sms','agent','agent:'||p_agent,'staff_commands_v1',p_receipt||':reply:v1','pending',
   jsonb_build_object('pilot_id',pilot.id,'reply_action',p_action,'reply_state',p_state,'binding_fingerprint',e.phone_fingerprint,'allocation_only',true))
 ON CONFLICT(idempotency_key) DO NOTHING RETURNING id INTO notification_ref;
 RETURN jsonb_build_object('replyQueued',true,'replayed',notification_ref IS NULL);
END $$;
CREATE FUNCTION public.reserve_staff_allocation_reply_v1(p_notification uuid,p_segments integer,p_cost bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE n public.lead_notifications; e public.agent_operational_enrollment; pilot public.lead_allocation_pilots;
BEGIN
 PERFORM pg_advisory_xact_lock(731042026);
 SELECT * INTO n FROM public.lead_notifications WHERE id=p_notification FOR UPDATE;
 IF n.id IS NULL OR n.notification_type<>'allocation_command_reply' OR n.channel<>'sms' OR n.status<>'pending' OR n.attempt_count<>0 OR n.provider_message_id IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error','send_reconciliation_required'); END IF;
 SELECT * INTO pilot FROM public.staff_allocation_pilot_v1(n.lead_id) WHERE id=(n.metadata->>'pilot_id')::uuid;
 SELECT * INTO e FROM public.agent_operational_enrollment WHERE agent_id=n.agent_id;
 IF pilot.id IS NULL OR NOT n.agent_id=ANY(pilot.allowed_agents) OR e.revoked_at IS NOT NULL OR e.approved_at IS NULL OR e.consent_at IS NULL OR e.possession_verified_at IS NULL
  OR (NOT e.sms_enabled AND n.metadata->>'reply_action'<>'verify') OR e.phone_fingerprint IS DISTINCT FROM n.metadata->>'binding_fingerprint'
  OR NOT EXISTS(SELECT 1 FROM public.agents g JOIN public.lead_center_users u ON u.id=e.user_id WHERE g.id=e.agent_id AND g.is_active AND g.notification_sms AND u.banned IS NOT TRUE AND u.role IN ('primary_lead_owner','approved_agent') AND u."agentId"=g.id::text)
 THEN RETURN jsonb_build_object('ok',false,'error','staff_reply_held'); END IF;
 INSERT INTO public.lead_allocation_send_reservations(notification_id,agent_id,day,segments,estimated_cost_micros,pilot_id)
 VALUES(n.id,n.agent_id,(now() AT TIME ZONE 'America/New_York')::date,p_segments,p_cost,pilot.id);
 UPDATE public.lead_notifications SET status='processing',attempt_count=attempt_count+1 WHERE id=n.id;
 RETURN jsonb_build_object('ok',true,'reservation_committed',true);
END $$;

ALTER TABLE public.lead_allocation_pilots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_allocation_pilots FROM PUBLIC;
DO $$ DECLARE r text; f text; BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON public.lead_allocation_pilots FROM %I',r); END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN GRANT SELECT,INSERT,UPDATE ON public.lead_allocation_pilots TO service_role; END IF;
 FOREACH f IN ARRAY ARRAY['staff_allocation_pilot_v1(uuid)','effective_lead_allocation_policy_v1(uuid)','fence_staff_allocation_pilot_v1()',
  'seed_staff_allocation_fixture_v1(uuid,integer,text)','queue_staff_allocation_reply_v1(uuid,text,text,text,text,text,boolean)','reserve_staff_allocation_reply_v1(uuid,integer,bigint)',
  'fence_staff_pilot_command_v1()','expire_lead_allocation_offers_core_v3(integer,boolean,uuid)','expire_staff_allocation_pilot_v1(uuid,text)'] LOOP
  EXECUTE 'REVOKE ALL ON FUNCTION public.'||f||' FROM PUBLIC';
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE 'REVOKE ALL ON FUNCTION public.'||f||' FROM '||quote_ident(r); END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN EXECUTE 'GRANT EXECUTE ON FUNCTION public.'||f||' TO service_role'; END IF;
 END LOOP;
END $$;
