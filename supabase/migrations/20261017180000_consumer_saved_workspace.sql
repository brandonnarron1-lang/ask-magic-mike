-- Separate consumer identity/state in the canonical Neon database. No lead,
-- contact, consent, assignment, notification, or existing auth row is changed.
BEGIN;
CREATE TABLE public.consumer_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  email TEXT NOT NULL UNIQUE CHECK (length(email)<=254),
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  audience TEXT NOT NULL DEFAULT 'consumer' CHECK (audience='consumer'),
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.consumer_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "expiresAt" TIMESTAMPTZ NOT NULL, token TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT, "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES public.consumer_users(id) ON DELETE CASCADE
);
CREATE INDEX consumer_sessions_user_idx ON public.consumer_sessions("userId");
CREATE INDEX consumer_sessions_expiry_idx ON public.consumer_sessions("expiresAt");
CREATE TABLE public.consumer_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "accountId" TEXT NOT NULL, "providerId" TEXT NOT NULL CHECK ("providerId"='credential'),
  "userId" TEXT NOT NULL REFERENCES public.consumer_users(id) ON DELETE CASCADE,
  "accessToken" TEXT, "refreshToken" TEXT, "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ, "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope TEXT, password TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("providerId","accountId")
);
CREATE INDEX consumer_accounts_user_idx ON public.consumer_accounts("userId");
CREATE TABLE public.consumer_verifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, identifier TEXT NOT NULL, value TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX consumer_verifications_identifier_idx ON public.consumer_verifications(identifier);
CREATE TABLE public.consumer_rate_limits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL, "lastRequest" BIGINT NOT NULL
);
CREATE TABLE public.consumer_workspaces (
  user_id TEXT PRIMARY KEY REFERENCES public.consumer_users(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision>0),
  interests JSONB NOT NULL DEFAULT '[]'::JSONB
    CHECK (jsonb_typeof(interests)='array' AND jsonb_array_length(interests)<=8 AND octet_length(interests::TEXT)<=16384),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
REVOKE ALL ON public.consumer_users,public.consumer_sessions,public.consumer_accounts,
  public.consumer_verifications,public.consumer_rate_limits,public.consumer_workspaces FROM PUBLIC;
-- Neon does not necessarily retain the legacy browser roles. Revoke them
-- when present; do not create unused roles merely to satisfy this migration.
DO $$ DECLARE browser_role TEXT; BEGIN
  FOR browser_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
    EXECUTE format('REVOKE ALL ON public.consumer_users,public.consumer_sessions,public.consumer_accounts,public.consumer_verifications,public.consumer_rate_limits,public.consumer_workspaces FROM %I',browser_role);
  END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.consumer_users,public.consumer_sessions,
  public.consumer_accounts,public.consumer_verifications,public.consumer_rate_limits TO service_role;
ALTER TABLE public.consumer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY consumer_users_server ON public.consumer_users TO service_role USING(true) WITH CHECK(true);
CREATE POLICY consumer_sessions_server ON public.consumer_sessions TO service_role USING(true) WITH CHECK(true);
CREATE POLICY consumer_accounts_server ON public.consumer_accounts TO service_role USING(true) WITH CHECK(true);
CREATE POLICY consumer_verifications_server ON public.consumer_verifications TO service_role USING(true) WITH CHECK(true);
CREATE POLICY consumer_rate_limits_server ON public.consumer_rate_limits TO service_role USING(true) WITH CHECK(true);
-- Requests set a transaction-local verified subject then downgrade to this
-- non-login role. No browser SQL access or transaction-pool session leakage.
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='amm_consumer_workspace_v1') THEN
    CREATE ROLE amm_consumer_workspace_v1 NOLOGIN NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  ELSIF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='amm_consumer_workspace_v1' AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)) THEN
    RAISE EXCEPTION 'consumer workspace role attributes do not match';
  END IF;
END $$;
GRANT amm_consumer_workspace_v1 TO service_role;
GRANT amm_consumer_workspace_v1 TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO amm_consumer_workspace_v1;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.consumer_workspaces TO amm_consumer_workspace_v1;
ALTER TABLE public.consumer_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_workspaces FORCE ROW LEVEL SECURITY;
CREATE POLICY consumer_workspace_subject ON public.consumer_workspaces TO amm_consumer_workspace_v1
  USING (user_id=current_setting('amm.consumer_user_id',true))
  WITH CHECK (user_id=current_setting('amm.consumer_user_id',true));
-- Recovery: disable the account feature or use the accepted R1a application;
-- retain these tables, credentials and audit history. Never DROP after use,
-- rewrite canonical inquiries, or roll back the existing v6 notification reader.
COMMIT;
