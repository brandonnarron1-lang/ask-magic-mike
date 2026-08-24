# Funnel-event identity integrity QA evidence

Date: 2026-08-24

Candidate branch:
`codex/phase9-funnel-event-identity-20260824`

Parent: exact Draft PR #215 head
`985079d1574daf970fa7a24e469b5a0954cf3cae`

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

The exact focused matrix passed 10 files / 69 tests.

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
- seller/buyer contact-channel consent reflects supplied fields;
- replay does not emit a new conversion;
- durable failures remain visible and emit one linked allowlisted event; and
- failure analytics contain no contact data or raw error field.

## Complete local release evidence

- full Vitest: 237 files / 3,116 tests passed;
- strict TypeScript: passed;
- full ESLint: passed;
- optimized Next.js 15.5.21 build: passed, 52 generated pages;
- route proof: 84 active routes / 17 acknowledged root-`src` duplicates;
- release safety: 14/14 passed;
- Ask Magic Mike / NellySelly deployable-source isolation: passed;
- Production dependency audit: no known vulnerabilities;
- redacted tracked-history scan: 603 commits, no leaks; and
- `git diff --check`: passed.

The final PR head must repeat changed-file secret scanning, focused/full tests,
typecheck, lint, optimized build/route proof, release safety, isolation,
dependency audit, and whitespace proof after every code/evidence change.
Immutable Preview proof remains mandatory before sealing.

The candidate-specific threat review and residual-risk record is
`docs/phase9/FUNNEL_EVENT_IDENTITY_SECURITY_REVIEW.md`.

## Required write-intercepted browser acceptance

The immutable Preview test must intercept `/api/leads`, `/api/events`,
`/api/appointments/request`, `/api/chat/message`, and experiment writes before
navigation. No request may reach Neon, Resend, the notification queue, OpenAI,
or another provider.

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
