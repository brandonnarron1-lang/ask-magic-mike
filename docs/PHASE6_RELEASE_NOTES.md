# Phase 6 Release Notes

## Added

- Purpose-specific communication permission engine.
- 33-template message registry and 8 approval-required sequences.
- SMS STOP/HELP classifier, quiet hours, frequency caps, segment preview, and mock-safe orchestration.
- OpenAI Responses API structured lead intelligence with deterministic fallback, PII minimization, injection defenses, and cost limits.
- Protected read-only Lead Center copilot.
- Protected message review studio with responsive email and SMS previews.
- Additive communication/sequence/AI audit migration.
- Phase 6 environment, architecture, safety, compliance, QA, and rollback documentation.

## Changed

- Public chat migrated from Chat Completions to Responses API and is feature-gated.
- Public success copy confirms durable receipt without a response-time promise.
- Consumer acknowledgment receives its own fail-closed release gate.
- Mock providers no longer log destinations or message bodies.

## Preserved

Canonical Neon lead storage, deterministic scoring/routing, durable notification outbox, retries/idempotency, WordPress bridge, attribution, existing Lead Center RBAC, Mike dormant state, and consumer automation disabled state.
