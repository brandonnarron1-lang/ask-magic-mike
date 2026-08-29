# Phase 9 Capability Authority Ledger

Date: 2026-08-29

Status: isolated read-only candidate; no Production action

## Decision

Add one canonical capability/authority ledger to the existing protected Growth
Command Center. Do not create another dashboard, roadmap database, CRM,
deployment, provider adapter, lead store, or automation engine.

The ledger answers four questions before new work begins:

1. Is the capability already established in Production?
2. Is it implemented only in the reviewed ordered release train?
3. Is the next step an explicit human, hosting, contract, credential, licensed
   data, privacy, or communication gate?
4. Is the requested action intentionally prohibited?

This closes an operating-truth gap exposed by the current competitive benchmark:
database revival, recurring-value planning, first-response economics, owned
demand controls, provider contracts, and no-send messaging foundations already
exist. Treating them as missing would create parallel subsystems and more release
risk without improving the live lead pipe.

## Canonical states

| State | Meaning |
| --- | --- |
| `production_live` | Established operating capability supported by existing Production evidence |
| `release_candidate` | Implemented and reviewed in the current ordered branch train, but not Production |
| `operator_gate` | Prepared next action requires a named human approval and separate execution evidence |
| `host_gate` | Hosting-operator configuration is required and remains unapplied |
| `external_dependency` | Contract, credentials, licensed data, approved provider field map, or privacy review is missing |
| `prohibited` | Unrestricted autonomy is outside system authority by design |

Passing tests, a Vercel Preview, or a green Draft PR never changes
`release_candidate` into `production_live`. The two application-bound candidates
change state only when this exact code renders in the canonical Vercel Production
runtime. WordPress publication, hosting correction, provider activation,
consumer communication, paid spend, and public publishing remain separate even
after an application release.

## Capabilities reconciled

The ledger covers:

- canonical public intake, Neon lead storage, consent/attribution, deterministic
  routing, Lead Center, and notification outbox;
- the approved signed Gravity Form 3 bridge;
- outcome, attributed-revenue, and immutable first-response intelligence;
- accepted PR 209 durable-rate-limit authority and the later ordered candidate
  train, with the consumed PR 209 gate excluded;
- permission-aware database revival and the device-private review planner;
- prepared owned-traffic WordPress publication;
- the exact Our Town Facebook-crawler Apache remediation and the completed,
  rolled-back account-level test;
- provider-backed property/listing alerts;
- portal webhooks and ad-platform conversion feedback;
- consumer nurture and acknowledgment authority; and
- prohibited unrestricted sending, spending, publishing, rule overrides, and
  protected-class targeting.

Every item contains existing evidence, one next allowed action, and a link to an
already-protected operating surface. Exact gates are displayed only while they
remain unconsumed; the ledger cannot create or consume an approval. The PR 209
durability gate and the approved account-level Facebook-crawler gate are both
consumed and absent. The crawler test failed its 42/42 acceptance condition and
was rolled back, so the ledger records a root/WHM dependency instead of
repeating that gate.

## Architecture

- `app/lib/growth/capability-ledger.ts` is a pure, typed, deterministic model.
- `app/admin/growth/page.tsx` renders the summary and expandable decision cards
  after the existing `report:view` authorization check.
- Runtime classification uses only canonical server-side `VERCEL_ENV` to
  distinguish this exact code in Production from Preview/local execution.
- No database query, fetch, server action, mutation endpoint, provider request,
  background job, package, route, migration, environment variable, or secret is
  added.

## Security, privacy, and compliance boundary

- The ledger contains no lead, contact, property, consumer, provider-payload,
  credential, secret, client-IP, or raw analytics data.
- It grants no authority to assign, score, decide consent, send, publish, spend,
  migrate, deploy, or alter a host.
- Provider-backed inventory and alerts remain unavailable until licensing,
  field/display rules, preferences, frequency, and purpose-specific permission
  are approved.
- AI remains limited to observation, calculation, recommendation, and drafting;
  deterministic routing and human approval boundaries remain unchanged.
- Public/private authorization is unchanged because the ledger renders only
  inside the protected Growth Command Center.

## Verification contract

Required checks:

- Preview/local state keeps the current application tail labeled as a candidate
  and identifies PR #210 as the first pending predecessor;
- Production state promotes only application-bound candidates;
- WordPress, hosting, provider, consumer-send, and prohibited states remain
  separate in every runtime;
- unique keys, complete evidence, internal links, and exact existing gates;
- no form, server action, fetch, write method, or mutation path in the model or
  page;
- existing `/admin/:path*` and `report:view` authorization;
- keyboard-operable nested details, visible focus, text labels in addition to
  color, mobile containment, and no horizontal overflow;
- strict typecheck, lint, full tests, optimized build, route manifest,
  release-safety, dependency audit, secret scan, and protected Preview visual QA.

Local acceptance passes 267 files / 3,346 tests, strict typecheck, full lint,
optimized Next.js 15.5.21 build, 95/17 route proof, 14/14 release safety,
deployable-source isolation, zero known Production dependency vulnerabilities,
and responsive desktop/mobile no-write visual QA with zero axe A/AA violations.
Exact-head CI and immutable protected Preview proof remain pending until push.

Evidence:
[`CAPABILITY_AUTHORITY_LEDGER_QA_EVIDENCE.md`](./CAPABILITY_AUTHORITY_LEDGER_QA_EVIDENCE.md).

## Rollback

Revert the capability-ledger commit and redeploy the preceding verified
candidate. This removes one pure module, one protected page section, its tests,
and documentation. There is no database, provider, WordPress, DNS, hosting,
communication, analytics, or consumer state to reverse.

## Release position

PR #209 is accepted in Production and its exact durability gate is consumed.
This candidate is stacked after Draft PR #229, while PR #210 remains the first
pending application candidate. PR #230 cannot bypass PR #210 or any later
predecessor. Its future application-only gate, eligible only after predecessor
release and fresh exact-head proof, is:

`APPROVE PHASE 9 CAPABILITY AUTHORITY LEDGER MERGE AND PRODUCTION DEPLOYMENT`

That phrase does not authorize a WordPress edit, hosting change, database migration,
lead/test submission, notification, consumer communication, provider activation,
publication, paid spend, DNS change, deletion, or NellySelly action.
