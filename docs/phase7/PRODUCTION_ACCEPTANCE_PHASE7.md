# Production acceptance — Phase 7

Release acceptance is evidence-based. Code-complete does not mean Production-verified.

Required proof: merged commit, Ready Vercel deployment, canonical domains unchanged, additive migration recorded, consumer/SMS/scheduler/AI-auto flags off, health/ready 200, funnel smoke, Lead Center RBAC, permission matrix, template previews, sequence draft safety, signed webhook, OpenAI provider or transparent deterministic fallback, no Vercel runtime errors, Brandon-only QA outbox/message ID/inbox receipt, and no Mike/consumer delivery.

## Acceptance state at 2026-08-16

Accepted: local quality gate; canonical project and NellySelly isolation; Ready PR Preview; Preview public/health smoke; Preview and Production database migrations; PR 156 merge commit `4b4caefcd2aea2944a06df71a8cf3e3e569b969d`; Ready canonical Production deployment `dpl_31FNiQF1TcRw7cHZkmb8eFnRFmKc`; canonical-domain smoke; operator-only OpenAI Responses acceptance using the existing Sensitive Production key; and one Resend-accepted Brandon-only QA message with provider ID `871e5b96-a10b-492a-bb23-9898824f0cd3`.

The Phase 7 accessibility polish was merged through PR 158 at `fb6312d60c287477fc030d13804bde9f7c8884b2` after the 2,621-test release gate and matched in-app-browser Preview verification. Production deployment `dpl_3TCT4xrVCdh55xMzCoCC1qzhJrbV` is Ready on Node 24.x, owns both canonical Ask Magic Mike domains, and passed post-release smoke, funnel, monitor, lead-pipe, isolation, and no-error/no-warning log checks. Production DOM verification confirmed the persistent inline alert and required marker without submitting a lead.

The connected Gmail account is not the authorized recipient inbox, and the existing Resend key is send-scoped, so inbox receipt is not claimed. Brandon must review the authorized inbox for rendering and receipt. Carrier SMS, consumer messaging, sequence scheduling, AI automatic action, Mike activation, and Resend webhook ingestion remain disabled.

Phase 7 is deployed as a guarded release candidate; the Form 3 consumer acknowledgment pilot remains disabled behind its separate approval gate.
