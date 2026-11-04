-- PREPARED ONLY. Inspect the applied ledger and approve exact migration/role
-- effects before Production use. Neon canonical; no history rewrite/backfill.
BEGIN;
CREATE UNIQUE INDEX analytics_traffic_event_identity_v1
 ON public.analytics_events ((properties->>'traffic_event_id'))
 WHERE properties->>'traffic_version'='1' AND properties ? 'traffic_event_id';
ALTER TABLE public.leads ADD COLUMN seller_request jsonb;
ALTER TABLE public.leads ADD CONSTRAINT seller_request_shape_v1 CHECK (
 seller_request IS NULL OR (jsonb_typeof(seller_request)='object'
 AND seller_request->>'version'='1'
 AND seller_request->>'option' IN ('home-value','as-is','cash-review','compare','guidance')
 AND seller_request->>'relationship' IN ('owner','co-owner','authorized-helper','unknown')
 AND seller_request->>'representation' IN ('represented','not-represented','unknown')
 AND seller_request->>'occupancy' IN ('owner-occupied','tenant-occupied','vacant','unknown')
 AND (seller_request - ARRAY['version','option','relationship','representation','occupancy'])='{}'::jsonb
 AND seller_request ?& ARRAY['version','option','relationship','representation','occupancy']) IS TRUE);
CREATE FUNCTION public.capture_public_lead_v5(p_session jsonb,p_lead jsonb,p_attribution jsonb,p_notification_mode text,p_internal_notification jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE r jsonb; request jsonb := p_lead->'seller_request'; expected text;
BEGIN
 IF request IS NULL OR request IS DISTINCT FROM p_internal_notification->'request_context'->'seller_request'
 THEN RAISE EXCEPTION 'seller_request_context_required' USING ERRCODE='22023'; END IF;
 expected := CASE request->>'option' WHEN 'cash-review' THEN 'seller_cash_offer' WHEN 'home-value' THEN 'home_value' ELSE 'seller' END;
 IF p_lead->>'lead_type' IS DISTINCT FROM expected THEN RAISE EXCEPTION 'seller_request_type_mismatch' USING ERRCODE='22023'; END IF;
 -- v4 binds the entire request context into the existing retry/conflict chain.
 r := public.capture_public_lead_v4(p_session,p_lead,p_attribution,p_notification_mode,p_internal_notification);
 IF (r->>'ok')::boolean AND NOT coalesce((r->>'idempotent_replay')::boolean,false) THEN
   UPDATE public.leads SET seller_request=request WHERE id=(r->>'lead_id')::uuid;
   IF NOT FOUND THEN RAISE EXCEPTION 'seller_request_capture_failed'; END IF;
 END IF;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.capture_public_lead_v5(jsonb,jsonb,jsonb,text,jsonb) FROM PUBLIC;
CREATE TABLE public.operational_daily_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 recipient_user_id text NOT NULL REFERENCES public.lead_center_users(id),
 recipient text NOT NULL, period_from timestamptz NOT NULL, period_to timestamptz NOT NULL,
 idempotency_key text NOT NULL UNIQUE, frozen_body jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','retry','accepted','unknown','failed')),
 attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count BETWEEN 0 AND 3),
 claim_token uuid, claimed_at timestamptz, first_attempt_at timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 provider text, provider_message_id text, accepted_at timestamptz,
 error_code text, history jsonb NOT NULL DEFAULT '[]',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(recipient_user_id,period_from),
 CHECK(period_to>period_from AND period_to-period_from BETWEEN interval '23 hours' AND interval '25 hours'),
 CHECK(jsonb_typeof(frozen_body)='object'), CHECK(jsonb_typeof(history)='array')
);
ALTER TABLE public.operational_daily_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operational_daily_reports FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
   REVOKE ALL ON public.operational_daily_reports FROM anon;
   REVOKE ALL ON FUNCTION public.capture_public_lead_v5(jsonb,jsonb,jsonb,text,jsonb) FROM anon;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
   REVOKE ALL ON public.operational_daily_reports FROM authenticated;
   REVOKE ALL ON FUNCTION public.capture_public_lead_v5(jsonb,jsonb,jsonb,text,jsonb) FROM authenticated;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
   -- Owner defaults can grant DELETE on new tables; narrow this table only.
   REVOKE ALL ON public.operational_daily_reports FROM service_role;
   GRANT SELECT,INSERT,UPDATE ON public.operational_daily_reports TO service_role;
   GRANT EXECUTE ON FUNCTION public.capture_public_lead_v5(jsonb,jsonb,jsonb,text,jsonb) TO service_role;
 END IF;
END $$;
COMMIT;
-- Recovery: pause digest worker first; retain operational delivery/consent/
-- inquiry history and v5. Compatible app-only rollback, never delete records.
