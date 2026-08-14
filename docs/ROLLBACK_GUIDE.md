# Rollback Guide

## Application

Current production is Vercel deployment
`dpl_GJkS5dRAtzakPdtVJRiNAUWbWSKp` at merge commit
`8ca35cf3154268edf9c9d26bd9cce91a799323f0`. The retained prior Ready deployment
is `dpl_4krvUvVDvgK4owaQmaHHfXyWAEke`. Before a future deploy,
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

Set `AMM_CANONICAL_BRIDGE_ENABLED=false`; for one-form rollback, remove only that
ID from `AMM_CANONICAL_BRIDGE_FORM_IDS`. Remove only the approved embed block when
the incident concerns an embed rather than Gravity forwarding.
Gravity Forms remains the capture fallback. Do not alter parent theme, IDX,
unrelated forms, pages, or SEO metadata.
