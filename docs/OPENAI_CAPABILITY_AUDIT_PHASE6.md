# OpenAI Capability Audit - Phase 6

Reviewed: 2026-08-15

## Official sources

- Models: https://developers.openai.com/api/docs/models
- Responses API: https://developers.openai.com/api/docs/guides/migrate-to-responses
- Structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Tools: https://developers.openai.com/api/docs/guides/tools
- Agents SDK for TypeScript: https://openai.github.io/openai-agents-js/
- API data controls: https://platform.openai.com/docs/models/default-usage-policies-by-endpoint

## Decisions

| Area | Decision | Reason |
| --- | --- | --- |
| API | Responses API | Current API surface; supports strict structured output and `store:false` |
| Default lead model | `gpt-5.6-luna` | Cost-conscious draft/summarization tier; configurable by environment |
| Public chat | Responses API behind `AI_PUBLIC_CHAT_ENABLED` | Safe fallback when disabled, unavailable, or blocked |
| Lead intelligence | Strict JSON schema | Reject malformed output and preserve deterministic fallback |
| Web search | Disabled for lead intelligence | Lead PII and free text must not be sent to external search providers |
| Agents SDK | Evaluated, not placed in lead hot path | Current task needs one bounded read-only tool, not an autonomous agent loop |
| Tracing | Disabled by default | Avoid copying lead content into traces |
| Storage | `store:false` | Minimize provider-side retention; approved project data controls still govern |

## Cost controls

- 8-second default timeout, bounded to 20 seconds.
- 1,200 output-token default, bounded to 2,500.
- Per-lead estimated-cost ceiling defaults to $0.05.
- Daily budget variable is documented for an operations monitor; automatic global aggregation is not enabled until usage records are migrated.
- Deterministic fallback costs $0 and remains functional without an API key.

## Prohibited AI authority

AI may summarize, identify missing facts, draft questions, and propose a human next action. It may not assign, reassign, score, change a stage, create a valuation or offer, claim inventory, infer protected traits, decide consent, schedule, send, or override deterministic rules.
