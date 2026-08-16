# AI safety review — Phase 7

The AI layer is read-only and advisory. Prompt injection is screened; contact/address PII is redacted; untrusted lead text is delimited; output is schema-validated; time/token/cost limits are bounded; retries are bounded; provider failure falls back deterministically. No external web investigation of prospects is allowed.

The model cannot override deterministic test, suppression, consent, lead type, geography, routing, assignment, opt-out, legal hold, BIC hold, or communication permission. It cannot send. Human review is mandatory for every draft/action. Emergency disable bypasses the provider without affecting lead operations.

