# AI Model and Tool Decision

- API: OpenAI Responses API.
- Default model: `gpt-5.6-luna`, overrideable by `OPENAI_LEAD_INTELLIGENCE_MODEL`.
- Output: strict `lead_intelligence` JSON Schema validated again with Zod.
- Persistence: disabled unless an independently reviewed Phase 6 database migration and persistence flag are activated.
- Tools: none exposed to the lead-summary model in the initial release.
- Production posture: read-only recommendations; deterministic consent, suppression, score, routing, assignment, and messaging eligibility remain authoritative.
- Fallback: deterministic result for disabled AI, missing key, timeout, HTTP failure, malformed output, injection block, or cost-cap breach.
- Retention: `store: false`.
- Hot-path rule: capture, database storage, routing, and internal genuine-lead alerts do not depend on OpenAI.

Implementation: `src/lib/ai/openai-responses.ts`, `src/lib/ai/lead-intelligence-schema.ts`, and `src/lib/ai/guardrails.ts`.
