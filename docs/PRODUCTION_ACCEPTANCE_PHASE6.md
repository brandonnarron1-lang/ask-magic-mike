# Production Acceptance - Phase 6

Status: **NOT YET ACCEPTED FOR PRODUCTION**

## Passed locally

- ESLint, strict typecheck, 2,600 tests, and production build.
- Existing canonical lead and notification tests.
- New AI, permission, messaging, sequence, and SMS policy tests.
- Consumer automation and carrier SMS remain disabled.
- Mike remains outside Phase 6 QA.

## Required before acceptance

1. Commit and push the Phase 6 branch; open a reviewable PR.
2. Deploy Preview with Preview-scoped Neon branch and feature flags.
3. Apply the additive migration to Preview only; verify tables and grants.
4. Run authenticated Lead Center copilot and message-preview QA with synthetic records only.
5. Send the specifically authorized Brandon-only QA email and verify provider acceptance, inbox receipt, rendering, links, reply path, no Mike delivery, and no consumer delivery.
6. Complete Preview smoke/funnel/monitoring, dependency audit, secret/history scan, and same-viewport visual comparison.
7. Review Preview logs for post-deploy errors and TLS warnings.
8. Only then merge and deploy Production, with consumer and SMS automation still disabled.

No local test result authorizes a live migration, consumer send, carrier SMS, Mike activation, or publication by itself.
