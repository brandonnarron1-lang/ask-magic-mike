-- Additive launch successor. No old capture/template body, queue or lead rewrite.
BEGIN;
DO $predecessors$
BEGIN
  IF to_regprocedure('public.capture_public_lead_v3(jsonb,jsonb,jsonb,text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'accepted_public_capture_v3_required';
  END IF;
END;
$predecessors$;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS buyer_interest jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS inquiry_request_fingerprint text;
ALTER TABLE public.lead_notifications ADD COLUMN IF NOT EXISTS private_intake_snapshot jsonb;
ALTER TABLE public.lead_notifications ADD COLUMN IF NOT EXISTS first_provider_attempt_at timestamptz;
ALTER TABLE public.lead_notifications ADD COLUMN IF NOT EXISTS provider_accepted_at timestamptz;
ALTER TABLE public.lead_notifications ADD COLUMN IF NOT EXISTS launch_batch_lease_token uuid;
ALTER TABLE public.lead_notifications ADD COLUMN IF NOT EXISTS launch_batch_lease_until timestamptz;
COMMENT ON COLUMN public.leads.buyer_interest IS 'Versioned submitted property interests/search area; not residential address, listing verification or geography inference. NULL for legacy records; no backfill.';
COMMENT ON COLUMN public.lead_notifications.private_intake_snapshot IS 'Server-only immutable launch recipient, sender, exact rendered body and submitted inquiry evidence. Not notification metadata; never project into public, analyst, preclaim or ordinary admin DTOs. No credentials.';
COMMENT ON COLUMN public.lead_notifications.first_provider_attempt_at IS 'Persisted claim immediately before first provider submission; a crash can make acceptance ambiguous. Never reset to extend provider idempotency retention.';
COMMENT ON COLUMN public.lead_notifications.provider_accepted_at IS 'Provider API/signed acceptance evidence, NOT recipient delivery or mailbox observation.';

CREATE FUNCTION public.amm_validate_buyer_interest_v1(p_interest jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_property jsonb; v_field text; v_limit int; v_url text;
BEGIN
  IF p_interest IS NULL OR p_interest = 'null'::jsonb THEN RETURN; END IF;
  IF jsonb_typeof(p_interest) IS DISTINCT FROM 'object' OR p_interest->'version' IS DISTINCT FROM '1'::jsonb
     OR octet_length(p_interest::text) > 32768 THEN RAISE EXCEPTION 'invalid_buyer_interest' USING ERRCODE='22023'; END IF;
  IF p_interest->>'kind' = 'search' THEN
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_interest) f(key) WHERE key NOT IN ('version','kind','desired_area','budget_range'))
       OR jsonb_typeof(p_interest->'desired_area') IS DISTINCT FROM 'string'
       OR char_length(p_interest->>'desired_area') NOT BETWEEN 1 AND 500
       OR p_interest->>'desired_area' IS DISTINCT FROM btrim(p_interest->>'desired_area')
       OR p_interest->>'desired_area' ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'invalid_buyer_interest' USING ERRCODE='22023'; END IF;
    IF p_interest ? 'budget_range' AND (jsonb_typeof(p_interest->'budget_range') IS DISTINCT FROM 'string'
       OR char_length(p_interest->>'budget_range') NOT BETWEEN 1 AND 160
       OR p_interest->>'budget_range' IS DISTINCT FROM btrim(p_interest->>'budget_range')
       OR p_interest->>'budget_range' ~ '[[:cntrl:]]') THEN RAISE EXCEPTION 'invalid_buyer_interest' USING ERRCODE='22023'; END IF;
  ELSIF p_interest->>'kind' = 'specific' THEN
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_interest) f(key) WHERE key NOT IN ('version','kind','properties'))
       OR jsonb_typeof(p_interest->'properties') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_buyer_interest' USING ERRCODE='22023'; END IF;
    IF jsonb_array_length(p_interest->'properties') NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'invalid_buyer_interest' USING ERRCODE='22023'; END IF;
    FOR v_property IN SELECT value FROM jsonb_array_elements(p_interest->'properties') LOOP
      IF jsonb_typeof(v_property) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_buyer_interest' USING ERRCODE='22023'; END IF;
      IF EXISTS (SELECT 1 FROM jsonb_object_keys(v_property) f(key) WHERE key NOT IN ('address_text','unit','listing_url','reference')) THEN RAISE EXCEPTION 'invalid_buyer_interest' USING ERRCODE='22023'; END IF;
      FOR v_field, v_limit IN SELECT * FROM (VALUES ('address_text',500),('unit',100),('listing_url',2048),('reference',160)) b(field,maximum) LOOP
        IF v_property ? v_field AND (jsonb_typeof(v_property->v_field) IS DISTINCT FROM 'string'
           OR char_length(v_property->>v_field) NOT BETWEEN 1 AND v_limit
           OR v_property->>v_field IS DISTINCT FROM btrim(v_property->>v_field)
           OR v_property->>v_field ~ '[[:cntrl:]]') THEN RAISE EXCEPTION 'invalid_buyer_interest' USING ERRCODE='22023'; END IF;
      END LOOP;
      IF NOT (v_property ? 'address_text' OR v_property ? 'listing_url') THEN RAISE EXCEPTION 'invalid_buyer_interest' USING ERRCODE='22023'; END IF;
      v_url := v_property->>'listing_url';
      IF v_url IS NOT NULL AND (v_url !~* '^https?://[^/?#[:space:]@]+([/?#]|$)' OR v_url ~ '[[:space:]]' OR position(chr(92) IN v_url)>0) THEN RAISE EXCEPTION 'invalid_buyer_interest' USING ERRCODE='22023'; END IF;
    END LOOP;
  ELSE RAISE EXCEPTION 'invalid_buyer_interest' USING ERRCODE='22023'; END IF;
