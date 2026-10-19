-- Minimal retained source versions and scoped answer receipts. Existing jobs,
-- audit log, auth and review services remain the execution/authority spine.
BEGIN;
CREATE TABLE public.intelligence_sources (
  id text PRIMARY KEY, revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
  scope jsonb NOT NULL, active_version uuid, revoked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.intelligence_source_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id text NOT NULL REFERENCES public.intelligence_sources(id),
  ordinal integer NOT NULL, snapshot jsonb NOT NULL, content_hash text NOT NULL,
  identity_hash text NOT NULL, validation text NOT NULL DEFAULT 'pending' CHECK(validation IN ('pending','validated','quarantined')),
  reason text NOT NULL DEFAULT '', revoked boolean NOT NULL DEFAULT false,
  created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_id,ordinal), UNIQUE(source_id,identity_hash)
);
ALTER TABLE public.intelligence_sources ADD CONSTRAINT intelligence_active_version_fk
 FOREIGN KEY(active_version) REFERENCES public.intelligence_source_versions(id);
CREATE TABLE public.r2_guest_sessions (
 owner_scope text PRIMARY KEY, expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days', revoked_at timestamptz
);
CREATE TABLE public.intelligence_answers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), revision integer NOT NULL DEFAULT 1,
 owner_scope text NOT NULL, consumer_user_id text REFERENCES public.consumer_users(id) ON DELETE CASCADE,
 consumer_session_id text, source_refs jsonb NOT NULL, reply jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days'
);
CREATE INDEX intelligence_answers_subject_idx ON public.intelligence_answers(owner_scope,created_at DESC);
CREATE UNIQUE INDEX r2_source_action_replay_idx ON public.audit_logs((metadata->>'request_id'))
 WHERE action='intelligence.source_transition';

-- Content/identity are immutable even for privileged application writes. A
-- version tombstone cannot be undone by validation, rollback or a late worker.
CREATE FUNCTION public.r2_source_version_immutable_v1() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'source_version_history_is_immutable'; END IF;
 IF (to_jsonb(NEW)-ARRAY['validation','reason','revoked']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['validation','reason','revoked'])
    OR (OLD.revoked AND NEW.revoked IS DISTINCT FROM true) THEN
   RAISE EXCEPTION 'source_version_content_identity_or_tombstone_is_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER r2_source_version_immutable BEFORE UPDATE OR DELETE ON intelligence_source_versions
 FOR EACH ROW EXECUTE FUNCTION public.r2_source_version_immutable_v1();
CREATE FUNCTION public.r2_source_identity_immutable_v1() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'source_registry_history_is_immutable'; END IF;
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.scope IS DISTINCT FROM OLD.scope OR NEW.revision<OLD.revision THEN
   RAISE EXCEPTION 'source_registry_identity_or_grant_is_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER r2_source_identity_immutable BEFORE UPDATE OR DELETE ON intelligence_sources
 FOR EACH ROW EXECUTE FUNCTION public.r2_source_identity_immutable_v1();

CREATE FUNCTION public.r2_source_scope_valid_v1(p_source jsonb,p_scope jsonb) RETURNS boolean
 LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE k text;
BEGIN
 IF jsonb_typeof(p_source) IS DISTINCT FROM 'object' OR jsonb_typeof(p_scope) IS DISTINCT FROM 'object'
   OR jsonb_typeof(p_source->'permissions') IS DISTINCT FROM 'object'
   OR jsonb_typeof(p_scope->'permissions') IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 FOREACH k IN ARRAY ARRAY['id','url','owner','provider','licenseScope','grantReference','audience'] LOOP
   IF jsonb_typeof(p_source->k) IS DISTINCT FROM 'string' OR length(coalesce(p_source->>k,''))=0
     OR p_source->k IS DISTINCT FROM p_scope->k THEN RETURN false; END IF;
 END LOOP;
 IF (SELECT count(*) FROM jsonb_object_keys(p_source->'permissions'))<>5 THEN RETURN false; END IF;
 FOREACH k IN ARRAY ARRAY['display','ai','marketing','embedding','training'] LOOP
   IF jsonb_typeof(p_source->'permissions'->k) IS DISTINCT FROM 'boolean'
     OR jsonb_typeof(p_scope->'permissions'->k) IS DISTINCT FROM 'boolean'
     OR (p_source->'permissions'->k='true'::jsonb AND p_scope->'permissions'->k IS DISTINCT FROM 'true'::jsonb)
     THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $$;
CREATE FUNCTION public.r2_source_snapshot_eligible_v1(p_snapshot jsonb,p_scope jsonb,p_audience text) RETURNS boolean
 LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE s jsonb:=p_snapshot->'source'; fetched timestamptz; effective timestamptz; hours integer;
