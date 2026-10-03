# Agent Command Center — implementation plan and release boundary

Updated: 2026-10-02. This file extends the existing boundary; it does not
replace release authority, Phase E evidence, or the canonical data model.

## Verified starting point

- Canonical repository: `brandonnarron1-lang/ask-magic-mike`, based on the
  verified successor to PR #284.
- Reused authority: Neon `leads`, assignments, tasks, appointments,
  communication permissions/events, notification outbox, attribution,
  outcomes, audit logs, first-response milestones, RBAC, and existing
  Responses API boundary.
- No new CRM, lead store, score, routing engine, provider, or WordPress plugin.
- Product work is implemented on `codex/agent-command-center`; the additive
  migration is not applied to Production and the product branch is not a
  Production release until its own reviewed gate is granted.

## Compact delivery plan

| Milestone | Reused paths | Missing behavior addressed | Acceptance commands |
| --- | --- | --- | --- |
| ACC-1 timeline | `app/lib/adminLeadTimeline.ts`, `app/lib/persistence/neonAdminLeadView.ts` | Namespaced identity, immutable-vs-snapshot truth, complete sources, deterministic paging, explicit partial-source state | timeline unit tests, RBAC tests, typecheck |
| ACC-2 Today | lifecycle/scoring, assignments, tasks, appointments, permissions, notification outbox | Server-scoped ordered queue, reasons/blockers, record versions, durable snooze/dismiss and task completion | Today projection tests, mutation guards, migration tests |
| ACC-3 workspace | `/admin/leads`, lead detail, existing server actions | Today/Leads/Activity/Reports navigation, secure body-based search, server filtering/sorting/paging, accessible operational states | browser desktop/mobile/320/zoom/keyboard QA |
| ACC-4 AI drafts | `src/lib/ai/*`, copilot API/UI, AI usage storage | Pre-call shared reservation, fail-closed permissions/accounting, durable draft versions, edit/approve/reject without send | mocked provider tests, zero-budget tests, origin/RBAC/Preview guards |
| ACC-5 reporting | existing reporting and outcome models | Scoped-first aggregation, first-touch source-to-outcome, n/N, unknown/excluded evidence | reporting unit/security tests, role-scoped browser QA |

### Additive persistence

`supabase/migrations/20261002143000_agent_command_center.sql` adds only:

- operator review state over deterministic Today projections;
- atomic shared AI budget reservations/finalization; and
- immutable, versioned AI draft reviews with purpose/channel approval checks.

The migration must be tested on an attested isolated PostgreSQL database before
a separate Production migration approval. Approval never sends a draft.

## Competitive pattern check (primary sources)

