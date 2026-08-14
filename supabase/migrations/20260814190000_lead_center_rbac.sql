-- Ask Magic Mike Lead Center per-user identity tables.
-- Canonical runtime: Neon PostgreSQL. This migration is prepared but must not
-- be applied to Production until the owner-import roster is approved.

CREATE TABLE IF NOT EXISTS public.lead_center_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role TEXT NOT NULL DEFAULT 'read_only_analyst'
    CHECK (role IN ('administrator', 'primary_lead_owner', 'approved_agent', 'read_only_analyst')),
  banned BOOLEAN NOT NULL DEFAULT FALSE,
  "banReason" TEXT,
  "banExpires" TIMESTAMPTZ,
  "agentId" TEXT,
  territory TEXT,
  "leadPermissions" TEXT
);

CREATE TABLE IF NOT EXISTS public.lead_center_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES public.lead_center_users(id) ON DELETE CASCADE,
  "impersonatedBy" TEXT
);
CREATE INDEX IF NOT EXISTS lead_center_sessions_user_idx
  ON public.lead_center_sessions ("userId");
CREATE INDEX IF NOT EXISTS lead_center_sessions_expiry_idx
  ON public.lead_center_sessions ("expiresAt");

CREATE TABLE IF NOT EXISTS public.lead_center_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES public.lead_center_users(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("providerId", "accountId")
);
CREATE INDEX IF NOT EXISTS lead_center_accounts_user_idx
  ON public.lead_center_accounts ("userId");

CREATE TABLE IF NOT EXISTS public.lead_center_verifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lead_center_verifications_identifier_idx
  ON public.lead_center_verifications (identifier);

CREATE TABLE IF NOT EXISTS public.lead_center_rate_limits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  "lastRequest" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lead_center_auth_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES public.lead_center_users(id) ON DELETE SET NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'denied', 'failure')),
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lead_center_auth_audit_created_idx
  ON public.lead_center_auth_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS lead_center_auth_audit_user_idx
  ON public.lead_center_auth_audit (user_id, created_at DESC);

REVOKE ALL ON public.lead_center_users,
  public.lead_center_sessions,
  public.lead_center_accounts,
  public.lead_center_verifications,
  public.lead_center_rate_limits,
  public.lead_center_auth_audit
FROM PUBLIC;

-- Rollback (only before users are provisioned):
-- DROP TABLE public.lead_center_auth_audit, public.lead_center_rate_limits,
--   public.lead_center_verifications, public.lead_center_accounts,
--   public.lead_center_sessions, public.lead_center_users;
