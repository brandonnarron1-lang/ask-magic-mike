-- Neon compatibility for the canonical server-only service_role.
-- Prerequisite: create/rotate the role password in Neon's secure interface.
-- Never place the password or DATABASE_URL in this file.

ALTER ROLE service_role LOGIN BYPASSRLS;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT EXECUTE ON FUNCTION public.capture_public_lead_v1(JSONB, JSONB, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.amm_normalize_email(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.amm_normalize_phone(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.amm_normalize_property_identity(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.amm_public_lead_request_fingerprint(JSONB, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_public_appointment_v1(UUID, UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.mutate_admin_lead_status_v1(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.mutate_admin_assignment_v1(UUID, UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.mutate_admin_agent_operations_v1(UUID, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_sla_breach_v1(UUID, TEXT, TEXT, TEXT) TO service_role;

-- Future tables remain server-accessible without granting CREATE on the schema.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;