- [Follow Up Boss Smart Lists and action plans](https://www.followupboss.com/features):
  prioritize follow-up and preserve one contact history. Reused as the
  deterministic Today + unified timeline pattern, without copying UI.
- [Rechat Today and CRM](https://rechat.com/): task-centered daily work and
  contact history informed the small primary navigation and evidence-first
  lead workspace.
- [Lofty AI-powered platform](https://lofty.com/): the useful pattern is a
  prioritized workspace showing what needs attention; autonomous outbound
  behavior is intentionally excluded.
- [Real Brokerage Leo CoPilot](https://investors.onereal.com/news/news-details/2025/Real-Launches-Leo-CoPilot/default.aspx):
  ready-made material for agent review informed durable draft artifacts. This
  is brokerage-specific capability evidence, not a claim that its interface
  was tested.
- [SERHANT S.MPLE](https://serhant.com/simple): documented request-to-human
  advisor service informed the request → prepared work → human review flow;
  it is not treated as pure self-serve software.
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
  and [agent evaluations](https://developers.openai.com/api/docs/guides/agent-evals):
  strict typed output, explicit refusal/failure handling, and traceable tests
  are used instead of speculative multi-agent orchestration.

Implemented patterns are independently designed for Ask Magic Mike. No
inaccessible competitor interface was claimed as tested.

Phase E proved one live WordPress-to-Neon lead, email/BCC delivery, replay
behavior, and rollback. Reuse the canonical lead,
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

## Implementation state

- **Implemented locally:** ACC-1 read model, ACC-2 deterministic projection
  and durable review contract, ACC-3 operational surfaces, ACC-4 durable
  human-review drafts and shared reservation contract, ACC-5 scoped reporting.
- **Locally verified:** tracked in the product PR receipt with exact commands;
  historical release evidence is not counted as newly executed testing.
- **Configured:** no new secret names are required; existing OpenAI feature
  flags and approved key remain authoritative. The default reviewed low-cost
  model identifier is `gpt-6-luna`, and an explicit zero budget disables paid
  generation.
- **Not activated:** additive migration, Production product deploy, live-model
  evaluation, and any communication send remain outside this implementation
  branch until their exact later gates.

## Local release-candidate receipt

Executed on the assigned Apple-silicon machine on 2026-10-02 with Node 24.
This is isolated local evidence, not Production or representative-volume
performance evidence.

- `pnpm release:gate` — PASS: Ask Magic Mike/NellySelly isolation, 14/14
  release-safety checks, 299 Vitest files and 3,638 tests, strict typecheck,
  lint, optimized Next.js build, and the 106-route manifest.
- `pnpm test:e2e` — PASS: 30/30 Chromium tests. The Agent Command Center was
  exercised at 1440 px, 390 px, 320 px, and a 200% visual zoom simulation,
  including authenticated navigation, keyboard focus, and overflow checks.
- Visual artifacts are retained locally under `output/playwright/`; they are
  review evidence, not release authority and not a claim of native-browser
  zoom or live Neon data.
- A disposable, unlinked Supabase PostgreSQL 17.6 container applied all 40
  migrations from an empty database and then passed the complete local staging
  verifier. Six rollback-only SQL contracts passed, including the new Agent
  Command Center transaction suite; counts after verification remained zero
  leads, zero notifications, and zero audit rows. Provider calls, email, and SMS
  were all zero.
- The database exercise verified RLS, explicit denial of the five new RPCs to
  `anon`/`authenticated`, least-privilege server access, queue concurrency
  versions, shared/zero AI budget behavior, over-reservation protection,
  immutable draft versions, permission-bound approval, audit writes, and
  no-send behavior. It also replaced an unsafe legacy revoked-function
  invocation in the marketing-spend contract with a catalog privilege check;
  the full verifier then completed without a database-process crash.
- The additive migration has **not** been applied or transaction-tested on
  Production. No representative-volume latency claim is made.
- Live OpenAI generation was not invoked. Mocked provider, zero-budget,
  permission, origin, RBAC, Preview, stale-fact, and no-send guards passed.

### Bounded data-access baseline

Implementation inspection and tests establish bounded round trips and result
caps; database latency is intentionally unclaimed until an isolated branch has
representative rows.

| Surface | Maximum database round trips | Bound |
| --- | ---: | --- |
| Today | 6 | 1 scoped lead query, then 5 parallel child queries; fixed per-source caps |
| Lead inbox | 2 | parallel count and paginated rows; page size 1–100 |
| Lead workspace | 13 | 1 scoped lead query, then 12 parallel timeline sources; page size 1–100 |
| Activity | 5 | selected or all authorized sources in parallel; page size 1–100 |
| Reports | 6 | 5 parallel aggregate inputs plus one optional scoped agent-name lookup |

No source query is allowed to turn into a public or cross-agent read: the lead
scope is resolved before detail children, and report/activity joins enforce the
principal scope. Partial source failures are surfaced instead of being shown as
complete history.

## Remaining release sequence

1. Complete review of PR #285 against its exact head and immutable no-write
   Preview receipt.
2. Request one exact migration/merge/same-tree Production gate with rollback
   identities. Production remains unchanged until that gate is granted.
3. Keep paid model generation disabled or at an explicit zero budget. A bounded
   synthetic live-model evaluation remains a later, separately authorized
   provider action and approval still performs no send.
