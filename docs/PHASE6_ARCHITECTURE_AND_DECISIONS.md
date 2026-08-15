# Phase 6 Architecture and Decisions

Date: 2026-08-15
Branch: `codex/phase6-funnel-ai-messaging-2026-08-15`

## Preserved canonical spine

`Public/WordPress form -> POST /api/leads -> Neon transaction -> deterministic score/routing -> lead_notifications outbox -> provider -> Lead Center/audit`

Phase 6 extends that spine. It does not add a second lead store, notification queue, CRM, or admin surface.

| Capability | Canonical implementation | Phase 6 decision |
| --- | --- | --- |
| Lead storage | Neon `public.leads` | Preserved |
| Attribution | `source_attribution` | Preserved |
| Notifications | `lead_notifications` and `app/lib/leadAlertService.ts` | Preserved; consumer ack receives a separate fail-closed gate |
| WordPress | Signed bridge into `/api/leads` | Preserved; no form replacement |
| Admin authorization | Better Auth plus server-side RBAC | Preserved and reused by copilot |
| AI | OpenAI Responses API, structured output, `store:false` | Advisory only; no routing, scoring, permission, assignment, stage, or send authority |
| Messaging policy | `src/lib/messaging/permission-engine.ts` | New single decision function for purpose/channel/consent/suppression checks |
| Message sequences | Existing outbox remains delivery system | New definitions remain approval-required and unscheduled |

## Trust boundaries

1. Browser inputs are untrusted and validated server-side.
2. Public routes receive no provider secrets or private Lead Center data.
3. Copilot requests require an authenticated Lead Center session and lead-scoped RBAC.
4. Lead email, phone, and street address are not sent to the AI summary call. Untrusted free text is redacted and delimited.
5. AI output is visibly labeled advisory and cannot invoke delivery code.
6. Consumer email, SMS, and sequence scheduling default disabled.

## Data additions

Migration `20260815193000_phase6_ai_messaging.sql` is additive. It introduces permission evidence, communication decisions, sequence instances/steps, communication events, AI outputs, and AI usage records. All new tables have RLS enabled and revoke `anon` and `authenticated` access. Applying this migration to Production remains a separate release action.

## Isolation

Ask Magic Mike remains connected only to its canonical Vercel project, GitHub repository, and Neon project. No NellySelly hostname, database, environment variable, deployment alias, or code path is used by this release.
