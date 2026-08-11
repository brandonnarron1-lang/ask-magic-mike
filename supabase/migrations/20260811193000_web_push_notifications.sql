-- Zero-cost, standards-based staff phone alerts. Push subscription endpoints and
-- keys are server-only capabilities and must never be returned by public APIs.

ALTER TABLE public.lead_notifications
  DROP CONSTRAINT IF EXISTS lead_notifications_channel_check;

ALTER TABLE public.lead_notifications
  ADD CONSTRAINT lead_notifications_channel_check
  CHECK (channel IN ('email', 'sms', 'push'));

CREATE TABLE IF NOT EXISTS public.staff_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('primary', 'copy')),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS staff_push_subscriptions_active_role_idx
  ON public.staff_push_subscriptions(recipient_role)
  WHERE is_active = TRUE;

ALTER TABLE public.staff_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_push_subscriptions_deny_public
  ON public.staff_push_subscriptions;
CREATE POLICY staff_push_subscriptions_deny_public
  ON public.staff_push_subscriptions
  FOR ALL TO PUBLIC USING (FALSE) WITH CHECK (FALSE);

COMMENT ON TABLE public.staff_push_subscriptions IS
  'Server-only Web Push capabilities for approved internal lead-alert recipients.';

-- Rollback:
-- DROP TABLE IF EXISTS public.staff_push_subscriptions;
-- ALTER TABLE public.lead_notifications DROP CONSTRAINT IF EXISTS lead_notifications_channel_check;
-- ALTER TABLE public.lead_notifications ADD CONSTRAINT lead_notifications_channel_check CHECK (channel IN ('email', 'sms'));
