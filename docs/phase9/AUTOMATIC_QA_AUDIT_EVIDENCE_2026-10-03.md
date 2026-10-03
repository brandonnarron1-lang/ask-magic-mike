# Automatic QA audit evidence — bounded P0 candidate

This is review evidence, not Production acceptance or authorization. Resolve
current acceptance with `pnpm release:authority:resolve`. Do not replay old gates.

## Reconciled starting state

- Fresh branch: `codex/qa-audit-evidence-20261003`, from accepted main
  `e60926d0b517c17b8dc9bf5f3f8b9249ba0d026e`, tree
  `1d8f274467a7a9fad9ee28aea42f98414809bd38` (PR #285).
- Authenticated resolver: 25/25 checks passed on 2026-10-03, Production
  `dpl_4Vj5gk6edHSCW3iR534EgP7R8NnF`, canonical
  `https://www.askmagicmike.com`, preserved Ready rollback
  `dpl_BKUAX82VpcrUyg9u1E7spG6ipsbq`.
- Accepted receipt canonical payload checksum:
  `4179e1d552fde65335524c62ad82dfe3816262ebc12e559236cb6dc0dd062901`.
  Published file checksum (different object):
  `5bb64fa12eea25e21b5206e9e128feb3c2e579bd550de11bd655a2b742205922`.
- Original agent-command-center worktree, dirty screenshot, handoff, and private
  reconciliation evidence remain untouched. No reset, stash, cleanup, or force push.
- Read-only Production catalog at 20:10 UTC: only `capture_public_lead_v1`,
  `SECURITY INVOKER`, `search_path=public, pg_temp`, server role executable;
  browser roles `anon`/`authenticated` absent. Function-definition SHA-256
  `613c4df70c1701a24740f2fe14206ba44cfdcf3379264c635671e709548b9bf7`.
  Isolated accepted-schema installation independently reproduces that hash.
- Production migration ledger: 12 recorded entries, latest
  `20261002143000`; v2 entry `20260902012000` absent. Ledger coverage is not
  assumed to include all historically installed tables/functions.
- Built root `app/api/leads/route.ts` calls v1 through `NeonPostgresAdapter`.
  `src/app` is historical; imported `src/lib` remains active.

## Defect and smallest correct repair

The existing server classifier recognizes BOTH `INTERNAL QA` and `DO NOT CONTACT`
in approved input text. Browser `is_test`, UTM labels, actor/audit fields, or score
cannot supply trusted classification/state. The classifier and public ingress
contract remain unchanged.

Previously v1 ignored the server-derived test/suppression fields; later,
separate enrichment persisted them but no accepted audit marker was created.
The new migration writes all four flags in the lead INSERT, then inserts
`lead.qa_suppressed` inside the same existing capture transaction. Actor:
`system/public_lead_capture`, never the owner-reconciliation actor. `after_state`
contains only the four true flags. Metadata is source, session UUID, and
classifier-policy identifier, not contact information or request payload.

The existing session advisory lock and early exact-replay return guarantee one
marker per new canonical capture. Required audit failure aborts all transaction
effects. Existing records are not backfilled or changed. Session fingerprint,
contact linkage, routing/capacity locks, assignment history, signature, invoker,
search path, RLS, and existing outbox behavior are preserved.

Provider dispatch remains AFTER commit. P0 does not import v2, atomize all
enrichment/internal intent, add a queue, change recipients, or activate retries.
Accepted v1's legacy assignment intent remains skipped when called by public
capture; the canonical internal `lead_alert` continues through existing
post-commit orchestration. Broader enrichment/intent atomicity remains PR #279's
separate scope.

Two small compatibility fixes accompany the marker:

- Monitor rejects any test record with unsafe general, email, OR SMS suppression;
  accepted audit evidence cannot excuse unsafe flags. Its existing evidence
  predicate is not weakened.
- Existing timeline renders the marker with stable `audit:<UUID>` identity and
  protected fixed copy. Reporting sorts JSON attribution objects correctly;
  boolean CASE expressions on JSONB previously failed against the real schema.
  Production read-only catalog confirms both attribution columns are JSONB.

## Migration contract

New and ONLY Production migration in this candidate:
`supabase/migrations/20261003203000_atomic_qa_capture_evidence.sql`.
SHA-256: `f94e6bbab69359820414edf260f17acb37a977b4245cf659aaf4597cb9b8111c`.

One function replaced; no new table, signature, migration backfill, or data
repair. Role grants are conditional because Neon does not have the Supabase
browser roles. No role is created in Production. Service-role EXECUTE and
PUBLIC/browser denial are preserved. Apply only this reviewed migration after
confirming accepted predecessor function, schema, endpoint and source identity.
Never replay the historical migration directory or the ACC migration live.

## PR #279 reconciliation

Inspected open PR #279 at head
`131072e619eff72882c91931b60b8e93080d1280`; preserve it and its lineage.

| Component | Current disposition |
| --- | --- |
| Atomic v2 capture/enrichment/internal intent | Unique, not installed/called; deferred; unnecessary for P0 |
| First-response coverage/risk reconciliation | Unique action-queue changes; deferred, reconcile onto current ACC |
| Due-outbox processing/retry auth | Existing protected/manual path remains; PR's cron auth/batch extensions deferred |
| Stale never-claimed pending recovery | Unique retry eligibility extension; deferred |
| Ambiguous processing reconciliation | Existing visibility retained; no automatic requeue; provider-history review required |
| Atomic Resend receipt/state/communication/suppression | Unique callback CTE hardening; deferred; no callbacks changed here |
| Every-minute retry / five-minute SLA schedule | Send-capable change, explicitly held; `vercel.json` unchanged |

Test-only pinned PR #279 SQL is in `tests/fixtures/sql/`, not the migration
directory. Both install orders (v2 then P0; P0 then v2) are exercised against real
PostgreSQL: v2 delegates to the repaired v1, does not replace it, and preserves
one QA marker and one canonical internal intent on replay. A future successor
must re-run this invariant on its actual server-normalized payload and reconcile
newer source; this is not permission to bulk-merge PR #279.

Read-only backlog snapshot at 20:11 UTC: 18 rows, 7 sent, 9 skipped,
2 permanently failed; zero due eligible, stale pending, or processing rows;
sum of recorded attempts 9, configured maximum attempts 3, provider IDs 7.
The initial aggregate's `total=3` counted status groups, NOT messages; the
separate row-count query above corrected it. This is a snapshot, not future
send authority or evidence of an empty all-time lead database. Current eligible
dispatch bound is zero; PR #279's proposed batch caps and retry bounds still
need send-aware acceptance before activation.

## Verification and evidence boundary

`pnpm test:postgres:qa-audit` runs the changed SQL, actual root POST handler,
actual adapter, monitor, notification orchestration/repository, and ACC read
model against disposable PostgreSQL 17. Containers are UUID-named, network-none,
unexposed, label-checked, and cleaned individually. No credentials or provider
network required. Full historical schema is installed only in isolated fixtures.

Cases: fresh/upgrade parity and no backfill; recognized QA with genuine owned
UTMs; ordinary capture; public spoof rejection/normalization; sequential and
five-way first-capture/replay concurrency; conflicting fingerprint; forced audit
and assignment failure with rollback/retry; safe/missing/unsafe monitor states;
mocked provider failure with recoverable outbox; browser-role denial; Preview
refusal before DB query; timeline IDs/pagination/redaction; assigned-only denial;
QA-excluded reporting; non-destructive function rollback/forward repair; v2
successor compatibility. Real providers are replaced with no-send mocks only.

Owned fixture: `home_value_page`, UTMs `ourtownproperties` / `owned_media` /
`amm_owned_demand_2026` / `wordpress_home_value_page`; link-out placement ID stays
null. Consent copy is derived from current server policy. Unit-mode root handler
skips post-commit enrichment/notifications; tests invoke the actual enrichment
and alert services explicitly after asserting committed safe flags/marker.
This is isolated integration evidence, not a new Production lead or send.

Local command: Node 24.18.0, pnpm 10.30.3. Frozen install passed.
At 20:26 UTC, 14/14 isolated/static cases passed. Initial candidate full gate
passed: 300 files, 3640 unit cases (13 opt-in database cases skipped), strict
typecheck, lint, build, 106 active routes, isolation and 14 safety checks.
The interrupted browser run stopped after 12 passing cases with no active
process; its completed replacement passed 30/30 desktop/mobile, keyboard,
zoom, identity and intercepted submission cases. PostgreSQL fixture startup
and fresh-schema timeouts are bounded for slower hosted runners without
relaxing assertions. Exact frozen-head full gate, browser, hosted, immutable
Preview and no-write receipts belong in the PR/release
evidence; do not represent inherited PR totals as this run. CI explicitly runs
the PostgreSQL command; ordinary unit runs skip its opt-in database cases.
Full Supabase stack commands are not invoked because their fixed ports/services
could collide with unrelated local projects; the isolated command exercises the
actual canonical SQL and callers without touching their containers.

## Side effects, rollback and remaining gate

This run performs Production catalog/aggregate reads only. No Production data
write, migration, lead submission, notification/send, cron execution, WordPress
change, environment change, provider change, AI call, DNS, billing, or unrelated
project mutation. Local candidate/PR/Preview preparation is not acceptance.

Application rollback: accepted Ready deployment from the current resolver;
database rollback is separate. Capture the exact current v1 definition/ACL
privately before applying the single migration. Function-only restoration keeps
committed leads, audit, consent and outbox intact but REINTRODUCES the new-capture
QA evidence gap. Prefer a compatible forward repair. Tests restore the accepted
v1 and reapply P0, verifying row counts remain unchanged. Do not delete test
history or restore another deployment for a database-only issue.

Review/publish the sealed candidate under the existing release-intent process.
Production migration and application merge/deploy need explicit scope; retry/send
activation remains a separate held action and is not included. Protected local
evidence belongs under `.amm-run/qa-audit-evidence-20261003/`; immutable hosted
receipts/artifacts remain linked in the PR. No private backups/recipients are
committed.

## Next tickets only

1. QA audit evidence: implemented; finish exact-source acceptance and separately
   approved single Production migration/application release.
2. Notification reliability: reconcile PR #279 onto the accepted successor,
   preserve P0, and seal migration/callback/retry/send-aware release scope.
3. Operator/acquisition acceptance: human acceptance of deployed ACC for
   `administrator`, `primary_lead_owner`, `approved_agent`, `read_only_analyst`;
   verify assigned-only access, Today tasks/reviews/stale state, partial timelines
   and reporting truth, keyboard/mobile, and actual account/device participation.
   Automated fixtures are not Mike's acceptance. Then prepare one additional
   visible owned-traffic placement under separate publication/QA scope.
