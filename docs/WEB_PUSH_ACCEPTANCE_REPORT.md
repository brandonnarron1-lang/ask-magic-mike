# Web Push Acceptance Report

Verified 2026-08-14 without sending a push notification.

- Production readiness reports Push enabled, provider configured, phone setup
  configured, subscription table ready, and overall Push ready. No value was
  exposed.
- The production `staff_push_subscriptions` table exists with server-only RLS.
- Duplicate endpoints are constrained unique.
- Subscription role is restricted to `primary` or `copy`.
- Active subscriptions: 0.
- Mike devices enrolled: 0.
- Brandon devices enrolled: 0.
- Carrier SMS remains disabled and deferred.
- The enrollment and push code remain available at
  `https://www.askmagicmike.com/admin/notifications/phone` behind the current
  protected admin boundary.

The enrollment UI now captures a recognizable, non-secret device label and
returns that label instead of a raw Push endpoint. The additive schema migration
was applied and verified on Neon Preview only; Production remains unchanged.
Duplicate endpoints remain idempotent, revocation stays server-side, expired
subscriptions are disabled, tests are copy-role-only, and deep links return to
the protected Lead Center.

Physical browser permission and the reviewed Production device-label
migration/deploy are the remaining enrollment dependencies. No permission prompt
was bypassed and no test notification was sent in this phase. A QR code for the
protected enrollment route is at `docs/assets/web-push-enrollment-qr.png`.
