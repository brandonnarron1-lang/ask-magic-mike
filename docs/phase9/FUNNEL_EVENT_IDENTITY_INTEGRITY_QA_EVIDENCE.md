# Funnel-event identity integrity QA evidence

Date: 2026-08-24

Candidate branch:
`codex/phase9-funnel-event-identity-20260824`

Draft PR:
[#216](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/216)

Parent: exact Draft PR #215 head
`0e47db8780c7257f0d445d75e034aacd535c06a4`

Pre-refresh head preservation:
`rescue/amm-pr216-pre-pr215-seal-sync-20260824-1353` at
`e2b2c06edcc48bec1beb0218abf7bfc5ffc967c4`.

Refreshed code-bearing head:
`0c45a33b706d7e8a02501ccf83baf24a83ec107d`.

## Design rejection evidence

The first repository implementation attempted to create a privacy-minimized
`public.sessions` row before inserting each linked analytics event. Inspection
of `capture_public_lead_v1` proved that any existing session without a lead is
returned as `idempotency_conflict`. That design was removed before commit,
Preview, or external use. No database row or migration was created.

The replacement keeps the UUID in protected analytics properties and therefore
cannot occupy or conflict with the canonical session primary key before lead
capture.

## Focused local evidence

All commands use Node 24.18.0 and the exact frozen lockfile.

```bash
pnpm vitest run \
  tests/analytics/funnel-event-identity-contract.test.ts \
  tests/analytics/client-analytics-privacy.test.ts \
  tests/api/public-events-route.test.ts \
  tests/api/analytics-event-route.test.ts \
  tests/persistence/neon-analytics-event-repository.test.ts \
  tests/public/home-value-inline-validation.test.tsx \
  tests/public/buyer-intent-contact.test.tsx \
  tests/public/seller-intent-funnel-identity.test.tsx \
  tests/public/ask-conversion-accessibility.test.tsx \
  tests/public/appointment-funnel-identity.test.tsx
```

The exact focused matrix passed 10 files / 72 tests.

Covered contracts:

- valid UUID is sent only to the canonical first-party endpoint;
- malformed identity is dropped;
- public event route never binds a browser event directly to lead/agent ID;
- browser-authored lead/widget creation, qualification, appointment-request,
  and notification lifecycle outcomes are rejected;
- browser analytics still receive those success events;
- Neon write stores the validated UUID only as protected
  `funnel_session_id`, with no `sessions` insert;
- Home Value, buyer, seller, Ask chat, and appointment events share their
  existing lead/session UUID;
- Home Value's first address interaction synchronously creates or reuses that
  UUID before emitting an event, with truthful failure when secure browser
  crypto is unavailable;
- seller/buyer contact-channel consent reflects supplied fields;
- replay does not emit a new conversion;
- durable failures remain visible and emit one linked allowlisted event; and
- failure analytics contain no contact data or raw error field.

## Complete local release evidence

- full Vitest: 237 files / 3,123 tests passed;
- protected branch-owned Preview contract: 6/6 mutation-free browser tests
  passed;
- strict TypeScript: passed;
- full ESLint: passed;
- optimized Next.js 15.5.21 build: passed, 52 generated pages;
- route proof: 84 active routes / 17 acknowledged root-`src` duplicates;
- release safety: 14/14 passed;
- Ask Magic Mike / NellySelly deployable-source isolation: passed;
- Production dependency audit: no known vulnerabilities;
- redacted tracked-history scan: 615 commits, no leaks; and
- `git diff --check`: passed.

GitHub Release Gate run
[#32760061703](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32760061703)
passed on the exact code-bearing head. Immutable Vercel Preview deployment
`dpl_A3oZ7CvoAGe8mu6aUmp3r9ivMUXb` is READY at
`https://ask-magic-mike-avruwnthn-eyes-up-industries.vercel.app`. Its runtime
warning/error/fatal query returned no entries. A later evidence-only seal must
still pass its own exact-head Release Gate and immutable Preview checks; the
Draft PR body records that final immutable head.

The candidate-specific threat review and residual-risk record is
`docs/phase9/FUNNEL_EVENT_IDENTITY_SECURITY_REVIEW.md`.

## Automated write-intercepted browser acceptance

`tests/e2e/funnel-event-identity-preview.spec.ts` extends the existing
protected-Preview runner rather than creating a second QA system. Before each
page navigation it intercepts all same-origin `/api/**` POST requests. The
approved lead, event, legacy-event, appointment, chat, and experiment paths
receive synthetic responses; any other POST is blocked and fails the test.

Protected branch-owned run
[#32760498269](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32760498269)
passed all 6 expected browser tests with 0 unexpected, 0 flaky, and 0 skipped:

- Home Value, seller, buyer, and Ask successful paths at 1,440 × 1,000;
- the same four paths at 390 × 844; and
- a durable Home Value failure with recoverable UI, one linked
  `lead_submit_failed`, and no conversion.

The three funnel-identity scenarios and the three existing widget scenarios
prove valid UUID continuity into the intercepted lead body and
privacy-allowlisted event requests, browser-visible fresh conversion signals,
no browser-authored protected outcome request, no synthetic PII in event
bodies, no unexpected POST, no provider call, no console error, and no
horizontal overflow. Artifact `9532615770` records `SAFE_DB_WRITE=false`, a
reachable database with mutation disabled, disabled live email/SMS/provider
delivery, and launch authority `PREVIEW_READY`. Four PNG viewport artifacts
were visually inspected; desktop and mobile Home Value/Ask states preserve the
existing black/gold/teal identity with no visible clipping, overflow,
unreadable state, or brand break. The captures are synthetic intercepted
acceptance, not real leads. The in-app screenshot channel was unavailable, so
no fresh in-app screenshot is claimed. Ask replay/fresh conversion behavior
also has direct component coverage.

The existing protected dispatcher first passed exact historical candidate head
`045fbff2cb368d68440c0f22b6928cef1cc01995` in run
[#32743481075](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32743481075)
with `SAFE_DB_WRITE=false`. It is retained as historical evidence only; the
branch-owned exact code-head run above is authoritative for the expanded suite.

The first enhanced branch-owned run,
[#32745542999](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32745542999),
truthfully failed before reaching a funnel field. Its artifact showed that the
stored Vercel bypass header was scoped to the older widget spec, so all three
new tests remained on Vercel's sign-in page and timed out waiting for
`Property address`. The older widget tests and the read-only Preview QA passed.
No funnel request, application mutation, provider call, or database write
occurred. The correction moves the unchanged secret-safe header construction
into `tests/e2e/preview-test-config.ts` and requires both browser suites to use
that one shared configuration; release safety now guards the linkage.

## Required write-intercepted browser acceptance

The immutable Preview test intercepts `/api/leads`, `/api/events`,
`/api/analytics/event`, `/api/appointments/request`, `/api/chat/message`, and
experiment writes before navigation. No request may reach Neon, Resend, the
notification queue, OpenAI, or another provider.

For Home Value, seller, buyer, and Ask:

1. each visible funnel step emits a request containing one valid UUID;
2. the lead body/header reuses that UUID;
3. synthetic success leaves browser `lead_created` visible but produces no
   `/api/events` request with a server-owned lead/widget creation,
   qualification, appointment-request, or notification-lifecycle event;
4. synthetic failure stays recoverable, emits `lead_submit_failed`, and emits
   no conversion;
5. no event body contains the synthetic name, email, phone, address, question,
   provider response, or lead ID; and
6. mobile and desktop remain accessible, contained, and browser-error free.

## Post-release read-only proof

After a separately approved release and only after organic traffic has had time
to arrive, run
`docs/phase9/analysis/funnel_event_identity_integrity.sql` read-only. It returns
aggregate counts only. Do not fabricate a lead or conversion to make the query
non-zero, and do not classify an anonymous UUID as a person or prospect.

## Safety boundary

No Production, environment, database row/migration, lead/event, notification,
email/BCC, consumer acknowledgment, SMS/MMS, Push, provider, WordPress/GTM/GA4,
DNS, publication, spend, deletion, or NellySelly action is authorized by this
candidate or its browser proof.
