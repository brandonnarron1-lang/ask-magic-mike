# Phase E current-state reconciliation

Date: 2026-09-30

Initial mode: authenticated repository/deployment inspection plus public,
read-only runtime inspection. The dated receipts below record the later,
separately approved page-only mutations and one controlled QA acceptance. No
other lead submission, provider send, environment change, DNS action, global
cache purge, or NellySelly action occurred in Phase E.

## 2026-10-01 activation addendum

- `main` is now PR #281 merge
  `a3a0c235decab5a8e9209d983358d200a36ca979`, tree
  `7c8b8395e3cbf4b31b81d52b05add21894f0911e`, accepted on Ready Vercel
  Production deployment `dpl_8488csXCtbfHMMZUF6KDQRiJVwTk`.
- The live Connector is active at 1.1.0. Its PHP SHA-256 is
  `700c78b77b24b0038078e45c6526908078dac46cf1a591b73dd0f13a6d840ec8`.
- Page 3952 still contains exactly one legacy shortcode. Fresh source is 420
  bytes with SHA-256
  `36a6b4f32329ffde16aef17dc1bc1ec815fdf4154ad80bf7ff3039d4326d7160`.
  The nine-byte difference from the earlier 411-byte contract is only nine
  `CRLF` line endings replacing nine `LF` line endings.
- The refreshed one-token candidate is 573 bytes with SHA-256
  `8bd52066b2cff51c2e2463fedd9f394d4174e5e353acdcc806bad5f691062816`.
  A protected page/postmeta backup, offline restoration rehearsal, and exact
  matching revision 4426 pass. The read-only manifest is
  `ready_for_approval` with no blockers.
- The normal anonymous page URL can still serve cached pre-upgrade markup.
  A unique query-string read and the active plugin state prove Connector
  1.1.0 without a cache purge. Normal page publication should invalidate this
  page; any additional cache action remains separately scoped.
- No page content was published, no lead was submitted, and no notification
  was sent during this addendum. The exact page-publication gate is the first
  unmet external authority. No separate Home Value link-out QA/send approval
  is recorded.

## 2026-10-01 page 3952 publication receipt

- The exact page-publication gate was subsequently received and consumed.
  Atomic preconditions passed immediately before the one WordPress save.
- Page 3952 now stores the reviewed 573-byte candidate with SHA-256
  `8bd52066b2cff51c2e2463fedd9f394d4174e5e353acdcc806bad5f691062816`.
  The legacy token count is zero, reviewed token count is one, and revision
  4427 exactly matches the postchange source. Title, slug, published status,
  and 13 postmeta rows were preserved.
- Direct shortcode rendering from the reviewed `post_content` produces exactly
  one `/home-value` CTA, zero legacy `/value` CTAs, and the Connector 1.1.0
  marker. This did not prove the Beaver Builder public render path.
- The public anonymous response is still served from WP Super Cache with
  `cache-control: max-age=600` and the legacy href. Page 3952's
  `index-https.html` and `index-https.html.gz` were regenerated after the save,
  so cache staleness alone is disproved. Authenticated read-only inspection
  found the legacy shortcode in the page's Beaver Builder published and draft
  metadata, which is the render source that regenerated those files.
- No cache invalidation, lead submission, database write, internal email/BCC,
  consumer acknowledgment, plugin change, application deployment, DNS action,
  or NellySelly action occurred under the publication gate.

## 2026-10-01 Beaver Builder alignment and public postflight receipt

- The exact builder-alignment and page-only cache gate was subsequently
  received and consumed. Native PHP lint passed before execution.
- One database transaction checked page identity plus both exact current
  metadata IDs, lengths, hashes, and token counts, then changed only node
  `70yltx6swbpf -> settings -> text` in `_fl_builder_data` meta ID 31311 and
  `_fl_builder_draft` meta ID 31308. The transaction committed once.
- Each metadata row moved from 158747 bytes / SHA-256
  `1ecdf9ab75451bc4438e123eb14cb98a4ddc1192a71cf43b1a1e124037a336d5`
  to 158900 bytes / SHA-256
  `801bfd5c6efefc89a666a5a5b81c4eceb4ab9dd91866635d46a20aa3a8b48cb9`.
  Postflight found zero legacy tokens and one reviewed token in each row.
