-- PREPARED ONLY: additive, exact-source migration. Neon canonical. No backfill,
-- no provider I/O, no owner-default changes. Disable new receipt generation /
-- worker independently for app rollback; preserve all records and v1 readers.
BEGIN;
ALTER TABLE public.lead_appointments ADD COLUMN request_preferences jsonb;
ALTER TABLE public.lead_appointments ADD CONSTRAINT appointment_preferences_v1 CHECK (
 request_preferences IS NULL OR (jsonb_typeof(request_preferences)='object'
 AND request_preferences->'version'='1'::jsonb
 AND request_preferences->>'channel' IN ('no_preference','email','phone')
 AND request_preferences->>'window' IN ('no_preference','morning','afternoon','evening')
 AND request_preferences->>'timezone'='America/New_York'
 AND (request_preferences->'day'='null'::jsonb OR request_preferences->>'day' ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$')
 AND request_preferences ?& ARRAY['version','channel','window','day','timezone']
 AND request_preferences - ARRAY['version','channel','window','day','timezone']='{}'::jsonb) IS TRUE);
ALTER TABLE public.lead_notifications ADD COLUMN private_response_snapshot jsonb;
ALTER TABLE public.lead_notifications ADD COLUMN response_claim_token uuid;
COMMENT ON COLUMN public.lead_notifications.private_response_snapshot IS 'Server-only immutable request-specific recipient/body; never include in public/admin DTOs, analytics, or logs.';

CREATE FUNCTION public.request_receipt_permitted_v1(p_lead uuid,p_recipient text,p_cutoff timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.leads l JOIN public.communication_permissions p ON p.lead_id=l.id
 WHERE l.id=p_lead AND lower(l.email)=lower(p_recipient) AND l.created_at>=p_cutoff
 AND NOT l.is_test AND NOT l.communication_suppressed AND NOT l.email_suppressed AND l.consent_email
 AND EXISTS(SELECT 1 FROM public.consents c WHERE c.lead_id=l.id AND c.consent_type='email' AND c.granted
   AND c.language_version='amm_contact_v2' AND c.language_text=l.consent_language_text AND c.collected_at=l.consent_timestamp)
 AND l.status NOT IN ('dead','converted','spam')
 AND coalesce(l.conversion_stage,'') NOT IN ('closed','closed_won','closed_lost','lost','disqualified','duplicate','converted','dead','spam')
 AND l.closed_won_at IS NULL AND l.closed_lost_at IS NULL
 AND p.channel='email' AND p.purpose='transactional_acknowledgment' AND p.state='allowed'
 AND NOT p.manual_review_required AND p.opted_out_at IS NULL
 AND p.consent_version='amm_request_receipt_email_v1'
 AND p.consent_text='Email me a receipt for this inquiry and any conversation request I submit here. No marketing or automated follow-up.'
 AND p.source='public_request_receipt' AND p.metadata->>'inquiry_id'=l.id::text
 AND p.evidence_at IS NOT NULL AND p.evidence_at<=now()
 AND NOT EXISTS(SELECT 1 FROM public.communication_permissions denied WHERE denied.lead_id=l.id
   AND denied.channel='email' AND (denied.state='opted_out' OR denied.opted_out_at IS NOT NULL)));
$$;

CREATE FUNCTION public.amm_guard_request_response_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='INSERT' AND NEW.template_version='request_response_v1'
 AND current_setting('amm.request_response_seed',true) IS DISTINCT FROM 'v1' THEN
   RAISE EXCEPTION 'atomic_request_response_intent_required' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' AND OLD.private_response_snapshot IS NOT NULL THEN
   IF (NEW.private_response_snapshot,NEW.lead_id,NEW.notification_type,NEW.channel,NEW.recipient_type,NEW.recipient_reference,NEW.template_version,NEW.idempotency_key)
    IS DISTINCT FROM (OLD.private_response_snapshot,OLD.lead_id,OLD.notification_type,OLD.channel,OLD.recipient_type,OLD.recipient_reference,OLD.template_version,OLD.idempotency_key)
   THEN RAISE EXCEPTION 'immutable_request_response_identity' USING ERRCODE='23514'; END IF;
   IF NEW.status='processing' AND OLD.status<>'processing'
    AND current_setting('amm.request_response_claim',true) IS DISTINCT FROM 'v1'
   THEN RAISE EXCEPTION 'request_response_claim_required' USING ERRCODE='23514'; END IF;
   IF OLD.first_provider_attempt_at IS NOT NULL AND NEW.first_provider_attempt_at IS DISTINCT FROM OLD.first_provider_attempt_at
    THEN RAISE EXCEPTION 'immutable_response_retry_boundary' USING ERRCODE='23514'; END IF;
   IF OLD.provider_accepted_at IS NOT NULL AND NEW.provider_accepted_at IS DISTINCT FROM OLD.provider_accepted_at
    THEN RAISE EXCEPTION 'immutable_response_acceptance' USING ERRCODE='23514'; END IF;
   IF NEW.status IN ('pending','failed','retry_scheduled') AND (OLD.provider_message_id IS NOT NULL OR OLD.provider_accepted_at IS NOT NULL OR OLD.status='processing')
    AND current_setting('amm.request_response_finish',true) IS DISTINCT FROM 'v1'
    THEN RAISE EXCEPTION 'response_provider_reconciliation_required' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER request_response_guard BEFORE INSERT OR UPDATE ON public.lead_notifications
FOR EACH ROW EXECUTE FUNCTION public.amm_guard_request_response_v1();

CREATE FUNCTION public.seed_request_responses_v1(p_lead uuid,p_event uuid,p_kind text,p_at timestamptz,p_draft jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE l public.leads; audience text; destination text; body jsonb; snapshot jsonb; key text; cutoff timestamptz; subscription record;
BEGIN
 IF p_kind NOT IN ('inquiry','appointment') THEN RAISE EXCEPTION 'invalid_response_kind'; END IF;
 SELECT * INTO STRICT l FROM public.leads WHERE id=p_lead;
 PERFORM set_config('amm.request_response_seed','v1',true);
 -- Staff appointment intent is independent of consumer permission and is not
 -- a resend of the inquiry's original v6 alerts. Test records never deliver.
 FOR audience IN SELECT unnest(CASE WHEN p_kind='appointment' THEN ARRAY['mike','brandon','customer'] ELSE ARRAY['customer'] END) LOOP
   IF audience='customer' THEN
     IF p_draft->>'receipts' IS DISTINCT FROM 'true' OR p_draft->>'cutoff' IS NULL THEN CONTINUE; END IF;
     cutoff := (p_draft->>'cutoff')::timestamptz;
     IF p_at<cutoff OR NOT public.request_receipt_permitted_v1(p_lead,l.email,cutoff) THEN CONTINUE; END IF;
     destination := l.email; body := p_draft->'bodies'->p_kind;
     IF p_draft->>'reply_to' IS NULL THEN CONTINUE; END IF;
   ELSE
     destination := p_draft->>audience; body := p_draft->'bodies'->'internal';
   END IF;
   IF body IS NULL OR jsonb_typeof(body) IS DISTINCT FROM 'object' OR NOT body ?& ARRAY['subject','text','html']
     THEN RAISE EXCEPTION 'response_body_required'; END IF;
   key := 'request_response:'||p_event::text||':'||p_kind||':'||audience;
   snapshot := jsonb_build_object('version',1,'kind',p_kind,'audience',audience,'event_id',p_event,'cutoff',cutoff,
     'recipient',destination,'from',p_draft->>'from','reply_to',CASE WHEN audience='customer' THEN p_draft->>'reply_to' END,
     'body',replace(body::text,'LEAD_REFERENCE',p_lead::text)::jsonb);
   INSERT INTO public.lead_notifications(lead_id,agent_id,notification_type,channel,recipient_type,recipient_reference,template_version,
     idempotency_key,status,max_attempts,metadata,private_response_snapshot)
   VALUES(p_lead,l.assigned_agent_id,CASE WHEN audience='customer' THEN 'consumer_ack' ELSE 'appointment_request' END,'email',
     CASE WHEN audience='customer' THEN 'customer' ELSE 'internal' END,CASE WHEN audience='customer' THEN 'customer_email' ELSE 'operator:'||audience END,
     'request_response_v1',key,CASE WHEN destination IS NULL OR p_draft->>'from' IS NULL OR l.is_test THEN 'skipped' ELSE 'pending' END,3,
     jsonb_build_object('event_id',p_event,'request_kind',p_kind,'is_test',l.is_test),snapshot)
   ON CONFLICT(idempotency_key) DO NOTHING;
 END LOOP;
 -- v6's staff email branch returns early; push needs its own atomic intent,
 -- not a legacy email enqueue. Never persist endpoint/key material here.
 IF p_kind='inquiry' AND p_draft->>'push'='true' AND NOT l.is_test THEN
  FOR subscription IN SELECT id,recipient_role FROM public.staff_push_subscriptions WHERE is_active ORDER BY created_at,id LIMIT 10 LOOP
   INSERT INTO public.lead_notifications(lead_id,agent_id,notification_type,channel,recipient_type,recipient_reference,template_version,
     idempotency_key,status,max_attempts,metadata,private_response_snapshot)
   VALUES(l.id,l.assigned_agent_id,'lead_alert','push','internal','subscription:'||subscription.id::text,'request_response_v1',
    'request_response:'||p_event::text||':push:'||subscription.id::text,'pending',1,
    jsonb_build_object('subscription_id',subscription.id,'is_test',false),
    jsonb_build_object('version',1,'kind','inquiry','audience','staff_push','event_id',p_event,'recipient',subscription.id,
      'role',subscription.recipient_role,'body',jsonb_build_object('subject','New saved inquiry',
      'text','Open the protected Lead Center to review the request and current contact readiness.')))
   ON CONFLICT(idempotency_key) DO NOTHING;
  END LOOP;
 END IF;
END $$;

CREATE FUNCTION public.capture_public_lead_v6(p_session jsonb,p_lead jsonb,p_attribution jsonb,p_mode text,p_internal jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE r jsonb; l public.leads; draft jsonb := p_internal->'response_draft';
BEGIN
 r := CASE WHEN p_lead->'seller_request' IS NOT NULL AND p_lead->'seller_request'<>'null'::jsonb
 THEN public.capture_public_lead_v5(p_session,p_lead,p_attribution,p_mode,p_internal)
 ELSE public.capture_public_lead_v4(p_session,p_lead,p_attribution,p_mode,p_internal) END;
 IF (r->>'ok')::boolean AND NOT coalesce((r->>'idempotent_replay')::boolean,false) THEN
   SELECT * INTO STRICT l FROM public.leads WHERE id=(r->>'lead_id')::uuid;
   -- Explicit optional receipt checkbox is a NEW, inquiry-scoped purpose.
   -- No historical backfill; no promotion of manual_contact copy or flags.
   IF draft->>'receipt_requested'='true' AND l.email IS NOT NULL AND NOT l.is_test THEN
     INSERT INTO public.communication_permissions(lead_id,channel,purpose,state,consent_text,consent_version,source,evidence_at,metadata)
     VALUES(l.id,'email','transactional_acknowledgment','allowed',
      'Email me a receipt for this inquiry and any conversation request I submit here. No marketing or automated follow-up.',
      'amm_request_receipt_email_v1','public_request_receipt',l.consent_timestamp,jsonb_build_object('inquiry_id',l.id))
     ON CONFLICT(lead_id,channel,purpose) DO NOTHING;
   END IF;
   PERFORM public.seed_request_responses_v1(l.id,l.id,'inquiry',l.created_at,draft);
 END IF;
 RETURN r;
END $$;

CREATE FUNCTION public.request_public_appointment_v2(p_lead uuid,p_session uuid,p_surface text,p_at timestamptz,p_preferences jsonb,p_draft jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE l public.leads; a public.lead_appointments; task uuid; task_created boolean := false; prefs jsonb := p_preferences;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('amm:appointment:'||p_lead::text,0));
 SELECT * INTO l FROM public.leads WHERE id=p_lead AND (session_id=p_session OR widget_session_id=p_session::text) FOR UPDATE;
 IF l.id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','appointment_request_not_found'); END IF;
 -- Closed/suppressed inquiries and revoked/stale public capabilities never
 -- become new business actions. Preserve every outcome and historical task.
 IF l.communication_suppressed AND NOT l.is_test OR l.status IN ('dead','converted','spam')
   OR coalesce(l.conversion_stage,'') IN ('closed','closed_won','closed_lost','lost','disqualified','duplicate','converted','dead','spam')
   OR l.closed_won_at IS NOT NULL OR l.closed_lost_at IS NOT NULL
 THEN RETURN jsonb_build_object('ok',false,'error','appointment_request_closed'); END IF;
 IF l.created_at<now()-interval '24 hours' THEN RETURN jsonb_build_object('ok',false,'error','appointment_request_session_expired'); END IF;
 -- Inspect ALL prior appointments before task creation: retry after canceled,
 -- completed or confirmed is still the SAME request, never a reopen.
 SELECT * INTO a FROM public.lead_appointments WHERE lead_id=p_lead ORDER BY created_at DESC,id LIMIT 1 FOR UPDATE;
 IF a.id IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'status','already_requested','appointment_id',a.id,'appointment_status',a.status,'followup_status','existing'); END IF;
 IF EXISTS(SELECT 1 FROM public.tasks WHERE lead_id=p_lead AND category='followup:appointment_confirmation' AND status IN ('done','cancelled'))
 THEN RETURN jsonb_build_object('ok',false,'error','appointment_request_closed'); END IF;
 IF prefs IS NULL OR jsonb_typeof(prefs) IS DISTINCT FROM 'object' OR prefs->'version' IS DISTINCT FROM '1'::jsonb
  OR coalesce(prefs->>'channel','') NOT IN ('no_preference','email','phone') OR coalesce(prefs->>'window','') NOT IN ('no_preference','morning','afternoon','evening')
  OR prefs->>'timezone' IS DISTINCT FROM 'America/New_York'
  OR NOT prefs ?& ARRAY['version','channel','window','day','timezone'] OR prefs-ARRAY['version','channel','window','day','timezone']<>'{}'::jsonb
 THEN RAISE EXCEPTION 'invalid_conversation_preferences' USING ERRCODE='22023'; END IF;
 IF prefs->'day'<>'null'::jsonb THEN
   IF prefs->>'day' !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' OR (prefs->>'day')::date::text IS DISTINCT FROM prefs->>'day'
   THEN RAISE EXCEPTION 'invalid_conversation_day' USING ERRCODE='22023'; END IF;
 END IF;
 IF (prefs->>'channel'='email' AND nullif(l.email,'') IS NULL) OR (prefs->>'channel'='phone' AND nullif(l.phone,'') IS NULL)
 THEN RETURN jsonb_build_object('ok',false,'error','appointment_preferred_channel_missing'); END IF;
 INSERT INTO public.lead_appointments(lead_id,assigned_agent_id,status,requested_at,timezone,location_type,location_label,created_by,request_preferences)
 VALUES(l.id,l.assigned_agent_id,'requested',p_at,'America/New_York','other','Conversation request; not booked','public_appointment_request',prefs) RETURNING * INTO a;
 SELECT id INTO task FROM public.tasks WHERE lead_id=l.id AND category='followup:appointment_confirmation' AND status IN ('open','in_progress') ORDER BY created_at,id LIMIT 1;
 IF task IS NULL THEN
   INSERT INTO public.tasks(lead_id,agent_id,created_by,title,body,due_at,status,priority,category)
   VALUES(l.id,l.assigned_agent_id,'public_appointment_request','Review conversation request',
    'Review the saved preferences and current contact permission. No time or channel is confirmed.',p_at+interval '2 hours','open','high','followup:appointment_confirmation') RETURNING id INTO task;
   task_created := true;
 END IF;
 UPDATE public.leads SET status='appointment_requested',appointment_requested=true,conversion_stage='appointment_requested' WHERE id=l.id;
 INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,before_state,after_state,metadata)
 VALUES('public_appointment_request','lead.appointment_requested_public','lead',l.id,jsonb_build_object('status',l.status),
   jsonb_build_object('status','appointment_requested','appointment_id',a.id),jsonb_build_object('request_preferences',prefs,'task_id',task,'request_surface',p_surface));
 PERFORM public.seed_request_responses_v1(l.id,a.id,'appointment',p_at,p_draft);
 RETURN jsonb_build_object('ok',true,'status','requested','appointment_id',a.id,'appointment_status',a.status,'followup_status',CASE WHEN task_created THEN 'created' ELSE 'existing' END);
END $$;

CREATE FUNCTION public.claim_request_response_v1(p_id uuid,p_cutoff timestamptz)
RETURNS SETOF public.lead_notifications LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE n public.lead_notifications; l public.leads;
BEGIN
 SELECT * INTO n FROM public.lead_notifications WHERE id=p_id AND template_version='request_response_v1' FOR UPDATE;
 IF n.id IS NULL OR n.status NOT IN ('pending','retry_scheduled') OR n.provider_message_id IS NOT NULL
 OR n.provider_accepted_at IS NOT NULL OR n.attempt_count>=least(n.max_attempts,3) OR n.next_attempt_at>now()
 OR (n.first_provider_attempt_at IS NOT NULL AND n.first_provider_attempt_at<now()-interval '23 hours') THEN RETURN; END IF;
 SELECT * INTO l FROM public.leads WHERE id=n.lead_id FOR SHARE;
 IF l.is_test OR l.communication_suppressed THEN RETURN; END IF;
 IF n.channel='push' AND NOT EXISTS(SELECT 1 FROM public.staff_push_subscriptions s WHERE s.id=(n.private_response_snapshot->>'recipient')::uuid
   AND s.is_active AND s.recipient_role=n.private_response_snapshot->>'role') THEN
  UPDATE public.lead_notifications SET status='skipped',error_code='staff_push_revoked' WHERE id=n.id; RETURN;
 END IF;
 IF n.recipient_type='customer' AND ((n.private_response_snapshot->>'cutoff')::timestamptz IS DISTINCT FROM p_cutoff
 OR NOT public.request_receipt_permitted_v1(n.lead_id,n.private_response_snapshot->>'recipient',p_cutoff)) THEN
  UPDATE public.lead_notifications SET status='skipped',error_code='request_receipt_permission_revoked' WHERE id=n.id; RETURN;
 END IF;
 PERFORM set_config('amm.request_response_claim','v1',true);
 RETURN QUERY UPDATE public.lead_notifications SET status='processing',attempt_count=attempt_count+1,
 provider=CASE WHEN channel='push' THEN 'web_push' ELSE 'resend' END,
 response_claim_token=gen_random_uuid(),first_provider_attempt_at=coalesce(first_provider_attempt_at,now()),
 next_attempt_at=NULL WHERE id=n.id RETURNING *;
END $$;

CREATE FUNCTION public.finish_request_response_v1(p_id uuid,p_claim uuid,p_result jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF p_result->>'status' NOT IN ('sent','processing','retry_scheduled','permanently_failed')
 THEN RAISE EXCEPTION 'invalid_response_outcome'; END IF;
 PERFORM set_config('amm.request_response_finish','v1',true);
 UPDATE public.lead_notifications SET status=p_result->>'status',
  provider_message_id=nullif(p_result->>'providerMessageId',''),
  provider_accepted_at=(p_result->>'acceptedAt')::timestamptz,
  sent_at=CASE WHEN p_result->>'status'='sent' THEN now() END,
  error_code=p_result->>'errorCode',next_attempt_at=(p_result->>'nextAttemptAt')::timestamptz
 WHERE id=p_id AND response_claim_token=p_claim AND status='processing' AND template_version='request_response_v1'
   AND provider_message_id IS NULL AND provider_accepted_at IS NULL;
END $$;

REVOKE ALL ON FUNCTION public.request_receipt_permitted_v1(uuid,text,timestamptz),public.amm_guard_request_response_v1(),
 public.seed_request_responses_v1(uuid,uuid,text,timestamptz,jsonb),public.capture_public_lead_v6(jsonb,jsonb,jsonb,text,jsonb),
 public.request_public_appointment_v2(uuid,uuid,text,timestamptz,jsonb,jsonb),public.claim_request_response_v1(uuid,timestamptz),public.finish_request_response_v1(uuid,uuid,jsonb) FROM PUBLIC;
-- Legacy browser roles are not present in every canonical Neon deployment.
-- Revoke their inherited rights when present; never create roles or change defaults.
DO $legacy_roles$
DECLARE legacy_role text; signature text;
BEGIN
 FOR legacy_role IN SELECT rolname FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated') LOOP
  FOREACH signature IN ARRAY ARRAY[
   'public.request_receipt_permitted_v1(uuid,text,timestamptz)',
   'public.amm_guard_request_response_v1()',
   'public.seed_request_responses_v1(uuid,uuid,text,timestamptz,jsonb)',
   'public.capture_public_lead_v6(jsonb,jsonb,jsonb,text,jsonb)',
   'public.request_public_appointment_v2(uuid,uuid,text,timestamptz,jsonb,jsonb)',
   'public.claim_request_response_v1(uuid,timestamptz)',
   'public.finish_request_response_v1(uuid,uuid,jsonb)'
  ] LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I',signature,legacy_role);
  END LOOP;
 END LOOP;
END $legacy_roles$;
GRANT EXECUTE ON FUNCTION public.request_receipt_permitted_v1(uuid,text,timestamptz),public.amm_guard_request_response_v1(),
 public.seed_request_responses_v1(uuid,uuid,text,timestamptz,jsonb),public.capture_public_lead_v6(jsonb,jsonb,jsonb,text,jsonb),
 public.request_public_appointment_v2(uuid,uuid,text,timestamptz,jsonb,jsonb),public.claim_request_response_v1(uuid,timestamptz),public.finish_request_response_v1(uuid,uuid,jsonb) TO service_role;
COMMIT;
