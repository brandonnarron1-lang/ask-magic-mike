# Reference lead allocation — operator / release guide

Current status (2026-10-05): #289 accepted; #290 forward-reconciled onto that
accepted main; staff-pilot command readiness remains a disabled candidate,
not a Production release or pilot activation.
The dated review history below remains evidence of earlier states. The
Post-289 reconciliation below supersedes earlier pending-release statements.
Work only in Ask Magic Mike. Neon, Vercel, the approved email provider, directory,
canonical intake, lead/contact records, tasks, assignments, audit and notification
outbox remain the authorities. No WordPress/connector, NellySelly or PropertyLens
change is included. No new public QA, provider call, credential entry or spend.

## Historical #288 review identity and dependencies (2026-10-04)

Fresh authority resolution at 2026-10-04T22:22:39Z: 25/25 checks passed. Accepted
main is `4f00826043bbe2b2d13779fd143d28a66ff61158` (PR #287), tree
`eddb7c08e930a0937af03eba574b4a0090759f6e`, Production
`dpl_2bZJGzHEzrPLZa9qrueGDk38nMhY`. This session has not changed Production.

PR288's branch is `codex/reference-lead-allocation-20261004`. Accepted main was
merged non-destructively; PR #288 now targets `main`. The rescue branch
`rescue/amm-pr288-pre-master-acceptance-20261004-2230` preserves the prior head
`35280b7bae317ab0c8fa7d751cc1dc09db5005f2`. #287 is accepted, not a pending gate.
Its historical reviewed head was `8c411833f8557bce325094a1224d8301efbf1144`.
PR #277 `a2b5acf01006e3105d746cf8d8ca4da653d75cec` supplies only compatible
bounded signed SMS receipt/STOP/status logic. PR #279 remains provenance,
not another merge. The existing completed public QA receipt is not replayed.

ONE new additive migration relative to #287:
`supabase/migrations/20261004160000_reference_lead_allocation.sql`, SHA-256
`f66867945f2548ceef2e29e17950be280f98dcf33befa4c9dddc9daa0ff97210`.
It is applied only to isolated local PostgreSQL in this run. #287's migration
is already accepted. There is exactly ONE migration relative to current main;
do not reapply #287. Never modify an accepted migration.

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

The existing routing workspace now filters the bounded canonical candidate /
offer read model by intent, town, source, owner, priority, offer and lifecycle.
It exposes real recipient/channel records, policy/deadline and reviewed roster /
capacity without leaking contact destinations or implying current eligibility.
Native expandable filters/health keep mobile lead rows ahead of configuration.
SQL remains the allocation authority. Lead-detail next steps use loaded canonical
appointments, open tasks and documented outcomes, not notification delivery or
decorative checkmarks. No approved packet is fabricated.

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

1. #287 is accepted and #288 is merge-reconciled against main. Seal the final
   reviewed source, then repeat exact-head CI, immutable Preview and no-write QA.
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
pnpm test:reference:sessions
AMM_E2E_BUILT=1 AMM_E2E_PORT=3219 VERCEL_ENV=development pnpm exec playwright test tests/e2e/reference-allocation.spec.ts
node scripts/amm/reference-allocation-comparison.mjs
pnpm smoke:prod
```

Historical pre-master browser evidence used an unmistakably synthetic local-only
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

Historical pre-master session evidence (not rerun evidence for the updated head):
frozen install passed; that session's `release:gate`
passed 3,698 unit tests / 47 skipped, typecheck, lint, build, isolation/safety
and 113 active route identities. Three actual isolated PostgreSQL suites passed
48/48 (58.96s) including real admin routing read queries, a no-send accepted SMS
and enrolled-sender-bound CLAIM sharing one offer/assignment. Built Chromium
review passed 6/6 (9.4s), including the real no-send routing board and all four
widths, six subtypes, assigned/pre-claim, keyboard and 200% text zoom. Read-only
Production smoke passed 19 checks / 2 skipped: authenticated admin health and
write mode were not run. Release doctor before freeze had one nonblocking dirty
worktree finding; rerun after commit for the exact-head receipt. No synthetic
record was written to Neon and no real provider message was sent.

The historical positive PostgreSQL orchestrator test invokes the canonical enrolled-staff
helper, not a carrier-originated signed HTTP request. Signature/account/SID
validation is separately exercised in isolated webhook handler tests. Neither
is a real handset proof. That historical release doctor passed 58 / 0 fail / 1 skip.

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

## Master completion delta — 2026-10-04

This section supersedes the earlier real-session/HTTP acceptance limits, not
historical receipts. Eight built Chromium tests passed again at 23:07:19Z with genuine
Better Auth password/session rows and real isolated PostgreSQL17. Five synthetic
identities cover four roles plus a competing agent. The test-only Neon HTTP wire
adapter executes unchanged SQL, not query/result mocks. It rejects non-loopback
database targets and external fetches. RBAC, Origin checks and Preview guards
are not disabled. Docker publishes only a random loopback port, bounds memory
to 512MiB and removes only its UUID-labeled disposable container afterwards.
Production credentials are not inherited. Fictional contacts cannot receive
messages; application and provider sends remain false, budgets zero.

Proven: real login, assigned-only list/detail, analyst reporting, direct URL/API
denials, preclaim redaction, stale version rejection, browser Claim, exact Pass
replay, a signed HTTP SMS/web race with one assignment/task/audit winner and one
confirmation per approved channel, official Twilio SDK signature conformance,
account/destination/phone binding, possession VERIFY, PAUSE/RESUME, STATUS,
throttle/STOP precedence, no consent restoration through START, real task stale
form/completion, persisted Today snooze, timeline pagination and session revocation.
Six studio subtypes render under a real admin session at 320/390/768/1440px,
keyboard/200% text; compiled email images-off, expired SMS and actual category
JPEGs pass. This is browser rendering, not mailbox/carrier/device acceptance.

Discovered and fixed: staff availability/STOP SQL needed an explicit command
parameter cast; native driver Date values were omitted from task/appointment,
Today and timeline projections; PostgreSQL task/appointment CAS versions must
be selected as text to retain microseconds. Assigned cards with no question now
say "Original question not recorded", not "identity locked". Regression tests
retain consent holds. No permission, routing, QA suppression or schema safety
rule was relaxed.

Isolated load: 300 additional synthetic leads (225 normal-like local fixtures,
75 QA/suppressed), 1,500 audit rows; 12 samples per route, concurrency3, predeclared
p95 budget2,000ms. Today p50/p95=230/261ms; inbox88/97; paginated detail36/40;
allocation51/76; analyst reporting27/31; zero HTTP/projection errors. App RSS
observed during SQL fetches peaked550MiB, not whole-machine peak memory. SQL plan
is retained; the small dataset does not justify a new index. This is loopback
performance, NOT Neon/Vercel latency, dispatch throughput or a promised SLA.
Final fixture count306 leads/16 notification intents/0 provider IDs/0 reservations;
none were written to Production. Test database was removed after acceptance.

Fresh final-source gates: frozen install; `pnpm release:gate` (3,703 passed,
47 skipped; typecheck, lint, build, isolation, safety14/14,113 routes); three
real PostgreSQL suites48/48 in56.56s; real-session Chromium8/8 in11.8s;
read-only predecessor Production smoke19 pass/2 skipped; production dependency
audit reports no known vulnerabilities. Authenticated Production health and
mutations were not run. Exact-head hosted evidence is collected after sealing.

Fresh public WordPress audit:42/42 pages HTTP200, Home Value destination and four
UTMs intact; Form7 appears on39 pages, Forms1/3/4/6 on one each. This public scan
does NOT verify authenticated forwarding/consent configuration. Four legacy
native capture pages, five multiple-surface pages, two incomplete CTA UTM links
and two incomplete embeds remain review holds. Forms2/5 were not found in this
sitemap, not declared absent from WordPress. No publication or plugin change.

Private local evidence: `.amm-run/reference-session-acceptance/{receipt.json,
performance.json,transport.log,wordpress-audit.json,build.log}` and actual
`output/playwright/real-session-*` screenshots. Keep with the preserved worktree;
do not upload credentials, cookies, traces, live contacts or private backups.
Hosted current-head CI/Preview are recorded in the frozen PR receipt separately.

### One completion register — reconciled 2026-10-05

| Priority / track | State | Evidence / exact gap | Dependency and next action | Owner / acceptance / scope |
| --- | --- | --- | --- | --- |
| P0 existing capture/QA/email | VERIFIED LIVE | Accepted #289 preserves earlier capture/provider delivery proof; independent primary/BCC mailbox receipt still unverified | Preserve; do not repeat lead/send or permanent failures | Release operator; accepted receipt unchanged; Production |
| P0 #288 real auth/HTTP | ACCEPTED | Accepted merge472b4bcd/tree3aa30e84; receipt and 25/25 fresh resolver checks | Preserve completed release; no repeated migration/QA | Production; historical test tiers remain distinct |
| P1 #288 disabled release | ACCEPTED | Migration ledger1/exact source hash; policy inactive/budgets0; enrollment/offer/reservation0 at11:16Z | Consumed approval; not requestable | Owner/release operator; no cadence or send activation |
| P1 scheduler #289 | ACCEPTED | Accepted main b8aba8b0/tree0f765c93; Ready dpl_81e1MY7Y79dQcYYcoTq1U72ED1ZZ; fresh authority25/25;16:09Z ledger1/exact scheduler SHA, lease0 | Consumed migration/release authority; preserve accepted scheduler and receipt | No due/retry Production probe; no cron/env/activation |
| P1 command capability #290 | RECONCILED / RELEASE HELD | Accepted main merged forward; rescue branch preserves e1b60d1; ONE pilot migration, Production ledger0/table absent | Fresh exact-source local/hosted/immutable Preview seal, then separate capability-only gate | No pilot scope, staff enrollment, provider configuration or sends |
| P1 Twilio/channel | EXTERNAL GATE | Owner sign-in completed; authenticated account chooser says No Accounts Yet; no sender/registration/account price to inspect | Owner identifies existing account or separately approves legitimate setup; no creation implied | Owner; no purchase/config/send authority |
| P1 HELP/STATUS handset | ISOLATED TEST-PROVEN / LIVE UNVERIFIED | Separate successor queues canonical fixed reply, signed HTTP/SQL/provider fake proof; provider HELP/STOP/START never gets duplicate app response | Capability release then actual account/registered sender/approved handset proof | No carrier/device delivery claimed |
| P1 staff pilot / roster | PREPARED / EXTERNAL DEPENDENCIES | Private expiring/capped QA context implemented; live enrollment0; Mike missing unique mobile/SMS/possession; second genuine agent absent | Combined packet below; no invented agent/admin eligibility; code release is not pilot authority | Explicit endpoints, price, window and paid effects required before pilot |
| P1 allocation activation | EXTERNAL GATE | No approved policy/start/caps/channel/cadence; dispatch inactive | New-only cutoff and small rollout after release/channel/pilot/lease acceptance | BIC/owner; no historic/QA redistribution or retry drain |
| P2 owned acquisition | VERIFIED LIVE | Page3952 link-out remains intact; other placements/legacy forms held,42-page read-only scan | Separate page/builder backup/diff authority; Form7/entry1550 remains held | Owner/WordPress operator; sequential publication, never global CSS/cache |
| P2 measurement | UNVERIFIED | Consent bridge1.2.0 is separate from Connector1.1.0; current tag-order/grant/revoke not newly proven | Isolated privacy tests then separate measurement activation gate | Owner/analytics; no PII, QA/admin exclusion; attribution independent |
| P2 conversion / nurture | TEST-PROVEN | Existing appointment-request/review-only workflow and consent regression suites; no live calendar/automation acceptance | Preserve truthful request; review stopping events/quiet-hours before separate activation | Operator/BIC; not a confirmed booking or permission to message |
| P2 AI / licensed data | UNVERIFIED | Existing GPT-6 Luna review-only adapter; current official model docs checked; account access, paid outputs/feed rights unproven | Redacted rubric + approved evaluation budget, broker/data-rights review | Owner/BIC; no model switch/spend, invented MLS/value or autonomous sends |
| P2 reporting/performance | TEST-PROVEN | Five role-scoped built views,300-lead/1,500-audit fixture within local budgets; no production conversion claims | Hosted/network cohort proof and genuine source-to-outcome events | Engineering/operator; clicks/delivery/contact/booking/outcome remain distinct |
| P1 operator / restore | UNVERIFIED | Synthetic role acceptance is not Mike/roster acceptance; synthetic-only pg_dump/restore tested, live secure backup/restore remains unverified | Own-login operator checklist; existing secure backup to isolated destination under data scope | Owner/operator; preserve accepted assignments/audit/STOP on rollback |
| P3 expansion | DEFERRED EXPANSION | Native sources/calendar, reactivation, homeowner updates, licensed search, campaign packets, voice notes, source-to-close coaching | Begin one actually used integration only after core dispatch acceptance | Product owner; not a hidden launch prerequisite |

Next unmet application gate (NOT approved):
`APPROVE ASK MAGIC MIKE STAFF PILOT COMMAND READINESS PRODUCTION MIGRATION, MERGE, AND SAME-TREE PRODUCTION DEPLOYMENT`.
Binding: separately sealed PR290 final head/tree, one pilot migration SHA256
`c7673e70ea45ed0055216d0af9a0f7bb1b40e9d993ff790fe04a3ee040820b52`.
No environment changes; no activation, roster, provider setup, pilot, cadence,
messages, spend, WordPress/DNS/billing/NellySelly or historical retries.
Initial compatible application rollback is accepted289
`dpl_81e1MY7Y79dQcYYcoTq1U72ED1ZZ`; resolve again before any release.

### Historical separate scheduler review / operating boundary (2026-10-04)

PR288 remains sealed separately. The successor adds ONE operational singleton
lease (not another queue), an additive migration, and the existing protected
due processor's lease/checkpoint wrapper. It does NOT modify `vercel.json`,
install cadence, approve policy, enroll staff, or change environment values.
`config/lead-allocation-cadence-readiness.json` is preparation, not activation.
Successor branch:`codex/allocation-scheduler-readiness-20261004`. It adds ONE
migration relative to sealedPR288, TWO pending migrations relative to accepted
PR287. Never apply the successor migration under PR288's one-migration gate.
Source:`20261004233000_lead_allocation_scheduler_lease.sql`, SHA256
`db4741b4472efc086e575353db6dd78ccac26944597fcb19ce2d359c00f0d480`.
The predecessor expiry function becomes a compatibility wrapper around the
same versioned implementation, with discovery explicitly held during overload;
save existing function definitions/ACLs before any separately approved cutover.
Fresh successor local gate:3,708unit pass/56skip,typecheck/lint/build/isolation/
safety113route identities; real-session8/8. Nine real SQL tests cover lease
race/restart/stale-token fence,cadence replay,no-send hold,downstream failure,
browser ACL denial,13synthetic no-network dispatches across5/5/3batches including
3confirmations,bounded expiry during overload,and synthetic pg_dump/restore.
Final combined four-suite run57/57 passed in71.61s, including scheduler9/9.
Fixture provider IDs are synthetic, not receipts.
Restore compares row totals and actual catalog-function hashes in an isolated
destination; no live PII/credential/backup was copied and Production restoration
is not claimed. All disposable databases/containers were removed.
Authenticated read-only Vercel evidence:eyes-up-industries is active Pro;
official [cron usage](https://vercel.com/docs/cron-jobs/usage-and-pricing)
permits per-minute scheduling; function usage still has costs. Ninety-second
crash lease plus a45s function ceiling can delay recovery to a later tick.
Early/duplicate invocations inside60s are held; do not promise exact intervals.
Record actual start gap/lateness and backlog age from DB-clock receipts.

Five intents/tick is NOT five leads/minute. Synthetic actual processor fixtures
include confirmations. Algebraic review bound:SMS-only offer+confirmation is
two intents/lead; dual-channel is four, before escalation. Three dual-channel
arrivals/minute demand12intents/minute versus a5maximum and accumulate70 over
ten modeled minutes; not measured carrier throughput. Existing20sends/agent/day,
paid budget, hours/capacity, Preview and suppression gates still apply. No
expected live arrival volume has been approved. Above50pending or600s age,
hold new discovery, clean expired offers boundedly, keep custodian ownership,
and require operator review; never silently drain or widen retry eligibility.

Fresh acquisition preparation:existing QR factory produced seller/buyer/renter
SVG +224/448px PNGs; Apple Vision decoded6/6 actual images. Public `/go/qr-*`
redirects307 to the exact owned tracked routes with UTMs. Local receipt/assets:
`.amm-run/reference-session-acceptance/owned-qr/`. This is not print/device or
publication acceptance. WordPress/public distribution remain separate holds.

Daily operator procedure (not automated human acceptance):

1. Resolve accepted release; review Today, unassigned/fallback, queue age,
   ambiguous provider outcomes, permanent failures and consent holds read-only.
2. Assigned agent uses own login:Claim/Pass, notes/task/next action, reviewed
   draft, appointment *request*, evidenced human contact and verified outcome.
   Delivery/clicks never count as contact or booking.
3. On duplicate ownership, wrong recipient/suppression, budget breach or absent
   fallback, use the separately authorized pause procedure. Preserve assignments,
   audit, STOP/in-flight callbacks and ambiguous reservations; no blind resend.
4. Review true source/cohort counts excluding QA/duplicate/suppressed/unknown;
   no conversion/revenue assertions without sufficient genuine outcomes.

Staff pilot remains held:actual participants/own-login consent and channel
registration are not verified. Brandon audit does not create agent eligibility.
Historical preliminary matrix (superseded by the finite packet below):
prepare SMS-first two-approved-agent matrix:up to16inbound messages and
8outbound messages/24segments,0MMS; count automatic provider responses inside
the ceiling. Current official [US pricing](https://www.twilio.com/en-us/sms/pricing/us)
lists$0.0083base/SMS segment each direction:up to$0.332base plus carrier,
number and registration charges; actual account/trial/pricing UNVERIFIED.
No purchase/send authority. HELP/STATUS handset reply and a safe staff-only
pilot capability must be proven before pilot; ordinary QA stays suppressed.
Existing tested consumer automation remains held. AI is review-only, with no
paid evaluation/account entitlement or licensed live MLS proof in this run.

## Post-289 reconciliation and executable pilot packet — 2026-10-05

### Current accepted source and PR290 boundary

Fresh authority resolution at16:00:32Z passes25/25: accepted main
`b8aba8b091a5dda38bf8b474dcaeadd8cc36d399`, reviewed/deployed tree
`0f765c935ef57467f93c864bd543c351f5641f4b`, Ready Production
`dpl_81e1MY7Y79dQcYYcoTq1U72ED1ZZ`. The immutable
[acceptance receipt](https://github.com/brandonnarron1-lang/ask-magic-mike/releases/tag/amm-production-acceptance/dpl_81e1MY7Y79dQcYYcoTq1U72ED1ZZ)
remains the authority. #289 is completed; do not replay its approval/migration.

Existing PR290 branch `codex/staff-pilot-command-readiness-20261005` was
forward-merged with accepted main in `78063b7`; no force-push/rebase/reset.
Rescue `rescue/amm-pr290-pre-accepted289-20261005` preserves `e1b60d1`;
the existing rescue stash, generated assets and earlier private receipts remain.
The final exact-source PR290 seal belongs in that PR, not a mutable branch or
inherited Preview. Capability release approval is absent. There is exactly ONE
additional migration relative to accepted #289, zero environment changes and
no pilot/roster/provider/WordPress/cadence activation. Compatible application
rollback is accepted #289 above; retain schema/audit/STOP/assignment records,
never drop functions called by the app.

### Historical pre-289 reconciliation — retained, superseded above

Fresh accepted authority at11:07:47Z:25/25. Main/Production is
`472b4bcd5ae367f3a3c4f1af84531cdde2439e9f`, tree
`3aa30e848a2bc2013ac65bb61cd695d7adf0a096`, deployment
`dpl_B5vrcWKotEHBz4EyBJ6bdD6veY9r`. Accepted #288 migration source/ledger
matches `f66867945f2548ceef2e29e17950be280f98dcf33befa4c9dddc9daa0ff97210`.
Its first wrapper rollback (absent anon role) and corrected two-catalog
verification remain historical disclosures, not a reason to replay the release.

#289 was forward-merged onto accepted main without force-push; rescue branch
`rescue/amm-pr289-pre-post288-reconcile-20261005` preserves2bc9d902.
Five ten-second requests could exceed the45s route ceiling. Final34fd0674
fixes the start budget to30s from orchestration entry, including discovery;
real lease fencing still runs before each I/O. No timer extends the window.
The one scheduler SQL source is unchanged. Fresh local3710unit/56skip,
57real-PG,8real-session,build/typecheck/lint/isolation/safety/113routes pass.
Hosted [37304847363](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/37304847363)
passed on the final head. Protected immutable Preview
`dpl_AXt3RVCACm4v35r2ctwhfx2spxDJ` matches that head/project; no-write checks
15pass/12skip. Privileged health, cloud mutations and device checks are skipped,
not accepted. Exact wrapper succeeds with present and absent browser roles;
forced post-source verification failure rolls everything back and preserves
canonical capture bytes. At that earlier observation #289 was draft/unmerged;
ledger0/table absent. Those observations are not the current release state.

Separate branch `codex/staff-pilot-command-readiness-20261005` adds one
capability migration relative to #289:
`20261005140000_staff_allocation_pilot.sql`, SHA256
`c7673e70ea45ed0055216d0af9a0f7bb1b40e9d993ff790fe04a3ee040820b52`.
It installs no rows/roster/schedule and updates no global allocation policy.
`LEAD_ALLOCATION_STAFF_PILOT_ENABLED` and
`LEAD_ALLOCATION_STAFF_PILOT_SENDS_ENABLED` are documented false defaults;
no deployment environment has been changed. The future capability-only gate,
not an approval or currently requested activation, is:
`APPROVE ASK MAGIC MIKE STAFF PILOT COMMAND READINESS PRODUCTION MIGRATION, MERGE, AND SAME-TREE PRODUCTION DEPLOYMENT`.
#289 is now accepted. Refresh/seal this successor, then under its separate
capability-only approval apply only its exact guarded migration and deploy
matching callers. No paid pilot authority is implied.

### Account, directory and legitimate possession dependencies

Fresh Production read-only snapshot16:09:30Z: #289 ledger1/exact source SHA,
#290 ledger0/table absent; scheduler lease0. Staff_v1 inactive, starts/approval/
fallback null, budgets0, MMSfalse; enrollments/offers/commands/reservations0.
Existing10leads/4contacts/27consents/10attributions/22audits/20notifications/
6assignments/1task are observations, not frozen concurrent-business guarantees.
Queue processing0/retry-due0; two historical permanent failures are preserved.
Neon is the existing bitter-star project/primary production branch; no new DB.

Mike's genuine directory ref `b9c08f62-673f-4cac-bb4b-8f2c87227eb1` has an
active primary-owner user binding, but no directory mobile, SMS preference or
operational enrollment/consent/possession. Current hours are Mon–Fri8–20,
Sat9–17 America/New_York; no Sunday coverage. These hours are not a newly
approved pilot roster. The other admin-escalation row lacks an agent-user/mobile
binding and is not an eligible second participant. Brandon audit is not an
agent. Second genuinely approved agent, private endpoints and fallback are
still unselected. Do not arm a two-person contract until those exist.

Owner completed legitimate Twilio sign-in. The authenticated account chooser
shows **No Accounts Yet**; no account/subaccount, sender or service is available
for inspection in this identity. Screenshot is private in
`.amm-run/post289-pr290-readiness-20261005/twilio-account-summary.png`.
No account was created and no phone/provider/credential setting was changed.
Trial status, registration, callbacks, account-specific prices and delivery
limits remain UNVERIFIED. Owner must identify an existing accessible account or
separately authorize legitimate setup. Any setup gate must bind sender/service/
callbacks,
registration and secure Vercel values; no purchase or irreversible Advanced
Opt-Out enablement is implicit. Preserve Resend and public brokerage phone.

For each approved staff participant: existing own login → administrator binds
allowlisted directory/user → exact operational consent → browser challenge
(no outbound OTP) → phone sends VERIFY to actual registered sender → existing
sender/binding/SID/hash verification → explicit SMS-only preference + RESUME.
An expiring private scope allows only its owner to approve that roster; no
arbitrary endpoint, public form or administrator can become an agent.

### Server scope, templates and proposed cost envelope — NOT APPROVED

The private operational scope requires an unbanned approving administrator,
approval reference/reviewed tree/current price evidence,1–2 unique allowlisted
agent references, explicit fallback, positive caps and a start/end ≤1hour.
There is no HTTP arming/price/roster/budget endpoint. An separately approved
guarded operator transaction must bind the actual recipients/window/pricing
under canonical advisory lock731042026;
the capability migration creates zero scopes. Pre-window, expired, paused,
wrong-owner, preview or unapproved operations fail closed.

Protected same-origin administrator POST `/api/admin/allocation/pilot` accepts
only strict `seed {pilotId,index:1..3}`, `offer {pilotId,leadId,version}`,
`dispatch {pilotId}`, `pause {pilotId}`, `expire {pilotId}`. Pause/expiry may
close an existing owned scope after its window; they cannot reopen it. Seed
uses canonical capture, registration and audit once per index, with no contact
endpoint, no consumer permission or notification, all QA/suppression flags true,
and name `INTERNAL QA — DO NOT CONTACT`. Source is private
`staff_allocation_pilot_v1`; a matching source string alone grants no exception.
Ordinary due, retry and KPI paths exclude these fixtures.

Canonical offer/claim/assignment/outbox/reservation functions are reused with
checked predecessor replacements, not another routing service. Pilot offers,
assignments, last-offered load-balancing and budget reservations do not consume
ordinary capacity/budgets. Real directory/RBAC/consent/possession/binding checks
remain. MMS/email are held. `reference_cards_v1` SMS offers/confirmations and
fixed `staff_commands_v1` HELP/STATUS/VERIFY/PAUSE/RESUME/CLAIM/PASS responses
share the same outbox and cap. Reply templates never contain raw inbound text
or consumer contact data. STATUS explicitly reports a requested snapshot.

Signed account/destination HTTP validation precedes every command. Provider
`OptOutType=HELP/STOP/START` means Twilio already replied: no duplicate app
message. Empty TwiML prevents a second synchronous response. STOP bypasses
action throttles/caps, revokes staff SMS, and retains consumer STOP processing;
START/RESUME never restore revoked purpose consent. Exact SID replay cannot
send again; SID/body conflicts are rejected. A known hold leaves intent pending;
unknown provider outcome retains processing/ambiguous reservation for inspection,
never automatic resend/refund. General retries cannot select allocation replies.

Proposed one-hour, two-approved-agent, SMS-only scenario ceiling (unapproved):
3 registered staff-only contexts;22 application outbound messages,66 segments,
≤3segments/message,≤12messages/agent,32mutating actions. Candidate scope budget
would be1,320,000micros at a reviewed **$0.020/segment** ceiling. Isolated
server enforcement covers application messages/segments/reservations only.
Allow20inbound one-segment commands plus2reserved provider-only HELP/STOP replies:
up to24total outbound messages/68segments +20inbound segments. Model=$1.76;
proposed total usage ceiling=$2.00,margin$0.24. These are proposals, not funds or
recipient authorization. Unexpected long inbound texts/provider auto-replies,
tax/add-ons/unrelated account traffic are not controlled by app reservations.
Actual quote exceeding the model keeps activation held and requires review.

Current official [US pricing](https://www.twilio.com/en-us/sms/pricing/us):
$0.0083base/segment each direction; listed long-code carrier surcharges up to
$0.005outbound/$0.0035inbound; failed-message fee$0.001/message. Existing number
fees ($1.15long-code/$2.15toll-free monthly), registration/setup, recurring,
optional engagement/compliance services and taxes are separate, unverified
account costs. No new number/registration/subscription is authorized.
See [Advanced Opt-Out](https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out)
for provider reply precedence; configuration itself remains unchanged.

The current official [trial guide](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account)
distinguishes new and legacy Console experiences. New trials use predefined
message templates rather than arbitrary custom bodies; do not assume this
workflow can run on a new trial. Trials restrict recipients to verified phones;
US toll-free sending requires verification and US A2P10DLC registration requires
a paid account. Actual account capability must be inspected before selecting a
pilot venue. Recipient verification itself can send a message and remains a
separate setup scope, not an effect of read-only inspection.

Scenarios within envelope: two VERIFY acknowledgments; context1 two offers,
one competing CLAIM winner/confirmation/ack, late action rejected, STATUS+HELP;
context2 two offers, PASS acknowledgment then winner/confirmation/ack;
context3 two offers then scoped expiry/fallback; PAUSE/RESUME acknowledgments;
provider HELP/STOP without extra app response. No stress flood, new public QA,
email/BCC, consumer acknowledgment or actual-client reassignment. Device
receipt/inbound/assignment/timeline/cost reconciliation are all NOT RUN live.
If only one genuine participant exists, do not claim a two-agent race.

Abort on wrong recipient/role/source, revoked consent, unknown price, missing
fallback, expiry, caps, duplicate ownership or ambiguous acceptance. Pause only
the pilot scope/flag under its approved stop scope; preserve accepted assignment,
test/audit rows, STOP and ambiguous reservation. Inspect provider evidence before
any separately authorized resend. Compatible application rollback retains schema;
do not drop called functions, delete records or restore pre-286 capture.

### Cadence, proof and next boundary

Fresh Vercel read-only account evidence: active Pro, fluid iad1; only existing
copilot/first-live/SLA crons. No allocation cron. Current official
[cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) allow100jobs
per project and Pro per-minute schedules; old2/40limits are stale. Proposed
later cadence `* * * * *` is NOT installed. Capacity ceiling is five new intents
per admitted tick, not five leads; offer/confirmation/channel fanout consume
slots.90s crash lease/60s early hold, platform delays and long processing can
skip ticks; measure queue age and gaps before promising an SLA. Function/provider
usage costs still apply. Machine GET due is a mutation and was NOT probed.

Historical initial PR290 evidence at `e1b60d1` (not newly executed post-289
acceptance): local3711unit/68skip, strict types/lint/build/isolation/safety/
114routes passed;69real-PG and9real-session checks pass. Two-role-catalog
atomic migration rehearsals preserve capture, defaults and required row locks.
These receipts distinguish no-send fixture
acceptance from carrier/device delivery. No hosted or privileged evidence may
be inherited from #289 or #288 for this different tree. Reconciled-candidate
fresh gate results and exact hosted/immutable Preview identities belong in the
final PR290 seal. Device and carrier evidence remains NOT RUN.
Private evidence stays in the preserved worktree `.amm-run/post288-readiness-20261005/`
and `.amm-run/reference-session-acceptance/`, including logs, role-catalog
rehearsals and actual-session screenshots. Never publish credentials, phone
values, protected backups, signed payloads or cookies.

Current private reconciliation/read-only receipts and fresh gate logs are under
`.amm-run/post289-pr290-readiness-20261005/`; preceding directories retain
historical evidence. Never publish private endpoints or secrets.

Order: preserve accepted #289 disabled → accept separately sealed command-readiness
capability disabled → independently approved account/roster/consent setup →
exact participant/window/price/message pilot authority → real device proof →
later bounded new-only policy/cadence activation. This session performs none of
those Production effects. Next implementation boundary remains operational
channel acceptance, not a visual rebuild or new CRM/provider.