- `FLBuilderModel::delete_all_asset_cache(3952)` and
  `wp_cache_post_id_gc(3952, false)` invalidated only page 3952's Beaver Builder
  assets and WP Super Cache entry. The regenerated normal HTTPS cache contains
  the reviewed CTA once and the legacy CTA zero times. No global purge ran.
- Public desktop and iPhone 13 verification proves HTTP 200, the correct
  canonical, one Connector 1.1.0 marker, one reviewed CTA, zero legacy CTA,
  keyboard focusability, query preservation, destination HTTP 200, and one
  Home Value form. The source page's existing forms and unrelated links remain.
- No rollback was needed. No form was submitted, no lead or outbox row was
  created, and no email, BCC, consumer acknowledgment, SMS, or push was sent.

## 2026-10-01 controlled QA acceptance receipt

- The exact one-time Home Value link-out QA/email/BCC gate was received and
  consumed after the public page-3952 postflight passed.
- One browser submission followed the live brokerage CTA into the canonical
  `/home-value` form. It created lead
  `27cdd1a9-b85f-4092-bbc4-deec15754814`, session/idempotency identity
  `3168b13e-b286-44da-b826-8632840fb6cc`, and correlation
  `8c755b19-1bfb-4aa1-951b-75fa961275b1`.
- The record is visibly `INTERNAL QA — DO NOT CONTACT`, `QA TEST`, assigned,
  communication-suppressed, KPI-excluded, and blocked from every consumer
  email/SMS/phone purpose. No sequence was created.
- Lead Center persists `ourtownproperties / owned_media /
  amm_owned_demand_2026`, source detail `home_value_page`, the Home Value
  funnel, consent version `amm_contact_v2`, score `60`, canonical routing, and
  the capture/attribution/notification timeline. The source URL retains
  `utm_content=wordpress_home_value_page`.
- The notification center shows one `lead_alert_email_v3` record, Resend attempt
  `1/3`, no next retry, and provider message
  `01a0fa53-542b-755a-930b-c255e6b5e089` delivered at the capture minute.
  The legacy assignment-email path was skipped as designed.
- Resend's recipient-specific event timeline shows the configured primary
  recipient and hidden audit BCC each Sent and Delivered at Oct 1, 9:56 PM
  EDT. The private BCC address is not recorded here. Independent inbox
  placement is `UNVERIFIED` because neither delivery mailbox was available in
  the authenticated browser session; no resend occurred.
- The Form 3 signed bridge was not exercised. No consumer acknowledgment,
  nurture, SMS, push, phone outreach, second lead, manual replay, deletion,
  environment change, deployment, DNS action, or NellySelly mutation occurred.

## Canonical release

| Item | Verified state |
| --- | --- |
| Repository | `brandonnarron1-lang/ask-magic-mike` |
| Branch | protected `main` |
| Accepted PR | #281 |
| Reviewed head | `8c493aa4a36b96f21d8fe380dcfa781ca0a4c68e` |
| Merge commit | `a3a0c235decab5a8e9209d983358d200a36ca979` |
| Production tree | `7c8b8395e3cbf4b31b81d52b05add21894f0911e` |
| Vercel deployment | `dpl_8488csXCtbfHMMZUF6KDQRiJVwTk`, Ready |
| Canonical host | `https://www.askmagicmike.com` |
| Apex | HTTP 308 to the canonical `www` host |
| Application rollback | `dpl_aepoH5pzDwPMkerbrp9YekzVrdKD`, Ready |
| Database | Neon `bitter-star-20214385` / `br-round-base-auh6h2wd` / `neondb` |
| Migrations required by Phase E preparation | zero |
| Environment changes required by Phase E preparation | zero |

PR #281's exact application gate and Connector 1.1.0 plugin gate are consumed.
PR #280 remains an earlier accepted checkpoint. PR #248 is historical lineage,
not a release candidate; its reviewed Connector source, rollback baseline,
deterministic archives, and tests are included once through PR #281.

