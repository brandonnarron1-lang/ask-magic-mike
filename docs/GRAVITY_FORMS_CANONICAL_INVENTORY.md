# Gravity Forms Canonical Inventory

Verified 2026-08-14 against authenticated Gravity Forms and public rendered
pages. Form numbers are identifiers only; classification follows actual fields,
placement, consent, notification, and business purpose.

| ID | Form | Verified public placement | Entries at audit | Fields and controls | Native notification | Canonical classification | Required next gate |
| ---: | --- | --- | ---: | --- | --- | --- | --- |
| 1 | Contact Us | `/contact-us/` | 1,337 | Required name/email; optional phone, subject, message; CAPTCHA and honeypot; no Consent field | Active `Admin Notification` | `SHADOW — READY FOR QA` after consent policy is documented | Map general-question source, deny absent consent by default, controlled QA, replay proof |
| 2 | Cash Offer Form | No rendered sitemap placement found | 27 | Required name/phone/email/address; CAPTCHA and honeypot; no Consent field | Active `Admin Notification` | `SHADOW — MAPPING REQUIRED` | Brokerage review of seller-options language and intended public page before activation |
| 3 | Home Value Form | `/how-much-is-your-home-worth/` (plus global Form 7) | 10 | Required address/name/email/phone; CAPTCHA and honeypot | Inactive exact duplicate | `ACTIVE — CANONICAL` | Preserve verified baseline; daily reconciliation only |
| 4 | Join Our Team Form | `/join-our-team/` (plus global Form 7) | 4 | Required name/phone/email/address; optional license; CAPTCHA and honeypot; no Consent field | Active `Admin Notification` | `NOT A LEAD FORM` for consumer routing | Keep in recruiting/admin workflow unless a verified recruiting owner and privacy policy are approved |
| 5 | Rental Property Search | No rendered sitemap placement found | 0 | Required name/phone/email/current address; optional rental area; CAPTCHA and honeypot; no Consent field | Active `Admin Notification` | `SHADOW — MAPPING REQUIRED` | Confirm public placement, property-management owner, minimum-data need, and consent |
| 6 | Short Term Home Rentals form | `/short-term-home-rentals/` | 18 | Required name/phone/email/details; CAPTCHA and honeypot; no Consent field | Active `Admin Notification` | `SHADOW — READY FOR QA` after consent policy is documented | Map rental inquiry, route to Mike/admin review, controlled QA, replay proof |
| 7 | Never miss a property! | Global footer or sitewide placement on nearly all sitemap pages | 153 | Required name/email/message; optional phone; CAPTCHA and honeypot; no explicit marketing Consent field | Active `Admin Notification` | `DEFERRED — CONSENT RESTRICTED OR UNCLEAR` | Entry 1550 is preserved for Mike/BIC purpose-limited review; add explicit approved email/property-alert consent before canonical or Constant Contact activation |

## Shared controls

- All seven definitions are active in Gravity Forms.
- All seven use honeypot action `abort` and include CAPTCHA.
- No form has a native Gravity Forms Consent field.
- Forms 1, 2, and 4 through 7 retain their existing native Admin Notification.
- Only Form 3 is in the bridge allowlist.
- The Constant Contact add-on is active. No form may be added to a marketing
  audience through canonical QA, and Form 7 must not be activated canonically
  until explicit marketing consent is approved and stored.

## Placement finding

Rendered sitemap inspection found Form 7 across the site, consistent with a
global signup surface. Form 2 and Form 5 did not appear in any rendered Yoast
page-sitemap URL, so they are not activated merely because their definitions
exist. The repeatable inventory command is:

```bash
node scripts/audit-wordpress-form-placements.mjs
```

## Activation sequence

1. Form 1 - contact/general question.
2. Form 6 - short-term rental inquiry.
3. Form 2 - only after seller-options page and copy review.
4. Form 5 - only after placement and recipient review.
5. Form 7 - only after explicit marketing consent is added and approved.

Form 4 remains outside the consumer lead allocation pipeline unless the owner
explicitly commissions a recruiting workflow.

## Entry 1550 disposition

Entry 1550 was reviewed on 2026-08-14 and classified `GENUINE - CONSENT
RESTRICTED OR UNCLEAR`. It contains no QA marker and must not be treated as a
test, but Form 7 stores no consent choice or consent-language version. The
entry remains WordPress-only in `shadow_not_allowlisted` state with no
canonical Neon lead ID. See `FORM7_ENTRY_1550_DISPOSITION.md`; customer PII is
not repeated here.
