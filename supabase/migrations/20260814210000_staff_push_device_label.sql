-- Human-readable labels make revocation and device ownership auditable without
-- exposing Push endpoints. Apply to Preview first; no runtime DDL is permitted.

ALTER TABLE public.staff_push_subscriptions
  ADD COLUMN IF NOT EXISTS device_label TEXT;

ALTER TABLE public.staff_push_subscriptions
  DROP CONSTRAINT IF EXISTS staff_push_subscriptions_device_label_length;

ALTER TABLE public.staff_push_subscriptions
  ADD CONSTRAINT staff_push_subscriptions_device_label_length
  CHECK (device_label IS NULL OR char_length(device_label) BETWEEN 2 AND 64);

COMMENT ON COLUMN public.staff_push_subscriptions.device_label IS
  'Owner-entered non-secret device label used for enrollment and revocation.';

-- Rollback after confirming no operational dependency:
-- ALTER TABLE public.staff_push_subscriptions DROP CONSTRAINT IF EXISTS staff_push_subscriptions_device_label_length;
-- ALTER TABLE public.staff_push_subscriptions DROP COLUMN IF EXISTS device_label;
