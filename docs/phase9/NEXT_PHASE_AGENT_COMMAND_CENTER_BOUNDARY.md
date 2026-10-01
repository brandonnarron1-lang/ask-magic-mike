# Next phase boundary — Agent Command Center

Start this phase only after Phase E proves one live WordPress-to-Neon lead,
email/BCC delivery, replay behavior, and rollback. Reuse the canonical lead,
contact, assignment, task, notification, communication, outcome, attribution,
and audit models. Do not create another CRM, timeline, score, route, provider,
or agent database.

## Product outcome

Give an authorized operator one calm, evidence-backed workspace that answers:

1. What needs action now?
2. What happened with this person and property?
3. What is the safest next action?
4. What draft can AI prepare for human approval?
5. Which sources create qualified and closed outcomes?

## Implementation boundary

### 1. Today / next-action queue

Build a server-authorized projection over existing leads, assignments, tasks,
SLA deadlines, communication permissions, suppression, and last-human-response
evidence. Rank with deterministic rules and expose the explanation. AI may
summarize; it may not silently reprioritize, reassign, or send.

### 2. Unified CRM timeline

Compose the existing immutable audit, assignment, consent, interaction,
notification, provider callback, task, appointment, and outcome events into one
paginated read model. Preserve source identifiers, test exclusion, actor, and
correlation IDs. Do not copy rows into a second timeline table unless measured
query performance proves a projection is necessary.

### 3. Next-action engine

Return a deterministic action, due time, reason codes, blockers, and required
permission. Examples: call, review seller context, confirm appointment, retry a
failed internal alert, or hold because consent/suppression/assignment is
missing. Every suggestion must be dismissible and auditable.

### 4. AI-assisted follow-up

Use the existing OpenAI/provider boundary to produce grounded summaries,
appointment briefs, and draft follow-up. Require explicit human approval before
send. Keep prompts/results server-side, minimize contact data, cite the lead
facts used, record model/template/version, and prohibit fabricated inventory,
valuation, availability, or Fair Housing-sensitive advice.

### 5. Source and conversion reporting

Extend the existing Growth reporting with first/last touch, placement,
qualified outcome, appointment, closed outcome, response SLA, duplicate rate,
and notification health. Exclude `is_test`, suppressed, and incomplete-evidence
records from production KPIs and always display sample size/evidence maturity.

## Ordered tickets

1. `ACC-1` — canonical timeline query contract and authorization tests.
2. `ACC-2` — deterministic Today queue plus reason/SLA tests.
3. `ACC-3` — Lead Center timeline and next-action UI, mobile and accessible.
4. `ACC-4` — approval-only AI summary/draft/appointment brief with audit log.
5. `ACC-5` — source-to-qualified/closed reporting with KPI trust tests.

## Acceptance boundary

- agent sees only assigned leads unless broader permission is explicit;
- admin mutations remain server-authorized and audited;
- no draft is sent without a separate approved action;
- every recommendation exposes deterministic evidence and blockers;
- every report excludes QA/test records and reports denominator/sample size;
- browser, API, authorization, accessibility, mobile, failure, and rollback
  tests pass against an immutable Preview; and
- Production release, migration, provider activation, or external send keeps
  its own exact owner gate.