BEGIN
 IF NOT public.r2_source_scope_valid_v1(s,p_scope) OR p_audience IS NULL OR p_audience=''
   OR s->>'audience' IS DISTINCT FROM p_audience OR s->>'status' IS DISTINCT FROM 'active'
   OR s->'permissions'->>'display' IS DISTINCT FROM 'true' OR s->'permissions'->>'ai' IS DISTINCT FROM 'true'
   OR jsonb_typeof(s->'fetchedAt') IS DISTINCT FROM 'string' OR jsonb_typeof(s->'effectiveAt') IS DISTINCT FROM 'string'
   OR coalesce(s->>'freshnessHours','') !~ '^[1-9][0-9]{0,2}$'
   OR coalesce(p_scope->>'freshnessHours','') !~ '^[1-9][0-9]{0,2}$' THEN RETURN false; END IF;
 IF p_snapshot?'observation' AND (p_snapshot->'observation'->>'matchedPinnedContent' IS DISTINCT FROM 'true'
   OR coalesce(p_snapshot->'observation'->>'rawContentHash','') !~ '^[a-f0-9]{64}$'
   OR coalesce(p_snapshot->'observation'->>'contentHash','') !~ '^[a-f0-9]{64}$') THEN RETURN false; END IF;
 fetched:=(s->>'fetchedAt')::timestamptz; effective:=(s->>'effectiveAt')::timestamptz; hours:=(s->>'freshnessHours')::integer;
 IF NOT isfinite(fetched) OR NOT isfinite(effective) OR hours>least(720,(p_scope->>'freshnessHours')::integer)
   OR effective>clock_timestamp() OR fetched>clock_timestamp()
   OR fetched+make_interval(hours=>hours)<=clock_timestamp() THEN RETURN false; END IF;
 IF s->'upstreamModifiedAt' IS NOT NULL AND s->'upstreamModifiedAt'<>'null'::jsonb
   AND (s->>'upstreamModifiedAt')::timestamptz>fetched THEN RETURN false; END IF;
 RETURN true;
EXCEPTION WHEN data_exception THEN RETURN false;
END $$;

CREATE FUNCTION public.r2_viewer_valid_v1(p_scope text,p_user text,p_session text) RETURNS boolean
 LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT coalesce(CASE WHEN p_user IS NOT NULL THEN p_scope='consumer:'||p_user AND EXISTS(
   SELECT 1 FROM consumer_users u JOIN consumer_sessions s ON s."userId"=u.id
   WHERE u.id=p_user AND s.id=p_session AND s."expiresAt">clock_timestamp() AND NOT u.disabled AND u.audience='consumer')
 ELSE p_session IS NULL AND EXISTS(SELECT 1 FROM r2_guest_sessions WHERE owner_scope=p_scope AND revoked_at IS NULL AND expires_at>clock_timestamp()) END,false)
$$;
CREATE FUNCTION public.r2_sources_valid_v1(p_refs jsonb,p_audience text) RETURNS boolean
 LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE r jsonb; s intelligence_sources%ROWTYPE; v intelligence_source_versions%ROWTYPE;
BEGIN
 IF jsonb_typeof(p_refs) IS DISTINCT FROM 'array' OR p_audience IS NULL OR p_audience='' THEN RETURN false; END IF;
 IF jsonb_array_length(p_refs) NOT BETWEEN 1 AND 3 THEN RETURN false; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_refs) LOOP
   IF jsonb_typeof(r) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
   SELECT * INTO s FROM intelligence_sources WHERE id=r->>'sourceId';
   IF NOT FOUND OR s.revoked OR s.revision::text IS DISTINCT FROM r->>'revision' THEN RETURN false; END IF;
   SELECT * INTO v FROM intelligence_source_versions WHERE id=s.active_version AND source_id=s.id;
   IF NOT FOUND OR v.revoked OR v.validation<>'validated' OR v.id::text IS DISTINCT FROM r->>'versionId'
     OR NOT public.r2_source_snapshot_eligible_v1(v.snapshot,s.scope,p_audience) THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END;
$$;

