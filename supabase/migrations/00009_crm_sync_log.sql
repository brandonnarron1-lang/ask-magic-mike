-- Migration 00009: CRM sync audit log

CREATE TABLE crm_sync_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  lead_id         UUID NOT NULL REFERENCES leads(id),
  operation       TEXT NOT NULL CHECK (operation IN (
    'create_contact','update_contact','create_lead','update_lead',
    'create_task','log_note','attach_transcript'
  )),
  adapter         TEXT NOT NULL,              -- 'null' | 'follow_up_boss' | 'kvcore'
  status          TEXT NOT NULL CHECK (status IN ('success','error','skipped')),
  request_payload  JSONB,
  response_payload JSONB,
  error_message   TEXT,
  duration_ms     INTEGER
);

CREATE INDEX idx_crm_sync_log_lead ON crm_sync_log(lead_id);
CREATE INDEX idx_crm_sync_log_status ON crm_sync_log(status);
CREATE INDEX idx_crm_sync_log_occurred ON crm_sync_log(occurred_at DESC);
CREATE INDEX idx_crm_sync_log_adapter ON crm_sync_log(adapter);
