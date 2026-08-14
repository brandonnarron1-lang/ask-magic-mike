# Rollback Guide

## Application

Current production is Vercel deployment
`dpl_4krvUvVDvgK4owaQmaHHfXyWAEke`. The immediately preceding inspected Ready
deployment is `dpl_5cDj7c7QcCPassZvww9mGZzAfeVm`. Before a future deploy,
re-inspect both IDs because aliases and deployment order can change.

If critical smoke checks fail, stop activation and promote the recorded prior
Ready deployment through Vercel. Do not force-push, delete a deployment, or
change DNS. Re-run public, auth, health, and isolation checks after rollback.

## Database

Migrations are additive and require a separate approval. Prefer forward fixes.
Never drop canonical lead, consent, attribution, audit, or delivery history during
an application rollback. Use Neon branch restore/down notes only after exact-scope
review and owner approval.

## Communications

Set internal/customer channel toggles disabled to stop sends while preserving
outbox evidence. Fix and retry using the original idempotency key; do not delete
failed rows. Web Push subscriptions may be revoked individually.

## WordPress

Set `AMM_CANONICAL_BRIDGE_ENABLED=false` or remove only the approved embed block.
Gravity Forms remains the capture fallback. Do not alter parent theme, IDX,
unrelated forms, pages, or SEO metadata.