END;
$$;

CREATE FUNCTION public.amm_guard_launch_alert_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF (NEW.template_version='lead_alert_email_v6' OR NEW.private_intake_snapshot IS NOT NULL)
       AND current_setting('amm.launch_alert_capture',true) IS DISTINCT FROM 'v4' THEN
      RAISE EXCEPTION 'transactional_launch_intent_required' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.private_intake_snapshot IS NOT NULL AND NEW.private_intake_snapshot IS DISTINCT FROM OLD.private_intake_snapshot THEN
    RAISE EXCEPTION 'immutable_launch_alert_snapshot' USING ERRCODE='23514';
  END IF;
  IF NEW.private_intake_snapshot IS NOT NULL AND OLD.private_intake_snapshot IS NULL
     AND current_setting('amm.launch_alert_capture',true) IS DISTINCT FROM 'v4' THEN
    RAISE EXCEPTION 'transactional_launch_snapshot_required' USING ERRCODE='23514';
  END IF;
  IF OLD.template_version = 'lead_alert_email_v6' AND OLD.private_intake_snapshot IS NOT NULL THEN
    IF (NEW.lead_id,NEW.channel,NEW.notification_type,NEW.recipient_type,NEW.recipient_reference,NEW.template_version,NEW.idempotency_key)
       IS DISTINCT FROM (OLD.lead_id,OLD.channel,OLD.notification_type,OLD.recipient_type,OLD.recipient_reference,OLD.template_version,OLD.idempotency_key) THEN
      RAISE EXCEPTION 'immutable_launch_alert_identity' USING ERRCODE='23514';
    END IF;
    IF NEW.status = 'processing' AND OLD.status <> 'processing'
       AND current_setting('amm.launch_alert_claim',true) IS DISTINCT FROM 'v6' THEN
      RAISE EXCEPTION 'launch_alert_claim_required' USING ERRCODE='23514';
    END IF;
    IF OLD.first_provider_attempt_at IS NOT NULL AND NEW.first_provider_attempt_at IS DISTINCT FROM OLD.first_provider_attempt_at THEN
      RAISE EXCEPTION 'immutable_provider_retry_boundary' USING ERRCODE='23514';
    END IF;
    IF OLD.provider_accepted_at IS NOT NULL AND NEW.provider_accepted_at IS DISTINCT FROM OLD.provider_accepted_at THEN
      RAISE EXCEPTION 'immutable_provider_acceptance' USING ERRCODE='23514';
    END IF;
    IF NEW.status IN ('pending','failed','retry_scheduled') AND (OLD.provider_message_id IS NOT NULL OR OLD.provider_accepted_at IS NOT NULL) THEN
      RAISE EXCEPTION 'provider_reconciliation_required' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER launch_alert_snapshot_guard BEFORE INSERT OR UPDATE ON public.lead_notifications
