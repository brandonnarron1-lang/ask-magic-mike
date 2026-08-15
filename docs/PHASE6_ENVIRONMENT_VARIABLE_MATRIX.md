# Phase 6 Environment Variable Matrix

No values are recorded here.

| Variable | Scope | Default | Purpose |
| --- | --- | --- | --- |
| `AI_PUBLIC_CHAT_ENABLED` | Preview/Production | false | Public Responses API gate |
| `AI_PUBLIC_CHAT_MODEL` | Preview/Production | gpt-5.6-luna | Public model selection |
| `AI_LEAD_INTELLIGENCE_ENABLED` | Preview/Production | false | Lead copilot model gate |
| `AI_INTELLIGENCE_PERSIST_ENABLED` | Preview/Production | false | Persist structured AI audit/usage records |
| `OPENAI_LEAD_INTELLIGENCE_MODEL` | Preview/Production | gpt-5.6-luna | Copilot model selection |
| `AI_EMERGENCY_DISABLED` | Preview/Production | false | Emergency AI kill switch |
| `AI_TIMEOUT_MS` | Preview/Production | 8000 | Request timeout |
| `AI_MAX_OUTPUT_TOKENS` | Preview/Production | 1200 | Lead intelligence output cap |
| `AI_PER_LEAD_COST_LIMIT_USD` | Preview/Production | 0.05 | Per-run cost ceiling |
| `OPENAI_AGENTS_DISABLE_TRACING` | Preview/Production | 1 | Prevent sensitive trace copying |
| `QA_EMAIL_ENABLED` | Preview only initially | false | Brandon-only provider QA gate |
| `QA_EMAIL_RECIPIENT` | Preview only initially | empty | Secure approved QA destination |
| `QA_EMAIL_ALLOWED_RECIPIENTS` | Preview only initially | empty | Exact recipient allowlist |
| `QA_TEST_RECIPIENT_OVERRIDE_ENABLED` | Preview only initially | false | Allows test-recipient override |
| `CONSUMER_ACKNOWLEDGMENT_ENABLED` | Production | false | Consumer acknowledgment gate |
| `CONSUMER_FOLLOWUP_EMAIL_ENABLED` | Production | false | Consumer follow-up email gate |
| `CONSUMER_SMS_ENABLED` | Production | false | Consumer SMS gate |
| `MESSAGE_SEQUENCE_SCHEDULER_ENABLED` | Production | false | Sequence scheduling gate |
| `MESSAGE_AUTO_SEND_ENABLED` | Production | false | Consumer auto-send gate |
| `MESSAGE_HUMAN_APPROVAL_REQUIRED` | Production | true | Human approval policy |
