# Compliance Checklist

**This is not legal advice. Review with a licensed attorney before going live.**

## TCPA (Telephone Consumer Protection Act)

- [x] Consent language displayed verbatim before submission (see `StepConsent`)
- [x] Separate checkboxes for SMS, Call, and Email — none pre-checked
- [x] At least one method required to proceed
- [x] Consent timestamp stored with each lead (`consent_timestamp`)
- [x] Consent IP stored with each lead (`consent_ip`)
- [x] Consent language version stored (`consent_language_version = 'v1'`)
- [x] Consent language explicitly states it is not a condition of service
- [x] SMS opt-out instructions included in consent text (STOP keyword)
- [x] Consent record never overwritten — `consent_timestamp` is immutable
- [ ] **TODO**: Double opt-in for SMS (recommended for TCPA compliance)
- [ ] **TODO**: Unsubscribe/opt-out handler for SMS STOP replies
- [ ] **TODO**: Re-consent flow if consent language version changes
- [ ] **TODO**: DNC (Do Not Call) registry scrub before outbound calls

## CAN-SPAM (Email)

- [ ] **TODO**: Physical mailing address in all outbound emails
- [ ] **TODO**: Clear opt-out mechanism in every email
- [ ] **TODO**: Honor opt-out requests within 10 business days
- [ ] **TODO**: Subject lines not misleading
- [ ] **TODO**: Clear identification as commercial email when applicable

## FTC / Real Estate Disclosures

- [x] AVM disclaimer displayed with every valuation estimate
- [x] Disclaimer stored alongside every valuation report (immutable)
- [x] Disclaimer states estimate is not an appraisal or CMA
- [x] Disclaimer states market value depends on condition and professional review
- [ ] **TODO**: Agent license number displayed in UI (configured via `NEXT_PUBLIC_AGENT_LICENSE`)
- [ ] **TODO**: Brokerage disclosure on all consumer-facing pages
- [ ] **TODO**: Equal Housing Opportunity statement in footer

## Data Retention

- [ ] **TODO**: Define and document data retention policy
- [ ] **TODO**: Implement session expiry (24h — currently in schema, needs background job)
- [ ] **TODO**: Lead data deletion request handler (CCPA/right to be forgotten)
- [ ] **TODO**: PII handling documentation

## North Carolina-Specific

- [ ] **TODO**: Verify compliance with NC General Statute § 93A (Real Estate License Law)
- [ ] **TODO**: Ensure AVM disclaimer meets NC disclosure requirements
- [ ] **TODO**: NCREC (NC Real Estate Commission) rules review for AI-generated content

## Security

- [ ] **TODO**: Rate limiting on all API routes (especially `/api/intake/submit`)
- [ ] **TODO**: CSRF protection verification
- [ ] **TODO**: Input sanitization audit (Zod handles most, verify edge cases)
- [ ] **TODO**: `SUPABASE_SERVICE_ROLE_KEY` never exposed to client
- [ ] **TODO**: Admin route authentication (currently basic auth via `ADMIN_SECRET`)
- [ ] **TODO**: Upgrade admin auth to proper session-based auth before production

## Notes

- Consent language version `v1` is tied to the exact text in `StepConsent` component.
- Any change to the consent language requires a version bump and re-consent for existing contacts.
- The `crm_sync_log` table provides a full audit trail of all CRM operations.
- All analytics events are stored with IP address for audit purposes.
