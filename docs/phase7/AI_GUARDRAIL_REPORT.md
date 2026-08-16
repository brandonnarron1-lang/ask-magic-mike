# AI guardrail report

Implemented: server-side key, Responses API, `store:false`, strict schema, input length limits, PII redaction, prompt-injection detection, untrusted-text delimiters, timeout, output-token cap, per-lead cost cap, daily cost cap, bounded job attempts, deterministic fallback, emergency disable, RBAC, object scope, usage audit, and explicit no-send/no-assignment controls.

Tests cover PII redaction, direct prompt injection, deterministic fallback, output safety, and release flags. Production model/key access remains deployment-verified; no secret was printed. Residual risk is inaccurate advice within an otherwise valid schema, so every output remains advisory and human-reviewed.

