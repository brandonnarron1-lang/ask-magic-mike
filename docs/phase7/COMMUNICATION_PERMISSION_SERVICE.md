# Communication permission service

The service evaluates one channel and one purpose at a time using canonical lead state plus explicit `communication_permissions` rows. It records immutable results in `communication_decisions` with actor, timestamp, code, explanation, evidence metadata, and idempotency key.

Order of enforcement: invalid destination; legal/BIC hold; test/suppression; QA test-and-suppressed invariant; ambiguous/denied consent; channel opt-out; purpose-specific permission; auto-send gate; human approval gate.

Marketing permission is never inferred from an inquiry. SMS permission is never inferred from a phone number. Property-alert permission does not authorize general marketing. Form 7 legacy records are not retroactively subscribed. Internal alerts and QA tests use separate purposes. The Lead Center matrix shows allowed, review-required, and blocked states without sending.

API: `GET|POST /api/admin/leads/[id]/communication-permissions`. RBAC and object-level assignment scope are enforced server-side. POST records a decision; it does not send.

