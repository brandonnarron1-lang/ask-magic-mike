# Current OpenAI Capability Audit

Canonical detailed audit: `OPENAI_CAPABILITY_AUDIT_PHASE6.md`.

Phase 6 uses the Responses API for new work and does not add Assistants API dependencies. The implemented lead-intelligence path uses strict JSON Schema output, `store: false`, bounded output, an 8-second default timeout, a per-lead cost cap, emergency disable, and deterministic fallback. Current model defaults and estimated cost assumptions are centralized in `src/lib/ai/openai-responses.ts`; they are configuration, not routing authority.

Implemented capabilities: Responses API, structured output, redacted/untrusted input boundaries, usage/cost capture, timeout, deterministic fallback, and read-only Lead Center integration. Audited but not placed in the lead-capture hot path: tools, web search, file search, computer use, Realtime/voice, and remote MCP. No lead PII is sent to web search.

Official-source decisions and limitations are recorded in `OPENAI_CAPABILITY_AUDIT_PHASE6.md`, `PHASE6_ARCHITECTURE_AND_DECISIONS.md`, and `AI_SAFETY_REVIEW_PHASE6.md`.
