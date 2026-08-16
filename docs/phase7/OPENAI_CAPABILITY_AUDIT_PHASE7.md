# OpenAI capability audit — Phase 7

Phase 7 uses the current Responses API with strict Structured Outputs. New code does not depend on the deprecated Assistants API. The audited design supports server-side function tools, redacted external-tool inputs, image generation for non-PII brand assets, emergency disable, timeouts, token limits, usage records, and estimated-cost records.

The active implementation does not enable web search on lead records, does not expose computer-use tools to the public, does not send lead PII to image generation, and does not grant the model direct database mutations. File search, Agents SDK, MCP, tracing, and sessions remain evaluated capabilities rather than mandatory dependencies for the release candidate.

Model access is deployment-verified because model availability can vary by account. `OPENAI_LEAD_INTELLIGENCE_MODEL` is configurable. A rejected key, unavailable model, timeout, invalid schema, or cost cap returns the deterministic fallback without delaying lead storage, assignment, internal alerts, or Lead Center access.

Official references consulted: OpenAI Responses API, Structured Outputs, safety, and evaluation documentation current at execution time.

