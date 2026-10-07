-- Additive, no backfill/no dispatch. Existing tables and immutable audit rows
-- retain one logical action's replay receipt. Old functions remain for rollback.
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_conversion_action_key
 ON public.audit_logs(actor,resource_id,(metadata->>'request_key'))
 WHERE metadata->>'conversion_version'='v1';

CREATE OR REPLACE FUNCTION public.admin_conversion_actor_allowed_v1(p_lead uuid,p_actor text)
 RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE owner_id uuid; u public.lead_center_users;
BEGIN
 SELECT assigned_agent_id INTO owner_id FROM public.leads WHERE id=p_lead FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_actor='system/admin_basic_auth' THEN RETURN true; END IF;
 IF p_actor IS NULL OR p_actor NOT LIKE 'lead_center:%' THEN RETURN false; END IF;
 SELECT * INTO u FROM public.lead_center_users WHERE id=substring(p_actor FROM 13) FOR SHARE;
 RETURN u.id IS NOT NULL AND u.banned IS NOT TRUE AND u.role IN ('administrator','primary_lead_owner','approved_agent')
  AND (u.role='administrator' OR (u."agentId" IS NOT NULL AND u."agentId"=owner_id::text));
END $$;

-- Narrow wrappers retain the accepted v3/v1 bodies and lock-order while closing
-- the same ownership/role race for existing explicit human/pipeline controls.
CREATE OR REPLACE FUNCTION public.mutate_admin_lead_status_v4(
 p_lead_id uuid,p_expected_status text,p_next_status text,p_patch jsonb,p_reason text DEFAULT NULL,
 p_outcome_amount_usd numeric DEFAULT NULL,p_actor text DEFAULT 'system/admin_basic_auth',p_occurred_at timestamptz DEFAULT now()
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT coalesce(public.admin_conversion_actor_allowed_v1(p_lead_id,p_actor),false) THEN
  RETURN jsonb_build_object('ok',false,'error','conversion_actor_forbidden');
 END IF;
 RETURN public.mutate_admin_lead_status_v3(p_lead_id,p_expected_status,p_next_status,p_patch,p_reason,p_outcome_amount_usd,p_actor,p_occurred_at);
END $$;
CREATE OR REPLACE FUNCTION public.record_admin_first_response_v2(
 p_lead_id uuid,p_actor text DEFAULT 'system/admin_basic_auth',p_occurred_at timestamptz DEFAULT now(),p_source_system text DEFAULT 'admin_lead_detail'
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT coalesce(public.admin_conversion_actor_allowed_v1(p_lead_id,p_actor),false) THEN
  RETURN jsonb_build_object('ok',false,'error','conversion_actor_forbidden');
 END IF;
 RETURN public.record_admin_first_response_v1(p_lead_id,p_actor,p_occurred_at,p_source_system);
END $$;

CREATE OR REPLACE FUNCTION public.mutate_admin_conversion_v1(
 p_lead uuid, p_operation text, p_payload jsonb, p_actor text, p_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE
 l public.leads; a public.lead_appointments; t public.tasks;
 prior public.audit_logs; target_id uuid; audit_id uuid; before_state jsonb;
 result jsonb; lifecycle_result jsonb; next_status text; action text;
 starts timestamptz; ends timestamptz; due timestamptz; zone text;
 occurred timestamptz := clock_timestamp(); target_lead_status text;
 fingerprint text := encode(sha256(convert_to(p_operation || ':' || (p_payload-'occurred_at')::text,'UTF8')),'hex');
BEGIN
 IF p_key IS NULL OR p_key !~ '^[A-Za-z0-9_-]{8,128}$' OR p_actor IS NULL OR length(p_actor)>200
  OR p_operation NOT IN ('appointment_create','appointment_transition','task_create','task_update','human_followthrough')
  OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR length(p_payload::text)>32768
  OR length(coalesce(p_payload->>'note',''))>5000 OR length(coalesce(p_payload->>'outcome',''))>5000 THEN
  RETURN jsonb_build_object('ok',false,'error','invalid_conversion_request','statusCode',400);
 END IF;
 -- Consistent with allocation: lead first, then dependent records/agent. User
 -- SHARE prevents role/ban edits between current authorization and the commit.
 SELECT * INTO l FROM public.leads WHERE id=p_lead FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','lead_not_found','statusCode',404); END IF;
 IF NOT coalesce(public.admin_conversion_actor_allowed_v1(p_lead,p_actor),false) THEN
  RETURN jsonb_build_object('ok',false,'error','conversion_actor_forbidden','statusCode',403);
 END IF;
 SELECT * INTO prior FROM public.audit_logs WHERE actor=p_actor AND resource_id=p_lead
  AND metadata->>'conversion_version'='v1' AND metadata->>'request_key'=p_key;
 IF FOUND THEN
  IF prior.metadata->>'request_hash' IS DISTINCT FROM fingerprint THEN
   RETURN jsonb_build_object('ok',false,'error','idempotency_conflict','statusCode',409);
  END IF;
  RETURN prior.metadata->'response' || jsonb_build_object('warning','conversion_action_already_saved','idempotent_replay',true);
 END IF;
 zone := coalesce(nullif(p_payload->>'timezone',''),'America/New_York');
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) THEN
  RETURN jsonb_build_object('ok',false,'error','invalid_appointment_timezone','statusCode',400);
 END IF;
 IF p_operation IN ('appointment_create','appointment_transition') THEN
  next_status := coalesce(p_payload->>'status','requested');
  IF next_status NOT IN ('requested','scheduled','confirmed','completed','canceled','no_show','reschedule_requested') THEN
   RETURN jsonb_build_object('ok',false,'error','invalid_appointment_status','statusCode',400);
  END IF;
  IF p_operation='appointment_transition' THEN
   SELECT * INTO a FROM public.lead_appointments WHERE id=(p_payload->>'appointmentId')::uuid AND lead_id=p_lead FOR UPDATE;
   IF a.id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','appointment_not_found','statusCode',404); END IF;
   IF a.updated_at IS DISTINCT FROM nullif(p_payload->>'expectedUpdatedAt','')::timestamptz THEN
    RETURN jsonb_build_object('ok',false,'error','stale_appointment_version','statusCode',409,'current',jsonb_build_object('status',a.status,'updated_at',a.updated_at::text));
   END IF;
   IF a.status=next_status THEN RETURN jsonb_build_object('ok',true,'id',a.id,'status',a.status,'warning','appointment_status_already_current'); END IF;
   IF NOT ((a.status='requested' AND next_status IN ('scheduled','canceled'))
    OR (a.status='scheduled' AND next_status IN ('confirmed','canceled','reschedule_requested'))
    OR (a.status='confirmed' AND next_status IN ('completed','no_show','canceled','reschedule_requested'))
    OR (a.status IN ('canceled','no_show') AND next_status='reschedule_requested')
    OR (a.status='reschedule_requested' AND next_status IN ('scheduled','canceled'))) THEN
    RETURN jsonb_build_object('ok',false,'error','forbidden_appointment_transition','statusCode',409);
   END IF;
   IF a.assigned_agent_id IS DISTINCT FROM l.assigned_agent_id THEN
    RETURN jsonb_build_object('ok',false,'error','appointment_owner_changed','statusCode',409);
   END IF;
   zone:=coalesce(nullif(p_payload->>'timezone',''),a.timezone,'America/New_York');
  ELSIF l.status IN ('converted','dead','spam') THEN
   RETURN jsonb_build_object('ok',false,'error','terminal_lead_appointment_held','statusCode',409);
  END IF;
  starts := coalesce(nullif(p_payload->>'startsAt','')::timestamptz,a.starts_at);
  ends := coalesce(nullif(p_payload->>'endsAt','')::timestamptz,a.ends_at);
  IF next_status IN ('scheduled','confirmed','completed','no_show') AND (starts IS NULL OR ends IS NULL) THEN
   RETURN jsonb_build_object('ok',false,'error','appointment_window_required','statusCode',400);
  END IF;
  IF ends IS NOT NULL AND (starts IS NULL OR ends<=starts OR ends-starts>interval '8 hours') THEN
   RETURN jsonb_build_object('ok',false,'error','invalid_appointment_duration','statusCode',400);
  END IF;
  IF next_status IN ('requested','scheduled','confirmed','reschedule_requested') AND EXISTS(
   SELECT 1 FROM public.lead_appointments WHERE lead_id=p_lead AND id IS DISTINCT FROM a.id
    AND status IN ('requested','scheduled','confirmed','reschedule_requested')) THEN
   RETURN jsonb_build_object('ok',false,'error','duplicate_active_appointment','statusCode',409);
  END IF;
  IF next_status IN ('scheduled','confirmed') AND l.assigned_agent_id IS NOT NULL THEN
   PERFORM 1 FROM public.agents WHERE id=l.assigned_agent_id FOR UPDATE;
   IF EXISTS(SELECT 1 FROM public.lead_appointments WHERE assigned_agent_id=l.assigned_agent_id AND id IS DISTINCT FROM a.id
    AND status IN ('scheduled','confirmed') AND starts_at<ends AND ends_at>starts) THEN
    RETURN jsonb_build_object('ok',false,'error','appointment_native_conflict','statusCode',409);
   END IF;
  END IF;
  before_state := CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object('appointment_id',a.id,'status',a.status,'updated_at',a.updated_at::text) END;
  IF p_operation='appointment_create' THEN
   INSERT INTO public.lead_appointments(lead_id,assigned_agent_id,status,starts_at,ends_at,timezone,location_type,location_label,meeting_url,created_by)
    VALUES(p_lead,l.assigned_agent_id,next_status,starts,ends,zone,coalesce(p_payload->>'locationType','office'),nullif(p_payload->>'locationLabel',''),nullif(p_payload->>'meetingUrl',''),p_actor) RETURNING * INTO a;
   action := 'lead.appointment_created';
  ELSE
   UPDATE public.lead_appointments SET status=next_status,starts_at=starts,ends_at=ends,timezone=zone,
    confirmed_at=CASE WHEN next_status='confirmed' THEN occurred ELSE confirmed_at END,
    completed_at=CASE WHEN next_status='completed' THEN occurred ELSE completed_at END,
    canceled_at=CASE WHEN next_status='canceled' THEN occurred ELSE canceled_at END,
    cancellation_reason=CASE WHEN next_status='canceled' THEN nullif(p_payload->>'cancellationReason','') ELSE cancellation_reason END
    WHERE id=a.id RETURNING * INTO a;
   action := 'lead.appointment_status_changed';
  END IF;
  target_id:=a.id;
  target_lead_status:=CASE WHEN next_status IN ('scheduled','confirmed','completed','no_show') THEN 'appointment_set'
   WHEN next_status IN ('requested','reschedule_requested') AND l.status<>'appointment_set' THEN 'appointment_requested' ELSE NULL END;
  -- Later terminal decisions always win. Updating an old appointment must never
  -- reopen a won/lost/disqualified lead or erase actual outcome evidence.
  IF target_lead_status IS NOT NULL AND l.status NOT IN ('converted','dead','spam') THEN
   lifecycle_result:=public.mutate_admin_lead_status_v2(p_lead,l.status,target_lead_status,
    jsonb_build_object('appointment_requested',true,'conversion_stage',target_lead_status),NULL,NULL,p_actor,occurred);
   IF lifecycle_result->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'conversion_lifecycle_sync_failed'; END IF;
  END IF;
 ELSIF p_operation IN ('task_create','human_followthrough') THEN
  IF coalesce(p_payload->>'taskType','') NOT IN ('first_contact','qualification_followup','appointment_confirmation','appointment_followup','document_followup','nurture_check_in','manual_callback') THEN
   RETURN jsonb_build_object('ok',false,'error','invalid_followup_type','statusCode',400);
  END IF;
  due:=nullif(p_payload->>'dueAt','')::timestamptz;
  IF due IS NULL OR coalesce(p_payload->>'priority','normal') NOT IN ('low','normal','high','urgent') THEN
   RETURN jsonb_build_object('ok',false,'error','invalid_followup_due_at','statusCode',400);
  END IF;
  IF p_operation='human_followthrough' AND (coalesce(p_payload->>'channel','') NOT IN ('phone','email','in_person','other')
   OR coalesce(p_payload->>'result','') NOT IN ('attempted','no_answer','two_way_conversation') OR coalesce(length(btrim(p_payload->>'note')),0)=0) THEN
   RETURN jsonb_build_object('ok',false,'error','invalid_human_interaction','statusCode',400);
  END IF;
  INSERT INTO public.tasks(lead_id,agent_id,created_by,title,body,due_at,status,priority,category)
   VALUES(p_lead,l.assigned_agent_id,p_actor,initcap(replace(p_payload->>'taskType','_',' ')),nullif(p_payload->>'note',''),due,'open',coalesce(p_payload->>'priority','normal'),'followup:'||(p_payload->>'taskType')) RETURNING * INTO t;
  target_id:=t.id; next_status:='open';
  action:=CASE WHEN p_operation='human_followthrough' THEN 'lead.human_interaction_recorded' ELSE 'lead.followup_created' END;
  IF p_operation='human_followthrough' AND p_payload->>'result'='two_way_conversation' THEN
   lifecycle_result:=public.record_admin_first_response_v1(p_lead,p_actor,occurred,'admin_lead_detail');
   IF lifecycle_result->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'conversion_response_sync_failed'; END IF;
  END IF;
 ELSE
  SELECT * INTO t FROM public.tasks WHERE id=(p_payload->>'taskId')::uuid AND lead_id=p_lead FOR UPDATE;
  IF t.id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','followup_not_found','statusCode',404); END IF;
  IF t.updated_at IS DISTINCT FROM nullif(p_payload->>'expectedUpdatedAt','')::timestamptz THEN
   RETURN jsonb_build_object('ok',false,'error','stale_followup_version','statusCode',409,'current',jsonb_build_object('status',t.status,'updated_at',t.updated_at::text));
  END IF;
  IF t.agent_id IS DISTINCT FROM l.assigned_agent_id THEN RETURN jsonb_build_object('ok',false,'error','followup_owner_changed','statusCode',409); END IF;
  IF coalesce(p_payload->>'action','') NOT IN ('complete','cancel','reschedule') THEN RETURN jsonb_build_object('ok',false,'error','invalid_followup_action','statusCode',400); END IF;
  IF t.status IN ('done','cancelled') THEN RETURN jsonb_build_object('ok',false,'error','followup_terminal_state','statusCode',409); END IF;
  next_status:=CASE p_payload->>'action' WHEN 'complete' THEN 'done' WHEN 'cancel' THEN 'cancelled' ELSE 'open' END;
  due:=CASE WHEN p_payload->>'action'='reschedule' THEN nullif(p_payload->>'dueAt','')::timestamptz ELSE t.due_at END;
  IF p_payload->>'action'='reschedule' AND due IS NULL THEN RETURN jsonb_build_object('ok',false,'error','invalid_followup_due_at','statusCode',400); END IF;
  before_state:=jsonb_build_object('task_id',t.id,'status',t.status,'due_at',t.due_at,'updated_at',t.updated_at::text);
  UPDATE public.tasks SET status=next_status,due_at=due,body=coalesce(nullif(p_payload->>'outcome',''),body) WHERE id=t.id RETURNING * INTO t;
  target_id:=t.id; action:='lead.followup_'||(p_payload->>'action');
 END IF;
 result:=jsonb_build_object('ok',true,'id',target_id,'status',next_status,'updated_at',CASE WHEN a.id IS NOT NULL THEN a.updated_at::text ELSE t.updated_at::text END);
 INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,before_state,after_state,metadata)
  VALUES(p_actor,action,'lead',p_lead,before_state,jsonb_build_object('id',target_id,'status',next_status),
   jsonb_build_object('source','admin_appointment_followup','conversion_version','v1','operation',p_operation,'request_key',p_key,'request_hash',fingerprint,'response',result,
    'occurred_at',occurred,'appointment_id',a.id,'task_id',t.id,'due_at',due,'timezone',zone,'provenance','manual_operator_record','channel',p_payload->>'channel','result',p_payload->>'result')) RETURNING id INTO audit_id;
 RETURN result || jsonb_build_object('audit_id',audit_id);
 -- No exception handler: required write failures abort the whole SQL statement.
END $$;
REVOKE ALL ON FUNCTION public.mutate_admin_conversion_v1(uuid,text,jsonb,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_conversion_actor_allowed_v1(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mutate_admin_lead_status_v4(uuid,text,text,jsonb,text,numeric,text,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_admin_first_response_v2(uuid,text,timestamptz,text) FROM PUBLIC;
DO $conversion_acl$ DECLARE r text; BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
   EXECUTE format('REVOKE ALL ON FUNCTION public.mutate_admin_conversion_v1(uuid,text,jsonb,text,text),public.admin_conversion_actor_allowed_v1(uuid,text),public.mutate_admin_lead_status_v4(uuid,text,text,jsonb,text,numeric,text,timestamptz),public.record_admin_first_response_v2(uuid,text,timestamptz,text) FROM %I',r);
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
  GRANT EXECUTE ON FUNCTION public.mutate_admin_conversion_v1(uuid,text,jsonb,text,text),public.admin_conversion_actor_allowed_v1(uuid,text),public.mutate_admin_lead_status_v4(uuid,text,text,jsonb,text,numeric,text,timestamptz),public.record_admin_first_response_v2(uuid,text,timestamptz,text) TO service_role;
 END IF;
END $conversion_acl$;
COMMENT ON FUNCTION public.mutate_admin_conversion_v1(uuid,text,jsonb,text,text) IS 'Atomic internal conversion state + audit. No dispatch/calendar integration. Lead lock, current actor, exact version and one logical-action receipt; manual human evidence stays manual.';
