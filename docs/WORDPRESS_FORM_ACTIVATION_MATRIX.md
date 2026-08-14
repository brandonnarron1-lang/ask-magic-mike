# WordPress Form Activation Matrix

The requested `.xlsx` workbook remains pending because the required spreadsheet
artifact runtime is unavailable in this execution environment. This Markdown
matrix is the canonical source for that workbook and contains no secrets or live
customer data.

| ID | Form | Existing fields | Canonical type | Bridge | Legacy notification | Consent state | Next gate |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | Contact Us | name, email, phone, subject, message, CAPTCHA | general question | Blocked | Active | No native Consent field | Map page/source; controlled QA |
| 2 | Cash Offer Form | name, phone, email, address, CAPTCHA | seller options | Blocked | Active | No native Consent field | Legal copy and controlled QA |
| 3 | Home Value Form | address, name, email, phone, CAPTCHA | home value | **Enabled / accepted** | **Inactive duplicate** | Call/email/SMS denied and stored | Daily reconciliation monitoring |
| 4 | Join Our Team | name, phone, email, license, address, CAPTCHA | recruiting/admin review | Blocked | Active | No native Consent field | Approve recruiting route |
| 5 | Rental Property Search | name, phone, email, address, rental area, CAPTCHA | renter/property management | Blocked | Active | No native Consent field | Confirm recipient and consent |
| 6 | Short Term Home Rentals | name, phone, email, details, CAPTCHA | rental inquiry | Blocked | Active | No native Consent field | Map details and controlled QA |
| 7 | Never miss a property! | name, phone, email, message, CAPTCHA | buyer/property alert | Blocked | Active | No native Consent field | Add explicit marketing consent |

Rollback for Form 3: disable the global bridge flag before reverting plugin
1.1.0, then re-enable only the Form 3 legacy Admin Notification. Preserve every
entry. See `WORDPRESS_BRIDGE_ROLLBACK.md`.