FOR EACH ROW EXECUTE FUNCTION public.amm_guard_launch_alert_v1();

CREATE FUNCTION public.capture_public_lead_v4(
  p_session jsonb,p_lead jsonb,p_attribution jsonb,
  p_notification_mode text DEFAULT 'disabled',p_internal_notification jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  v_session uuid := (p_session->>'id')::uuid;
  v_key text := nullif(btrim(p_lead->>'request_idempotency_key'),'');
  v_interest jsonb := nullif(p_lead->'buyer_interest','null'::jsonb);
  v_address jsonb := nullif(p_lead->'address_entry','null'::jsonb);
  v_context jsonb := p_internal_notification->'request_context';
  v_fingerprint text; v_existing record; v_found boolean := false;
  v_result jsonb; v_lead uuid; v_notification uuid; v_second uuid;
  v_draft jsonb := p_internal_notification->'launch_draft'; v_recipient jsonb;
  v_template text := p_internal_notification->>'template_version';
  v_saved record; v_snapshot jsonb; v_context_text text; v_assignment_text text;
  v_status text; v_error text; v_cutoff timestamptz; v_count int;
BEGIN
  IF v_session IS NULL OR jsonb_typeof(v_context) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'inquiry_request_context_required' USING ERRCODE='22023'; END IF;
  PERFORM public.amm_validate_buyer_interest_v1(v_interest);
  IF nullif(v_context->'buyer_interest','null'::jsonb) IS DISTINCT FROM v_interest
     OR nullif(v_context->'address_entry','null'::jsonb) IS DISTINCT FROM v_address THEN
    RAISE EXCEPTION 'inquiry_context_mismatch' USING ERRCODE='22023';
  END IF;
  v_fingerprint := encode(sha256(convert_to(v_context::text,'UTF8')),'hex');
  -- Same identities/order as unchanged v3 -> v2 -> v1.
  IF v_key IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended('amm:request-idempotency:'||v_key,0)); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('amm:session:'||v_session::text,0));
  IF v_key IS NOT NULL THEN
    SELECT id,session_id,buyer_interest,address_entry,inquiry_request_fingerprint INTO v_existing
      FROM public.leads WHERE request_idempotency_key=v_key LIMIT 1 FOR UPDATE;
    v_found := FOUND;
  END IF;
  IF NOT v_found THEN
    SELECT id,session_id,buyer_interest,address_entry,inquiry_request_fingerprint INTO v_existing
      FROM public.leads WHERE session_id=v_session LIMIT 1 FOR UPDATE;
    v_found := FOUND;
  END IF;
  IF v_found AND (v_existing.buyer_interest IS DISTINCT FROM v_interest
     OR v_existing.address_entry IS DISTINCT FROM v_address
     OR (v_existing.inquiry_request_fingerprint IS NOT NULL AND v_existing.inquiry_request_fingerprint IS DISTINCT FROM v_fingerprint)) THEN
    RETURN jsonb_build_object('ok',false,'error','idempotency_conflict','session_id',v_existing.session_id,'idempotent_replay',false);
  END IF;
  IF v_template = 'lead_alert_email_v6' THEN
    IF jsonb_typeof(v_draft) IS DISTINCT FROM 'object' OR v_draft->'version' IS DISTINCT FROM '1'::jsonb
       OR v_draft->'submitted' IS DISTINCT FROM v_context
       OR jsonb_typeof(v_draft->'recipients') IS DISTINCT FROM 'array'
       OR jsonb_typeof(v_draft->'subject') IS DISTINCT FROM 'string'
       OR char_length(v_draft->>'subject') > 240 OR v_draft->>'subject' ~ '[[:cntrl:]]'
       OR jsonb_typeof(v_draft->'text_prefix') IS DISTINCT FROM 'string' OR char_length(v_draft->>'text_prefix')>38000
       OR jsonb_typeof(v_draft->'html_prefix') IS DISTINCT FROM 'string' OR char_length(v_draft->>'html_prefix')>118000
       OR jsonb_typeof(v_draft->'is_test') IS DISTINCT FROM 'boolean'
       OR jsonb_typeof(v_draft->'qa_initial_authorized') IS DISTINCT FROM 'boolean'
       OR v_draft->'is_test' IS DISTINCT FROM to_jsonb(coalesce((p_lead->>'is_test')::boolean,false)) THEN
      RAISE EXCEPTION 'invalid_launch_alert_draft' USING ERRCODE='22023';
    END IF;
    IF jsonb_array_length(v_draft->'recipients') <> 2
       OR v_draft->'recipients'->0->>'operator' IS DISTINCT FROM 'mike'
       OR v_draft->'recipients'->1->>'operator' IS DISTINCT FROM 'brandon' THEN
      RAISE EXCEPTION 'exact_two_operator_envelopes_required' USING ERRCODE='22023';
    END IF;
    IF v_draft->>'launch_cutoff' IS NOT NULL THEN v_cutoff := (v_draft->>'launch_cutoff')::timestamptz; END IF;
  ELSIF v_template IS DISTINCT FROM 'lead_alert_email_v4' THEN
    RAISE EXCEPTION 'unsupported_launch_generation_version' USING ERRCODE='22023';
  END IF;
  -- Predecessor seeds exactly one intent; only this brand-new uncommitted intent
  -- is finalized below. No old intent or old original inquiry is upgraded.
  IF v_template='lead_alert_email_v6' THEN PERFORM set_config('amm.launch_alert_capture','v4',true); END IF;
  IF v_address IS NOT NULL THEN
    v_result := public.capture_public_lead_v3(p_session,p_lead,p_attribution,
      CASE WHEN v_template='lead_alert_email_v6' THEN 'disabled' ELSE p_notification_mode END,p_internal_notification);
  ELSE
    v_result := public.capture_public_lead_v2(p_session,p_lead,p_attribution,
      CASE WHEN v_template='lead_alert_email_v6' THEN 'disabled' ELSE p_notification_mode END,p_internal_notification);
  END IF;
  IF coalesce((v_result->>'ok')::boolean,false) IS NOT TRUE OR coalesce((v_result->>'idempotent_replay')::boolean,false) THEN RETURN v_result; END IF;
  v_lead := (v_result->>'lead_id')::uuid;
  UPDATE public.leads SET buyer_interest=v_interest,inquiry_request_fingerprint=v_fingerprint WHERE id=v_lead;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RAISE EXCEPTION 'required_inquiry_enrichment_failed' USING ERRCODE='23514'; END IF;
  IF v_template <> 'lead_alert_email_v6' THEN RETURN v_result || jsonb_build_object('capture_version','v4'); END IF;
  SELECT contact_id,duplicate_of_lead_id,assigned_agent_id,assignment_status,created_at INTO v_saved FROM public.leads WHERE id=v_lead;
  v_context_text := CASE WHEN EXISTS(SELECT 1 FROM public.leads WHERE contact_id=v_saved.contact_id AND id<>v_lead)
    THEN 'Existing contact; this is a separate new inquiry.' ELSE 'New contact inquiry.' END;
  v_assignment_text := CASE WHEN v_saved.assigned_agent_id IS NOT NULL THEN 'Assignment recorded; review ownership in Lead Center.'
    WHEN v_saved.duplicate_of_lead_id IS NOT NULL THEN 'Existing inquiry ownership retained; no reassignment.'
    ELSE 'No saved assignment; operator review required.' END;
  PERFORM set_config('amm.launch_alert_capture','v4',true);
  FOR v_recipient IN SELECT value FROM jsonb_array_elements(v_draft->'recipients') LOOP
    v_error := CASE
      WHEN p_notification_mode='disabled' THEN 'notifications_disabled'
      WHEN p_notification_mode <> 'production' THEN 'launch_requires_production_transport'
      WHEN v_cutoff IS NULL OR v_saved.created_at<v_cutoff THEN 'launch_cutoff_not_eligible'
      WHEN v_draft->>'from' IS NULL OR v_recipient->>'recipient' IS NULL THEN 'launch_operator_binding_missing'
      WHEN lower(v_draft->'recipients'->0->>'recipient')=lower(v_draft->'recipients'->1->>'recipient') THEN 'launch_operator_binding_duplicate'
      WHEN (v_draft->>'is_test')::boolean AND NOT (v_draft->>'qa_initial_authorized')::boolean THEN 'initial_qa_not_authorized'
      ELSE NULL END;
    IF v_recipient->>'recipient' IS NOT NULL AND (char_length(v_recipient->>'recipient')>254
       OR v_recipient->>'recipient' ~ '[[:space:],;<>]' OR v_recipient->>'recipient' !~ '^[^@]+@[^@]+[.][^@]+$') THEN RAISE EXCEPTION 'invalid_launch_recipient' USING ERRCODE='22023'; END IF;
    IF v_draft->>'from' IS NOT NULL AND (char_length(v_draft->>'from')>320 OR v_draft->>'from' ~ '[[:cntrl:]]'
       OR NOT (btrim(v_draft->>'from') ~ '^[^[:space:]@<>;,]+@[^[:space:]@<>;,]+[.][^[:space:]@<>;,]+$'
         OR btrim(v_draft->>'from') ~ '^[^<>]+<[^[:space:]@<>;,]+@[^[:space:]@<>;,]+[.][^[:space:]@<>;,]+>$')) THEN RAISE EXCEPTION 'invalid_launch_sender' USING ERRCODE='22023'; END IF;
    v_status := CASE WHEN v_error IS NULL THEN 'pending' WHEN v_error IN ('notifications_disabled','initial_qa_not_authorized','launch_requires_production_transport') THEN 'skipped' ELSE 'permanently_failed' END;
    v_snapshot := jsonb_build_object('version',1,'template_version',v_template,'launch_cutoff',v_draft->'launch_cutoff',
      'operator',v_recipient->>'operator','recipient',v_recipient->'recipient','from',v_draft->'from',
      'subject',v_draft->>'subject','submitted',v_context,'inquiry_id',v_lead,'session_id',v_session,
      'is_test',v_draft->'is_test','qa_initial_authorized',v_draft->'qa_initial_authorized',
      'text',(v_draft->>'text_prefix')||v_context_text||E'\n'||v_assignment_text||E'\nLead Center: https://www.askmagicmike.com/admin/leads/'||v_lead::text||E'\nNot a survey.',
      'html',(v_draft->>'html_prefix')||'<p>'||v_context_text||'</p><p>'||v_assignment_text||'</p><p><a style="display:inline-flex;min-height:44px;align-items:center;box-sizing:border-box;padding:12px 18px;background:#cda24a;color:#090909;text-decoration:none;font-weight:700;border-radius:8px" href="https://www.askmagicmike.com/admin/leads/'||v_lead::text||'">Open this saved inquiry</a></p><p style="font-size:12px;color:#d9ceb8">Not a survey.</p></div>');
    IF v_recipient->>'operator'='mike' THEN
      UPDATE public.lead_notifications SET private_intake_snapshot=v_snapshot,recipient_reference='operator:mike',
        idempotency_key='lead_alert:'||v_lead::text||':'||v_template||':mike',status=v_status,provider='resend',
        error_code=v_error,error_summary=CASE WHEN v_error IS NULL THEN NULL ELSE 'Launch envelope is held; inspect server configuration/policy.' END,
        failed_at=CASE WHEN v_error IS NULL THEN NULL ELSE now() END,
        metadata=metadata||jsonb_build_object('launch_intake',true,'operator','mike')
      WHERE id=(v_result->>'notification_id')::uuid AND lead_id=v_lead AND attempt_count=0 AND provider_message_id IS NULL
        AND private_intake_snapshot IS NULL AND template_version=v_template RETURNING id INTO v_notification;
      IF v_notification IS NULL THEN RAISE EXCEPTION 'required_primary_launch_intent_failed' USING ERRCODE='23514'; END IF;
    ELSE
      INSERT INTO public.lead_notifications(lead_id,agent_id,assignment_audit_id,notification_type,channel,recipient_type,
        recipient_reference,template_version,idempotency_key,status,max_attempts,provider,error_code,error_summary,failed_at,metadata,private_intake_snapshot)
      VALUES(v_lead,NULL,nullif(v_result->>'assignment_audit_id','')::uuid,'lead_alert','email','internal','operator:brandon',v_template,
        'lead_alert:'||v_lead::text||':'||v_template||':brandon',v_status,3,'resend',v_error,
        CASE WHEN v_error IS NULL THEN NULL ELSE 'Launch envelope is held; inspect server configuration/policy.' END,
        CASE WHEN v_error IS NULL THEN NULL ELSE now() END,
        jsonb_build_object('capture_transaction','capture_public_lead_v4','launch_intake',true,'operator','brandon','is_test',(v_draft->>'is_test')::boolean),v_snapshot)
      RETURNING id INTO v_second;
    END IF;
  END LOOP;
  IF v_second IS NULL THEN RAISE EXCEPTION 'required_second_launch_intent_failed' USING ERRCODE='23514'; END IF;
  RETURN v_result || jsonb_build_object('capture_version','v4','notification_id',v_notification,'notification_ids',jsonb_build_array(v_notification,v_second),'alert_template_version',v_template);
