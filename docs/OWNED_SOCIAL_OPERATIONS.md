# Owned social operation — November 1, 2026

Current state: **BLOCKED / NOT PUBLISHED / NOT SCHEDULED**. This is a separate
publisher, not activation of the R2 draft-only workers. PR316 remains the accepted
application baseline; this candidate is not deployed or an active runtime.

## Prepared implementation

- `config/owned-social-content.json`: seven evergreen concepts, 21 platform
  captions/destinations, seven additional concepts held as backlog. No listing,
  market-statistic, valuation, testimonial or response-time promises.
- `public/social/owned-launch-v1/`: four 1080×1920 H.264 videos (12 seconds,
  24fps, no audio), three carousels, seven feed/Story layouts, profile/cover,
  source/output SHA-256 manifest and a local review gallery. Local SVG/Sharp and
  FFmpeg only; system fonts are rasterized, not redistributed. Portrait/logo
  come from the existing approved kit; no synthetic person/property or music.
- `src/lib/social/{publisher,buffer,github-store}.ts`: current Buffer GraphQL
  adapter, durable pre-effect CAS, lease, account/slot collision prevention,
  unknown-result reconciliation, bounded inventory, queue limits and pause.
- `scripts/social/run.mjs`: default no-key/no-network preview. `--execute` is
  held until the reviewed policy and dedicated social binding are established.
- `scripts/social/owned-social-workflow.yml`: **uninstalled review template**.
  No new cron is active. No app route, consumer worker or database migration.

## Access and capability matrix

| Channel | Current evidence | Publication capability |
|---|---|---|
| Facebook | Brandon's legitimate identity; managed list has no Ask Magic Mike Page. Separate public Page setup reached the Page Terms agreement. | NOT ESTABLISHED; owner action at exact Terms step. No personal-profile substitution. |
| Instagram | Signed out; supported Facebook login returned to sign-in. Brand name/proposed handle prepared in signup. | NOT ESTABLISHED; owner recovery/birth-date/password/verification. Handle validity is not availability or ownership. |
| TikTok | Signed out; email signup requires real owner details/password/code. | NOT ESTABLISHED; clickable website eligibility and automatic commercial disclosure still require account evidence. |
| Buffer | Signed out; no workspace entitlement/API binding read. No matching publishing connector installed. | Public Free documentation is not this owner's verified workspace. No paid trial/card. |

Only the genuine Our Town Facebook Page was identified; that does not establish
new account publisher rights. Mike's Instagram/TikTok handles were not established
by authoritative project records. Use plain brokerage attribution, not guessed
native tags. Native tagging/collaboration acceptance remains NOT RUN.

Profile copy prepared: “Home value requests, buying help and selling options
with Mike Eatmon and Our Town Properties, Inc. Start at askmagicmike.com.”
This is not a separately licensed brokerage or guaranteed coverage. Do not add
unverified towns, phone/recovery information, staffing or opening hours.

## Activation requirements (one scoped packet, not per-post approval)

1. Finish owner account security/Terms steps; capture actual owner-controlled
   Page/business account IDs. Connect only these three assets to Buffer Free.
2. Record actual Free entitlement, queue/API limits, automatic image/video
   formats, public profile destinations, required commercial/AI disclosure
   controls, and an expiry/recheck time in the policy. No billing enablement.