CREATE FUNCTION public.r2_source_transition_v1(p_actor text,p_request uuid,p_id text,p_expected integer,p_action text,p_input jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE s intelligence_sources%ROWTYPE; v intelligence_source_versions%ROWTYPE;
 old audit_logs%ROWTYPE; result jsonb; version_id uuid; payload_hash text; unchanged boolean:=false; validation_state text;
BEGIN
 PERFORM 1 FROM lead_center_users WHERE id=p_actor AND role='administrator' AND banned=false FOR SHARE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
 IF p_request IS NULL OR p_id IS NULL OR p_expected IS NULL OR p_expected<0
   OR jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR p_action IS NULL THEN
   RETURN jsonb_build_object('ok',false,'error','invalid_source_action'); END IF;
 payload_hash:=encode(sha256(convert_to(jsonb_build_array(p_id,p_expected,p_action,p_input)::text,'UTF8')),'hex');
 PERFORM pg_advisory_xact_lock(hashtext('r2-source-request:'||p_request::text));
 PERFORM pg_advisory_xact_lock(hashtext('r2-source:'||p_id));
 SELECT * INTO old FROM audit_logs WHERE action='intelligence.source_transition' AND metadata->>'request_id'=p_request::text;
 IF FOUND THEN
  IF old.actor IS DISTINCT FROM 'lead_center:'||p_actor OR old.metadata->>'payload_hash' IS DISTINCT FROM payload_hash THEN RETURN jsonb_build_object('ok',false,'error','replay_conflict'); END IF;
  RETURN old.metadata->'result'||jsonb_build_object('replayed',true);
 END IF;
 IF (SELECT count(*) FROM audit_logs WHERE actor='lead_center:'||p_actor AND action='intelligence.source_transition' AND created_at>clock_timestamp()-interval '1 minute')>=30 THEN
 RETURN jsonb_build_object('ok',false,'error','rate_limited'); END IF;
 SELECT * INTO s FROM intelligence_sources WHERE id=p_id FOR UPDATE;
 IF p_action='register' THEN
  IF FOUND OR p_expected IS DISTINCT FROM 0 OR p_id IS DISTINCT FROM 'ourtown-experience'
   OR p_input->'scope'->>'id' IS DISTINCT FROM p_id
   OR p_input->'scope'->>'url' IS DISTINCT FROM 'https://www.askmagicmike.com/api/experience/v1'
   OR p_input->'scope'->>'audience' IS DISTINCT FROM 'public'
   OR length(coalesce(p_input->'scope'->>'grantReference',''))=0
   OR NOT public.r2_source_scope_valid_v1(p_input->'scope',p_input->'scope')
   OR p_input->'scope'->'permissions' IS DISTINCT FROM '{"display":true,"ai":true,"marketing":false,"embedding":false,"training":false}'::jsonb THEN
   RETURN jsonb_build_object('ok',false,'error','scope_or_revision_conflict'); END IF;
  INSERT INTO intelligence_sources(id,scope) VALUES(p_id,p_input->'scope') RETURNING * INTO s;
 ELSE
  IF NOT FOUND OR s.revision<>p_expected THEN RETURN jsonb_build_object('ok',false,'error','source_revision_changed'); END IF;
  IF p_action='candidate' THEN
   IF s.revoked THEN RETURN jsonb_build_object('ok',false,'error','source_revoked'); END IF;
   -- Scope/rights may only narrow the registered grant, never expand it.
   IF NOT public.r2_source_scope_valid_v1(p_input->'snapshot'->'source',s.scope)
    OR p_input->'snapshot'->'source'->>'id' IS DISTINCT FROM s.id
    OR coalesce(p_input->>'contentHash','') !~ '^[a-f0-9]{64}$'
    OR coalesce(p_input->>'identityHash','') !~ '^[a-f0-9]{64}$'
    OR jsonb_typeof(p_input->'snapshot'->'passages') IS DISTINCT FROM 'array'
    THEN RETURN jsonb_build_object('ok',false,'error','scope_expansion_denied'); END IF;
   -- Fetch time alone must not replace a still-eligible active version. Rights,
   -- freshness limits and every other source field still require assessment.
   SELECT * INTO v FROM intelligence_source_versions WHERE id=s.active_version AND source_id=p_id;
   IF p_input->>'refresh'='true' AND FOUND AND NOT v.revoked AND v.validation='validated'
     AND public.r2_source_snapshot_eligible_v1(v.snapshot,s.scope,'public')
     AND public.r2_source_snapshot_eligible_v1(p_input->'snapshot',s.scope,'public')
     AND ((v.snapshot-'observation')#-'{source,fetchedAt}') IS NOT DISTINCT FROM
       (((p_input->'snapshot')-'observation')#-'{source,fetchedAt}') THEN
     unchanged:=true; version_id:=v.id; validation_state:=v.validation;
   ELSE
    SELECT * INTO v FROM intelligence_source_versions WHERE source_id=p_id AND identity_hash=p_input->>'identityHash';
    IF FOUND THEN
     IF v.revoked THEN RETURN jsonb_build_object('ok',false,'error','source_not_eligible'); END IF;
     unchanged:=true; version_id:=v.id; validation_state:=v.validation;
    ELSE
     validation_state:=CASE WHEN p_input->'snapshot'->'observation'->>'matchedPinnedContent'='false' THEN 'quarantined' ELSE 'pending' END;
     INSERT INTO intelligence_source_versions(source_id,ordinal,snapshot,content_hash,identity_hash,created_by,validation,reason)
    VALUES(p_id,(SELECT coalesce(max(ordinal),0)+1 FROM intelligence_source_versions WHERE source_id=p_id),
      p_input->'snapshot',p_input->>'contentHash',p_input->>'identityHash',p_actor,validation_state,
      CASE WHEN validation_state='quarantined' THEN left(coalesce(p_input->'snapshot'->'observation'->>'reason','Fetched content requires review'),500) ELSE '' END) RETURNING id INTO version_id;
    END IF;
   END IF;
  ELSIF p_action IN ('validate','promote','revoke_version','recover') THEN
   SELECT * INTO v FROM intelligence_source_versions WHERE id=(p_input->>'versionId')::uuid AND source_id=p_id FOR UPDATE;
   IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','source_version_missing'); END IF;
   version_id:=v.id;
   IF p_action='validate' THEN
    IF v.revoked THEN RETURN jsonb_build_object('ok',false,'error','source_not_eligible'); END IF;
    UPDATE intelligence_source_versions SET validation=CASE WHEN p_input->'valid'='true'::jsonb
      AND public.r2_source_snapshot_eligible_v1(v.snapshot,s.scope,'public') THEN 'validated' ELSE 'quarantined' END,
      reason=left(coalesce(p_input->>'reason','Validation evidence missing'),500) WHERE id=v.id;
   ELSIF p_action='revoke_version' THEN
    UPDATE intelligence_source_versions SET revoked=true,reason=left(p_input->>'reason',500) WHERE id=v.id;
   ELSE
    IF v.revoked OR v.validation<>'validated' OR (s.revoked AND p_action<>'recover')
     OR length(coalesce(s.scope->>'grantReference',''))=0
     OR p_input->>'confirmedGrant' IS DISTINCT FROM s.scope->>'grantReference'
     OR NOT public.r2_source_snapshot_eligible_v1(v.snapshot,s.scope,'public') THEN
      RETURN jsonb_build_object('ok',false,'error','source_not_eligible'); END IF;
    UPDATE intelligence_sources SET active_version=v.id,revoked=false WHERE id=p_id;
   END IF;
  ELSIF p_action='revoke_source' THEN
   UPDATE intelligence_sources SET revoked=true WHERE id=p_id;
  ELSE RETURN jsonb_build_object('ok',false,'error','invalid_source_action'); END IF;
  IF NOT unchanged THEN UPDATE intelligence_sources SET revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO s; END IF;
 END IF;
 result:=jsonb_build_object('ok',true,'revision',s.revision,'versionId',version_id,'action',p_action,'unchanged',unchanged,'validation',validation_state);
 INSERT INTO audit_logs(actor,action,resource_type,resource_id,metadata)
 VALUES('lead_center:'||p_actor,'intelligence.source_transition','intelligence_source',version_id,
   jsonb_build_object('source_id',p_id,'request_id',p_request,'payload_hash',payload_hash,'action',p_action,
    'reason',left(p_input->>'reason',500),'revision',s.revision,'versionId',version_id,'result',result));
 RETURN result;
END $$;

-- Existing jobs, not a separate refresh queue. Logical request identity is
-- independent of generated deadline/fetch timestamps and survives navigation.
CREATE FUNCTION public.prepare_r2_source_refresh_v1(p_actor text,p_request uuid,p_id text,p_expected integer,p_freshness integer,p_key text,p_contract jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE s intelligence_sources%ROWTYPE; job ai_intelligence_jobs%ROWTYPE; queued jsonb;
BEGIN
 PERFORM 1 FROM lead_center_users WHERE id=p_actor AND role='administrator' AND banned=false FOR SHARE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
 IF p_request IS NULL OR p_key IS NULL OR p_key !~ '^r2:[a-f0-9]{64}$' THEN RETURN jsonb_build_object('ok',false,'error','invalid_worker_contract'); END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_key));
 SELECT * INTO job FROM ai_intelligence_jobs WHERE request_key=p_key;
 IF FOUND THEN
   IF job.feature IS DISTINCT FROM 'bounded_intelligence_v1' OR job.requested_by IS DISTINCT FROM p_actor
     OR job.r2_contract->>'role' IS DISTINCT FROM 'source_steward' OR job.r2_contract->>'entityId' IS DISTINCT FROM p_id
     OR job.r2_contract->>'eventId' IS DISTINCT FROM p_request::text
     OR job.r2_contract->'input'->'sourceRefresh'->'expectedRevision' IS DISTINCT FROM to_jsonb(p_expected)
     OR job.r2_contract->'input'->'sourceRefresh'->'freshnessHours' IS DISTINCT FROM to_jsonb(p_freshness) THEN
     RETURN jsonb_build_object('ok',false,'error','replay_conflict'); END IF;
   IF job.metadata->'sourceRefreshResult' IS NOT NULL THEN RETURN job.metadata->'sourceRefreshResult'||jsonb_build_object('replayed',true); END IF;
   RETURN jsonb_build_object('ok',job.status IN ('queued','processing'),'action','refresh','jobId',job.id,'status',job.status,
     'pending',job.status IN ('queued','processing'),'replayed',true,'error',job.last_error_code);
 END IF;
 SELECT * INTO s FROM intelligence_sources WHERE id=p_id FOR SHARE;
 IF NOT FOUND OR s.revoked OR s.revision IS DISTINCT FROM p_expected THEN RETURN jsonb_build_object('ok',false,'error','source_revision_changed'); END IF;
 IF p_freshness IS NULL OR p_freshness NOT BETWEEN 1 AND 720
   OR p_freshness>coalesce((s.scope->>'freshnessHours')::integer,0)
   OR p_contract->>'version' IS DISTINCT FROM 'amm.r2.workers.v1'
   OR p_contract->>'tenant' IS DISTINCT FROM 'ask-magic-mike' OR p_contract->>'actor' IS DISTINCT FROM p_actor
   OR p_contract->>'eventId' IS DISTINCT FROM p_request::text OR p_contract->>'entityId' IS DISTINCT FROM p_id
   OR p_contract->>'entityVersion' IS DISTINCT FROM p_expected::text OR p_contract->>'role' IS DISTINCT FROM 'source_steward'
   OR p_contract->'input'->'sourceRefresh'->'expectedRevision' IS DISTINCT FROM to_jsonb(p_expected)
   OR p_contract->'input'->'sourceRefresh'->'freshnessHours' IS DISTINCT FROM to_jsonb(p_freshness)
   OR NOT public.r2_source_scope_valid_v1(p_contract->'input'->'source',s.scope)
   OR coalesce((p_contract->'budget'->>'steps')::integer,99) NOT BETWEEN 2 AND 8 THEN
   RETURN jsonb_build_object('ok',false,'error','invalid_worker_contract'); END IF;
 IF (SELECT count(*) FROM ai_intelligence_jobs WHERE requested_by=p_actor AND r2_contract->'input'?'sourceRefresh'
   AND created_at>clock_timestamp()-interval '1 minute')>=30 THEN RETURN jsonb_build_object('ok',false,'error','rate_limited'); END IF;
 queued:=public.enqueue_r2_worker_v1(p_key,NULL,p_actor,p_contract);
 IF queued->>'ok' IS DISTINCT FROM 'true' THEN RETURN queued; END IF;
 RETURN jsonb_build_object('ok',true,'action','refresh','jobId',queued->>'id','status','queued','pending',true,'replayed',false);
END $$;

CREATE FUNCTION public.r2_source_refresh_fence_v1(p_job uuid,p_token uuid) RETURNS boolean
 LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE job ai_intelligence_jobs%ROWTYPE; s intelligence_sources%ROWTYPE; fence jsonb;
BEGIN
 SELECT * INTO job FROM ai_intelligence_jobs WHERE id=p_job AND feature='bounded_intelligence_v1';
 IF NOT FOUND OR job.status<>'processing' OR p_token IS NULL OR job.r2_lease_token IS DISTINCT FROM p_token
   OR job.r2_lease_until IS NULL OR job.r2_lease_until<=clock_timestamp()
   OR job.r2_deadline IS NULL OR job.r2_deadline<=clock_timestamp()
   OR job.r2_contract->>'role' IS DISTINCT FROM 'source_steward'
   OR NOT EXISTS(SELECT 1 FROM lead_center_users WHERE id=job.requested_by AND role='administrator' AND banned=false) THEN RETURN false; END IF;
 fence:=job.r2_contract->'input'->'sourceRefresh';
 SELECT * INTO s FROM intelligence_sources WHERE id=job.r2_contract->>'entityId';
 IF NOT FOUND OR s.revoked OR fence->>'expectedRevision' IS DISTINCT FROM s.revision::text
   OR job.r2_contract->>'entityVersion' IS DISTINCT FROM s.revision::text
   OR NOT public.r2_source_scope_valid_v1(job.r2_contract->'input'->'source',s.scope)
   OR coalesce((fence->>'freshnessHours')::integer,0) NOT BETWEEN 1 AND least(720,(s.scope->>'freshnessHours')::integer)
   OR coalesce((job.r2_contract->'budget'->>'steps')::integer,0) NOT BETWEEN 2 AND 8 THEN RETURN false; END IF;
 RETURN true;
EXCEPTION WHEN data_exception THEN RETURN false;
END $$;

-- Targetable overload of the SAME claim path. Both signatures and the existing
-- handoff claimer share the same two-worker advisory lock and lease columns.
CREATE FUNCTION public.claim_r2_worker_v1(p_worker text,p_actor text,p_roles text[],p_target uuid) RETURNS jsonb
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE job ai_intelligence_jobs%ROWTYPE;
BEGIN
 IF length(coalesce(p_worker,'')) NOT BETWEEN 8 AND 150 OR length(coalesce(p_actor,'')) NOT BETWEEN 1 AND 150
   OR coalesce(cardinality(p_roles),0) NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'invalid_worker_identity'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('amm:r2:two-worker-limit'));
 UPDATE ai_intelligence_jobs SET status='failed',last_error_code='worker_deadline_or_attempts_exhausted',
   r2_lease_until=NULL,r2_lease_token=NULL,completed_at=clock_timestamp(),updated_at=clock_timestamp()
   WHERE feature='bounded_intelligence_v1' AND status IN ('queued','processing')
     AND (r2_deadline<=clock_timestamp() OR (status='processing' AND r2_lease_until<=clock_timestamp() AND attempt_count>=max_attempts));
 UPDATE ai_intelligence_jobs SET status='queued',r2_lease_until=NULL,r2_lease_token=NULL,
   not_before=clock_timestamp()+interval '30 seconds',last_error_code='worker_lease_expired',updated_at=clock_timestamp()
   WHERE feature='bounded_intelligence_v1' AND status='processing' AND r2_lease_until<=clock_timestamp();
 IF (SELECT count(*) FROM ai_intelligence_jobs WHERE feature='bounded_intelligence_v1' AND status='processing' AND r2_lease_until>clock_timestamp())>=2 THEN RETURN NULL; END IF;
 SELECT * INTO job FROM ai_intelligence_jobs WHERE feature='bounded_intelligence_v1' AND status='queued'
   AND requested_by=p_actor AND r2_contract->>'role'=ANY(p_roles) AND (p_target IS NULL OR id=p_target)
   AND not_before<=clock_timestamp() AND r2_deadline>clock_timestamp() AND attempt_count<max_attempts
   ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 UPDATE ai_intelligence_jobs SET status='processing',attempt_count=attempt_count+1,claimed_at=clock_timestamp(),
   r2_lease_until=least(clock_timestamp()+interval '30 seconds',r2_deadline),r2_lease_token=gen_random_uuid(),
   metadata=metadata||jsonb_build_object('worker',p_worker),updated_at=clock_timestamp() WHERE id=job.id RETURNING * INTO job;
 RETURN to_jsonb(job);
END $$;
CREATE OR REPLACE FUNCTION public.claim_r2_worker_v1(p_worker text,p_actor text,p_roles text[]) RETURNS jsonb
 LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT public.claim_r2_worker_v1(p_worker,p_actor,p_roles,NULL::uuid)
$$;

-- The release boundary is this short, atomic eligibility check + receipt commit.
-- Payload is buffered until here. Previously released bytes cannot be retracted.
CREATE FUNCTION public.r2_release_answer_v1(p_id uuid,p_scope text,p_user text,p_session text,p_refs jsonb,p_reply jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_user IS NULL THEN PERFORM 1 FROM r2_guest_sessions WHERE owner_scope=p_scope FOR SHARE;
 ELSE PERFORM 1 FROM consumer_users u JOIN consumer_sessions x ON x."userId"=u.id WHERE u.id=p_user AND x.id=p_session FOR SHARE OF u,x; END IF;
 IF public.r2_viewer_valid_v1(p_scope,p_user,p_session) IS DISTINCT FROM true THEN RETURN jsonb_build_object('ok',false,'error','session_unavailable'); END IF;
 IF jsonb_typeof(p_refs) IS DISTINCT FROM 'array' THEN RETURN jsonb_build_object('ok',false,'error','source_changed_before_release'); END IF;
 PERFORM 1 FROM intelligence_sources WHERE id IN (SELECT x->>'sourceId' FROM jsonb_array_elements(p_refs) x) ORDER BY id FOR SHARE;
 IF public.r2_sources_valid_v1(p_refs,'public') IS DISTINCT FROM true THEN RETURN jsonb_build_object('ok',false,'error','source_changed_before_release'); END IF;
 INSERT INTO intelligence_answers(id,owner_scope,consumer_user_id,consumer_session_id,source_refs,reply)
  VALUES(p_id,p_scope,p_user,p_session,p_refs,p_reply);
 RETURN jsonb_build_object('ok',true,'answerId',p_id,'revision',1);
END $$;

-- Fencing extends the existing immutable worker/review committers, rather
-- than introducing a second execution or approval service.
ALTER FUNCTION public.complete_r2_worker_v1(uuid,uuid,jsonb) RENAME TO complete_r2_worker_context_v1;
CREATE FUNCTION public.complete_r2_worker_v1(p_id uuid,p_token uuid,p_result jsonb) RETURNS jsonb
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE job ai_intelligence_jobs%ROWTYPE; refs jsonb; outcome jsonb; completed jsonb; failure text; observed jsonb;
BEGIN
 SELECT * INTO job FROM ai_intelligence_jobs WHERE id=p_id AND feature='bounded_intelligence_v1' FOR UPDATE;
 IF NOT FOUND OR job.status<>'processing' OR p_token IS NULL OR job.r2_lease_token IS DISTINCT FROM p_token
   OR job.r2_lease_until IS NULL OR job.r2_lease_until<=clock_timestamp()
   OR job.r2_deadline IS NULL OR job.r2_deadline<=clock_timestamp() THEN
   RETURN jsonb_build_object('ok',false,'error','worker_lease_not_current'); END IF;
 IF job.r2_contract->'input'?'sourceRefresh' THEN
   PERFORM 1 FROM lead_center_users WHERE id=job.requested_by AND role='administrator' AND banned=false FOR SHARE;
   PERFORM pg_advisory_xact_lock(hashtext('r2-source-request:'||(job.r2_contract->>'eventId')));
   PERFORM pg_advisory_xact_lock(hashtext('r2-source:'||(job.r2_contract->>'entityId')));
   PERFORM 1 FROM intelligence_sources WHERE id=job.r2_contract->>'entityId' FOR UPDATE;
   IF NOT public.r2_source_refresh_fence_v1(p_id,p_token) THEN
     outcome:=jsonb_build_object('ok',false,'action','refresh','jobId',p_id,'status','blocked','error','source_revision_changed');
     UPDATE ai_intelligence_jobs SET status='blocked',completed_at=clock_timestamp(),last_error_code='source_revision_changed',
       r2_lease_token=NULL,r2_lease_until=NULL,r2_result=jsonb_build_object('state','blocked','reason','source_revision_changed','effects','draft_only_no_send'),
       metadata=metadata||jsonb_build_object('sourceRefreshResult',outcome),updated_at=clock_timestamp() WHERE id=p_id;
     RETURN outcome;
   END IF;
   completed:=public.complete_r2_worker_context_v1(p_id,p_token,p_result);
   IF completed->>'ok' IS DISTINCT FROM 'true' THEN RETURN completed; END IF;
   IF p_result->>'state'='blocked' THEN
     failure:=CASE WHEN p_result->>'text'='source_too_large' THEN 'source_too_large' ELSE 'source_fetch_unavailable' END;
     outcome:=jsonb_build_object('ok',false,'action','refresh','jobId',p_id,'status','blocked','error',failure);
   ELSE
     observed:=p_result->'sourceRefresh';
     IF jsonb_typeof(observed) IS DISTINCT FROM 'object' OR observed->'snapshot'->'source'->'freshnessHours' IS DISTINCT FROM
         job.r2_contract->'input'->'sourceRefresh'->'freshnessHours'
       OR coalesce(observed->'snapshot'->'observation'->>'rawContentHash','') !~ '^[a-f0-9]{64}$'
       OR observed->>'contentHash' IS DISTINCT FROM observed->'snapshot'->'observation'->>'contentHash' THEN
       failure:='invalid_worker_result';
       outcome:=jsonb_build_object('ok',false,'action','refresh','jobId',p_id,'status','blocked','error',failure);
     ELSE
       outcome:=public.r2_source_transition_v1(job.requested_by,(job.r2_contract->>'eventId')::uuid,
         job.r2_contract->>'entityId',(job.r2_contract->'input'->'sourceRefresh'->>'expectedRevision')::integer,
         'candidate',observed||jsonb_build_object('refresh',true));
       IF outcome->>'ok' IS DISTINCT FROM 'true' THEN failure:=coalesce(outcome->>'error','invalid_worker_result'); END IF;
       outcome:=outcome||jsonb_build_object('action','refresh','jobId',p_id,'status',CASE WHEN failure IS NOT NULL OR p_result->>'state'<>'review_required' THEN 'blocked' ELSE 'completed' END);
     END IF;
   END IF;
   UPDATE ai_intelligence_jobs SET metadata=metadata||jsonb_build_object('sourceRefreshResult',outcome),
     status=CASE WHEN failure IS NOT NULL THEN 'blocked' ELSE status END,last_error_code=failure,updated_at=clock_timestamp() WHERE id=p_id;
   RETURN outcome;
 END IF;
 IF EXISTS(SELECT 1 FROM intelligence_sources) THEN
  refs:=job.r2_contract->'input'->'sourceAuthorization';
  IF jsonb_typeof(refs)='array' THEN PERFORM 1 FROM intelligence_sources WHERE id IN(SELECT x->>'sourceId' FROM jsonb_array_elements(refs) x) ORDER BY id FOR SHARE; END IF;
  IF NOT public.r2_sources_valid_v1(refs,'public') THEN
   UPDATE ai_intelligence_jobs SET status='blocked',completed_at=clock_timestamp(),last_error_code='worker_source_invalid',
    r2_lease_token=NULL,r2_lease_until=NULL,r2_result=jsonb_build_object('state','blocked','reason','source_invalid','effects','draft_only_no_send') WHERE id=p_id;
   RETURN jsonb_build_object('ok',false,'error','worker_source_invalid');
  END IF;
 END IF;
 RETURN public.complete_r2_worker_context_v1(p_id,p_token,p_result);
END $$;
ALTER FUNCTION public.review_r2_handoff_v1(uuid,integer,text,text,text,text) RENAME TO review_r2_handoff_context_v1;
CREATE FUNCTION public.review_r2_handoff_v1(p_key uuid,p_version integer,p_action text,p_content text,p_hash text,p_actor text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE refs jsonb;
BEGIN
 IF p_action<>'expire' AND EXISTS(SELECT 1 FROM intelligence_sources) THEN
  SELECT r2_contract->'input'->'sourceAuthorization' INTO refs FROM ai_intelligence_jobs WHERE id=p_key;
  IF jsonb_typeof(refs)='array' THEN PERFORM 1 FROM intelligence_sources WHERE id IN(SELECT x->>'sourceId' FROM jsonb_array_elements(refs) x) ORDER BY id FOR SHARE; END IF;
  IF refs IS NULL OR NOT coalesce(public.r2_sources_valid_v1(refs,'public'),false) THEN
   RETURN jsonb_build_object('ok',false,'error','source_invalid','historicalReviewUnchanged',true);
  END IF;
 END IF;
 RETURN public.review_r2_handoff_context_v1(p_key,p_version,p_action,p_content,p_hash,p_actor);
END $$;

ALTER TABLE intelligence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_source_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE r2_guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON intelligence_sources,intelligence_source_versions,r2_guest_sessions,intelligence_answers FROM PUBLIC;
DO $$ DECLARE r text; f text;
BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
   EXECUTE format('REVOKE ALL ON intelligence_sources,intelligence_source_versions,r2_guest_sessions,intelligence_answers FROM %I',r);
  END IF;
 END LOOP;
 FOREACH f IN ARRAY ARRAY['r2_viewer_valid_v1(text,text,text)','r2_sources_valid_v1(jsonb,text)',
  'r2_source_scope_valid_v1(jsonb,jsonb)','r2_source_snapshot_eligible_v1(jsonb,jsonb,text)',
  'r2_source_version_immutable_v1()','r2_source_identity_immutable_v1()',
  'prepare_r2_source_refresh_v1(text,uuid,text,integer,integer,text,jsonb)','r2_source_refresh_fence_v1(uuid,uuid)',
  'claim_r2_worker_v1(text,text,text[],uuid)','claim_r2_worker_v1(text,text,text[])',
  'r2_source_transition_v1(text,uuid,text,integer,text,jsonb)','r2_release_answer_v1(uuid,text,text,text,jsonb,jsonb)',
  'complete_r2_worker_v1(uuid,uuid,jsonb)','review_r2_handoff_v1(uuid,integer,text,text,text,text)'] LOOP
  EXECUTE 'REVOKE ALL ON FUNCTION public.'||f||' FROM PUBLIC';
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM %I',f,r); END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN EXECUTE 'GRANT EXECUTE ON FUNCTION public.'||f||' TO service_role'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
  GRANT SELECT,INSERT,UPDATE ON intelligence_sources,intelligence_source_versions,r2_guest_sessions TO service_role;
  GRANT SELECT,INSERT,DELETE ON intelligence_answers TO service_role;
 END IF;
END $$;
COMMIT;
