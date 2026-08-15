# Phase 5 Release Notes

Phase 5 preserves the production funnel and adds operational guardrails:

- Suppressed non-test records are excluded from every live inbox and from
  routing/stalled signals.
- Reporting appointment and follow-up queries now join only to live,
  unsuppressed leads and apply a defensive live-ID filter before aggregation.
- The first-live monitor now checks unsuppressed QA and weakly evidenced QA
  classifications without returning lead PII.
- Explicit regression coverage protects queue filters, report exclusions, and
  genuine-lead classification.
- Public confirmation copy no longer promises an unverified response time.
- The launch doctor ignores MLS/FlexMLS words that occur only in source-code
  documentation while continuing to block deployable confidential markers.

These changes are monitoring, reporting, and compliance corrections permitted
during the Phase 5 stabilization window. No schema migration or lead-data
mutation is required.
