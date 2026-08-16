# Outbound automation readiness report

| Capability | Code | Production flag | Readiness |
|---|---|---|---|
| Internal lead alert | preserved | existing | operational baseline preserved |
| Brandon QA email | hardened | controlled | one accepted provider send; inbox review pending |
| Consumer acknowledgment | template + permission gate | off | pilot not approved |
| Consumer nurture | template + sequence draft | off | not approved |
| Carrier SMS | mock interface | off | not activated |
| Sequence scheduler | durable state machine | off | test-only candidate |
| Resend webhook | signed/idempotent | secret pending | deployment acceptance required |
| AI copilot | structured/fallback | feature flagged | deployed structured-output acceptance passed |

No outbound consumer automation is release-ready until a narrow purpose receives BIC/legal/owner approval and passes a suppressed Brandon test.
