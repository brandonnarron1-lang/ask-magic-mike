# Form Activation Change Log

This log records one-form-at-a-time canonical bridge decisions. A Gravity Forms
definition being `Active` does not mean it is enabled in the canonical bridge.
No entry deletion, production lead mutation, consumer contact, or marketing
audience enrollment is authorized by this log.

## 2026-08-14 — Form 1 (`Contact Us`)

Disposition: **STOPPED / NOT ALLOWLISTED**.

- Public placement verified at `/contact-us/` from authenticated entry metadata.
- Gravity Forms stores the entry before notification and currently has 1,337
  retained entries.
- Required fields are name and email. Phone, subject, and message are optional.
- CAPTCHA and the form honeypot are enabled.
- There is no explicit consent field, consent text/version, attribution field,
  first/last-touch field, UTM field, click-ID field, or placement identifier.
- The existing `Admin Notification` is active and uses a domain-aligned From
  address plus the submitter email as Reply-To. It does not prove inbox delivery;
  Gravity Forms records only that WordPress passed the message to the sending
  server.
- The default confirmation redirects to `/thank-you/`.
- Existing entries show the form receives mixed-purpose contact, vendor,
  property-management, and unsolicited messages. This makes silent marketing
  consent inference especially unsafe.
- A read-only form-definition export was attempted through the authenticated
  Gravity Forms export UI. No local download artifact was produced, so no form
  change was made and no rollback-dependent activation proceeded.

Required before activation:

1. Owner/BIC-approved consent language with no preselected choice.
2. Requested-response permission separated from optional marketing permission.
3. A denied or absent marketing choice must not block a requested response.
4. Exact consent text/version and source attribution mapped into the canonical
   payload.
5. Successful form-definition backup, controlled QA submission, one-record
   proof, duplicate-notification suppression, and replay/reconciliation proof.

Rollback if a future activation fails: remove Form 1 from the bridge allowlist,
restore its backed-up definition if the form itself changed, keep every native
entry, and leave the existing Admin Notification enabled until canonical email
delivery is independently proven.

## 2026-08-14 — Form 6 (`Short Term Home Rentals form`)

Disposition: **STOPPED / NOT ALLOWLISTED**.

- Form 1 was fully stopped and recorded before Form 6 was inspected; no bulk
  activation occurred.
- Public placement is verified at `/short-term-home-rentals/`.
- Gravity Forms retains 18 entries. The latest inspected entry shows the native
  entry existed before WordPress handed the Admin Notification to its sending
  server.
- Required fields are name, phone, email, and free-text details; CAPTCHA and the
  form honeypot are enabled.
- The form has no explicit consent choice, consent text/version, source
  attribution, UTM/click-ID persistence, or structured rental timing/property
  context.
- The existing `Admin Notification` remains active. The default confirmation
  redirects to `/thank-you/`.
- No form definition, notification, entry, allowlist, or page was changed.

Required before activation: owner/BIC-approved unselected consent choices,
purpose and routing approval for short-term-rental inquiries, explicit canonical
field mapping, a successful definition backup, controlled QA, one-record proof,
and duplicate-notification suppression. Rollback is identical in principle to
Form 1: remove only Form 6 from the allowlist, preserve native entries, and keep
the legacy notification until canonical delivery is proven.
