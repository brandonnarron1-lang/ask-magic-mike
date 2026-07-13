-- Public appointment request idempotency
--
-- A public appointment request creates an AdminOps confirmation follow-up.
-- Keep that follow-up idempotent without changing the broader task model.

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_one_open_appointment_confirmation_per_lead
  ON tasks(lead_id, category)
  WHERE category = 'followup:appointment_confirmation'
    AND status IN ('open','in_progress')
    AND lead_id IS NOT NULL;
