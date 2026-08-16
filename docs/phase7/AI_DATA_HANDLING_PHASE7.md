# AI data handling — Phase 7

- Server-side only; the OpenAI key is a Vercel Sensitive variable.
- `store:false` is sent to the Responses API.
- Email addresses, phone numbers, and street addresses in free text are redacted before model input.
- Deterministic fields are minimized to lead type, status, score explanation, source/placement, timeline, geography, consent booleans, test/suppression, and redacted question text.
- Lead text is delimited as untrusted data and screened for prompt-injection patterns.
- External web search is not used for prospects.
- Provider errors and usage ledgers avoid raw lead text.
- Output is strict JSON and is labeled advisory.
- Test and suppressed states remain deterministic and cannot be overwritten by model output.

Retention follows the canonical lead-retention policy. AI records can be deleted with the parent lead through database foreign keys; secrets and provider payloads are never stored in AI tables.

