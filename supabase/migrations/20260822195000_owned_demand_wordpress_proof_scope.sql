-- Extend the existing Phase 9 append-only publication-proof ledger to the
-- brokerage-owned WordPress channel and its seven reviewed placements.
--
-- This migration changes validation constraints only. It does not create a
-- second ledger, mutate lead records, seed publication proof, publish a page,
-- or call an external provider. The replacement constraints are added and
-- validated in the same migration transaction, so a divergent schema or an
-- incompatible existing row fails closed.

DO $owned_demand_wordpress_constraint_replacement$
DECLARE
  matching_count integer;
  matching_name text;
BEGIN
  IF to_regclass('public.owned_demand_publication_proofs') IS NULL THEN
    RAISE EXCEPTION 'owned-demand publication-proof ledger is missing';
  END IF;

  SELECT count(*), min(c.conname::text)
    INTO matching_count, matching_name
    FROM pg_constraint c
   WHERE c.conrelid = 'public.owned_demand_publication_proofs'::regclass
     AND c.contype = 'c'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%channel_key%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%google_business_profile%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%qr_print%'
     AND lower(pg_get_constraintdef(c.oid)) NOT LIKE '%utm_source%'
     AND lower(pg_get_constraintdef(c.oid)) NOT LIKE '%utm_content%'
     AND lower(pg_get_constraintdef(c.oid)) NOT LIKE '%platform_state%'
     AND lower(pg_get_constraintdef(c.oid)) NOT LIKE '%evidence_url%';
  IF matching_count <> 1 THEN
    RAISE EXCEPTION 'expected one legacy publication channel constraint, found %', matching_count;
  END IF;
  EXECUTE format(
    'ALTER TABLE public.owned_demand_publication_proofs DROP CONSTRAINT %I',
    matching_name
  );

  SELECT count(*), min(c.conname::text)
    INTO matching_count, matching_name
    FROM pg_constraint c
   WHERE c.conrelid = 'public.owned_demand_publication_proofs'::regclass
     AND c.contype = 'c'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%placement_key%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%general_question%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%renter_plan%'
     AND lower(pg_get_constraintdef(c.oid)) NOT LIKE '%channel_key%'
     AND lower(pg_get_constraintdef(c.oid)) NOT LIKE '%utm_content%';
  IF matching_count <> 1 THEN
    RAISE EXCEPTION 'expected one legacy publication placement constraint, found %', matching_count;
  END IF;
  EXECUTE format(
    'ALTER TABLE public.owned_demand_publication_proofs DROP CONSTRAINT %I',
    matching_name
  );

  SELECT count(*), min(c.conname::text)
    INTO matching_count, matching_name
    FROM pg_constraint c
   WHERE c.conrelid = 'public.owned_demand_publication_proofs'::regclass
     AND c.contype = 'c'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%evidence_url%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%goo%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%facebook%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%instagram%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%linkedin%';
  IF matching_count <> 1 THEN
    RAISE EXCEPTION 'expected one legacy publication evidence-host constraint, found %', matching_count;
  END IF;
  EXECUTE format(
    'ALTER TABLE public.owned_demand_publication_proofs DROP CONSTRAINT %I',
    matching_name
  );

  SELECT count(*), min(c.conname::text)
    INTO matching_count, matching_name
    FROM pg_constraint c
   WHERE c.conrelid = 'public.owned_demand_publication_proofs'::regclass
     AND c.contype = 'c'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%utm_source%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%utm_medium%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%google_business_profile%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%qr_print%';
  IF matching_count <> 1 THEN
    RAISE EXCEPTION 'expected one legacy publication attribution constraint, found %', matching_count;
  END IF;
  EXECUTE format(
    'ALTER TABLE public.owned_demand_publication_proofs DROP CONSTRAINT %I',
    matching_name
  );

  SELECT count(*), min(c.conname::text)
    INTO matching_count, matching_name
    FROM pg_constraint c
   WHERE c.conrelid = 'public.owned_demand_publication_proofs'::regclass
     AND c.contype = 'c'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%utm_content%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%gbp_update%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%qr_local_question%';
  IF matching_count <> 1 THEN
    RAISE EXCEPTION 'expected one legacy publication content constraint, found %', matching_count;
  END IF;
  EXECUTE format(
    'ALTER TABLE public.owned_demand_publication_proofs DROP CONSTRAINT %I',
    matching_name
  );

  SELECT count(*), min(c.conname::text)
    INTO matching_count, matching_name
    FROM pg_constraint c
   WHERE c.conrelid = 'public.owned_demand_publication_proofs'::regclass
     AND c.contype = 'c'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%platform_state%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%channel_key%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%google_business_profile%'
     AND lower(pg_get_constraintdef(c.oid)) LIKE '%qr_print%'
     AND lower(pg_get_constraintdef(c.oid)) NOT LIKE '%proof_type%';
  IF matching_count <> 1 THEN
    RAISE EXCEPTION 'expected one legacy publication state-scope constraint, found %', matching_count;
  END IF;
  EXECUTE format(
    'ALTER TABLE public.owned_demand_publication_proofs DROP CONSTRAINT %I',
    matching_name
  );
