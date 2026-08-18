# Form 3 consumer acknowledgment release gate

Status: **prepared, disabled, approval required**. Scope: Gravity Form 3 Home Value only. This document does not activate sending.

## Exact contract

| Control | Required value |
|---|---|
| Trigger | Successful canonical capture from WordPress Gravity Form 3 after durable lead storage |
| Purpose | `transactional_acknowledgment` only |
| Template | `home_value.email.received` version `v1` (pin exact content hash before activation) |
| From | Existing authenticated, domain-aligned sender stored in secure provider configuration |
| Reply-To | Validated consumer email only when header-safe; otherwise the approved brokerage reply address |
| Subject | `Your home-value review request was received` |
| Timing | Immediate queueing after durable storage and permission approval; delivery is not promised |
| Permission | Explicit allowed decision for transactional acknowledgment; ambiguous, held, opted-out, test, or suppressed fails closed |
| Idempotency | Lead ID + notification type + template version |
| Feature flag | `CONSUMER_ACKNOWLEDGMENT_ENABLED=true` only after approval |

## Required message

Ask Magic Mike and Our Town Properties confirm only that the request was received for human review. The message must not claim an appraisal, valuation, cash offer, appointment, guaranteed response time, or automated property result. It must identify the approved reply path and follow suppression/opt-out requirements.

## Safety and lifecycle

- Store the lead independently before any email attempt.
- Exclude `is_test=true` and `communication_suppressed=true`.
- Reject a duplicate idempotency key without sending again.
- Record provider message ID, attempts, timestamps, status, and safe error.
- Queue bounded retry on temporary failure; expose terminal failure in Lead Center.
- Treat bounce and complaint as terminal delivery/suppression signals.
- Treat a reply as a sequence stop and human-review signal.
- Marketing nurture, SMS, property alerts, other forms, and Mike activation remain excluded.
- Quiet hours do not delay this email acknowledgment; any later SMS or scheduled follow-up has separate rules.
- Frequency control: one acknowledgment per lead/template version.

## Monitoring and rollback

Before activation: verify sender alignment, provider account standing, webhook signature, template HTML/text/dark-mode previews, permission decision, suppression, duplicate prevention, and the Lead Center failure view.

After activation: watch accepted/sent/delivered/delayed/bounced/complained/failed events, queue depth, duplicate rate, complaint rate, and acknowledgment-to-lead reconciliation. Never infer delivery from queue acceptance alone.

Enablement: set only `CONSUMER_ACKNOWLEDGMENT_ENABLED=true` in the approved Production secret interface, redeploy, and run the approved Form 3 controlled acceptance.

Rollback: set `CONSUMER_ACKNOWLEDGMENT_ENABLED=false` and redeploy. Canonical lead capture and internal operational alerts continue.

## Visual preview copy

Desktop/mobile HTML headline: “We received your home-value review request.” Body: “Ask Magic Mike and Our Town Properties will review the details you submitted. This confirmation is not an appraisal, automated valuation, offer, or appointment.”

Plain text: “We received your home-value review request. Ask Magic Mike and Our Town Properties will review the details you submitted. This is not an appraisal, automated valuation, offer, or appointment.”

Dark mode uses the same wording and preserves contrast; it does not change the legal meaning.

Future approval phrase: `APPROVE FORM 3 CONSUMER ACKNOWLEDGMENT EMAIL PILOT`