Draft PR #279 is also conflicting with current `main` and spans 70 files plus
an unapplied database migration. It is not merged wholesale. Phase E reuses
only its independently reviewed single-statement Resend callback boundary,
then adds ordered-event protection and current-main tests. Its unrelated
notification, migration, lockfile, SLA, and admin changes remain outside this
candidate. Draft PR #277 is SMS-only and has no Phase E file overlap.

## Existing lead path

- Canonical intake is `POST /api/leads`.
- The approved WordPress capture path is Gravity Forms Form 3 through the
  HMAC-signed canonical bridge into that same endpoint.
- Neon is the one durable lead database. Gravity Forms keeps a secondary local
  entry; it is not a competing CRM.
- Server code owns validation, consent resolution, attribution normalization,
  deterministic scoring/routing, assignment history, lifecycle persistence,
  notification outbox creation, and analytics/audit events.
- Idempotency requires one bounded key, maps non-UUID keys to a stable session
  UUID, and rejects body/header conflicts. Signed WordPress requests additionally
  bind timestamp, entry ID, raw body, and payload identity.
- Internal email uses the existing authenticated provider/outbox path with the
  audit BCC held in protected configuration. Provider receipts and callbacks
  are persisted independently of lead durability.
- The Lead Center reads the canonical Neon lifecycle model behind Better Auth
  and server-side RBAC.
- QA records use `is_test=true`, unmistakable
  `INTERNAL QA — DO NOT CONTACT` identity/message copy, suppression, and KPI
  exclusion. The one Phase E acceptance record satisfies and visibly preserves
  that contract.

## WordPress truth and first placement

Before publication, public inspection of page 3952,
`https://www.ourtownproperties.com/how-much-is-your-home-worth/`, returned
HTTP 200 with the correct canonical tag, visible Form 3, the separate held Form
7 surface, and one visible Connector CTA. Its current link is:

`https://www.askmagicmike.com/value?utm_source=ourtownproperties&utm_medium=home_value_page&utm_campaign=website_widget`

The active Connector is 1.1.0 with the authenticated source hash recorded in
the activation addendum. `post_content`, Beaver Builder's published and draft
metadata, and the regenerated page cache now contain the same reviewed
`/home-value` destination and attribution. The normal anonymous page renders:

`https://www.askmagicmike.com/home-value?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_home_value_page`

Connector reconciliation, plugin backup/upgrade, page backup, exact
`post_content` publication, builder alignment, page-only cache invalidation,
public desktop/mobile postflight, and the one controlled QA/email/BCC acceptance
are complete. All Phase E gates are consumed; none authorizes another
submission, message, page change, or deployment.

## Fresh read-only checks

- Production monitor: 11/11 pass on first attempt.
- Production smoke: 19 pass, 2 intentional write/auth skips, 0 fail.
- Live conversion funnel: 15/15 pass.
- System isolation: pass; no deployable NellySelly project identifiers.
- WordPress sitemap audit: 42/42 pages fetched; Form 3 appears once; Form 7 is
  repeated sitewide and remains outside the canonical allowlist.
- Focused Connector/readiness tests: 5 files, 50 tests pass on Node 24.18.0.
- Page-3952 source cutover verifier correctly refused to run without the
  authenticated source/backup/revision inputs.
- Page-3952 server postflight: `post_content` and both builder metadata rows
  match their exact reviewed hashes; normal and gzip page caches each contain
  one reviewed CTA and zero legacy CTA.
- Page-3952 browser postflight: desktop and iPhone 13 both pass source HTTP,
  canonical, marker, CTA count/visibility, destination/query, and form checks;
  keyboard Tab focus reaches the CTA.
- Public Production health: Neon configured/ready, notification mode
  `production`, email enabled, and capture, leads, notification, RBAC,
  rate-limit, push, and phone-setup readiness all pass.

## Completion boundary

PR #281 and Connector 1.1.0 are accepted. Page 3952 has a protected rollback,
one exact approved `post_content` save, matching revision 4427, aligned builder
published/draft metadata, and passing public desktop/mobile postflight. The
placement is live. One controlled Home Value QA record reached canonical
persistence, Lead Center, the notification ledger, the primary recipient, and
the hidden audit BCC with provider-recipient delivery evidence. No Phase E
approval remains requestable.
