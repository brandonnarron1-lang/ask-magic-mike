# Phase 9 Public Lead Ingress Boundary

Date: 2026-09-02
Status: isolated successor to stacked Draft PR #269; Production unchanged

## Decision

Harden the existing `POST /api/leads` route and keep the proven canonical
`capture_public_lead_v2` transaction. Do not add another form handler, lead
store, scoring engine, routing engine, notification queue, or WordPress lead
database.

The root `app/` route remains the active public authority. Its transaction
continues to create or reconcile the canonical session, contact, lead,
deduplication, score, route, assignment history, source attribution, consent,
audit evidence, and required internal-email outbox row before the route reports
success. Immediate provider dispatch remains post-commit; failure leaves the
seeded outbox row available to the existing bounded retry worker.

This candidate closes edge-contract gaps around that architecture. It does not
replace the lifecycle transaction or replay any already accepted Production
release.

## Public request contract

- Browser requests require an explicit exact origin from the existing Ask
  Magic Mike / Our Town Properties allowlist.
- The sole origin-less caller is the existing WordPress server bridge, which
  must present its `v1` marker and pass raw-body HMAC, timestamp, entry-ID, and
  payload-identity verification before lead persistence.
- Only `application/json` is accepted. Declared and streamed bodies are capped
  at 65,536 bytes, and the JSON root must be a plain object.
- Funnel, source-surface, optional lead type, primitive types, attribution
  objects, nested touch/click values, and operational field lengths are
  validated before the canonical transaction.
- Browser-authored score, scoring factors/version, routing reason, suppression,
  duplicate identity, and assignment state are rejected. Assignment and
  lifecycle status remain server-owned.
- One 1–160 character idempotency key is mandatory. Header, canonical body,
  and legacy body aliases must agree; conflicting or malformed references fail
  before persistence.
- A browser `is_test=true` flag cannot hide an ordinary submission. Test state
  requires the unmistakable `INTERNAL QA` plus `DO NOT CONTACT` marker pair.
- Public channel grants require the displayed umbrella consent plus the exact
  channel boolean. SMS remains denied because the current public lead copy has
  no separate SMS consent control. A verified WordPress bridge retains its
  narrower source-specific evidence policy.

## Runtime and durability ordering

Exact origin, JSON media type, and declared size are checked first. Read-only
Preview then refuses before the shared limiter, ensuring Preview cannot create
a Neon rate-limit row. Production reaches lead parsing and persistence only
after an allowed durable shared-rate-limit result; the existing exact
`RATE_LIMIT_EMERGENCY_MEMORY=1` setting remains the sole documented break-glass
exception.

Semantic validation, scoring, and routing preparation all finish before the
database command. A successful response is returned only after
`capture_public_lead_v2` commits. Idempotent replay returns the canonical lead
identity without invoking provider or analytics side effects.

Every post-commit activity is failure-isolated. An immediate email/provider,
analytics, or first-live-monitor failure cannot convert a durably stored lead
into a false public failure. The required internal notification intent was
already committed atomically and remains recoverable by the existing outbox
worker.

## Response and privacy contract

Every response is `private, no-store`, includes `Pragma: no-cache`, and carries
one server-generated correlation identifier in both the JSON envelope and
`X-AMM-Correlation-Id`. HTTP 429 returns positive retry guidance bounded by the
existing ten-minute intake window. Public failures expose stable safe codes and
never return a database URL, provider detail, raw exception, recipient, BCC,
contact record, or existing lead identity.

## Compatibility proof

The active Home Value, Seller, Buyer, Renter, Open House, Ask follow-up, and
iframe/widget surfaces already submit JSON with an exact source surface and a
browser-generated UUID in both the body and `Idempotency-Key` header. The
existing Gravity Forms bridge submits the same contract using its deterministic
`gf:<form>:<entry>` key and signed raw-body headers. No active caller requires a
new field or endpoint.

The older `src/app` widget submitter and route belong to the acknowledged,
non-built historical router tree. They are retained for provenance and are not
promoted into the root App Router by this change.

## Scope, release order, and rollback

This is an application-only candidate with focused tests and documentation. It
adds no route, database migration, table, provider, secret, environment
variable, queue, cron, WordPress change, visual redesign, or NellySelly
dependency.

The branch starts from exact PR #269 head
`14e8ef0c61aa7e046b3b88b7344bdc947c25a423` and remains downstream of the
ordered Draft stack beginning at PR #248. PR #248 remains the sole currently
requestable application merge/deployment gate.

Rollback is application-only: restore the immediately preceding accepted Ready
deployment or revert this route/policy/test/documentation commit. No lead,
contact, consent, attribution, notification, audit, analytics, or WordPress
record should be deleted or rewritten during rollback.
