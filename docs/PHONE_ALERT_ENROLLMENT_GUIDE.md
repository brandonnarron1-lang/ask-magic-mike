# Phone Alert Enrollment Guide

Carrier SMS is DEFERRED — PAID SERVICE. The free-first staff-phone path is the
existing standards-based Web Push enrollment. Mike and Brandon must each grant
browser notification permission on their own physical phone; the server cannot
grant that permission or take over a device.

## Brandon copy device

1. An authenticated admin generates the short-lived, single-role copy-device
   setup link under `/admin/notifications/phone`.
2. Open that exact secure install link in Safari. The page serves a short-lived,
   token-scoped web-app manifest whose `start_url` points to the claim route.
3. Add the install page to the Home Screen, leave Open as Web App enabled when
   shown, leave Safari, and open the new Magic Mike icon before expiry.
4. The installed app redeems the token inside its own isolated cookie context,
   cleans the URL, and opens the copy-only setup page. Tap Enable notifications
   and accept the operating-system prompt.
5. Confirm the admin page reports one active copy subscription.

Do not rely on Safari transferring its setup cookie into the installed iPhone
web app. WebKit documents iOS Home Screen apps as isolated and requires Web Push
permission to be requested from the installed app after a direct user gesture.
The token-scoped manifest makes that first installed-app launch deterministic.

Primary references:

- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- https://bugs.webkit.org/show_bug.cgi?id=181849

## Mike primary device

Use the authenticated primary-device enrollment flow on Mike's own phone after
he approves. Do not use Brandon's scoped copy link or test destination as Mike.

## Verification

Use the explicit test control only after approval. The message must say internal
QA and must not be connected to a fabricated prospect. Confirm subscription ID,
provider result, timestamp, target role, and receipt. Revoke stale subscriptions;
never share `ADMIN_SECRET`, signing keys, or VAPID private keys.
