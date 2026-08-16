# Phase 7 environment configuration report

Date: 2026-08-16  
Scope: names, intended states, and validation only. No secret values are recorded here.

## Reused controls

The existing flags remain canonical: `QA_EMAIL_ENABLED`, `QA_TEST_RECIPIENT_OVERRIDE_ENABLED`, `QA_EMAIL_RECIPIENT`, `QA_EMAIL_ALLOWED_RECIPIENTS`, `QA_EMAIL_PRODUCTION_ENABLED`, `CONSUMER_ACKNOWLEDGMENT_ENABLED`, `CONSUMER_FOLLOWUP_EMAIL_ENABLED`, `CONSUMER_SMS_ENABLED`, `MESSAGE_SEQUENCE_SCHEDULER_ENABLED`, `MESSAGE_AUTO_SEND_ENABLED`, `MESSAGE_HUMAN_APPROVAL_REQUIRED`, `AI_LEAD_INTELLIGENCE_ENABLED`, `AI_PERSONALIZATION_PREVIEW_ENABLED`, and `AI_EMERGENCY_DISABLED`.

Phase 7 adds narrowly scoped names: `RESEND_WEBHOOK_SECRET`, `QA_EMAIL_MAX_SENDS`, `AI_ASYNC_COPILOT_ENABLED`, and `AI_ASYNC_WORKER_ENABLED`.

## Intended release state

| Control | Preview | Production |
|---|---|---|
| Brandon QA email | enabled for a suppressed test record | enabled only during controlled acceptance |
| QA recipient override | exact allowlist; test + suppressed required | exact allowlist; test + suppressed required |
| Consumer acknowledgment | disabled | disabled |
| Consumer nurture | disabled | disabled |
| Carrier SMS | disabled | disabled |
| Sequence scheduler | test-only after migration | disabled |
| AI lead intelligence | synthetic/operator preview | operator-only, feature flagged |
| AI automatic action | disabled | disabled |
| Human approval | required | required |
| Resend webhook | validate after secret configuration | validate before events are accepted |

The QA email route queries the canonical lead record and refuses an override unless `is_test=true` and `communication_suppressed=true`. It never adds BCC, Mike, or a consumer recipient.

## Reused OpenAI key decision

The existing Vercel Sensitive `OPENAI_API_KEY` remains the approved source. It is not copied, printed, downloaded, or committed. Phase 7 verifies it only from a deployed environment and falls back deterministically on provider or model failure.

