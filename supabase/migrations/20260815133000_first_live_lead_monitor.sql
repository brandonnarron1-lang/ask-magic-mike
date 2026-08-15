-- Idempotent, PII-minimized production detection for genuine live leads.
-- The monitor writes only state booleans/status labels to the immutable audit
-- ledger. Contact data, consent text, source URLs, and provider payloads remain
-- in their protected canonical tables.

CREATE UNIQUE INDEX IF NOT EXISTS audit_logs_live_lead_monitor_once_idx
  ON public.audit_logs(action, resource_type, resource_id)
  WHERE resource_type = 'lead'
    AND action IN ('lead.first_live_detected', 'lead.first_live_escalation');

COMMENT ON INDEX public.audit_logs_live_lead_monitor_once_idx IS
  'Prevents duplicate first-live detection and escalation events per canonical lead.';

-- Rollback:
-- DROP INDEX IF EXISTS public.audit_logs_live_lead_monitor_once_idx;
