# AI Lead Intelligence Architecture

`Lead Center RBAC -> authorized lead projection -> contact-field exclusion -> free-text redaction/injection check -> feature/cost gates -> Responses API strict schema -> Zod validation -> read-only facts/suggestions UI`

The deterministic lead record is authoritative. AI cannot mutate consent, suppression, test state, score, assignment, stage, routing, message permission, or send state. The output includes summary, intent, urgency interpretation, key/missing facts, motivation indicators, objections, next human action, suggested questions/call/email/SMS drafts, cadence, risk flags, consent limits, geography/source notes, confidence, and explanation.

Failure at any AI step returns a deterministic result and never blocks capture or genuine internal alerting. See `src/lib/ai/`, `app/api/admin/copilot/route.ts`, and `AI_SAFETY_REVIEW_PHASE6.md`.
