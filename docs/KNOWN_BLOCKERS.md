# Known Operating Constraints

Updated 2026-08-23. The public funnel, canonical Neon capture, Lead Center, and
internal authenticated email delivery are operational. These constraints limit
specific expansions; they do not invalidate the live lead pipe.

## WordPress owned-demand publication boundary

- Three existing public WordPress CTAs are now provably identifiable through
  read-only manifests, but no page has been changed. The current links remain
  live and reversible.
- The fresh 2026-08-23 20:37 UTC server-runtime audit returned
  `legacy_match_ready` for exact page IDs 149, 3952, and 3631 with one current
  link each, zero lookalikes, and no blockers. These are readiness facts only;
  every manifest still reports `publicationAuthorized=false` and
  `mutationPerformed=false`.
- The homepage is the only recommended first publication. It still requires a
  fresh matching readiness manifest, verified page-149 revision/backup, the
  exact phrase
  `APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION`,
  and post-publication public/mobile/analytics acceptance.
- A readiness manifest is not proof of publication or demand. Do not create a
  publication-proof row until an authorized operator actually publishes the
  exact link and supplies public evidence.
- Home-value page 3952 and We Buy Homes page 3631 remain later independent
  decisions. Do not bulk-edit them under the homepage gate.

## Current release constraint

- Current accepted Production is PR #195 merge
  `b450b41c66c6740bd20571cdbe7d8caf82e92d5e` on deployment
  `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`. Its conversion-identity gate and every
  earlier completed release gate are exhausted.
- Fresh read-only Production checks pass conversion 15/15 and smoke 19/19 with
  two intentional skips. Candidate monitoring reports 8/9 because current
  deployed readiness does not prove the durable rate-limit contract. Public
  pages remain reachable; this is a durability-readiness failure, not a funnel
  outage.
- Draft PR #209 is the sole current application release candidate. It contains
  PRs #202 through #208's reviewed cumulative work once plus fail-closed Neon
  Preview endpoint attestation. Those incremental PRs are preserved as review
  evidence and have no independent release authority.
- PR #209 has no database migration and keeps Preview writes, email, SMS, Push,
  consumer acknowledgment, WordPress publication, paid media, and NellySelly
  access disabled. Its final head must pass fresh exact-head CI, Preview,
  protected no-write, browser, dependency, secret, diff, and isolation proof.
- Controlled synthetic Preview mutation/cleanup requires
  `APPROVE PHASE 9 NEON-ATTESTED CONTROLLED PREVIEW MUTATION QA`.
- Production secret entry, exact PR #209 merge, and matching deployment require
  `APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`.
- Preview Lead Center RBAC remains disabled, so the WordPress manifest API
  fails closed there. An authenticated role-bound runtime download is required
  after application release and before any separately approved WordPress edit.
- PR #187's KPI-target migration remains excluded until eligible genuine demand
  supplies a defensible baseline. Historical PR #179, PR #182, PRs #92 and
  #119 through #121 remain superseded or archive history.

## Human and BIC decisions

- Form 7 entry 1550 has unclear purpose/consent and remains preserved without
  contact, marketing enrollment, alerting, or canonical forwarding.
- Forms 1, 2, and 4–7 require approved requested-response consent and separately
  optional marketing consent before allowlist expansion.
- Seller-options, guaranteed-value, cash-offer, territory, response-time, and
  other material claims require brokerage/BIC approval before publication.
- The public brokerage number remains `252-243-7700`. Historical/internal
  numbers must not enter public copy without explicit owner confirmation.

## Operator activation

- Brandon's administrator acceptance is complete. Mike's provisioned
  `primary_lead_owner` account remains dormant until Mike chooses a password and
  completes assigned-lead-only acceptance.
- Web Push infrastructure is ready, but each device owner must grant browser
  permission and complete a controlled `[TEST]` receipt. The prepared iPhone
  handoff still requires application release, physical Home Screen installation,
  and the owner's explicit test-send approval. Brandon cannot enroll a device
  as Mike.
- `hub.ourtownproperties.com` is not attached. DNS and Vercel domain mapping
  remain separately gated; canonical `/admin` remains the private entry point.

## Channel constraints

- Internal Resend email and hidden audit BCC have controlled delivery proof.
  Consumer acknowledgments, nurture, and sequence sends remain
  purpose/permission/template/approval gated.
- Carrier SMS/MMS remains disabled until an approved registered sender and paid
  provider exist. Web Push and authenticated email remain the free-first staff
  alert paths.
- CRM remains the null adapter until an existing CRM account and secure
  credentials are explicitly approved. Neon remains the lead source of truth.
- No GBP, social, email-signature, or QR placement may be recorded as live until
  an authorized operator actually publishes/configures/distributes it and
  supplies valid native-platform evidence.

## External platform constraint

The Our Town hosting WAF blocks FacebookExternalHit on selected WordPress URLs.
Use AskMagicMike.com links as the approved fallback. Apply only a documented,
path/method-specific exception after the host identifies the exact managed rule.

## Truthful demand constraint

Current aggregate Production evidence contains only suppressed/test leads and
no contactable live prospect. A working funnel can be guaranteed; genuine demand
cannot be fabricated. Test leads remain labeled, suppressed, and excluded from
KPIs.