END;
$owned_demand_wordpress_constraint_replacement$;

ALTER TABLE public.owned_demand_publication_proofs
  ADD CONSTRAINT owned_demand_publication_channel_scope_v2
  CHECK (channel_key IN (
    'ourtown_wordpress', 'google_business_profile', 'facebook', 'instagram',
    'linkedin', 'email_signature', 'qr_print'
  )) NOT VALID,
  ADD CONSTRAINT owned_demand_publication_placement_scope_v2
  CHECK (
    (
      channel_key = 'ourtown_wordpress'
      AND placement_key IN (
        'general_question', 'seller_review', 'buyer_match', 'renter_plan',
        'wordpress_homepage_ask_mike', 'wordpress_home_value',
        'wordpress_we_buy_homes', 'wordpress_mike_agent',
        'wordpress_listing_buyer', 'wordpress_rental_to_homeownership',
        'wordpress_ask_magic_mike_embed'
      )
    )
    OR (
      channel_key <> 'ourtown_wordpress'
      AND placement_key IN (
        'general_question', 'seller_review', 'buyer_match', 'renter_plan'
      )
    )
  ) NOT VALID,
  ADD CONSTRAINT owned_demand_publication_evidence_host_v2
  CHECK (
    evidence_url IS NULL OR (
      position('@' IN evidence_url) = 0
      AND evidence_url !~* '[?&](access[_-]?token|api[_-]?key|authorization|code|credential|key|password|secret|signature|token)='
      AND (
        (channel_key = 'ourtown_wordpress' AND evidence_url ~* '^https://([a-z0-9-]+\.)*ourtownproperties\.com/')
        OR (channel_key = 'google_business_profile' AND evidence_url ~* '^https://([a-z0-9-]+\.)*(google\.com|goo\.gl)/')
        OR (channel_key = 'facebook' AND evidence_url ~* '^https://([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.watch)/')
        OR (channel_key = 'instagram' AND evidence_url ~* '^https://([a-z0-9-]+\.)*instagram\.com/')
        OR (channel_key = 'linkedin' AND evidence_url ~* '^https://([a-z0-9-]+\.)*linkedin\.com/')
      )
    )
  ) NOT VALID,
  ADD CONSTRAINT owned_demand_publication_attribution_v2
  CHECK (
    (channel_key = 'ourtown_wordpress' AND utm_source = 'ourtownproperties' AND utm_medium = 'owned_media')
    OR (channel_key = 'google_business_profile' AND utm_source = 'google_business_profile' AND utm_medium = 'organic_local')
    OR (channel_key = 'facebook' AND utm_source = 'facebook' AND utm_medium = 'social_organic')
    OR (channel_key = 'instagram' AND utm_source = 'instagram' AND utm_medium = 'social_organic')
    OR (channel_key = 'linkedin' AND utm_source = 'linkedin' AND utm_medium = 'social_organic')
    OR (channel_key = 'email_signature' AND utm_source = 'email' AND utm_medium = 'owned_media')
    OR (channel_key = 'qr_print' AND utm_source = 'qr' AND utm_medium = 'owned_media')
  ) NOT VALID,
  ADD CONSTRAINT owned_demand_publication_content_v2
  CHECK (
    (
      channel_key = 'ourtown_wordpress'
      AND (
        (placement_key = 'general_question' AND utm_content = 'wordpress_ask_magic_mike')
        OR (placement_key = 'seller_review' AND utm_content = 'wordpress_ask_magic_mike_seller_review')
        OR (placement_key = 'buyer_match' AND utm_content = 'wordpress_ask_magic_mike_buyer_match')
        OR (placement_key = 'renter_plan' AND utm_content = 'wordpress_ask_magic_mike_renter_plan')
        OR (placement_key = 'wordpress_homepage_ask_mike' AND utm_content = 'wordpress_homepage_ask_mike')
        OR (placement_key = 'wordpress_home_value' AND utm_content = 'wordpress_home_value_page')
        OR (placement_key = 'wordpress_we_buy_homes' AND utm_content = 'wordpress_we_buy_homes')
        OR (placement_key = 'wordpress_mike_agent' AND utm_content = 'wordpress_mike_agent_page')
        OR (placement_key = 'wordpress_listing_buyer' AND utm_content = 'wordpress_listing_buyer')
        OR (placement_key = 'wordpress_rental_to_homeownership' AND utm_content = 'wordpress_rental_to_homeownership')
        OR (placement_key = 'wordpress_ask_magic_mike_embed' AND utm_content = 'wordpress_ask_magic_mike_embed')
      )
    )
    OR (channel_key = 'google_business_profile' AND utm_content = ('gbp_update' || CASE WHEN placement_key = 'general_question' THEN '' ELSE '_' || placement_key END))
    OR (channel_key = 'facebook' AND utm_content = ('facebook_local_question' || CASE WHEN placement_key = 'general_question' THEN '' ELSE '_' || placement_key END))
    OR (channel_key = 'instagram' AND utm_content = ('instagram_story_question' || CASE WHEN placement_key = 'general_question' THEN '' ELSE '_' || placement_key END))
    OR (channel_key = 'linkedin' AND utm_content = ('linkedin_local_guidance' || CASE WHEN placement_key = 'general_question' THEN '' ELSE '_' || placement_key END))
    OR (channel_key = 'email_signature' AND utm_content = ('email_signature_ask_mike' || CASE WHEN placement_key = 'general_question' THEN '' ELSE '_' || placement_key END))
    OR (channel_key = 'qr_print' AND utm_content = ('qr_local_question' || CASE WHEN placement_key = 'general_question' THEN '' ELSE '_' || placement_key END))
  ) NOT VALID,
  ADD CONSTRAINT owned_demand_publication_state_scope_v2
  CHECK (
    (channel_key = 'ourtown_wordpress' AND platform_state IN ('live', 'configured', 'removed'))
    OR (channel_key = 'google_business_profile' AND platform_state IN ('live', 'scheduled', 'pending_review', 'not_approved', 'removed'))
    OR (channel_key IN ('facebook', 'instagram', 'linkedin') AND platform_state IN ('live', 'scheduled', 'removed'))
    OR (channel_key = 'email_signature' AND platform_state IN ('configured', 'removed'))
    OR (channel_key = 'qr_print' AND platform_state IN ('distributed', 'removed'))
  ) NOT VALID;

ALTER TABLE public.owned_demand_publication_proofs
  VALIDATE CONSTRAINT owned_demand_publication_channel_scope_v2,
  VALIDATE CONSTRAINT owned_demand_publication_placement_scope_v2,
  VALIDATE CONSTRAINT owned_demand_publication_evidence_host_v2,
  VALIDATE CONSTRAINT owned_demand_publication_attribution_v2,
  VALIDATE CONSTRAINT owned_demand_publication_content_v2,
  VALIDATE CONSTRAINT owned_demand_publication_state_scope_v2;

COMMENT ON CONSTRAINT owned_demand_publication_content_v2
  ON public.owned_demand_publication_proofs IS
  'Canonical channel, placement, and UTM-content contract, including the reviewed Our Town WordPress placements.';
