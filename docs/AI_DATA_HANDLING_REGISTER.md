# AI Data Handling Register

| Data | Handling | External use |
| --- | --- | --- |
| Lead ID | Used for authorization/audit, not model prose | Redacted identifier only when persistence is enabled |
| Name, email, phone | Excluded from the copilot model payload | Never sent by the Phase 6 route |
| Street address | Redacted from free text | Never sent in free text |
| Lead type, status, deterministic score | Read-only facts | Allowed in bounded model payload |
| Consent/test/suppression flags | Read-only authoritative facts | Allowed so the model can state restrictions |
| Free-text question | Email, phone, and street-address patterns redacted; length capped; delimited as untrusted | Responses API only when enabled |
| AI output | Strict schema, Zod validation, human-review label | Not an automation decision |
| Traces | No raw contact fields | Persistence disabled until approved migration |

Controls: prompt-injection detection, source delimiters, no tool access, `store: false`, timeout, output-token cap, per-lead cost cap, emergency disable, and deterministic fallback. See `AI_SAFETY_REVIEW_PHASE6.md` and `SECURITY_REVIEW_PHASE6.md`.
