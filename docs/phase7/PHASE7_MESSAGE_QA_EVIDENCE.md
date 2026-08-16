# Phase 7 message QA evidence

The QA route requires a UUID lead record, validates `is_test=true` and `communication_suppressed=true`, validates the exact allowlisted recipient configuration, caps successful sends at eight, creates an outbox row before provider delivery, uses a release/lead/audience idempotency key, and never includes BCC, Mike, or a consumer recipient.

Allowed subjects begin `[TEST — BRANDON QA]` or `[TEST — BRANDON QA — MIKE VIEW]`. Provider message ID and outbox status are persisted. Actual Brandon inbox acceptance will be appended only after a deployed, approved run; local mocked-provider results are not represented as delivery proof.

