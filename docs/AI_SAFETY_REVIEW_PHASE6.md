# AI Safety Review - Phase 6

## Result

Local AI guardrail tests pass. This is an application security review, not a penetration test.

## Controls

- Injection-pattern detection blocks common instruction override, secret extraction, guardrail bypass, unauthorized send, and privilege escalation text.
- Lead free text is capped, email/phone/street-address redacted, and enclosed in explicit untrusted-data delimiters.
- Strict Zod and JSON Schema validation rejects malformed model output.
- Model output cannot call routing, assignment, scoring, appointment, communication, or stage-change functions.
- External web search is not used with lead data.
- `store:false`; tracing disabled by default.
- Safe deterministic fallback works with no key, timeout, provider failure, malformed output, injection block, or cost-cap breach.

## Residual risks

- Regex redaction minimizes but cannot prove removal of every identifier; therefore approved structured fields exclude direct contact and full street address before the AI call.
- AI drafts can still be wrong or awkward. UI labels them as suggestions requiring human review.
- Provider data retention depends on the approved OpenAI project settings in addition to request flags.
