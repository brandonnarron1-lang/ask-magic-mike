# SMS mock-provider acceptance

Acceptance boundary: render only, no carrier. The existing mock adapter and communication tests prove template interpolation, transactional-versus-marketing separation, do-not-contact blocking, unknown-template rejection, and opt-out language. The Phase 7 permission service adds purpose-specific consent, test/suppression enforcement, and human review.

Result: release-candidate interface ready; carrier activation not authorized and not attempted.

## Inbound and sequence acceptance — 2026-08-16

The active App Router inbound endpoint is `/api/webhooks/sms/inbound`. It uses
canonical Neon storage only. Exact form media is treated as Twilio and requires
a valid constant-time signature even if outbound delivery has been disabled.
The admin-secret JSON mock mode is local/non-Production only; Production refuses
it and read-only Preview refuses before body/auth/database work. The route
enforces declared and streamed 20 KB caps, validates U.S. phone/body/provider
IDs, hashes message content, and never stores the raw body or phone in webhook
metadata.

STOP atomically suppresses every currently matching lead record, upserts every
purpose-specific opt-out, and cancels active sequences. A normal reply cancels
eligible sequences; HELP is recorded without cancellation. The provider receipt
and all downstream mutations share one statement, so a partial failure rolls
back completely. Exact replay is idempotent and conflicting event-ID reuse is
rejected. START/UNSTOP is not an automatic re-opt-in path.

Focused acceptance passed with no network/provider call and no carrier send.
