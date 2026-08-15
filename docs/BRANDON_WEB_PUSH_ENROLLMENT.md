# Brandon Web Push Enrollment

Technical state: ready. Device state: not enrolled.

Open `https://www.askmagicmike.com/admin/notifications/phone` while signed in as
Brandon. On iPhone/iPad, add the site to the Home Screen and open it there.
Enter a non-sensitive device label, select the `copy` role, grant the browser's
notification permission, and send one clearly labeled `[TEST]` push. Confirm
the deep link returns to the authenticated Lead Center, duplicate enrollment is
idempotent, revocation stops delivery, and re-enroll only if needed.

Never copy the Push endpoint or keys into chat, screenshots, or shared records.
The browser permission cannot and must not be bypassed remotely.
