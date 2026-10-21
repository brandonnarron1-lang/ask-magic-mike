# Web acquisition — 21 October 2026

Accepted starting source: PR308 `33a7e029e58deabef274a50eee367b38dea744bb`, tree `4bfdd83efd4dce0a2c143b2d6ad8d7f3d989b2d6`, Production `dpl_F4EuertMn7u75L1Ni2XGKcM96oah`. Authenticated authority resolver: 25/25. Prior results are inherited, not rerun. PR309/native remain separate; their original expiry/cleanup remains active.

## Bounded discovery and baseline

Observation: 21 October, current public pages plus legitimate signed-in distribution view; window for that report: trailing 30 days. No new Production submission or message.

| Stage | Current observation/source | QA exclusion / coverage |
| --- | --- | --- |
| Exposure/publication | Existing owned WordPress placements visible. Social post not verified; no verified business publishing role. | Placement existence is not audience reach. |
| Landing visits | No current authorized visitor dataset established. | UNKNOWN, not zero. Server requests/bots are not unique people. |
| CTA/form starts | Existing PII-filtered browser events; no current aggregate available. | Tracking coverage/consent refusal unknown; no historic reconstruction. |
| Submitted requests | Current protected reporting returns measurement unavailable. | UNKNOWN, not an inferred failure. |
| Durable eligible inquiries | Same gap; exact all-source and historic three-tag cohorts must stay distinct. | Exclude test/suppressed/spam; retain separate inquiries on shared contacts. |
| Mike delivery | No new scoped provider/mailbox observation in this run. | Historical controlled proof retained; not new demand. |
| Brandon delivery | Same. | Missing observation is not a failed delivery. |
| Human follow-up | No current measured authorized result. | A click/open is not a conversation. |

Three-tag WordPress: `ourtownproperties / owned_media / amm_owned_demand_2026`. Launch social: `organic_social / amm_seller_buyer_launch_2026`. These are different cohorts, not evidence of lost leads. No backfill.

## Ranked changes implemented/tested in this increment

1. Direct seller/buyer/options actions in the opening (high impact/confidence, small): live 96svh hero hid choices while prioritizing chat.
2. Real Browse Homes destination (high confidence, small): distinguish property search from a request form.
3. Preserve old homepage forms in mounted, expandable recovery sections (medium-high impact, medium effort): multiple competing forms reproduced; no removal of pending/frozen state.
4. Readable warm form surfaces and shorter seller opening (design hypothesis, small): verify built pixels, text enlargement and errors before release.
5. Separate staff utility and an all-eligible-source summary in the existing report (high confidence, bounded): current narrow cohort cannot answer all-source demand; unavailability remains explicit.

## Boundaries and evidence

No schema/root dependency/provider/recipient change intended. Immutable experience v1 JSON remains unchanged for existing consumers. Capture, consent, duplicate semantics, v6 readers and R2 governance remain authoritative.

Working evidence: private `.amm-run/web-acquisition-20261021/`. On the integrated working diff, `gate-2.log` records 4,842 unit passes / 255 explicit opt-in skips, isolation, safety, typecheck, lint, production build and 127-route verification. The 16 opted-in PostgreSQL checks passed separately. `session-8` records nine built-app cases: ordinary seller and buyer capture, a genuinely allowlisted synthetic-QA capture, five viewport/text-enlargement cases and preserved old homepage fragments. Six new unsent v6 intents (two per inquiry), zero provider calls, zero Production writes. The 21 final notification rows include seeded fixtures, not 21 new deliveries. The ordinary UI health advisory is explicitly mocked in this local isolated venue; canonical POST/SQL/consent/classification/ownership remain real. This is not Production health or actual device/Mail evidence. Final-source and hosted association remain separate gates.

Earlier failures are retained, not erased: initial unit expectations used old navigation labels; the owned-demand shortcode map needed its new options entry; native initdb defaulted to SQL_ASCII, causing the existing control-character guard to reject the em dash in the QA subject. The fixture now explicitly uses UTF8; application guards were not weakened. Earlier buyer screenshots named 390 used the default viewport; session-8 sets and asserts 390x844. The final cream-surface selector includes heading levels 4–6 and list items.

Budget: owner clarified **no new paid API/service/QA infrastructure spending**. No paid model calls, creative, reservations, new venues, subscriptions or upgrades occurred. Preserve existing business hosting/alerts and prior $65 reservations/unknown liabilities; do not infer an available balance. Standard public-repository GitHub Linux CI is the no-additional-charge review path. `vercel.json` disables automatic Git deployment for this candidate branch only, preventing unverified build liability. This is a configuration change, not a runtime/secret change. All existing crons remain unchanged. An immutable protected Preview is still mandatory; no free verified venue means release remains held, not waived.

WordPress: native published-page exports before/after contain 99 pages; only 149 (homepage), 3631 (We Buy Homes), and 3952 (Home Value) changed. Page226/Rentals, page2994/Property Search and page4364/We Buy Houses remain unchanged. Existing links/UTMs and form ownership remain intact. Page3631 received neutral conditional-review copy and matching SEO title/description. Page149 adds four clear destinations and a modest staff utility. Page3952 replaces its instant-cash title with local-review wording while retaining Gravity Forms 3 and 7. No plugin/theme/options/global cache operation, bridge/forwarding/notification change or form submission occurred.

Fresh private exports, exact serialized backups and local byte-exact rollback rehearsals precede each write. The supported builder also set page149's previously empty `_fl_builder_enabled` to `1`; page3952 gained empty responsive/custom-attribute/connection defaults, equivalent leading-# color normalization, and native page-settings defaults. These are retained in the actual metadata diff, not reported as zero changes. Rollback restores only reviewed fields plus these recorded builder effects after an intervening-edit check; never blindly import the entire site export. Existing consent remains visible and unchanged. Page4364's separate legacy form/renderer is held rather than silently migrated.

The three-offer versioned share page/manifest and options creative reuse approved owned imagery; old shared kit assets and URLs are unchanged. New assets are local/review candidates until accepted app deployment. Social status remains **READY / NOT PUBLISHED**: the bounded account check established no connected brokerage publishing role. No social post, audience traffic or genuine lead is claimed. Current all-source report unavailability is a measurement gap with cause unestablished, not a repaired historical incident or an inferred delivery failure.

Application recovery must retain current R2 revocation/privacy and v6 readers. Prefer accepted PR308 deployment for a compatible app-only recovery; explicit R2/OFF addendum remains available. Roll back a placement/page before app for a placement-only defect. No recovery action performed.
