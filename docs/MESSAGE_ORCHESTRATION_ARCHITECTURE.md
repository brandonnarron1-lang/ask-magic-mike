# Message Orchestration Architecture

Canonical implementation: `src/lib/messaging/orchestrator.ts`, `sequence-engine.ts`, `template-registry.ts`, `sms-policy.ts`, and the additive migration `supabase/migrations/20260815193000_phase6_ai_messaging.sql`.

The preview planner resolves a versioned template, authoritative permission decision, deterministic idempotency key, rendered-content SHA-256, schedule time, SMS segment count, quiet-hours block, frequency-cap block, and auto-send warning. The mock SMS provider is idempotent and logs no destination or body.

Production remains fail closed: consumer acknowledgment, follow-up email,
sequence scheduler, auto-send, and carrier SMS are disabled. Authenticated Neon
evidence proved the isolated Preview branch distinct, and the Phase 6 migration
passed there. It has not been applied to Production, so Production runtime
features that require it remain inactive. Existing genuine internal alerts
continue through the proven durable `lead_notifications` outbox.
