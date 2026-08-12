-- Runtime access for the server-only Web Push repository. Schema ownership and
-- DDL remain with the migration owner; the application role receives only the
-- row operations required to register, list, update, and deactivate devices.

GRANT USAGE ON SCHEMA public TO service_role;
REVOKE ALL ON TABLE public.staff_push_subscriptions FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.staff_push_subscriptions
  TO service_role;

-- Rollback:
-- REVOKE SELECT, INSERT, UPDATE, DELETE
--   ON TABLE public.staff_push_subscriptions
--   FROM service_role;
