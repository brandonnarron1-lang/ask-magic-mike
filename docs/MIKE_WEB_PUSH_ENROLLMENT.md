# Mike Web Push Enrollment

Technical state: ready. Device state: not enrolled. Mike must first finish his
private Lead Center password activation.

Open `https://www.askmagicmike.com/admin/notifications/phone` while signed in as
Mike. On iPhone/iPad, add the site to the Home Screen and open it there. Enter a
non-sensitive device label, select the `primary` role, grant the browser's
notification permission, and send one clearly labeled `[TEST]` push. Confirm
the deep link requires the authenticated Lead Center, duplicate enrollment is
idempotent, and revocation stops delivery.

Never store the Push endpoint or keys in a general artifact. Carrier SMS remains
disabled and is not replaced by an unsafe phone takeover.
