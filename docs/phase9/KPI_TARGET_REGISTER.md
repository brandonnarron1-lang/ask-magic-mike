# Phase 9 KPI Target Register

Date: 2026-08-21
Status: stacked release candidate; Production database and application unchanged

## Executive decision

Reuse the existing Growth intelligence view, canonical Neon database, Lead
Center RBAC, and immutable audit ledger. Add one append-only operator target
register that refuses to turn missing evidence into a business target.

The register separates three facts:

1. whether a KPI is currently instrumented and supportable;
2. what the observed baseline and sample size are for a named window; and
3. what target an authorized operator has drafted, approved, or retired.

No target is seeded by the migration. A numeric target cannot be recorded until
the server resolves a measured baseline. The browser cannot supply or override
the baseline.

## Why this is the next useful layer

The latest read-only Production aggregate contains six test/suppressed leads and
no genuine contactable lead, first-response sample, business outcome, or spend.
That is enough to prove system state, not enough to claim a conversion baseline
or choose a numeric growth target. The register makes that distinction durable
and visible while preserving a backlog of instrumentation work.

## Reused system

- Public and operator application: the existing root Next.js `app/` router.
- Intelligence source: the existing server-only Neon Growth view.
- Database: Neon project `bitter-star-20214385`, Production branch
  `br-round-base-auh6h2wd`, database `neondb`.
- Authentication and authorization: existing Lead Center sessions,
  `report:view`, and `growth:manage`.
- Audit: existing immutable `audit_logs` table.
- Deployment: the existing `eyes-up-industries/ask-magic-mike` Vercel project.

No second analytics system, CRM, database, publisher, provider adapter, consumer
message, AI decision-maker, or parallel admin was added.

## Canonical KPI catalog

The catalog contains 32 versioned definitions across these categories:

| Category | Examples |
|---|---|
| Acquisition | useful source attribution |
| Response | median, P75, and P90 first-human-response minutes |
| Conversion | contactable, qualified, appointment, signed-client, and close rates |
| Database | stale inventory and reactivation rate |
| Economics | cost per progression, revenue, referral cost, ROAS, and margin |
| Portfolio | owned-demand and rented-demand share |
| Operations | agent acceptance, follow-up, and conversion |
| Experimentation | experiment velocity and decision quality |
| Trust and delivery | notification failures, bounce, opt-out, and complaint rates |

Each definition fixes its key, label, unit, preferred direction, minimum sample
size, and denominator language. Protected-class data and proxies are not inputs.

## Baseline state model

| State | Meaning | Numeric value allowed? | Numeric target allowed? |
|---|---|---:|---:|
| `measured` | Instrumented and at or above the minimum sample | Yes | Yes |
| `directional` | Instrumented but not mature enough for approval | Yes | No |
| `insufficient_sample` | Denominator exists but the sample is too small | No | No |
| `not_instrumented` | Required event or field is not yet canonical | No | No |
| `unavailable` | The selected window cannot support the calculation | No | No |

One exception is a truthful count metric with a minimum sample of zero, such as
stale lead inventory. A measured zero is valid when the underlying inventory is
instrumented; an absent conversion denominator is not displayed as 0%.

Every snapshot records the selected 30-, 90-, or 365-day window, observation
time, sample size, reason, minimized evidence, and a stable SHA-256 evidence
hash. Raw lead identity and contact data are not persisted in target versions.

## Target lifecycle

- `draft`: an evidence-backed proposal. It may have a numeric target only when
  the baseline is measured.
- `approved`: requires a measured baseline, numeric target, rationale, and
  explicit approval reference.
- `retired`: appends a new terminal version; prior versions are never edited or
  deleted.

Rationales, approval references, and actor identifiers reject email addresses,
phone numbers, credential-like values, and secret patterns. Idempotency is
derived from the complete normalized version contract.

## Operator and security boundary

- `/admin/growth/targets` requires a server-side `report:view` session.
- Recording a version requires a second server-side `growth:manage` check.
- Mutation is rate-limited per authenticated operator to 30 attempts per hour.
- Preview mutation fails closed before a database or baseline query.
- The page is dynamic, private/no-store, and rendered through ordinary React
  escaping; no unsafe HTML sink is introduced.
- The repository uses parameterized SQL and a server-only database connection.
- The interface shows unavailable values as **Not measured**, never as a
  fabricated 0%, $0, or zero ratio.

## Database contract

Migration `20260821213000_growth_kpi_target_register.sql` creates:

- append-only RLS table `growth_kpi_target_versions`;
- strict metric, unit, direction, status, range, state, baseline, and approval
  constraints;
- bounded indexes for current metric and approved-version reads;
- a hard UPDATE/DELETE rejection trigger; and
- idempotent security-invoker RPC `record_growth_kpi_target_version_v1`.

`anon`, `authenticated`, and public access are denied. `service_role` receives
only SELECT, INSERT, and function execution. Each new version and exactly one
`growth.kpi_target_version_recorded` audit event are committed atomically;
idempotent replay creates neither duplicate.

## Operator workflow

1. Open the protected target register and select a 30-, 90-, or 365-day view.
2. Inspect the server-resolved baseline state, sample, reason, and definition.
3. Leave unmeasured KPIs in the instrumentation backlog; do not invent a value.
4. For a measured KPI, draft a realistic target and record the rationale.
5. Approve only after the named owner/broker review exists; record its
   non-sensitive reference.
6. Retire a target by appending a new version; never rewrite history.
7. Revisit targets after real demand produces a materially different sample.

## Production cutover

Offline plan:

```text
pnpm run phase9:kpi-targets:cutover -- --plan
```

After the release reaches the front of the approved stack, the guarded runner
requires the unpooled owner connection through the secure environment. It pins
the reviewed migration hash, validates canonical Neon identity and the
publication-proof prerequisite, creates a validated mode-600 backup, acquires
an advisory lock, applies one transaction, writes the migration ledger, and
proves object, RLS, privilege, immutability, idempotency, no-seed, and unchanged
lead/audit postconditions.

Exact future gate:

```text
APPROVE PHASE 9 KPI TARGET REGISTER PRODUCTION MIGRATION, MERGE, AND PRODUCTION DEPLOYMENT
```

That gate authorizes only the reviewed additive migration, exact code merge,
and canonical Vercel application deployment. It does not authorize a target to
be recorded, an external publication, consumer message, spend, DNS/WordPress
change, or provider action.

## Rollback

- Before release: leave or close the Draft PR; no Production state exists.
- Application: promote the immediately preceding verified Production artifact.
- Database: prefer a forward fix and leave the additive empty table/RPC dormant.
  Do not drop the table or delete target/audit history as an application
  rollback.
- Target error: append a corrected or retired version; never mutate history.

## Truthful limitations

- Production currently has no genuine live sample from which to approve numeric
  conversion or economics targets.
- Several catalog entries remain uninstrumented until their canonical event or
  denominator exists.
- A target is an operator-approved operating commitment, not a forecast,
  guarantee, automated budget decision, appraisal, or assignment instruction.
- AI may later summarize evidence, but it cannot write or approve a target.
