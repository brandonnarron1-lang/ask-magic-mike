# Production Acceptance - Phase 6

Status: **NOT YET ACCEPTED FOR PRODUCTION**

## Passed locally

- ESLint, strict typecheck, 2,600 tests, and production build.
- Existing canonical lead and notification tests.
- New AI, permission, messaging, sequence, and SMS policy tests.
- Consumer automation and carrier SMS remain disabled.
- Mike remains outside Phase 6 QA.

## Required before acceptance

1. Review PR 152 and the ready Preview deployment.
2. Prove that Preview `DATABASE_URL` targets a non-Production Neon branch; the sensitive value is configured but not exportable to the CLI.
3. Apply the additive migration to that proven Preview branch only; verify tables and grants.
4. Run authenticated Lead Center copilot and message-preview QA with synthetic records only.
5. Send the specifically authorized Brandon-only QA email and verify provider acceptance, inbox receipt, rendering, links, reply path, no Mike delivery, and no consumer delivery.
6. Complete Preview smoke/funnel/monitoring, dependency audit, secret/history scan, and same-viewport visual comparison.
7. Review Preview logs for post-deploy errors and TLS warnings.
8. Only then merge and deploy Production, with consumer and SMS automation still disabled.

No local test result authorizes a live migration, consumer send, carrier SMS, Mike activation, or publication by itself.
