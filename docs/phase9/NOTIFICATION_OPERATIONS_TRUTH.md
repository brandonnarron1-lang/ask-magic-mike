# Phase 9 Notification Operations Truth

Date: 2026-08-29  
Status: reviewed local candidate; no Production authority

## Decision

Reuse the canonical `lead_notifications` outbox, Neon database, protected Lead
Center notification page, existing provider lifecycle metadata, and existing
one-record retry action. Do not create another queue, notification table,
provider, dashboard, CRM, migration, or public endpoint.

The prior page counted only the bounded latest-record list. Its cards could
therefore be mistaken for complete queue totals and included QA records in the
same numbers as live leads. Per-record provider message IDs, lifecycle events,
safe errors, attempt counts, and retry controls were already implemented and
remain unchanged.

## Candidate behavior

The protected server now executes one aggregate, read-only Neon query that:

- joins each notification to its canonical lead;
- excludes `is_test=true` leads from every live KPI while reporting the QA
  count separately;
- reports orphaned notification rows as an explicit integrity signal;
- reports exact live pending, processing, retry-scheduled, retry-due, sent,
  skipped, failed, and permanently-failed totals;
- flags pending records older than five minutes and processing records older
  than ten minutes;
- distinguishes provider acceptance (`sent`) from provider-confirmed delivery;
- reports provider terminal failures, oldest actionable work, last accepted
  send, and last provider confirmation; and
- returns no recipient, message body, lead identity, secret, provider token, or
  database identity.

The protected `/admin/notifications` surface renders the exact values and
labels recent QA rows. If the aggregate query is unavailable, it labels the
fallback cards as a bounded recent sample rather than presenting them as
Production KPIs. The protected `/api/admin/health` response exposes the same
PII-free operational counts for authenticated monitoring.

## Safety and data boundary

- Query type: `SELECT` only.
- Storage: existing canonical Neon tables only.
- Runtime authorization: existing Lead Center `notification:manage` permission
  and protected admin-health authentication remain unchanged.
- Retry behavior: existing confirmed one-record action only; no bulk retry,
  automatic send, or provider call was added.
- Public surface: unchanged.
- Production data, environment variables, provider settings, WordPress,
  domains, and NellySelly: unchanged.

## Lineage and release order

The candidate starts from exact sealed PR #233 head
`ff67874eacdb44d7653c964ce395ae7bafd54910`, preserved at
`rescue/amm-pr234-base-pr233-20260829-171619`. It is an ordered downstream
candidate only. PR #210 remains the first eligible application release and no
later candidate may bypass an immediate predecessor.

The durable-rate-limit approval supplied again on 2026-08-29 is historical:
PR #209 already consumed it and Production already reports every durable
limiter readiness boolean true. It grants no authority to this candidate.

## Rollback

Before Production release, close the Draft and retain its branch/rescue ref.
After an eventual approved release, restore the immediately preceding READY
Production deployment. This candidate has no migration or data rewrite to
reverse.

## Future exact gate

Only after every predecessor is accepted, this branch is refreshed onto the
then-current Production `main`, and exact-head CI/Preview/protected proof is
repeated may it request:

`APPROVE PHASE 9 NOTIFICATION OPERATIONS TRUTH MERGE AND PRODUCTION DEPLOYMENT`

