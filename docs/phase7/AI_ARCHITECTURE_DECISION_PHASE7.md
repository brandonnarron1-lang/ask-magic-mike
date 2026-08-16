# AI architecture decision — Phase 7

Decision: preserve deterministic lead capture/routing and add AI as an asynchronous, read-only advisory layer.

`leads`, scoring, routing, consent, assignment, notification outbox, and audit records remain authoritative. `ai_intelligence_jobs` queues advisory work; the hourly worker claims one job atomically, enforces the daily ceiling, calls the Responses API, validates strict JSON, stores `ai_lead_intelligence`, stores `ai_usage_events`, and marks the job completed, blocked, or retryable. The synchronous copilot endpoint remains available as a controlled fallback.

AI cannot send, assign, alter score, infer consent, create property facts, guarantee outcomes, make protected-class decisions, or silently change a lead. RBAC-filtered tools expose reads and preview-only actions. Every state-changing tool requires explicit human approval; production send tools are absent.

Rollback: disable `AI_ASYNC_COPILOT_ENABLED`, `AI_ASYNC_WORKER_ENABLED`, or set `AI_EMERGENCY_DISABLED=true`. Lead capture and operations continue unchanged.

