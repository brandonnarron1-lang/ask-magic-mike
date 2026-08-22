# Phone Alert Enrollment Guide

Carrier SMS is DEFERRED — PAID SERVICE. The free-first staff-phone path is the
existing standards-based Web Push enrollment. Mike and Brandon must each grant
browser notification permission on their own physical phone; the server cannot
grant that permission or take over a device.

## Brandon copy device

1. An authenticated admin generates the short-lived, single-role copy-device
   setup link under `/admin/notifications/phone`.
2. Share it only to Brandon when his iPhone is ready. Open it in Safari; do not
   forward, bookmark, or paste the bearer link into another service.
3. From the private install page choose Share → Add to Home Screen, leave Open
   as Web App enabled when shown, then launch the Magic Mike Home Screen icon.
4. The installed app claims the token once inside its own secure cookie context
   and removes it from the browser URL. Tap Enable free phone alerts and Allow.
5. Confirm the admin page reports one active `copy` subscription.

If the app reports that the link expired, was already claimed, or secure claim
verification is unavailable, stop. No phone was registered. Generate one fresh
link only when the intended phone is ready and repeat the installation.

## Mike primary device

Use the authenticated primary-device enrollment flow on Mike's own phone after
he approves. Do not use Brandon's scoped copy link or test destination as Mike.

## Verification

Use the explicit test control only after approval. The message must say internal
QA and must not be connected to a fabricated prospect. Confirm subscription ID,
provider result, timestamp, target role, and receipt. Revoke stale subscriptions;
never share `ADMIN_SECRET`, signing keys, VAPID private keys, or an unexpired
install link. Automated Preview QA validates the page/manifest contract without
redeeming the token, registering a device, or sending Push.
