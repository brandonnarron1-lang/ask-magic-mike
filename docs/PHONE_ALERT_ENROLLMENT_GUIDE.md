# Phone Alert Enrollment Guide

Carrier SMS is DEFERRED — PAID SERVICE. The free-first staff-phone path is the
existing standards-based Web Push enrollment. Mike and Brandon must each grant
browser notification permission on their own physical phone; the server cannot
grant that permission or take over a device.

## Brandon copy device

1. An authenticated admin generates the short-lived, single-role copy-device
   setup link under `/admin/notifications/phone`.
2. Open that exact secure link on Brandon's phone in a supported browser; do not
   strip the token during browser handoff.
3. Claim it before expiry, tap Enable notifications, and accept the operating
   system prompt.
4. Confirm the admin page reports one active copy subscription.

## Mike primary device

Use the authenticated primary-device enrollment flow on Mike's own phone after
he approves. Do not use Brandon's scoped copy link or test destination as Mike.

## Verification

Use the explicit test control only after approval. The message must say internal
QA and must not be connected to a fabricated prospect. Confirm subscription ID,
provider result, timestamp, target role, and receipt. Revoke stale subscriptions;
never share `ADMIN_SECRET`, signing keys, or VAPID private keys.
