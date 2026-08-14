# Form 7 Entry 1550 Disposition

Captured: 2026-08-14 (America/New_York)

## Classification

**GENUINE - CONSENT RESTRICTED OR UNCLEAR**

The entry contains a coherent property-management inquiry and complete contact
fields, has no known internal-QA marker, and is not marked spam. It must not be
used as a test lead. Form 7 does not contain a Consent field, consent-language
version, attribution fields, or a recorded permission to subscribe the person
to property alerts or other marketing.

## Evidence considered

- Gravity Forms form: `7` (`Never miss a property!`)
- Gravity Forms entry: `1550`
- Submitted: 2026-08-14 at 8:58 PM in the WordPress display timezone
- Entry fields present: name, phone, email, and message
- Inquiry category: property management / rental-property help
- Anti-spam control: Form 7 contains CAPTCHA
- QA markers: none found
- WordPress spam state: not marked spam
- Source evidence: the entry records the Our Town Properties site as the embed
  origin, but no source-page detail, referrer, UTM, or click ID is stored
- Notification evidence: Gravity Forms records that its Admin Notification was
  passed successfully to the WordPress sending server; mailbox delivery is not
  proven by that status
- Contact-history evidence: no entry note other than notification-processing
  evidence was present

Customer PII is intentionally omitted from this artifact.

## Consent determination

Consent is **unclear and insufficient for automated marketing or alert
subscription**. Form 7 has only Name, Phone, Email, Message, CAPTCHA, and Submit
controls. It has no Consent field and no stored consent language/version.

Permitted handling at this point is limited to protected internal review of the
inbound request. Do not enroll the person in property alerts, Constant Contact,
automated nurture, consumer email, carrier SMS, or another marketing audience.

## Duplicate determination

- Production Neon aggregate at review time: 6 test leads, 0 live leads.
- Form 7 bridge state: `shadow_not_allowlisted`, attempt `0`.
- No canonical lead ID is attached to the bridge record.
- Therefore no existing **live** canonical lead can be the duplicate/master.
- A PII-to-PII comparison against suppressed test records was not used to
  reclassify this entry; the absence of QA evidence controls.

## Canonical-record determination

No canonical Neon record exists for this entry. Automated canonical creation is
withheld because the source form lacks recorded consent evidence and the entry
falls outside the current Form 3-only bridge allowlist. The original WordPress
entry remains the protected audit copy.

## Internal notification result

The existing Gravity Forms Admin Notification was passed to the WordPress mail
server. Delivery to a mailbox and reading by the responsible owner remain
unverified. No additional email, carrier SMS, consumer acknowledgment, or Web
Push message was sent during this review.

## SLA status

`INTERNAL REVIEW REQUIRED - AUTOMATION WITHHELD`

The canonical lead SLA is not started because there is no consent-supported
canonical lead record. The operational review clock starts from the original
submission time and should be resolved promptly by the brokerage owner/BIC.

## Follow-up restriction

- Do not send marketing.
- Do not subscribe to property alerts.
- Do not send carrier SMS.
- Do not send a consumer acknowledgment automatically.
- Do not mark the entry test, spam, or invalid without new evidence.
- Any one-to-one response must be approved as consistent with the inquiry and
  brokerage policy before it is sent.

## Owner and next action

Owner: **Mike Eatmon / brokerage review**, with Brandon Narron as system owner
for technical reconciliation only.

Next action: Mike or the BIC should review the original entry in Gravity Forms,
confirm whether a purpose-limited one-to-one response is permitted, and record
the decision. Separately, approve explicit consent language before Form 7 is
ever connected to the canonical pipeline.

## Audit references

- WordPress Gravity Forms: Form 7 / Entry 1550
- WordPress canonical bridge 1.1.0 status:
  `shadow_not_allowlisted`, attempt 0, no canonical lead ID
- Neon project: `bitter-star-20214385`
- Neon production branch: `br-round-base-auh6h2wd`
- Production aggregate query at 2026-08-14: 6 test / 0 live / 0
  unsuppressed-test leads
- Production notification aggregate: 0 pending / 0 failed

