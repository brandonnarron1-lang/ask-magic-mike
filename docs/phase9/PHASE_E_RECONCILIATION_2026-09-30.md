# Phase E current-state reconciliation

Date: 2026-09-30

Mode: authenticated repository/deployment inspection plus public, read-only
runtime inspection. No WordPress save, lead submission, provider send,
database write, environment change, DNS action, cache purge, or NellySelly
action occurred.

## Canonical release

| Item | Verified state |
| --- | --- |
| Repository | `brandonnarron1-lang/ask-magic-mike` |
| Branch | protected `main` |
| Accepted PR | #280 |
| Reviewed head | `0b70701c46a7228b075e9630576df5188f5d9c62` |
| Merge commit | `fa1d0fb077882309970b801bbdfaa756107c2104` |
| Production tree | `d9533274418430b750a87b8259902cddff5b2937` |
| Vercel deployment | `dpl_51jpakXn2zav3WPQYfUmAiSBBHqZ`, Ready |
| Canonical host | `https://www.askmagicmike.com` |
| Apex | HTTP 308 to the canonical `www` host |
| Application rollback | `dpl_aepoH5pzDwPMkerbrp9YekzVrdKD`, Ready |
| Database | Neon `bitter-star-20214385` / `br-round-base-auh6h2wd` / `neondb` |
| Migrations required by Phase E preparation | zero |
| Environment changes required by Phase E preparation | zero |

PR #280's exact gate is consumed. PR #248 is conflicting historical lineage,
not a release candidate. Phase E ports only its reviewed Connector source,
rollback baseline, deterministic archives, and tests onto current `main`;
obsolete PR #248 authority metadata is excluded.

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
  exclusion. No Phase E QA record has been created yet.

## WordPress truth and first placement

Public inspection of page 3952,
`https://www.ourtownproperties.com/how-much-is-your-home-worth/`, returned
HTTP 200 with the correct canonical tag, visible Form 3, the separate held Form
7 surface, and one visible Connector CTA. Its current link is:

`https://www.askmagicmike.com/value?utm_source=ourtownproperties&utm_medium=home_value_page&utm_campaign=website_widget`

The public Connector CSS and JavaScript carry `ver=1.0.0`, and no
`data-amm-connector-version` marker is present. This corroborates Connector
1.0.0 without claiming a fresh authenticated source-file hash. The isolated
browser session reached WordPress reauthentication, so no credential was
requested and no admin mutation was attempted.

Page 3952 remains the lowest-risk first placement because its source-bound
replacement and rollback contract already exist. It cannot be published yet:

1. reconcile and verify Connector 1.1.0 on current `main`;
2. freshly authenticate, re-hash the live 1.0.0 plugin, back up plugin files and
   options, run native `php -l`, and rehearse rollback;
3. receive the exact plugin-only gate;
4. install 1.1.0 and prove the marker while legacy links remain unchanged;
5. capture fresh page-3952 source, postmeta, and matching revision evidence;
6. receive the independent page-only gate; and
7. replace exactly one shortcode token.

The plugin gate is:

`APPROVE PHASE 9 WORDPRESS CONNECTOR 1.1.0 PLUGIN UPGRADE`

The later page gate is:

`APPROVE PHASE 9 HOME VALUE CTA WORDPRESS PUBLICATION`

Neither gate authorizes a lead submission, email/BCC send, consumer
acknowledgment, database action, cache purge, DNS change, another page, or
NellySelly.

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

## Immediate boundary

Continue repository verification and seal a current-main Connector candidate.
The first external mutation remains blocked until fresh authenticated
WordPress preflight succeeds and the exact plugin-only gate is supplied.
