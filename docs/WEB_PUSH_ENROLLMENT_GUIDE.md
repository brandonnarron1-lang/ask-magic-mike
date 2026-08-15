# Web Push Enrollment Guide

Web Push is prepared but no device is enrolled. Carrier SMS remains disabled.

## Mike or Brandon

1. Open `https://www.askmagicmike.com/admin/notifications/phone` using the approved authenticated browser.
   The printed/onscreen QR code in `docs/assets/web-push-enrollment-qr.png` opens
   this protected route; it is not a credential.
2. On iPhone or iPad, add the site to the Home Screen and open that installed app.
3. Enter a recognizable device name without a phone number or private identifier.
4. Choose the approved role: Mike is primary; Brandon is copy.
5. Allow notifications in the browser prompt. This permission cannot be bypassed remotely.
6. Send one clearly labeled `[TEST]` push.
7. Confirm the lock-screen text contains no contact details.
8. Open the deep link and confirm the Lead Center still requires authentication.
9. Re-enroll once to confirm duplicates are merged, then revoke and verify delivery stops.

Never copy a subscription endpoint, key, or browser session into chat or a shared document.
