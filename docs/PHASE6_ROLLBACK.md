# Phase 6 Rollback

## Application rollback

1. Disable `AI_PUBLIC_CHAT_ENABLED`, `AI_LEAD_INTELLIGENCE_ENABLED`, `AI_INTELLIGENCE_PERSIST_ENABLED`, `QA_EMAIL_ENABLED`, all consumer flags, the sequence scheduler, and auto-send.
2. Redeploy the last verified Phase 5 production commit `1dd8f35cb1ab1adcacd1292262ca6c01580eb370` through the existing Vercel project.
3. Confirm `/api/health/live`, `/api/health/ready`, public funnel routes, Lead Center login, notification outbox, and WordPress Form 3 bridge health.
4. Run the existing production smoke, funnel, and monitoring scripts.

## Database rollback

The Phase 6 migration is additive and the application does not require its tables while persistence flags are disabled. Prefer leaving empty tables in place during an application rollback. Dropping tables or deleting AI/communication records is a destructive production-data action and requires a separate approved migration and backup.

## Communication rollback

Turning off consumer, sequence, QA, AI, SMS, push, or provider flags prevents new actions. Existing canonical notification records remain for audit. Do not delete or rewrite them.
