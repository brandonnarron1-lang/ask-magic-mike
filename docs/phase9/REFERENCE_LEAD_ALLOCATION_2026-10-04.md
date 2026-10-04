# Reference lead allocation — operator / release guide

Status: dependent review candidate, not Production acceptance or channel activation.
Work only in Ask Magic Mike. Neon, Vercel, the approved email provider, directory,
canonical intake, lead/contact records, tasks, assignments, audit and notification
outbox remain the authorities. No WordPress/connector, NellySelly or PropertyLens
change is included. No new public QA, provider call, credential entry or spend.

## Identity and dependencies

Fresh authority resolution on 2026-10-04: 25/25 checks passed. Accepted main is
`4e7d818d9405e3ef5f31f0feb9ffb19bdfa22c82` (PR #286), tree
`a78737b701d8da78d0539419e87ac813b8cb9c91`, Production
`dpl_6emNTgVrMq1Qc64xxYVg7GAHRC1m`. Current application remains unchanged.

This branch is `codex/reference-lead-allocation-20261004`, based on sealed,
still-open PR #287 head `8c411833f8557bce325094a1224d8301efbf1144`, tree
`eddb7c08e930a0937af03eba574b4a0090759f6e`. It does not broaden #287's gate.
PR #277 `a2b5acf01006e3105d746cf8d8ca4da653d75cec` supplies only compatible
bounded signed SMS receipt/STOP/status logic. PR #279 remains provenance,
not another merge. The existing completed public QA receipt is not replayed.

ONE new additive migration relative to #287:
`supabase/migrations/20261004160000_reference_lead_allocation.sql`, SHA-256
`f66867945f2548ceef2e29e17950be280f98dcf33befa4c9dddc9daa0ff97210`.
It is applied only to isolated local PostgreSQL in this run. #287's migration
is an independent earlier dependency: two migrations in total from accepted
#286, not two newly authored migrations here. Never modify an accepted migration.

## Connected implementation

`capture_public_lead_v2` commits the existing canonical lead/consent/attribution
and approved internal intent. The allocation due worker discovers only newly
committed non-test, non-suppressed, non-duplicate leads at/after an explicitly
reviewed `starts_at`; it does not offer historical leads after enabling a flag.
Existing trusted/non-fallback owners are retained. New investor intake is `buy`,
cash-offer seller intake is `sell`; no historical classification is backfilled.

The existing `/admin/allocation` gains real policy/queue/budget/expiry metrics and
explicit review controls; `/admin/leads/[id]` gains the shared card and evidence
task workspace. The five module names and six subtypes match the reference
family. The existing grounded copilot, versioned draft review, composer,
appointment workflow and canonical task endpoint remain the action authorities.
Missing comps/value/availability stay unknown. CMA/offer analysis preparation
saves a broker-review task, not a valuation, binding offer, packet or send.
Known financing is labeled self-reported, never independently verified.

`app/lib/leadPresentation.ts` is the server disclosure contract. Intended-agent
pre-claim pages get category/town/priority/deadline, not contact/property/free
text. Assigned views use the existing real role/ownership permissions. Audit
scope has no claim. Subjects, email offers, SMS and category JPEGs carry no
consumer identity/address/private notes or identifying property photo. The
compiled email, text and SMS share the offer ID/version/deadline. All action GETs
are read-only; an authenticated same-origin POST or enrolled signed command
contends for the same SQL claim. Scanners and forwarded links cannot assign.

## Durable allocation / delivery behavior

The new tables store **only** reviewed staff enrollment, policy, offers,
command receipts and cost reservations. They reference existing users/agents,
leads and notifications; no second lead, CRM, provider or assignment store.
Server-only grants/RLS deny browser roles. Default policy is inactive, no start
time, no approved fallback/coverage, zero paid segment/cost budgets, MMS off.

Sequential or bounded first-claim uses approved town/intent, on-duty hours,
weighted least load, daily/concurrent capacity and deterministic UUID tie-break.
Outstanding offers reserve capacity. Lead-before-offer/agent locking gives one
winner. Assignment, capacity, existing routing, history, next task, required
audit and confirmation intents commit together; any required failure rolls back.
Pass/expiry escalation is bounded, current-policy-only, never repeats a prior
recipient and leaves custodian/fallback work visible. Manual reassignment
invalidates old offers/unsent intents. No AI decides ownership.

Only `allocation_offer` / `allocation_confirmation`, pending, attempt zero,
without provider ID are selected by the bounded processor (maximum five).
Known transport/configuration holds leave pending work unconsumed. Atomic
reservations enforce reviewed segment/cost/pool/recipient limits before I/O.
SMS/MMS are alternatives: known media readiness failure chooses SMS before I/O.
Timeout, missing provider ID or ambiguous result stays processing/ambiguous;
no blind resend, budget refund or cross-channel duplicate. Provider accepted is
not delivered/inbox receipt. Old general retries and permanent failures remain
excluded by both the allocation and existing processors.

Canonical deadline starts at the offer transaction commit clock, not carrier
receipt. A delayed message never extends claim authority. Machine GET
`/api/admin/allocation/due` requires the existing cron bearer secret and Preview
guards, then expiry/discovery and separately held post-commit dispatch. Admin
same-origin POST processes due state without sending. No cadence is installed:
review a capable 60-second scheduler and measure actual delay/queue age before
promising a three-minute response/offer SLA. Existing `vercel.json` is unchanged.

## Staff enrollment and commands

`/admin/allocation/enrollment` reuses the real directory and roles. Admin approval
binds an existing active agent to its existing agent user and reviewed coverage;
it does not create a person or destination. Operational consent has exact text/
version; browser sees a bounded challenge and sends **no** outbound OTP. During
a separately approved pilot, the participating staff phone replies to the real
registered sender with `VERIFY <code>`. Possession is sender-bound, 10-minute,
five-attempt, receipt-idempotent. No arbitrary public phone registration.

`CLAIM/PASS/STATUS <8-character code>` is HMAC-scoped to agent/offer/version,
not URL bearer authority. Current directory binding, unique phone, role,
consent, availability/capacity and deadline are rechecked. `PAUSE`/`RESUME` do
not grant consent. Signed bound `STOP` revokes even before possession verification
and despite the command throttle; consumer STOP/suppression still runs. Revoked,
unknown or shared destinations cannot view or claim. Inbound/status validate
signature, account, destination, SID/hash replay/conflicts and lifecycle ordering.
Processing legitimate callbacks/STOP is not disabled by an outbound pause.

`HELP`/`STATUS` are deterministic no-charge application results in this candidate;
they do not queue an automatic reply. Provider-supported help/opt-out replies,
real sender registration and handset behavior are **UNVERIFIED** and must be
reviewed before activation. START does not restore consumer marketing grants.
Mike remains custodian until approved policy says otherwise; audit Brandon is
not made an eligible agent by this implementation.

## Safe activation boundaries (NOT executed)

1. Accept #287 under its independent current gate; rebase this candidate on that
   accepted main, then repeat exact-head CI, immutable Preview and no-write QA.
2. Backup/verify the existing Neon schema and predecessor; apply only the exact
   additive source above under a new migration/application approval. Deploy the
   same reviewed tree, flags held. Keep original capture/alert behavior intact.
3. Securely enter a dedicated command/binding key via the approved hosting
   interface. Review directory/coverage/hours/caps/fallback/policy version/start
   and purpose-specific staff consent/possession. No secrets in chat or commits.
4. Inspect real Twilio account/sender/use-case/trial restrictions/registered
   messaging compliance, consent, actual prices and existing email sender.
   This run has not registered, purchased, ported or verified a sender. Preserve
   public brokerage phone. No account-ready inference from env presence.
5. Separately approve a staff-only pilot with exact participating people,
   message counts, provider replies, segment/MMS/inbound costs and evidence.
   Do not clear QA suppression, reuse the public QA record or reassign a prospect.
6. Only after those proofs approve budgeted policy/scheduler/send activation.
   Measure server offer/accept/expiry delay separately from carrier and first
   human contact. Review source-to-assignment/conversion in existing reporting.

New `.env.example` names are safe preparation, not actual environment changes:
`LEAD_ALLOCATION_ENABLED`, `LEAD_ALLOCATION_SENDS_ENABLED`,
`LEAD_ALLOCATION_DUE_ENABLED`, `LEAD_ALLOCATION_COMMAND_SECRET`,
`LEAD_ALLOCATION_TRANSPORT_APPROVED`, `LEAD_ALLOCATION_SEGMENT_COST_MICROS`,
`LEAD_ALLOCATION_MMS_COST_MICROS`, `LEAD_ALLOCATION_MMS_FETCH_VERIFIED`.
Boolean controls default false. Existing Twilio/provider/RBAC/production-delivery
controls must also pass; no new provider credentials or channel are introduced.
The schema separately holds `active`, reviewed version/start/fallback/roster,
MMS opt-in and explicit daily budgets. Rotation invalidates pending phone/code
bindings; do not rotate during a live pilot without its separate scope.

## Review / verification

Existing protected `/admin/message-previews` is extended, not replaced. Synthetic
fixtures have explicit QA markers, no real identity/property and no sender
controls. Select module, disclosure tier, state, priority and channel. Non-TEST
visual priority does not unsuppress or persist a fixture. Mail is real compiled
HTML/text; SMS is exact encoding-aware body; MMS is actual JPEG plus text.
Assigned screenshots are synthetic, not four-role live database acceptance.

Commands (Node 24.18.0, pnpm 10.30.3; one heavy pipeline at a time):

```sh
pnpm install --frozen-lockfile
pnpm release:gate
AMM_QA_POSTGRES_TEST=1 pnpm exec vitest run tests/persistence/reference-allocation-postgres.test.ts tests/persistence/automatic-qa-audit-evidence.test.ts tests/persistence/notification-reliability-postgres.test.ts --no-file-parallelism
AMM_E2E_BUILT=1 AMM_E2E_PORT=3219 VERCEL_ENV=development pnpm exec playwright test tests/e2e/reference-allocation.spec.ts
node scripts/amm/reference-allocation-comparison.mjs
pnpm smoke:prod
```

Local browser command additionally used an unmistakably synthetic local-only
admin fixture secret and disabled RBAC in the isolated no-database browser
venue; it did not weaken Production auth. Actual four-role handler tests use
real permission policy with mocked session/SQL. Actual built, DB-backed
four-role sessions and authenticated cloud Preview remain separate acceptance
checks. Gmail/Apple Mail/Outlook inbox rendering, carrier/media fetch, staff
device receipt, provider registration/billing, live allocation and independent
primary/BCC receipt are **UNVERIFIED**. This candidate sends nothing to fill gaps.

Screenshots, 1080x1350 masters, comparison PNGs and browser trace are local,
ignored `output/` artifacts, retained with the candidate worktree; not provider
receipts. Source hashes and optimized public category artwork are in the
existing visual asset register. `design-qa.md` records the visual gate. The PR
receipt holds exact head/tree, hosted status and measured command counts.

Session evidence (not inherited): frozen install passed; final `release:gate`
passed 3,688 unit tests / 46 skipped, typecheck, lint, build, isolation/safety
and 113 active route identities. Three actual isolated PostgreSQL suites passed
47/47 (57.70s) including a no-send accepted SMS and enrolled-sender-bound CLAIM sharing
one offer/assignment. Final built Chromium review passed 5/5 (8.8s), all four
widths, six subtypes, assigned/pre-claim, keyboard and 200% text zoom. Read-only
Production smoke passed 19 checks / 2 skipped: authenticated admin health and
write mode were not run. Release doctor before freeze had one nonblocking dirty
worktree finding; rerun after commit for the exact-head receipt. No synthetic
record was written to Neon and no real provider message was sent.

The positive PostgreSQL orchestrator test invokes the canonical enrolled-staff
helper, not a carrier-originated signed HTTP request. Signature/account/SID
validation is separately exercised in isolated webhook handler tests. Neither
is a real handset proof. Final clean release doctor passes 58 / 0 fail / 1 skip.

## Rollback

Before any activation, review a configuration rollback that pauses new offers/
sends/due dispatch, makes policy inactive and preserves STOP/status reception.
Do not drop called functions, revoke the provider sender, remove consent/audit
history, delete QA evidence or promise to unsend accepted messages. Existing
accepted assignments remain canonical. Already started/ambiguous sends require
provider reconciliation, not automatic replay or reservation release. Preserve
the additive schema while reverting callers to the compatible accepted #287
application; do not restore pre-286 capture v1. Exact accepted deployment must
be re-resolved at that gate, not guessed from this dated document. Pending held
offers become non-actionable under current policy checks. No rollback or live
data mutation was performed here.
