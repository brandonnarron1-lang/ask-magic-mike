-- Migration 00010: Seed initial agents

INSERT INTO agents (
  name,
  email,
  phone,
  role,
  priority_score,
  max_daily_leads,
  availability,
  timezone,
  notification_email,
  notification_sms
)
VALUES
  (
    'Mike Eatmon',
    'mike@ourtownproperties.com',
    '+13525550001',
    'primary',
    100,
    50,
    '{"mon":[8,20],"tue":[8,20],"wed":[8,20],"thu":[8,20],"fri":[8,20],"sat":[9,17]}',
    'America/New_York',
    TRUE,
    TRUE
  ),
  (
    'Admin Escalation',
    'admin@ourtownproperties.com',
    NULL,
    'admin',
    0,
    999,
    '{"mon":[0,24],"tue":[0,24],"wed":[0,24],"thu":[0,24],"fri":[0,24],"sat":[0,24],"sun":[0,24]}',
    'America/New_York',
    TRUE,
    FALSE
  )
ON CONFLICT (email) DO NOTHING;
