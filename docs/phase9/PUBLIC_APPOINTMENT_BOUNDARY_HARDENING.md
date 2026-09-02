# Phase 9 Public Appointment Boundary Hardening

Date: 2026-09-02
Status: isolated successor to stacked Draft PR #264; Production unchanged

## Decision

Harden the existing `POST /api/appointments/request` boundary and retain the
existing `request_public_appointment_v1` transaction. Do not create another
appointment table, lead store, task queue, analytics endpoint, or calendar
system.

The existing database function is already the durable authority. Under one
advisory lock it verifies the lead/session pair, creates at most one active
appointment request, advances the lead lifecycle, appends an immutable audit
record, and creates at most one confirmation follow-up task. This candidate
adds only the missing public-edge and measurement controls around that proven
transaction.

## Public boundary contract

- Explicit browser origins must match the existing Ask Magic Mike / Our Town
  Properties allowlist; requests without an `Origin` remain available to
  trusted same-host or server callers.
- Only `application/json` is accepted.
- Declared and streamed request bodies are capped at 2,048 bytes before JSON
  parsing; arrays, primitives, malformed JSON, and absent bodies fail closed.
- `request_surface` must be one of the nine canonical `LeadSourceSurface`
  values. The validator is shared with lead normalization so appointment and
  lead-source vocabularies cannot silently drift.
- Preview refuses before the limiter or persistence layer can write.
- Production refuses a non-durable rate-limit result unless the existing exact
  `RATE_LIMIT_EMERGENCY_MEMORY=1` break-glass setting is active.
- Every response is private/no-store and returns the same random correlation
  identifier in the JSON envelope and `X-AMM-Correlation-Id` header.
- Public errors contain no contact data, lead context, database detail, or
  provider detail.

## Conversion truth

Only a new `requested` database result authors the trusted
`appointment_requested` analytics outcome. The server associates it with the
already verified canonical lead/session pair and stores only the controlled
`request_surface` dimension. The browser may publish the same named outcome to
an approved consented external analytics integration, but its canonical event
POST remains blocked by the existing protected-event policy.

An `already_requested` replay creates neither another appointment nor another
canonical/browser conversion event. If the secondary analytics write is
unavailable after the appointment transaction commits, the consumer still
receives a truthful stored-request response and the server logs only a safe
correlation ID plus a fixed error code. The appointment, lead lifecycle,
immutable audit record, and follow-up task remain the operational sources of
truth.

## Safety and non-actions

This candidate does not schedule or promise an appointment time. It does not
send email, SMS, Push, or a consumer acknowledgment. It changes no routing,
recipient, consent, provider, secret, database function, migration, WordPress
surface, domain, or NellySelly resource.

## Release order and rollback

This branch starts from exact PR #264 head
`95e1893d341ac755e3c1e5da63c4ce6f013caad7` and remains downstream of the
ordered Draft stack beginning at PR #248. PR #248 remains the only currently
requestable application merge/deployment gate.

Rollback is application-only: restore the immediately preceding accepted
Ready deployment or revert this route/client/privacy change. Existing leads,
appointments, tasks, audit records, and analytics rows must not be deleted or
rewritten as part of rollback.
