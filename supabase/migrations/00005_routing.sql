-- Migration 00005: Lead routing with SLA deadlines

CREATE TABLE lead_routing (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id            UUID NOT NULL REFERENCES agents(id),
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  assignment_reason   TEXT NOT NULL,
  agent_priority_score SMALLINT NOT NULL,        -- snapshot at assignment time

  -- SLA deadlines (computed at insert time)
  accept_deadline     TIMESTAMPTZ NOT NULL
                      GENERATED ALWAYS AS (assigned_at + INTERVAL '2 minutes') STORED,
  contact_deadline    TIMESTAMPTZ NOT NULL
                      GENERATED ALWAYS AS (assigned_at + INTERVAL '5 minutes') STORED,

  accepted_at         TIMESTAMPTZ,
  contacted_at        TIMESTAMPTZ,

  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','accepted','contacted','reassigned','escalated')),
  escalated_at        TIMESTAMPTZ,
  escalation_reason   TEXT,
  reassigned_to       UUID REFERENCES agents(id),

  notes               TEXT,

  CONSTRAINT uq_lead_routing_lead UNIQUE (lead_id)
);

CREATE INDEX idx_lead_routing_agent ON lead_routing(agent_id);
CREATE INDEX idx_lead_routing_status ON lead_routing(status);
CREATE INDEX idx_lead_routing_accept_deadline ON lead_routing(accept_deadline)
  WHERE status = 'pending';
CREATE INDEX idx_lead_routing_contact_deadline ON lead_routing(contact_deadline)
  WHERE status IN ('pending','accepted');
