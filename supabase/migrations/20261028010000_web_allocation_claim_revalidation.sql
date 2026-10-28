-- Forward-only operational patch after 20261005140000_staff_allocation_pilot.sql.
-- No policy/roster/business-data writes, professional-readiness attestation,
-- transport activation, tables, scheduler changes or second allocation engine.
-- One DO statement makes helper creation, ACLs and both replacements atomic,
-- including when the migration runner does not supply an outer transaction.
DO $migration$
DECLARE
  fn text;
  fn_oid oid;
  predecessor record;
  source text;
  anchor text;
  required_anchors text[];
  pair text[];
  replacements text[][];
BEGIN
  -- Explicit instant; no session timezone, lc_time, DateStyle or implicit clock.
  -- Existing hours are same-day integer [start,end), with 24 allowed only as
  -- the closing hour. Missing, overnight, fractional or malformed windows hold.
  -- DST follows local wall time at the supplied instant: repeated hours share
  -- a window; a skipped hour does not manufacture an instant or availability.
  EXECUTE $helper$
    CREATE FUNCTION public.lead_allocation_available_at_v1(
      p_availability jsonb, p_timezone text, p_at timestamptz
    ) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY INVOKER
    SET search_path=pg_catalog,pg_temp
    AS $hours$
    DECLARE
      local_at timestamp without time zone;
      day_window jsonb;
      opens numeric;
      closes numeric;
    BEGIN
      IF p_at IS NULL OR NOT isfinite(p_at)
        OR jsonb_typeof(p_availability) IS DISTINCT FROM 'object'
        OR p_timezone IS NULL THEN
        RETURN false;
      END IF;
      IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_timezone) THEN
        RETURN false;
      END IF;
      local_at:=p_at AT TIME ZONE p_timezone;
      day_window:=p_availability->(ARRAY['sun','mon','tue','wed','thu','fri','sat'])[extract(dow FROM local_at)::integer+1];
      IF jsonb_typeof(day_window) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
      IF jsonb_array_length(day_window)<>2 THEN RETURN false; END IF;
      IF jsonb_typeof(day_window->0) IS DISTINCT FROM 'number'
        OR jsonb_typeof(day_window->1) IS DISTINCT FROM 'number' THEN
        RETURN false;
      END IF;
      opens:=(day_window->>0)::numeric;
      closes:=(day_window->>1)::numeric;
      IF opens<>trunc(opens) OR closes<>trunc(closes)
        OR opens<0 OR opens>=24 OR closes<=opens OR closes>24 THEN
        RETURN false;
      END IF;
      RETURN extract(hour FROM local_at)>=opens AND extract(hour FROM local_at)<closes;
    END;
    $hours$;
  $helper$;
  REVOKE ALL ON FUNCTION public.lead_allocation_available_at_v1(jsonb,text,timestamptz) FROM PUBLIC;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON FUNCTION public.lead_allocation_available_at_v1(jsonb,text,timestamptz) FROM anon;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON FUNCTION public.lead_allocation_available_at_v1(jsonb,text,timestamptz) FROM authenticated;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    GRANT EXECUTE ON FUNCTION public.lead_allocation_available_at_v1(jsonb,text,timestamptz) TO service_role;
  END IF;

  FOREACH fn IN ARRAY ARRAY[
    'create_lead_allocation_offers_v1(uuid,bigint,text)',
    'resolve_lead_allocation_offer_v1(uuid,bigint,text,text,text,text)'
  ] LOOP
    fn_oid:=('public.'||fn)::regprocedure::oid;
    SELECT oid,proowner,proacl,prosecdef,proconfig INTO predecessor
      FROM pg_proc WHERE oid=fn_oid;
    IF predecessor.prosecdef THEN RAISE EXCEPTION 'allocation predecessor must be SECURITY INVOKER: %',fn; END IF;
    source:=pg_get_functiondef(fn_oid);

    IF fn LIKE 'create_%' THEN
      -- Require the installed pilot-aware predecessor, not the original body.
      required_anchors:=ARRAY[
        'PERFORM 1 FROM public.lead_allocation_policy WHERE id=''staff_v1'' FOR UPDATE; SELECT * INTO p FROM public.effective_lead_allocation_policy_v1(p_lead);',
        'WHERE (NOT EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1(l.id)) OR EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1(l.id) WHERE e.agent_id=ANY(allowed_agents))) AND e.approved_at IS NOT NULL AND e.revoked_at IS NULL',
        'IF a.email_enabled AND a.directory_email AND NOT EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1(l.id)) THEN'
      ];
      replacements:=ARRAY[
        ARRAY[
          $old$OR l.status IN ('dead','converted','closed_won','closed_lost')$old$,
          $new$OR l.status IN ('dead','converted','closed_won','closed_lost','spam','closed','lost','disqualified','duplicate')
    OR l.conversion_stage IN ('dead','converted','closed_won','closed_lost','spam','closed','lost','disqualified','duplicate')
    OR l.converted_at IS NOT NULL OR l.closed_won_at IS NOT NULL OR l.closed_lost_at IS NOT NULL$new$
        ],
        ARRAY[
          $old$AND ((e.email_enabled AND g.notification_email) OR (e.sms_enabled AND g.notification_sms AND e.consent_at IS NOT NULL AND e.possession_verified_at IS NOT NULL AND e.phone_fingerprint IS NOT NULL))$old$,
          -- The existing approved, unrevoked user/agent join is the normal web
          -- binding. Only nonpilot discovery gains channel independence; the
          -- pilot enrollment predicate and every per-channel intent stay intact.
          $new$AND (NOT EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1(l.id)) OR ((e.email_enabled AND g.notification_email) OR (e.sms_enabled AND g.notification_sms AND e.consent_at IS NOT NULL AND e.possession_verified_at IS NOT NULL AND e.phone_fingerprint IS NOT NULL)))$new$
        ],
        ARRAY[
          $old$AND EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=g.timezone)
      AND (g.availability->lower(to_char(now() AT TIME ZONE g.timezone,'Dy'))->>0)::int <= extract(hour FROM now() AT TIME ZONE g.timezone)
      AND (g.availability->lower(to_char(now() AT TIME ZONE g.timezone,'Dy'))->>1)::int > extract(hour FROM now() AT TIME ZONE g.timezone)$old$,
          $new$AND public.lead_allocation_available_at_v1(g.availability,g.timezone,clock_timestamp())$new$
        ]
      ];
    ELSE
      required_anchors:=ARRAY[
        'SELECT 1 FROM public.effective_lead_allocation_policy_v1(l.id) WHERE version=o.policy_version AND starts_at<=o.created_at',
        'IF ((l.is_test OR l.communication_suppressed) AND NOT EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1(l.id) WHERE o.pilot_id=id AND o.agent_id=ANY(allowed_agents))) OR e.paused THEN',
        'IF o.pilot_id IS NULL THEN UPDATE public.agents SET current_load=current_load+1 WHERE id=a.id; END IF;',
        'IF e.email_enabled AND a.notification_email AND o.pilot_id IS NULL THEN'
      ];
      replacements:=ARRAY[
        ARRAY[
          'audit_id uuid; result jsonb;',
          'audit_id uuid; result jsonb; reserved_count bigint;'
        ],
        ARRAY[
          $old$IF p_action='claim' THEN$old$,
          $new$IF p_action='claim' THEN
    -- The global advisory lock and lead/offer/enrollment/agent row locks above
    -- already protect these current records. PASS and exact receipt replay do
    -- not acquire a new assignment and retain their predecessor behavior.
    IF l.status IS NULL OR l.status IN ('dead','converted','closed_won','closed_lost','spam','closed','lost','disqualified','duplicate')
      OR l.conversion_stage IN ('dead','converted','closed_won','closed_lost','spam','closed','lost','disqualified','duplicate')
      OR l.converted_at IS NOT NULL OR l.closed_won_at IS NOT NULL OR l.closed_lost_at IS NOT NULL
      OR (l.city=ANY(e.towns)) IS NOT TRUE OR (l.lead_type=ANY(e.intents)) IS NOT TRUE
      OR NOT public.lead_allocation_available_at_v1(a.availability,a.timezone,clock_timestamp()) THEN
      RETURN jsonb_build_object('ok',false,'error','claim_eligibility_changed');
    END IF;
    -- Convert this offer's reserved slot into load, rather than double-counting
    -- it. Other still-open offers retain their slots after a cap reduction,
    -- with the same pilot/nonpilot isolation as canonical discovery. Expired
    -- but uncleaned offered rows remain conservatively reserved as before.
    SELECT count(*) INTO reserved_count FROM public.lead_allocation_offers reserved
      WHERE reserved.agent_id=a.id AND reserved.id<>o.id AND reserved.state='offered'
        AND reserved.pilot_id IS NOT DISTINCT FROM o.pilot_id;$new$
        ],
        ARRAY[
          'IF a.current_load>=e.concurrent_cap OR',
          'IF a.current_load+reserved_count>=e.concurrent_cap OR'
        ],
        ARRAY[
          $old$(SELECT count(*) FROM public.agent_assignments aa JOIN public.leads assigned ON assigned.id=aa.lead_id WHERE aa.agent_id=a.id AND NOT assigned.is_test AND aa.created_at>=date_trunc('day',now()))>=LEAST(a.max_daily_leads,e.daily_cap)$old$,
          $new$(SELECT count(*) FROM public.agent_assignments aa JOIN public.leads assigned ON assigned.id=aa.lead_id WHERE aa.agent_id=a.id AND NOT assigned.is_test AND aa.created_at>=date_trunc('day',now()))+reserved_count>=LEAST(a.max_daily_leads,e.daily_cap)$new$
        ]
      ];
    END IF;

    FOREACH anchor IN ARRAY required_anchors LOOP
      IF (length(source)-length(replace(source,anchor,'')))/length(anchor)<>1 THEN
        RAISE EXCEPTION 'allocation pilot predecessor drift: %',fn;
      END IF;
    END LOOP;
    FOREACH pair SLICE 1 IN ARRAY replacements LOOP
      IF (length(source)-length(replace(source,pair[1],'')))/length(pair[1])<>1 THEN
        RAISE EXCEPTION 'allocation replacement predecessor drift: %',fn;
      END IF;
      source:=replace(source,pair[1],pair[2]);
    END LOOP;
    -- pg_get_functiondef supplies CREATE OR REPLACE with the original function
    -- identity/settings. No DROP, changed signature, grants or SECURITY DEFINER.
    EXECUTE source;
    IF ('public.'||fn)::regprocedure::oid IS DISTINCT FROM fn_oid
      OR NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=fn_oid
        AND p.proowner=predecessor.proowner
        AND p.proacl IS NOT DISTINCT FROM predecessor.proacl
        AND p.prosecdef IS FALSE
        AND p.proconfig IS NOT DISTINCT FROM predecessor.proconfig) THEN
      RAISE EXCEPTION 'allocation function identity/privilege drift: %',fn;
    END IF;
  END LOOP;
END;
$migration$;

-- Recovery: keep LIVE/dispatch OFF. Prefer a reviewed forward repair. If a
-- function rollback is required, in one separately authorized transaction use
-- exactly-one reverse anchors for THIS patch against the installed definitions
-- (or captured pre-migration pg_get_functiondef output), then CREATE OR REPLACE
-- the two SAME signatures. Preserve all pilot/lease migrations, OIDs and ACLs;
-- do not replay the original pre-pilot migration or rewrite offers/receipts,
-- assignments, reservations, outbox history or policy. Leave the harmless helper
-- installed until both callers are restored; never DROP ... CASCADE. This file
-- intentionally fails on reapplication/predecessor drift, not silently rebase.
