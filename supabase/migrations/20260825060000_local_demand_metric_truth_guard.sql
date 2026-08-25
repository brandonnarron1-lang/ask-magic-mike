-- Phase 9 local-demand metric truth guard.
-- Google ended Business Profile chat/call-history features on 2024-07-31 and
-- BUSINESS_CONVERSATIONS is no longer a current Performance API metric.
-- Preserve historical evidence, but fail closed for every new or revised
-- canonical Google Business Profile signal that claims the retired metric.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.market_signals') IS NULL THEN
    RAISE EXCEPTION 'public.market_signals is required before the local-demand metric truth guard';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.amm_reject_retired_local_profile_metric()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.source_system = 'google_business_profile' AND
     NEW.evidence->>'metric' = 'business_conversations' THEN
    RAISE EXCEPTION 'retired Google Business Profile metric: business_conversations'
      USING ERRCODE = '23514',
            HINT = 'Import only current aggregate Business Profile Performance metrics.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS market_signals_reject_retired_local_profile_metric
  ON public.market_signals;
CREATE TRIGGER market_signals_reject_retired_local_profile_metric
  BEFORE INSERT OR UPDATE OF source_system, evidence
  ON public.market_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.amm_reject_retired_local_profile_metric();

COMMENT ON FUNCTION public.amm_reject_retired_local_profile_metric() IS
  'Rejects new/revised canonical GBP signals that use the retired business_conversations metric; historical rows are not scanned, updated, or deleted.';

REVOKE ALL ON FUNCTION public.amm_reject_retired_local_profile_metric() FROM PUBLIC;

DO $$
DECLARE
  v_role text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.amm_reject_retired_local_profile_metric() FROM %I',
        v_role
      );
    END IF;
  END LOOP;
END;
$$;

COMMIT;
