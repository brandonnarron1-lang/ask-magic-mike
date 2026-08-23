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
  `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`; its gate is exhausted.
- Draft PR #202 is the immediate durability correction. It remains unmerged
  behind its dedicated Production-secret/merge/deploy gate.
- Draft PR #203 reuses only PR #200's unique application and test work on top
  of exact PR #202. Its application head has exact-head CI, immutable Preview,
  protected no-write runtime, and browser proof, but it is not release-eligible
  until PR #202 releases, it refreshes onto exact `main`, and fresh exact-head
  proof passes.
- PRs #197–#201 remain preserved. Their useful attribution/WordPress,
  conversion, performance, and visual work is not deleted or silently merged.
- The current local owned-traffic fast-track reuses only PRs #197 and #198 on
  top of sealed PR #204. It remains behind the ordered #202 → #203 → #204 stack,
  has no Production gate, and cannot authorize a WordPress publication.
- Historical PR #179 is superseded by PR #194. PR #182 is superseded; PRs #92
  and #119–#121 are preserved archive history.
- Historical gates for already merged PRs #170, #172, #173, #177, #178, #180,
  and #181 must not be requested again.

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
