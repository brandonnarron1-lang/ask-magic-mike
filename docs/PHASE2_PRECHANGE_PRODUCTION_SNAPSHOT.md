# Phase 2 Pre-change Production Snapshot

Captured 2026-08-14 between 17:13 and 17:22 EDT. This snapshot is read-only.
No lead, message, WordPress setting, Vercel setting, database row, DNS record, or
provider configuration was changed while collecting it.

## Canonical release

- GitHub repository: `brandonnarron1-lang/ask-magic-mike`
- Production branch: `main`
- Production commit: `76edb598e3c21c7d2deb27d230aa6f862f9a400e`
- Vercel project: `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`
- Production deployment: `dpl_3io4gCpEE3yeDgTSGSGV1D8p5RMe`
- Deployment state: `READY`
- Domains: `www.askmagicmike.com`, apex redirect, and canonical Vercel aliases
- Runtime: Node 24.x on Vercel

## Public and dependency health

- `www.askmagicmike.com`: HTTP 200
- `askmagicmike.com`: HTTP 308 to `https://www.askmagicmike.com/`
- `/api/health/live`: HTTP 200, no-store
- `/api/health/ready`: HTTP 200, no-store
- Anonymous `/admin`: HTTP 401 with Basic challenge and no-store
- Production smoke: 19 passed, 2 protected/write checks skipped, 0 failed
- Funnel verification: 15 of 15 passed
- Public health verification: 2 of 2 passed
- Ask Magic Mike/NellySelly isolation: passed
- Vercel error review: one historical 2026-08-14 20:05 UTC Form 3 replay
  failure, already reconciled in `FORM3_PRODUCTION_RECONCILIATION.md`; no new
  unresolved production error was identified.

## Neon production state

- Project: `bitter-star-20214385`
- Branch: `br-round-base-auh6h2wd` (`production`)
- Database: `neondb`
- Test leads: 6
- Canonical live prospects: 0 at this snapshot
- Unsuppressed test leads: 0
- Pending/retrying notification rows: 0
- Failed notification rows: 0
- Active Web Push devices: 0

## WordPress and Gravity Forms

- WordPress remains the Our Town brokerage, SEO, IDX, and local-entry system.
- Gravity Forms plugin: 2.10.5. A 3.0.2 update is available but was not applied.
- Gravity Forms forms: 7 active definitions.
- Ask Magic Mike Canonical Lead Bridge: 1.1.0, active.
- Bridge signing secret: configured and not displayed.
- Bridge allowlist: Form 3 only.
- Form 3: forwarded entry 1549, canonical lead recorded, duplicate native Admin
  Notification inactive.
- Forms 1, 2, 4, 5, 6, and 7: not allowlisted; their native Admin Notifications
  remain active.
- Wordfence 9.0.0 and WP Super Cache 3.1.1 are active.

## Newly observed shadow entry

The bridge status panel shows Form 7 entry 1550 at 2026-08-14 20:58:30 UTC as
`shadow_not_allowlisted`. Authenticated entry review found no `QA_TEST`,
`INTERNAL QA`, `DO NOT CONTACT`, internal-QA UTM, or 555 marker. The entry has a
plausible contact address. It is therefore treated as a possible genuine lead,
not as test data. It was not copied into Neon, altered, contacted, or exposed in
this document. Owner review and lawful follow-up are recorded as the first
operational action in `OWNER_ACTIONS_REMAINING.md`.

## Social crawler state

- Ask Magic Mike pages: Facebook and other tested social crawlers receive 200.
- Our Town `/ask-mike/`: Facebook crawler receives 403; browser and four other
  social crawlers receive 200.
- Our Town `/agents/mike-eatmon/`: Facebook crawler receives 403; browser and
  four other social crawlers receive 200.
- Wordfence Live Traffic did not show the matching Facebook requests. At this
  snapshot, the available evidence placed the block upstream of WordPress but
  did not identify the responsible Apache directive.
- Later authenticated 2026-08-28 diagnostics supersede that preliminary
  classification: the domain's cPanel ModSecurity control reports Off, and the
  exact denial is a server-global Apache `authz_core` rule that maps
  `facebookexternalhit` to `bad_bots` and applies `Require not env bad_bots`.
  See `phase9/OTP_FACEBOOK_CRAWLER_APACHE_EVIDENCE_2026-08-28.md`.
- No broad ModSecurity switch or hosting rule was changed.

## Monitoring classification

The checks above are point-in-time. Existing scripts are operational, but this
snapshot does not claim a persistent schedule until a scheduler run is verified.
