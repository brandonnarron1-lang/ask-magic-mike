# Known Operating Constraints

Updated 2026-09-01. The public funnel, canonical Neon capture, Lead Center, and
internal authenticated email delivery are operational. These constraints limit
specific expansions; they do not invalidate the live lead pipe.

## WordPress owned-demand publication boundary

- Three existing WordPress links remain identifiable through read-only
  manifests, but no page has been changed.
- Fresh 2026-08-29 public and browser inspection found that homepage page 149
  has one exact Ask Magic Mike href inside an `.amm-cta` component suppressed
  by public `display:none !important` CSS. The corrected manifest returns
  `hidden_target`, `targetVisibility=hidden_by_known_css`, and
  `publicationBlocked=true`.
- The historical homepage href-only gate is not currently requestable. A link
  replacement would remain invisible. Select and review one visible placement,
  create a verified page-149 rollback, and generate a new exact publication
  packet before any WordPress gate.
- Home-value page 3952 and We Buy Homes page 3631 remain independent
  `visible_candidate` decisions. They are not bulk-edit substitutes for the
  blocked homepage placement.
- A readiness manifest is not proof of publication or demand. Do not create a
  publication-proof row until an authorized operator actually publishes the
  exact link and supplies public evidence.
- Detailed visibility evidence:
  `docs/phase9/WORDPRESS_HOMEPAGE_VISIBILITY_TRUTH.md`.

## Current release constraint

- Current accepted Production is PR #246 merge
  `98a91f752c4c53dc0ae300dfc320f47b53e32820` on deployment
  `dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe`; source deployment
  `dpl_E3Pob3TjWdxN9u4VK9xHZC61667g` is immediate rollback. Its release gate,
  credential-redeploy approval, and every earlier completed gate are consumed.
- Post-deploy verification, two manual monitors, and the first scheduled
  six-hour monitor pass on the exact Production commit.
- PR #247 is the one reviewed application candidate based directly on current
  `main`. It has zero migrations and zero authorized external mutations.
- Its reviewed content head/tree, exact-Node checks, hosted gate, immutable
  Preview, protected no-write QA, and rollback are sealed. Merge/deploy remains
  blocked only on the exact owner approval phrase and final authority-only
  exact-head checks; the phrase grants no WordPress or external-action authority.
- PR #238 is an applied five-migration receipt. PRs #244 and #245 are stale
  stacked review artifacts superseded by the current reconciliation and clean
  mainline port; none of their historical gates may be replayed.
- Preview Lead Center RBAC remains disabled, so protected manifests fail closed
  there. Role-bound Production inspection still requires an authenticated
  operator session and does not authorize a WordPress edit.
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

The Our Town server-global Apache authorization policy blocks
FacebookExternalHit on selected WordPress URLs. An approved account-level
`.htaccess` test could not supersede it and was rolled back byte-for-byte. Use
AskMagicMike.com links as the current fallback; only a root/WHM per-vhost,
path/method-specific correction is now appropriate.

## Truthful demand constraint

Current aggregate Production evidence contains only suppressed/test leads and
no contactable live prospect. A working funnel can be guaranteed; genuine demand
cannot be fabricated. Test leads remain labeled, suppressed, and excluded from
KPIs.
