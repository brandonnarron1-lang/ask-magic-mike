# Notification channel status

Status: `LIVE_PRODUCTION`

## Email

- Internal notification mode reports Production and email enabled.
- Canonical lead storage and outbox creation are independent of provider
  delivery.
- Internal templates support HTML/plain text, source-explicit subjects, safe
  Reply-To, hidden configured BCC, provider message IDs, attempts, timestamps,
  errors, and idempotency.
- Prior controlled evidence records delivery through the authenticated provider
  and hidden audit BCC. No email was sent during this continuation.
- Draft Batch B adds a bounded retry cron, stale-pending recovery, atomic
  internal alert intent, and Resend webhook atomicity; these are not yet
  Production.

## Consumer acknowledgment

Status: `VERIFIED_NOT_PRODUCTION`. Draft PR #275 contains the additive atomic
outbox implementation. Sending remains disabled and separately gated.

## Web Push

Infrastructure and phone setup are ready. Physical-device enrollment and one
`[TEST]` receipt remain user/device acceptance steps. Web Push is not SMS.

## Carrier SMS/MMS

Status: `BLOCKED_PROVIDER`. Twilio-compatible routing, callback, STOP/HELP,
suppression, recipient-role, retry, and safe-template code exists in the Draft
stack. No carrier/provider is enabled, no number is registered, and no SMS was
sent. Batch C must ship provider-disabled. A legitimate registered provider,
secrets, carrier compliance, and an approved test are required later.

## Immediate operating rule

Real lead notifications continue through the currently enabled internal email
path. Do not claim delivery from queue state alone; reconcile provider event,
message ID, final status, and Lead Center timeline.
