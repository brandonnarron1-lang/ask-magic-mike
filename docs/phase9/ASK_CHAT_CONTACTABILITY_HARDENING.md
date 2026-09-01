# Ask Chat Contactability Hardening

Updated 2026-09-01.

## Outcome

The existing `/ask` experience remains the public question surface, but a
question and AI answer are no longer treated as a contact lead. The visitor
must make a separate, explicit follow-up request with at least one valid contact
method and the versioned Our Town Properties consent language before
`POST /api/leads` is called.

This is a bounded repair of the established Black Diamond component, canonical
lead API, attribution, idempotency, analytics, notification, and appointment
handoff. It adds no new funnel, database, notification provider, AI provider,
design system, or CRM.

## Defect found

The prior `AskMikeChatPanel` called `POST /api/leads` immediately after any
successful chat answer. A starter-prompt click could therefore create a
non-contactable Production lead, route it, count it, and send an internal alert
without a name, email, phone, or consent.

The live audit exposed this behavior once before the request could be
intercepted. That artifact is **internal QA, not a live prospect**. It remains
intact and unaltered pending a separately confirmed, exact-record guarded
transaction that marks it test/suppressed and appends an audit event. It will
not be deleted or silently rewritten.

## Public contract

1. A starter prompt or typed question calls only `POST /api/chat/message`.
2. The answer remains visible and an optional local-follow-up panel appears.
3. The panel requires email or phone, plus the exact consent checkbox.
4. Only that deliberate submission calls `POST /api/leads` with the existing
   chat/session UUID as both header and body idempotency evidence.
5. A fresh durable response emits browser conversion signals; idempotent replay
   does not.
6. The appointment request appears only after durable contact-lead creation.
7. Failed follow-up storage preserves the answer and form values, surfaces a
   safe error, and retries with the same submission UUID.

The canonical API independently rejects chat lead payloads without a question,
without email or phone, or without explicit consent. Question events remain
pseudonymous operational analytics and are not prospect, consent, or lead
proof.

## Data and notification effect

- Database migration: none.
- New table or lead store: none.
- Question only: no lead, routing, notification outbox, acknowledgment,
  appointment, or canonical `lead_created` record.
- Consented follow-up: existing atomic lead capture, deterministic scoring,
  routing, notification, and audit behavior.
- SMS permission: remains false unless separately and explicitly collected;
  generic contact consent does not silently opt a phone number into SMS.
- Attribution: existing first/last touch, UTM, click-ID, placement, page, and
  session context are preserved on the deliberate follow-up.

## Verification contract

- Component tests prove a chat answer makes no lead request or conversion
  event.
- Validation tests prove contact and consent are required before the client
  calls the lead API.
- API tests prove direct chat-lead requests fail closed without contact or
  consent and make no persistence call.
- Fresh and idempotent follow-up tests prove conversion-event suppression.
- Browser acceptance must intercept all writes, prove zero `/api/leads` calls
  after a starter prompt, then prove exactly one intercepted lead request after
  explicit contact and consent.
- Protected Preview and hosted Node 24 release proof are required before any
  Production request is made.

Local exact-Node proof passes 283 test files / 3,441 tests, strict TypeScript,
full ESLint, two optimized builds, 100-route verification, 14/14 release
safety, system isolation, and a clean Production dependency audit.

## Rollback and authority

Rollback is an application-code revert; no database rollback is required. This
candidate changes no Production deployment, environment variable, Neon data,
WordPress surface, email/SMS/push provider, DNS record, publication, spend, or
NellySelly system. Existing accepted Production and the singular PR #248
application gate remain unchanged until a later exact-head release decision.