END;
$$;

CREATE FUNCTION public.acquire_launch_alert_batch_v1(p_cutoff timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp SET statement_timeout='5s' AS $$
DECLARE v_anchor record; v_token uuid;
BEGIN
  IF p_cutoff IS NULL OR NOT pg_try_advisory_xact_lock(hashtextextended('amm:launch-alert-batch:'||p_cutoff::text,0)) THEN RETURN NULL; END IF;
  SELECT id,launch_batch_lease_until INTO v_anchor FROM public.lead_notifications
    WHERE template_version='lead_alert_email_v6' AND created_at>=p_cutoff
      AND private_intake_snapshot->>'launch_cutoff'=to_char(p_cutoff AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ORDER BY created_at,id LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR v_anchor.launch_batch_lease_until>now() THEN RETURN NULL; END IF;
  v_token := gen_random_uuid();
  UPDATE public.lead_notifications SET launch_batch_lease_token=v_token,launch_batch_lease_until=now()+interval '30 seconds' WHERE id=v_anchor.id;
  RETURN v_token;
END;
$$;

CREATE FUNCTION public.claim_launch_lead_alert_v1(p_id uuid,p_cutoff timestamptz,p_initial_send boolean DEFAULT false,p_batch_lease uuid DEFAULT NULL)
RETURNS SETOF public.lead_notifications LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp SET statement_timeout='5s' AS $$
BEGIN
  IF p_cutoff IS NULL THEN RETURN; END IF;
  IF NOT p_initial_send AND NOT EXISTS(SELECT 1 FROM public.lead_notifications
    WHERE launch_batch_lease_token=p_batch_lease AND launch_batch_lease_until>now()
      AND template_version='lead_alert_email_v6' AND private_intake_snapshot->>'launch_cutoff'=to_char(p_cutoff AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) THEN RETURN; END IF;
  PERFORM set_config('amm.launch_alert_claim','v6',true);
  RETURN QUERY UPDATE public.lead_notifications n SET status='processing',attempt_count=n.attempt_count+1,
    first_provider_attempt_at=coalesce(n.first_provider_attempt_at,now()),error_code=NULL,error_summary=NULL,next_attempt_at=NULL,provider='resend'
  FROM public.leads l WHERE n.id=p_id AND l.id=n.lead_id AND n.created_at>=p_cutoff AND l.created_at>=p_cutoff
    AND n.template_version='lead_alert_email_v6' AND n.notification_type='lead_alert' AND n.channel='email' AND n.recipient_type='internal'
    AND n.private_intake_snapshot->>'launch_cutoff'=to_char(p_cutoff AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    AND n.idempotency_key='lead_alert:'||n.lead_id::text||':lead_alert_email_v6:'||(n.private_intake_snapshot->>'operator')
    AND n.private_intake_snapshot->>'recipient' IS NOT NULL AND n.private_intake_snapshot->>'from' IS NOT NULL
    AND n.status IN ('pending','failed','retry_scheduled') AND n.attempt_count<least(n.max_attempts,3)
    AND (NOT p_initial_send OR (n.status='pending' AND n.attempt_count=0))
    AND n.provider_message_id IS NULL AND n.provider_accepted_at IS NULL
    AND (n.first_provider_attempt_at IS NULL OR now()<n.first_provider_attempt_at+interval '23 hours 59 minutes')
    AND ((n.status='pending' AND n.attempt_count=0) OR (n.status IN ('failed','retry_scheduled')
      AND n.error_code IN ('resend_http_429','resend_http_425') AND n.next_attempt_at<=now()))
    AND ((NOT l.is_test AND NOT l.communication_suppressed AND NOT coalesce((n.private_intake_snapshot->>'is_test')::boolean,true))
      OR (p_initial_send AND l.is_test AND n.status='pending' AND n.attempt_count=0 AND (n.private_intake_snapshot->>'qa_initial_authorized')::boolean))
  RETURNING n.*;
END;
$$;

CREATE INDEX launch_alert_due_v6_idx ON public.lead_notifications(created_at,id,next_attempt_at)
WHERE template_version='lead_alert_email_v6' AND notification_type='lead_alert';
REVOKE ALL ON FUNCTION public.amm_validate_buyer_interest_v1(jsonb),public.amm_guard_launch_alert_v1(),
  public.capture_public_lead_v4(jsonb,jsonb,jsonb,text,jsonb),public.acquire_launch_alert_batch_v1(timestamptz),public.claim_launch_lead_alert_v1(uuid,timestamptz,boolean,uuid) FROM PUBLIC;
DO $roles$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON public.lead_notifications FROM %I',r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.amm_validate_buyer_interest_v1(jsonb), public.amm_guard_launch_alert_v1(), public.capture_public_lead_v4(jsonb,jsonb,jsonb,text,jsonb), public.acquire_launch_alert_batch_v1(timestamptz), public.claim_launch_lead_alert_v1(uuid,timestamptz,boolean,uuid) FROM %I',r);
    END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    GRANT EXECUTE ON FUNCTION public.amm_validate_buyer_interest_v1(jsonb),public.amm_guard_launch_alert_v1(),
      public.capture_public_lead_v4(jsonb,jsonb,jsonb,text,jsonb),public.acquire_launch_alert_batch_v1(timestamptz),public.claim_launch_lead_alert_v1(uuid,timestamptz,boolean,uuid) TO service_role;
  END IF;
END;
$roles$;
COMMIT;
-- Rollback: compatible v6-reader app, generation switched to v4 and launch
-- processor disabled. Retain functions, snapshots and data. Never drain/re-key
-- stored v6 with #297/#298's generic worker or undo accepted external mail.
