-- Depends on 20261018180000: answers, current viewer and current source validity.
-- Additive only. No transport, model, task, lead, schedule or notification effects.
BEGIN;
CREATE TABLE public.intelligence_answer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES public.intelligence_answers(id) ON DELETE CASCADE,
  answer_revision integer NOT NULL CHECK(answer_revision>0),
  owner_scope text NOT NULL,
  consumer_user_id text REFERENCES public.consumer_users(id) ON DELETE CASCADE,
  consumer_session_id text,
  request_id uuid NOT NULL,
  payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
  kind text NOT NULL CHECK(kind IN ('helpful','not_helpful','report')),
  category text CHECK(category IN ('incorrect_claim','stale_information','unsupported_citation','unsafe_private_content','handoff_issue','other')),
  comment text NOT NULL DEFAULT '' CHECK(length(comment)<=2000),
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
  revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
  regression_draft_id uuid REFERENCES public.ai_intelligence_jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
  UNIQUE(owner_scope,request_id),
  CHECK((kind='report' AND category IS NOT NULL) OR (kind<>'report' AND category IS NULL AND comment=''))
);
CREATE INDEX intelligence_feedback_owner_answer_idx ON public.intelligence_answer_feedback(owner_scope,answer_id,answer_revision);
CREATE INDEX intelligence_feedback_consumer_idx ON public.intelligence_answer_feedback(consumer_user_id) WHERE consumer_user_id IS NOT NULL;
CREATE INDEX intelligence_feedback_expiry_idx ON public.intelligence_answer_feedback(expires_at);
CREATE INDEX intelligence_feedback_queue_idx ON public.intelligence_answer_feedback(created_at DESC,id) WHERE kind='report';

-- Minimal disposition history has no comment, answer, scope, source text or customer ID.
CREATE TABLE public.intelligence_feedback_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid REFERENCES public.intelligence_answer_feedback(id) ON DELETE SET NULL,
  actor_id text NOT NULL, request_id uuid NOT NULL, payload_hash text,
  action text NOT NULL CHECK(action IN ('classify','resolve','reopen','regression_draft')),
  category text, revision integer NOT NULL, status text NOT NULL,
  regression_draft_id uuid REFERENCES public.ai_intelligence_jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(actor_id,request_id)
);
CREATE INDEX intelligence_feedback_audit_feedback_idx ON public.intelligence_feedback_audit(feedback_id);

CREATE FUNCTION public.r2_feedback_receipt_v1(f public.intelligence_answer_feedback)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('id',f.id,'kind',f.kind,'category',f.category,'status',f.status,
   'revision',f.revision,'createdAt',f.created_at,'expiresAt',f.expires_at)
$$;

-- Call from existing authorized maintenance; reads never run retention mutations.
-- Mutations also purge expired detail. All read paths immediately hide expired rows.
CREATE FUNCTION public.expire_r2_feedback_v1()
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE removed integer;
BEGIN
 DELETE FROM public.intelligence_answer_feedback WHERE id IN (
   SELECT id FROM public.intelligence_answer_feedback WHERE expires_at<=clock_timestamp()
   ORDER BY expires_at,id LIMIT 100 FOR UPDATE SKIP LOCKED
 );
 GET DIAGNOSTICS removed=ROW_COUNT;
 RETURN removed;
END $$;

CREATE FUNCTION public.scrub_r2_feedback_audit_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE public.intelligence_feedback_audit SET feedback_id=NULL,payload_hash=NULL WHERE feedback_id=OLD.id;
 RETURN OLD;
END $$;
CREATE TRIGGER intelligence_feedback_delete_scrub BEFORE DELETE ON public.intelligence_answer_feedback
 FOR EACH ROW EXECUTE FUNCTION public.scrub_r2_feedback_audit_v1();

