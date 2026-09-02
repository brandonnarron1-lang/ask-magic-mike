# Current OpenAI Capability Audit

Canonical detailed audit: `OPENAI_CAPABILITY_AUDIT_PHASE6.md`.

Phase 6 uses the Responses API for new work and does not add Assistants API dependencies. The implemented lead-intelligence path uses strict JSON Schema output, `store: false`, bounded output, an 8-second default timeout, a per-lead cost cap, emergency disable, and deterministic fallback. Current model defaults and estimated cost assumptions are centralized in `src/lib/ai/openai-responses.ts`; they are configuration, not routing authority.

Implemented capabilities: Responses API, structured output, redacted/untrusted input boundaries, usage/cost capture, timeout, deterministic fallback, and read-only Lead Center integration. Audited but not placed in the lead-capture hot path: tools, web search, file search, computer use, Realtime/voice, and remote MCP. No lead PII is sent to web search.

Official-source decisions and limitations are recorded in `OPENAI_CAPABILITY_AUDIT_PHASE6.md`, `PHASE6_ARCHITECTURE_AND_DECISIONS.md`, and `AI_SAFETY_REVIEW_PHASE6.md`.

## Phase 9 public-chat runtime boundary — 2026-09-02

The existing public Responses API path remains opt-in through
`AI_PUBLIC_CHAT_ENABLED` and the existing emergency-disable control. Read-only
Preview now always returns the deterministic local guidance response before it
can write a shared rate-limit bucket or call OpenAI, even if Preview inherited
an API key. Production reaches OpenAI only after the canonical limiter confirms
a durable shared result; loss of that durability returns a safe 503 unless the
documented exact emergency-memory break-glass control is active.

This hardening adds no model, provider, key, agent, tool, retrieval source, or
AI routing authority. Existing redaction, prompt-injection screening,
delimitation of untrusted text, `store: false`, output-token ceiling, timeout,
deterministic fallback, and human-review language remain unchanged.
