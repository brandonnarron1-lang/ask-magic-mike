# Compliance Checklist

**This is not legal advice. Review with a licensed attorney before going live.**

---

## TCPA (Telephone Consumer Protection Act)

- [x] Consent language displayed verbatim before submission (`StepConsent` component)
- [x] Separate checkboxes for SMS, Call, and Email — none pre-checked
- [x] At least one consent method required to proceed
- [x] Consent timestamp stored per lead (`consent_timestamp`)
- [x] Consent IP address stored per lead (`consent_ip`)
- [x] Consent language version stored (`consent_language_version = 'v1'`)
- [x] Consent language explicitly states it is not a condition of service
- [x] SMS opt-out instructions included in consent text (STOP keyword)
- [x] Consent records stored in immutable `consents` table (append-only, no UPDATE/DELETE)
- [x] Consent records include `language_text` (verbatim text shown at time of consent)
- [ ] **TODO**: Double opt-in for SMS (recommended for TCPA compliance)
- [ ] **TODO**: Unsubscribe/opt-out handler for SMS STOP replies → write `compliance_flags` row with `flag_type=opt_out_sms`
- [ ] **TODO**: Re-consent flow if consent language version changes
- [ ] **TODO**: DNC (Do Not Call) registry scrub before outbound calls → check `compliance_flags.flag_type=do_not_contact`

### Consent Language (v1)

Verbatim text shown to users (source: `src/components/intake/step-consent.tsx`):

> "By checking the boxes above, you consent to be contacted by Our Town Properties regarding real estate services. This consent is not a condition of service. You may opt out at any time by replying STOP to any SMS or contacting us directly. Standard message and data rates may apply."

Any change to this text requires:
1. Version bump in `consent_language_version`
2. Re-consent from all existing leads with the prior version
3. Update to the audit trail

---

## CAN-SPAM (Email)

- [ ] **TODO**: Physical mailing address in all outbound emails — use `3301 Nash St. NW Suite E, Wilson NC 27896`
- [ ] **TODO**: Clear opt-out mechanism in every email
- [ ] **TODO**: Honor opt-out requests within 10 business days → write `compliance_flags.flag_type=opt_out_email`
- [ ] **TODO**: Subject lines not misleading
- [ ] **TODO**: Clear identification as commercial email when applicable

---

## MLS / IDX Data Restrictions

- [x] No MLS/IDX-derived sold comps, listing data, or confidential MLS exports in public UI
- [x] All valuation data uses AVM estimates with disclaimer (not MLS/IDX data)
- [x] Sold section uses career performance statistics from broker biography only
- [ ] **TODO**: Any MLS data import functionality must be internal/admin-only until explicit broker + MLS board approval
- [ ] **TODO**: Obtain written IDX/RETS agreement from MLS board before displaying live listing data
- [ ] **TODO**: Document MLS membership and IDX license in `ENVIRONMENT.md` when applicable

---

## FTC / Real Estate Disclosures

- [x] AVM disclaimer displayed with every valuation estimate (see `src/lib/valuation/disclaimer.ts`)
- [x] Disclaimer stored alongside every valuation report (immutable field)
- [x] Disclaimer states estimate is not an appraisal or CMA
- [x] AVM disclaimer text: "This Automated Valuation Model (AVM) estimate is for informational purposes only. It is not an appraisal, a Comparative Market Analysis (CMA), or a guarantee of value. Contact Mike Eatmon at Our Town Properties for a professional evaluation."
- [x] Performance claims on site limited to verified career biography facts ($750M+, 2,500+ homes, licensed 1993)
- [ ] **TODO**: Agent license number displayed in UI — add NC license # to `NEXT_PUBLIC_AGENT_LICENSE`
- [ ] **TODO**: Equal Housing Opportunity logo/statement in footer (required under Fair Housing Act)
- [ ] **TODO**: "This is not an appraisal" disclosure on every valuation response page

---

## Data Retention and Privacy

- [x] Sessions expire after 24 hours (`expires_at = NOW() + INTERVAL '24 hours'`)
- [x] `audit_logs` table tracks all admin actions (immutable — no UPDATE/DELETE rules)
- [x] `compliance_flags` table for opt-outs, DNC flags, deletion requests
- [ ] **TODO**: Define and document data retention policy (recommend: leads = 7 years, sessions = 90 days, events = 1 year)
- [ ] **TODO**: Implement session expiry background job (schema supports it; job not written)
- [ ] **TODO**: Lead data deletion request handler → set `compliance_flags.flag_type=data_deletion_request`, anonymize PII
- [ ] **TODO**: PII handling documentation — document which fields are PII and access controls
- [ ] **TODO**: Privacy policy page at `/privacy` before going live

---

## North Carolina-Specific

- [ ] **TODO**: Verify compliance with NC General Statute § 93A (Real Estate License Law)
- [ ] **TODO**: Ensure AVM disclaimer meets NC disclosure requirements
- [ ] **TODO**: NCREC (NC Real Estate Commission) rules review for AI-generated content and automated responses
- [ ] **TODO**: NC license number prominently displayed per NCREC rule A.0105

---

## Security

- [x] `SUPABASE_SERVICE_ROLE_KEY` only used server-side (never in client components or `NEXT_PUBLIC_*`)
- [x] `ADMIN_SECRET` fails with HTTP 503 in production if not set or left as default
- [x] Admin Basic Auth enforced in `src/middleware.ts` (not in Server Components)
- [x] All API routes validate with Zod before any DB operation
- [ ] **TODO**: Rate limiting on all API routes (especially `/api/intake/submit`)
- [ ] **TODO**: CSRF protection verification
- [ ] **TODO**: Upgrade admin auth to proper session-based auth before production
- [ ] **TODO**: Add `Content-Security-Policy` header

---

## Audit Trail

All of the following are logged automatically:

| Event | Storage |
|-------|---------|
| Lead created/scored | `analytics_events` + `lead_scores` |
| Consent granted | `consents` table (immutable) |
| Lead assigned to agent | `lead_routing` + `agent_assignments` |
| CRM sync attempt | `crm_sync_log` (success + error) |
| SLA breach | `compliance_flags.flag_type IN (sla_accept_breached, sla_contact_breached)` |
| Admin actions | `audit_logs` (immutable) |

---

## Notes

- Consent language version `v1` is tied to the exact text in `src/components/intake/step-consent.tsx`.
- Any change to consent language requires a version bump and re-consent for existing contacts.
- The `consents` table has database-level `NO UPDATE / NO DELETE` rules — consent records cannot be altered after creation.
- The `audit_logs` table has database-level `NO UPDATE / NO DELETE` rules.
- All performance claims on the site (sales volume, homes sold, years licensed) must remain grounded in Mike Eatmon's verified Our Town Properties career biography.
