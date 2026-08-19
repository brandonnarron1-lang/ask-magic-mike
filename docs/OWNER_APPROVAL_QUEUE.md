# Owner Approval Queue

Updated 2026-08-19. These are the exact remaining human/external gates. Continue
unrelated repository, Preview, test, and documentation work without waiting.

## Production release gates

1. PR #170 owned-demand command:
   `APPROVE PHASE 9.1 OWNED DEMAND COMMAND MERGE AND PRODUCTION DEPLOYMENT`
2. PR #177 commercial-email compliance:
   `APPROVE PHASE 9 COMMERCIAL EMAIL COMPLIANCE MERGE AND PRODUCTION DEPLOYMENT`
3. PR #173 device-private review planner:
   `APPROVE PHASE 9.4 REVIEW PLANNER MERGE AND PRODUCTION DEPLOYMENT`
4. PR #172 database revival command, only after its branch is refreshed and its
   final Preview/CI evidence is re-established:
   `APPROVE PHASE 9.3 DATABASE REVIVAL COMMAND MERGE AND PRODUCTION DEPLOYMENT`

Each phrase authorizes only its named code release. It does not authorize a live
database migration, provider/environment change, message send, device enrollment,
WordPress publication, DNS change, data mutation, or marketing publication.

## People and brokerage decisions

1. Mike/BIC: decide whether Form 7 entry 1550 permits a purpose-limited one-to-one
   response. Preserve it without marketing, alerts, or canonical forwarding until
   that decision is recorded.
2. Mike/BIC: approve requested-response and optional-marketing consent wording
   before Forms 1, 6, or 7 are added to the bridge allowlist.
3. Mike: activate the dormant `primary_lead_owner` account from his own approved
   email/device, then pass assigned-lead-only, logout, and revocation acceptance.
4. Brandon and Mike separately: enroll their own supported browsers for Web Push,
   grant notification permission, and approve one `[TEST]` receipt. Do not replace
   Mike's device with Brandon's.
5. Brokerage/BIC/legal reviewer: approve any seller-options, guaranteed-value,
   cash-offer, territory, response-time, or campaign claim before publication.

## Infrastructure/publication gates

1. Hosting operator: identify the exact ModSecurity rule blocking the verified
   Facebook crawler and approve one narrow public GET/HEAD exception.
2. DNS/Vercel owner: approve attachment of `hub.ourtownproperties.com` and the one
   Vercel-provided CNAME after the reviewed release.
3. Owner: approve the exact internal QA email/push, consumer acknowledgment,
   WordPress placement, GBP/social/email publication, or paid campaign immediately
   before that action.
4. Owner: approve any paid carrier-SMS sender/service. No free workaround may
   bypass carrier registration or consent requirements.

## Resolved

- Canonical Neon Production and Preview identities are established.
- Better Auth/RBAC Production cutover and Brandon administrator acceptance are
  complete.
- Form 3 signed WordPress forwarding and duplicate native-notification shutdown
  passed controlled QA.
- Internal authenticated email, hidden audit BCC, provider message ID, and
  canonical outbox/delivery reconciliation have controlled QA evidence.
- Both Ask Magic Mike custom hostnames belong only to the canonical Vercel project.
