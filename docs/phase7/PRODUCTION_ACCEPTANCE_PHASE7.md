# Production acceptance — Phase 7

Release acceptance is evidence-based. Code-complete does not mean Production-verified.

Required proof: merged commit, Ready Vercel deployment, canonical domains unchanged, additive migration recorded, consumer/SMS/scheduler/AI-auto flags off, health/ready 200, funnel smoke, Lead Center RBAC, permission matrix, template previews, sequence draft safety, signed webhook, OpenAI provider or transparent deterministic fallback, no Vercel runtime errors, Brandon-only QA outbox/message ID/inbox receipt, and no Mike/consumer delivery.

## Acceptance state at 2026-08-16

Accepted: local quality gate; canonical project and NellySelly isolation; Ready PR Preview; Preview public/health smoke; Preview and Production database migrations; PR 156 merge commit `4b4caefcd2aea2944a06df71a8cf3e3e569b969d`; Ready canonical Production deployment `dpl_31FNiQF1TcRw7cHZkmb8eFnRFmKc`; canonical-domain smoke; operator-only OpenAI Responses acceptance using the existing Sensitive Production key; and one Resend-accepted Brandon-only QA message with provider ID `871e5b96-a10b-492a-bb23-9898824f0cd3`.

The Phase 7 accessibility polish was merged through PR 158 at `fb6312d60c287477fc030d13804bde9f7c8884b2` after the 2,621-test release gate and matched in-app-browser Preview verification. Production deployment `dpl_3TCT4xrVCdh55xMzCoCC1qzhJrbV` is Ready on Node 24.x, owns both canonical Ask Magic Mike domains, and passed post-release smoke, funnel, monitor, lead-pipe, isolation, and no-error/no-warning log checks. Production DOM verification confirmed the persistent inline alert and required marker without submitting a lead.

Brandon-only delivery is now verified. Authenticated Resend inspection showed `sent` and `delivered`, and the authorized `brandonnarron1@gmail.com` Inbox contained the expected message with the approved sender, subject prefix, QA banner, HTML render, and protected Message Review Studio link. No mailbox write, Mike delivery, consumer delivery, BCC, or carrier SMS occurred. Evidence is stored under `output/phase7/screenshots/email-acceptance/`.

Provider-lifecycle hardening merged through PR 161 at `8f7697de5a7bf3384fb657fd5d0bbc31115dd6ad`. Production deployment `dpl_9xMNXTJP2iNdyGm3MnA42aQWTgPG` is Ready, owns the established apex and `www` aliases, and passed smoke (19/19 with two intentional read-only skips), funnel (15/15), monitor (9/9), lead-pipe, isolation, and no-error/no-warning log checks. The protected Notification Center now shows normalized provider event state/time, delivery confirmation cannot be regressed by later open/click events, and delayed/duplicate/terminal-failure paths are covered. No migration or live lead mutation occurred.

Resend webhook ingestion is now enabled and Production-verified. Webhook `d466d4d9-6837-49ae-9343-86c54c2bd720` targets the canonical HTTPS route with the exact documented event allowlist; its secret is stored as a Sensitive Production-only Vercel value. Deployment `dpl_5g43rkAatsVi3FHyarZf7Km1jZfG` rejected an invalid signature, accepted one correctly signed no-PII synthetic event, returned `duplicate=true` for exact replay, and produced exactly one verified/hash-minimized Neon event row. The synthetic event matched no notification and therefore recorded `processing_status=ignored`; no email or lead was created.

Carrier SMS, consumer messaging, sequence scheduling, AI automatic action, and Mike activation remain disabled. Webhook ingestion is the only control activated by this acceptance.

Phase 7 is deployed as a guarded release candidate; the Form 3 consumer acknowledgment pilot remains disabled behind its separate approval gate.