CREATE FUNCTION public.submit_r2_feedback_v1(p_answer uuid,p_revision integer,p_scope text,p_user text,p_session text,
 p_request uuid,p_hash text,p_kind text,p_category text,p_comment text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE a public.intelligence_answers%ROWTYPE; f public.intelligence_answer_feedback%ROWTYPE;
BEGIN
 -- Match the current account/session (or guest grant), including revocation races.
 IF p_user IS NULL THEN
   PERFORM 1 FROM public.r2_guest_sessions WHERE owner_scope=p_scope AND revoked_at IS NULL AND expires_at>now() FOR SHARE;
   IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','answer_not_found'); END IF;
 ELSE
   PERFORM 1 FROM public.consumer_users WHERE id=p_user AND NOT disabled AND audience='consumer' FOR SHARE;
   IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','answer_not_found'); END IF;
   PERFORM 1 FROM public.consumer_sessions WHERE id=p_session AND "userId"=p_user AND "expiresAt">now() FOR SHARE;
   IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','answer_not_found'); END IF;
 END IF;
 IF NOT coalesce(public.r2_viewer_valid_v1(p_scope,p_user,p_session),false) THEN
   RETURN jsonb_build_object('ok',false,'error','answer_not_found'); END IF;
 -- Lock the answer so revision/deletion cannot race the feedback write.
 SELECT * INTO a FROM public.intelligence_answers WHERE id=p_answer AND revision=p_revision
   AND owner_scope=p_scope AND consumer_user_id IS NOT DISTINCT FROM p_user AND expires_at>now() FOR SHARE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','answer_not_found'); END IF;
 IF p_request IS NULL OR p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$'
   OR coalesce(p_kind,'') NOT IN ('helpful','not_helpful','report') OR p_comment IS NULL OR length(p_comment)>2000
   OR (p_kind='report' AND coalesce(p_category,'') NOT IN ('incorrect_claim','stale_information','unsupported_citation','unsafe_private_content','handoff_issue','other'))
   OR (p_kind<>'report' AND (p_category IS NOT NULL OR p_comment<>'')) THEN
   RETURN jsonb_build_object('ok',false,'error','invalid_request'); END IF;
 PERFORM pg_advisory_xact_lock(hashtext('r2:feedback:'||p_scope));
 SELECT * INTO f FROM public.intelligence_answer_feedback WHERE owner_scope=p_scope AND request_id=p_request;
 IF FOUND THEN
   IF f.answer_id<>p_answer OR f.answer_revision<>p_revision OR f.payload_hash<>p_hash OR f.expires_at<=now() THEN
     RETURN jsonb_build_object('ok',false,'error','feedback_replay_conflict'); END IF;
   RETURN jsonb_build_object('ok',true,'replayed',true,'feedback',public.r2_feedback_receipt_v1(f));
 END IF;
 IF (SELECT count(*) FROM public.intelligence_answer_feedback WHERE owner_scope=p_scope AND created_at>now()-interval '1 hour')>=20 THEN
   RETURN jsonb_build_object('ok',false,'error','feedback_rate_limited'); END IF;
 PERFORM public.expire_r2_feedback_v1();
 INSERT INTO public.intelligence_answer_feedback(answer_id,answer_revision,owner_scope,consumer_user_id,consumer_session_id,
   request_id,payload_hash,kind,category,comment,expires_at)
 VALUES(p_answer,p_revision,p_scope,p_user,p_session,p_request,p_hash,p_kind,p_category,p_comment,
   least(now()+interval '30 days',a.expires_at)) RETURNING * INTO f;
 RETURN jsonb_build_object('ok',true,'replayed',false,'feedback',public.r2_feedback_receipt_v1(f));
END $$;

CREATE FUNCTION public.read_r2_feedback_v1(p_answer uuid,p_revision integer,p_scope text,p_user text,p_session text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT CASE WHEN coalesce(public.r2_viewer_valid_v1(p_scope,p_user,p_session),false) AND EXISTS(
   SELECT 1 FROM public.intelligence_answers WHERE id=p_answer AND revision=p_revision AND owner_scope=p_scope
    AND consumer_user_id IS NOT DISTINCT FROM p_user AND expires_at>now())
 THEN (SELECT coalesce(jsonb_agg(public.r2_feedback_receipt_v1(f) ORDER BY f.created_at),'[]'::jsonb)
   FROM public.intelligence_answer_feedback f WHERE f.answer_id=p_answer AND f.answer_revision=p_revision
     AND f.owner_scope=p_scope AND f.consumer_user_id IS NOT DISTINCT FROM p_user AND f.expires_at>now()) ELSE NULL END
$$;

CREATE FUNCTION public.list_r2_feedback_v1(p_actor text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM public.lead_center_users WHERE id=p_actor AND role='administrator' AND banned=false)
 THEN (SELECT coalesce(jsonb_agg(item ORDER BY created_at DESC,id),'[]'::jsonb) FROM (
   SELECT f.id,f.created_at,public.r2_feedback_receipt_v1(f)||jsonb_build_object('answerRevision',f.answer_revision,
     'comment',f.comment,'sourceValid',coalesce(public.r2_sources_valid_v1(a.source_refs,'public'),false),
     'regressionDraftId',f.regression_draft_id,
     'regressionDraft',(SELECT left(j.r2_result->>'text',2000) FROM public.ai_intelligence_jobs j
       WHERE j.id=f.regression_draft_id AND j.feature='bounded_intelligence_v1'
         AND j.metadata->>'regressionCaseDraft'='true' AND j.metadata->>'synthetic'='true')) AS item
   FROM public.intelligence_answer_feedback f JOIN public.intelligence_answers a ON a.id=f.answer_id
   WHERE f.kind='report' AND f.expires_at>now() AND a.expires_at>now()
   ORDER BY f.created_at DESC,f.id LIMIT 50) bounded) ELSE NULL END
$$;

CREATE FUNCTION public.review_r2_feedback_v1(p_id uuid,p_revision integer,p_request uuid,p_hash text,p_actor text,
 p_action text,p_category text,p_contract jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE f public.intelligence_answer_feedback%ROWTYPE; prior public.intelligence_feedback_audit%ROWTYPE;
 v_job uuid; v_key text; v_draft jsonb;
BEGIN
 -- Current SQL role, not the browser, cached principal or a copied report ID.
 PERFORM 1 FROM public.lead_center_users WHERE id=p_actor AND role='administrator' AND banned=false FOR SHARE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
 IF p_request IS NULL OR p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_revision IS NULL OR p_revision<1
   OR coalesce(p_action,'') NOT IN ('classify','resolve','reopen','regression_draft')
   OR (p_action='classify' AND coalesce(p_category,'') NOT IN ('incorrect_claim','stale_information','unsupported_citation','unsafe_private_content','handoff_issue','other'))
   OR (p_action<>'classify' AND p_category IS NOT NULL) THEN
   RETURN jsonb_build_object('ok',false,'error','invalid_request'); END IF;
 PERFORM pg_advisory_xact_lock(hashtext('r2:feedback:review:'||p_actor));
 SELECT * INTO f FROM public.intelligence_answer_feedback WHERE id=p_id AND kind='report' AND expires_at>now() FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','feedback_not_found'); END IF;
 SELECT * INTO prior FROM public.intelligence_feedback_audit WHERE actor_id=p_actor AND request_id=p_request;
 IF FOUND THEN
   IF prior.feedback_id IS DISTINCT FROM p_id OR prior.payload_hash IS DISTINCT FROM p_hash THEN
     RETURN jsonb_build_object('ok',false,'error','feedback_replay_conflict'); END IF;
   RETURN jsonb_build_object('ok',true,'replayed',true,'feedback',public.r2_feedback_receipt_v1(f)||
     jsonb_build_object('revision',prior.revision,'category',prior.category,'status',prior.status),'regressionDraftId',prior.regression_draft_id);
 END IF;
 IF f.revision<>p_revision THEN RETURN jsonb_build_object('ok',false,'error','stale_feedback_revision'); END IF;
 IF (SELECT count(*) FROM public.intelligence_feedback_audit WHERE actor_id=p_actor AND created_at>now()-interval '1 hour')>=120 THEN
   RETURN jsonb_build_object('ok',false,'error','feedback_rate_limited'); END IF;
 IF (p_action='resolve' AND f.status<>'open') OR (p_action='reopen' AND f.status<>'resolved') THEN
   RETURN jsonb_build_object('ok',false,'error','invalid_feedback_transition'); END IF;
 v_job:=f.regression_draft_id;
 IF p_action='regression_draft' THEN
   IF v_job IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error','regression_draft_exists'); END IF;
   -- Construct, do not trust, the only job input. Raw comments/replies never enter a prompt.
   IF p_contract->>'actor' IS DISTINCT FROM p_actor OR p_contract->>'role' IS DISTINCT FROM 'quality_operations'
     OR p_contract->>'entityId' IS DISTINCT FROM 'synthetic-feedback-regression' THEN
     RETURN jsonb_build_object('ok',false,'error','invalid_worker_contract'); END IF;
   p_contract:=p_contract||jsonb_build_object('input',jsonb_build_object('question','SYNTHETIC regression-case draft; human review required. No customer text.',
      'offer','buyer','source',p_contract->'input'->'source','checkpoint',NULL));
   v_key:='r2:'||encode(sha256(convert_to('feedback-regression:'||f.id::text,'UTF8')),'hex');
   v_draft:=public.enqueue_r2_worker_v1(v_key,NULL,p_actor,p_contract);
   IF NOT coalesce((v_draft->>'ok')::boolean,false) THEN RETURN v_draft; END IF;
   v_job:=(v_draft->>'id')::uuid;
   -- A deterministic REVIEWABLE case draft, not a worker/model execution or deployment.
   UPDATE public.ai_intelligence_jobs SET status='completed',completed_at=now(),updated_at=now(),
     metadata=metadata||jsonb_build_object('regressionCaseDraft',true,'synthetic',true,'humanReviewRequired',true),
     r2_result=jsonb_build_object('version','amm.r2.workers.v1','role','quality_operations','state','review_required',
       'text','SYNTHETIC case: '||f.category||'. Arrange synthetic sources and a synthetic viewer. Assert current source eligibility, scoped answer access and no outbound effects. Human must review and complete this draft before use.',
       'evidence','[]'::jsonb,'missing','["Human-authored synthetic fixtures and expected assertions"]'::jsonb,
       'steps',1,'sourceCheckpoint',NULL,'effects','draft_only_no_send') WHERE id=v_job;
 END IF;
 UPDATE public.intelligence_answer_feedback SET revision=revision+1,
   category=CASE WHEN p_action='classify' THEN p_category ELSE category END,
   status=CASE WHEN p_action='resolve' THEN 'resolved' WHEN p_action='reopen' THEN 'open' ELSE status END,
   regression_draft_id=v_job WHERE id=p_id RETURNING * INTO f;
 INSERT INTO public.intelligence_feedback_audit(feedback_id,actor_id,request_id,payload_hash,action,category,revision,status,regression_draft_id)
   VALUES(f.id,p_actor,p_request,p_hash,p_action,f.category,f.revision,f.status,v_job);
 RETURN jsonb_build_object('ok',true,'replayed',false,'feedback',public.r2_feedback_receipt_v1(f),'regressionDraftId',v_job,
   'regressionDraft',(SELECT left(j.r2_result->>'text',2000) FROM public.ai_intelligence_jobs j WHERE j.id=v_job
     AND j.feature='bounded_intelligence_v1' AND j.metadata->>'regressionCaseDraft'='true' AND j.metadata->>'synthetic'='true'));
END $$;

ALTER TABLE public.intelligence_answer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_feedback_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY intelligence_feedback_server ON public.intelligence_answer_feedback TO service_role USING(true) WITH CHECK(true);
CREATE POLICY intelligence_feedback_audit_server ON public.intelligence_feedback_audit TO service_role USING(true) WITH CHECK(true);
REVOKE ALL ON public.intelligence_answer_feedback,public.intelligence_feedback_audit FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.intelligence_answer_feedback TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.intelligence_feedback_audit TO service_role;
DO $$ DECLARE signature text; browser_role text;
BEGIN
 FOR browser_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
   EXECUTE format('REVOKE ALL ON public.intelligence_answer_feedback,public.intelligence_feedback_audit FROM %I',browser_role);
 END LOOP;
 FOREACH signature IN ARRAY ARRAY[
   'public.r2_feedback_receipt_v1(public.intelligence_answer_feedback)',
   'public.expire_r2_feedback_v1()','public.scrub_r2_feedback_audit_v1()',
   'public.submit_r2_feedback_v1(uuid,integer,text,text,text,uuid,text,text,text,text)',
   'public.read_r2_feedback_v1(uuid,integer,text,text,text)',
   'public.list_r2_feedback_v1(text)',
   'public.review_r2_feedback_v1(uuid,integer,uuid,text,text,text,text,jsonb)'] LOOP
   EXECUTE 'REVOKE ALL ON FUNCTION '||signature||' FROM PUBLIC';
   FOR browser_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
     EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I',signature,browser_role);
   END LOOP;
   EXECUTE 'GRANT EXECUTE ON FUNCTION '||signature||' TO service_role';
 END LOOP;
END $$;
COMMIT;
