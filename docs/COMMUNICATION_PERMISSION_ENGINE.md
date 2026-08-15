# Communication Permission Engine

Canonical implementation: `src/lib/messaging/permission-engine.ts`.

The engine evaluates purpose, channel, requested-service/transactional/marketing basis, email/SMS/call permissions, test and suppression state, opt-out, legal/BIC hold, recipient isolation, and human approval. It returns an auditable allow/block decision with explicit reasons. Ambiguous consent fails closed.

Purposes are separated: internal alert, requested-service response, transactional acknowledgment, appointment coordination, property-alert subscription, marketing nurture, manual one-to-one, and QA test. Property-alert consent does not become general marketing consent. Test/suppressed records cannot receive consumer messaging. See `MESSAGING_SYSTEM_PHASE6.md` and `MESSAGING_COMPLIANCE_REVIEW_PHASE6.md`.
