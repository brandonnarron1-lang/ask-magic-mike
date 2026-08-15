# Phase 6 Message Copy Approval Packet

Status: **BIC/legal/provider review required before any consumer activation**

## Library submitted for review

The source-of-truth registry is `src/lib/messaging/template-registry.ts`: 33 templates covering general inquiry, home value, seller, buyer, seller options, rental, short-term rental, property alerts, out-of-area, coastal review, internal alert, push, and operator call opener. The sequence source is `src/lib/messaging/sequence-engine.ts`: 8 sequences, every step approval-required.

## Approval questions

1. Is each form’s consent language appropriate for the requested-service purpose and channel?
2. Which, if any, messages are marketing rather than requested-service or transactional?
3. Is the approved physical/business identification and unsubscribe mechanism correct for marketing email?
4. Are SMS HELP instructions, STOP handling, quiet hours, frequency caps, and sender registration acceptable?
5. Are out-of-area, coastal, seller-options, home-value, rental, and property-alert disclaimers accurate?
6. Which forms and sequences may be activated, and in what order?

## Copy guardrails already enforced

- No appraisal, automated valuation, guaranteed value, guaranteed offer, inventory, appointment, response time, lending result, closing outcome, or service-area promise.
- Property-alert permission is separate from marketing.
- Test and suppressed records receive no consumer messaging.
- Consumer sends require purpose-specific permission plus a release gate and human approval.
- SMS templates include STOP and HELP instructions and are previewed for segment count.

## Approval record

| Group | Email | SMS | Call/push | Consent | BIC/legal | Provider | Activation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| General | Pending | Pending | Pending | Pending | Pending | Pending | Disabled |
| Home value | Pending | Pending | Pending | Pending | Pending | Pending | Disabled |
| Seller | Pending | Pending | Pending | Pending | Pending | Pending | Disabled |
| Buyer | Pending | Pending | Pending | Pending | Pending | Pending | Disabled |
| Seller options | Pending | Pending | Pending | Pending | Pending | Pending | Disabled |
| Rental | Pending | Pending | Pending | Pending | Pending | Pending | Disabled |
| Short-term rental | Pending | N/A | Pending | Pending | Pending | Pending | Disabled |
| Property alerts | Pending | Pending | Pending | Pending | Pending | Pending | Disabled |
| Out-of-area/coastal | Pending | N/A | Pending | Pending | Pending | Pending | Disabled |

