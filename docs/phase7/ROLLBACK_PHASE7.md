# Phase 7 rollback

1. Disable `AI_ASYNC_COPILOT_ENABLED`, `AI_ASYNC_WORKER_ENABLED`, `QA_EMAIL_PRODUCTION_ENABLED`, and the webhook at the provider.
2. Keep consumer acknowledgment, nurture, SMS, scheduler, and auto-send false.
3. Redeploy the Phase 6 Production commit `c1648137b6a7ca3be947e3e0872f35dd671a1b93` through Vercel rollback.
4. Do not remove Phase 7 tables during incident response; they are additive and inert when code/flags are rolled back.
5. Verify health, lead capture, internal alerts, Lead Center, canonical domains, and NellySelly isolation.

Database rollback is normally unnecessary. If later approved, drop only Phase 7 tables/columns after backup and dependency review; never delete lead, notification, permission, or AI audit records ad hoc.

