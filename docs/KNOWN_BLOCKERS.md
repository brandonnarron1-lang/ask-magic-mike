# Known Operating Constraints

Updated 2026-08-23. The public funnel, canonical Neon capture, Lead Center, and
internal authenticated email delivery are operational. These constraints limit
specific expansions; they do not invalidate the live lead pipe.

## WordPress owned-demand publication boundary

- Three existing public WordPress CTAs are now provably identifiable through
  read-only manifests, but no page has been changed. The current links remain
  live and reversible.
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

- PR #183 is merged and live. PR #184's backup-first Neon migration is applied
  and independently verified; its application release evidence is tracked on
  the PR.
- PR #185 is merged and live as `44a7483400bdb9b4a10ecdf0883edc4bf96d4ab8`.
  Its WordPress proof-scope migration and Production application acceptance
  passed; its gate is exhausted.
- PR #193 is merged and live as `9b82afb609674bb0209b73f8ac9622ab02733e2a`
  on Vercel Production deployment `dpl_HkKHY5nF8DeF5azY1CuHAbHGNp3a`.
  Its privacy/KPI acceptance passed, it contained no database migration, and
  its gate is exhausted.
- PR #196 verifier hardening is merged and live as
  `c08abe1168840b99ccba07866bbec8cf7a6752fb`; its gate is exhausted.
- PR #194 iOS handoff is merged and live as
  `5a3c5c7f2463ea399c21b616ff249f6c67e156b6` on Production deployment
  `dpl_3FWSKSu9jXvC2FTPuojVpt8mgm8J`. Its application gate is exhausted;
  physical enrollment and a `[TEST]` Push remain separate actions.
- PR #195 conversion identity polish is merged and live as
  `b450b41c66c6740bd20571cdbe7d8caf82e92d5e` on Production deployment
  `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`. Its application gate is exhausted; it
  contained no migration, lead submission, message, or external publication.
- Draft PR #197 is the sole next application candidate. Its compatibility
  counts are deliberately excluded from exact KPI and activation states. It is
  refreshed onto released PR #195 `main`; pre-document-reconciliation head
  `3ef57919aedc6413301bf55c34cf7c570b3fed08` is preserved at
  `rescue/amm-pr197-pre-authority-reconciliation-20260823-1048`. Exact head
  `677604df8b1d27f78ba4aee5b7b111548bf603b2` has green Node 24 CI, immutable
  Preview, protected no-write QA, and remains Draft behind its distinct gate.
- Draft PR #198 remains stacked behind #197. Its readiness manifests cannot
  edit or publish WordPress. Pre-current-base head
  `85321a0dbeb98d7c6f105f6405a224e8e13727f2` is preserved at
  `rescue/amm-pr198-pre-pr197-authority-reconciliation-20260823-1119`. The
  exact refreshed head `284fdcf3119112c75d6cd1f0b9d1a3ae392ad3c4` has green local,
  Node 24, immutable Preview, and protected no-write proof. It must still refresh
  onto released `main` after #197 releases. Every WordPress publication remains
  separately gated.
- Draft PR #199 remains stacked behind #198. It has no migration and sends no
  Preview telemetry. Pre-current-base head
  `ec51f8cda97631f481f6f640d3ba9da60ccfc190` is preserved at
  `rescue/amm-pr199-pre-pr198-authority-reconciliation-20260823-1131`; the current
  branch incorporates exact PR #198 head `284fdcf3119112c75d6cd1f0b9d1a3ae392ad3c4`
  without application-code conflict. It must receive fresh exact proof, then
  still follow both predecessors and refresh after their releases before a later
  gate can authorize minimized Production field observations.
- Historical PR #179 is superseded by PR #194. PR #182 is superseded; PRs #92
  and #119–#121 are preserved archive history.
- Historical gates for already merged PRs #170, #172, #173, #177, #178, #180,
  #181, #183-#185, and #193-#196 must not be requested again.

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

A read-only Neon Production aggregate re-executed on 2026-08-23 contains six
test leads, all suppressed, and zero live/contactable prospects, eligible
response samples, live notification activity, outcomes, spend rows, active
experiments, open opportunities, or open recommendations. A working funnel can
be guaranteed; genuine demand cannot be fabricated. Test leads remain labeled,
suppressed, and excluded from KPIs.
