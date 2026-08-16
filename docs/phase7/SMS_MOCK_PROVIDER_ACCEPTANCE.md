# SMS mock-provider acceptance

Acceptance boundary: render only, no carrier. The existing mock adapter and communication tests prove template interpolation, transactional-versus-marketing separation, do-not-contact blocking, unknown-template rejection, and opt-out language. The Phase 7 permission service adds purpose-specific consent, test/suppression enforcement, and human review.

Result: release-candidate interface ready; carrier activation not authorized and not attempted.

## Inbound and sequence acceptance — 2026-08-16

The active App Router inbound endpoint is `/api/webhooks/sms/inbound`. It uses canonical Neon storage only. Twilio mode requires the form-encoded raw body and a valid constant-time signature; disabled-provider QA mode requires the timing-safe admin header. The route enforces a 20 KB request cap, validates phone/body/provider IDs, hashes message content, and never stores the raw body.

STOP immediately suppresses SMS, upserts purpose-specific opt-outs, and cancels active sequences. A normal reply cancels eligible sequences; HELP is recorded without cancellation. Provider event IDs are unique, so duplicate replay is idempotent. Forged signatures, unauthorized mock calls, invalid payloads, and oversized payloads fail before database mutation.

Focused acceptance passed with no network/provider call and no carrier send.
