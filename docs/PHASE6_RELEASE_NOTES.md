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

## Preview record

- PR: https://github.com/brandonnarron1-lang/ask-magic-mike/pull/152
- Initial Phase 6 commit: `45a9f210066fe26e0f05e50fa14b085107411f49`
- Initial Preview deployment: `dpl_GS3eyLz2Gwbsqf7r7FxZMcQF3Pag`
- Public and readiness health: pass; notification mode disabled; email disabled.

## Production record

- Merge commit: `509b54fa8def73d48169970868338ca66c28793f`.
- Current acceptance deployment: `dpl_BxCt1Yvq2T4hQqBUnnyPcqc4FNwq`.
- Brandon-only QA provider ID: `fb4fdd9d-d421-482d-b062-5c2bbf6bce1c`.
- Gmail receipt, sender-domain alignment, TLS, subject prefix, recipient isolation, and canonical CTA href verified.
- Consumer automation and carrier SMS remain disabled; no Phase 6 database migration was applied.