3. Reuse a genuine BIC advertising approval if available. No applicable standing
   approval for these new accounts was found in the focused canonical records.
   Prepared scope: owned evergreen education, existing offers/intake explanations,
   these seven examples, firm identification in every asset/caption; exclude
   listings, stats, testimonials, guarantees and consumer messaging. Owner
   technical authorization is not represented as BIC consent. See
   [NCREC guidance](https://bulletins.ncrec.gov/tech-corner-2/).
4. The new runtime's versioned media URLs need exact-source review/release and
   byte/hash verification. TikTok and compare UTM codes are registered narrowly
   in this candidate, not yet in accepted Production. A native Facebook/Instagram
   seller/buyer launch using the local finished upload and already-deployed kit
   tracking tuple need not wait for an app deployment when its account/editorial
   gates pass. Do not advertise a future media URL as currently hosted.
5. Activate the reviewed runtime only through the actual release/secret-install
   process. Dedicated `AMM_SOCIAL_BUFFER_KEY`, Buffer organization variable and
   repo-scoped state token only; never Production/model/database credentials.
6. Provision the state ref only AFTER its Vercel Git-build exclusion is verified
   effective: `codex/owned-social-publication-state`, file
   `owned-social-ledger.json`, initial `{ "revision": 0, "intents": [] }`.
   No automatic fallback to a local file, cache or missing/empty ledger.
7. Real launch per account: verify public post, then queue six future days and
   verify provider IDs. The current CLI creates scheduled intents only; the
   initial native launch is separate and must be reconciled before scheduling.

Free API evidence: [Buffer current API](https://developers.buffer.com/guides/getting-started.html),
[Free availability](https://support.buffer.com/articles/using-buffers-api-GtIYIQilz5).
Public docs describe three channels/ten scheduled slots each; this runner limits
itself to seven/account, three creates/run, 50 API calls, five inventory pages,
1,000 retained intents/750KB. If history exceeds bounded inventory/storage, HOLD
for reviewed archival; do not prune unknown outcomes or silently expand limits.

The repository is public. [Standard public GitHub Actions compute](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
is publicly documented as free; that does not make larger runners, artifact/cache
storage or every provider free. The template uses standard Ubuntu, no paid action,
no cache/media/artifact upload. Actual activation/secret permissions are unverified.
GitHub cron is not an exact-time SLA and may be disabled after 60 days of inactivity.

Authenticated owner GitHub billing UI was also read on November1: account
`brandonnarron1-lang` already has an Actions **$0** budget with **Usage blocked**.
It was not edited. The billing API separately lacked the `user` scope; no token
scope was broadened. Standard public review may run within this existing hard
stop; a quota failure is a blocked gate, not permission to enable billing.

## Run, reconcile and pause

Node24, no dependency additions:

```sh
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/social/run.mjs --start=YYYY-MM-DD --summary
# Only after all activation requirements:
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/social/run.mjs --execute
```

Slots are civil Eastern noon, converted per date including DST. Dry-run dates
are proposals, not booked slots. The initial seven concepts are a finite library;
the seven backlog ideas require completed, eligible media/copy before refill.
No infinite duplicate recycling or paid model fallback. Exhaustion must hold and
notify the operator; it is not evidence of a replenishing autonomous operation.
Weekly review is marked in the same run (Monday); future evidence is not claimed.
The existing owner GitHub workflow-failure notification is the proposed alert
path, not a new email transport. Its delivery has NOT been tested.

Master pause: persist `masterPaused: true` in the policy and durable ledger;
disable the workflow enable variable. Per-channel pause is stored by exact channel
ID. Pausing prevents new intents, **not existing remote publication**. After any
in-flight create finishes/reconciles, use the scoped `cancelQueued` path or Buffer's
ordinary queue controls; read back the remote queue. Only tracked, currently
scheduled/draft IDs are removed, never published/unrelated content. A timed-out
cancel is not confirmation. Never delete the ledger to reset an unknown create.

## Metrics and recovery

Retain content/account/slot IDs, hashes, provider IDs, actual state/permalink and
observation time. Copy genuine publication proofs to the existing protected
ledger only through its authorized writer; scheduling is not observed proof.
Account, placement/content, campaign, funnel, capture surface, transport and
internal notification channel are distinct. A shared UTM tuple cannot identify
which individual post caused an inquiry. No invented attribution/backfill.

Reuse Distribution's all-source social/direct/other/unknown summary; leave the
historic WordPress three-tag report unchanged. Reach/views/clicks remain UNKNOWN
until an actual authorized native dataset exists. No pixels, customer audiences,
test leads, consumer sends, allocation activation or reopened settled follow-up.

Recovery: pause and reconcile/cancel remote queued posts first. App rollback
retains PR316 privacy, permission reader, S2 guards and v6 readers/data. No DB
rollback/migration. App rollback cannot retract a real public post or cancel a
provider queue; these are separate operations with retained evidence.

## Paid test — prepared, not activated

Proposal only: Meta Facebook website-traffic pilot, Housing Special Ad Category,
seven days, **$5/day and $35 lifetime maximum**, $0 tooling/generation. Lifetime
cap, confirmed dates, proper Housing controls and a manual budget check required
before activation; no recurring authorization. Current authorized spend remains $0.

Variants: `01-your-next-move-feed.jpg` (three ways to request help) versus
`02-value-conversation-feed.jpg` (three useful facts). Destination `/home-value`
with a separately registered paid placement before launch. Proposed geography:
Wilson-area coverage only after actual brokerage scope is established; use the
platform's allowed broad housing geography, no protected-trait/proxy targeting,
customer lists, retargeting pixel, age/gender/ZIP selection or financing claims.
Optimize for legitimate landing visits, not invented lead conversions. Stop at
$35, capture/destination failure, policy rejection or loss of responder capacity.
Compare measured qualified inquiries separately; small samples prove no lift.

Official current Meta help returned a login/temporary-block response to the web
fetch; current Ads Manager targeting/radius and lifetime-cap enforcement are
**NOT VERIFIED**. No ad object, billing, campaign or spend was created. Keep the
test held until the real platform controls and brokerage coverage are reviewed.
Meta's [primary anti-discrimination announcement](https://about.fb.com/news/2019/03/protecting-against-discrimination-in-ads/)
supports the age/gender/ZIP restrictions; it is dated evidence, not verification
of today's account-level Ads Manager controls.
