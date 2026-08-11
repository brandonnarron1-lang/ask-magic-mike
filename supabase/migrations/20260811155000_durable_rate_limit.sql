-- Durable distributed rate limiting for deployments without a healthy Redis service.
-- Stores only a server-derived bucket identifier and aggregate counters.

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_window
  ON public.rate_limit_buckets(window_started_at);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_buckets FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_buckets TO service_role;

COMMENT ON TABLE public.rate_limit_buckets IS
  'Server-only atomic request counters used when the external Redis limiter is unavailable.';
