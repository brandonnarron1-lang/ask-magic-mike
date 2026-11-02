# Owned social operation — November 1, 2026

Current state: **FACEBOOK + INSTAGRAM INITIAL POSTS PUBLISHED / FIVE FACEBOOK
AND FOUR INSTAGRAM POSTS SCHEDULED / REPLENISHER NOT INSTALLED**. November1
evening native queue observation confirms those separate schedules. This is
separate from the R2 draft-only workers. PR316
remains accepted Production; PR317 is a Draft candidate, not deployed or active.

Owner-requested visual refresh: `public/social/owned-launch-v2/`, fourteen concepts,
four encoded vertical videos, ten carousels and modern photographic feed/Story
layouts. Supplied lakeside/interior/portrait concepts are not represented as real
listings or documentary locations. No generated replacement likeness or paid API.
The v1 asset and its actual Facebook publication are retained, not overwritten.
`config/owned-social-visuals.v2.json` is the reusable visual contract;
`scripts/social/render-cinematic.mjs` extends the existing editable SVG system.
Private source paths stay private; exported images omit EXIF/GPS. Source/output
hashes, 390px pixel checks and actual encoded video evidence remain distinct.

## Prepared implementation

- `config/owned-social-content.json`: fourteen finished evergreen concepts, 42
  platform variants. The seven former backlog topics have actual matched media.
  This is a finite reserve, not fourteen days of verified eligible queue coverage.
  No listing,
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
| Facebook | Owner-created Ask Magic Mike Page [61595981377188](https://www.facebook.com/profile.php?id=61595981377188); Manage Page and ordinary Page actor verified. | One initial Public announcement verified; tracked Home Value website/CTA saved. Buffer's broad default request included unrelated assets/ads and was cancelled without grant. |
| Instagram | [@askmagicmikenc](https://www.instagram.com/askmagicmikenc/), Business / Real Estate Service. Bio/photo saved, private contact info excluded. | Buffer connected, comments OFF. Owner added the mobile profile link; actual click reached Home Value. Initial post published; four future scheduled posts. Buyer/compare destinations are not implied by that seller-only profile link. |
| TikTok | [@askmagicmike](https://www.tiktok.com/@askmagicmike), own Edit profile verified; factual bio saved and reloaded. | Buffer connected, both comment scopes OFF. Native web photo upload did not save after two bounded attempts. Website-link eligibility and commercial disclosure not yet verified; no post. |
| Buffer | Actual signed-in Free billing: $0 forever, 3 channels, 10 scheduled posts/channel, one API key/client. | 2/3 channels connected; Instagram queue four. No trial/card/upgrade, API credential or active replenishment workflow. |

Verified Public initial announcement:
[Facebook launch](https://www.facebook.com/permalink.php?story_fbid=pfbid0UnvxUjGxLBg3Qac5d2r1fNvpCThWqMp4aRmMFLi7bwwQ1T57x1pixBYepH82opAkl&id=61595981377188).
One Post click; exact image/caption/custom alt text/link read back. Boost and Story
OFF; no personal-profile post or consumer contact. Facebook's automatic profile
picture update is a separate setup effect, not another launch announcement.

[Instagram launch](https://www.instagram.com/p/DfN8vQrKFEV/) is separately verified
published, with native AI disclosure. Native Facebook schedules: November2,3,5,6,7
at noon Eastern; Instagram Buffer schedules: November2,3,6,7 at noon Eastern.
These gaps are deliberate, not continuous daily coverage. Native Facebook IDs and
exact media/caption receipts remain private. Buffer UI did not expose opaque post
IDs; obtain authoritative inventory before activation, never guess them.

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
3. The owner expressly represented full delegated brokerage power and consent
   for the prepared standing scope on November1. Retain that owner statement,
   not a fabricated claim that Mike personally reviewed each post. Scope remains
   owned evergreen education, existing offers/intake explanations and firm
   identification in every asset/caption; exclude listings, stats, testimonials,
   guarantees and consumer messaging. Record policy binding/recheck before the
   separate runtime activation. See
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

Media disclosure is separate from AI writing assistance. Concept imagery cannot
be silently sent with `isAiGenerated:false`. The current API supports the native
flag for Instagram and TikTok video; Facebook and TikTok photo formats requiring
that flag stay held for the supported native method. Do not invent unsupported
GraphQL fields or call a caption disclaimer proof of native disclosure.
See [Buffer reference](https://developers.buffer.com/reference.html).

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
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/social/run.mjs --summary
# Optional LOCAL snapshot: { ledger, inventory }; no live-state claim:
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/social/run.mjs --plan --snapshot=/absolute/private/snapshot.json --summary
# Existing dedicated Buffer binding only; provider reads, NO mutations:
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/social/run.mjs --observe --summary
# Provider reads + durable ledger writes, NOT read-only; works while paused:
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/social/run.mjs --reconcile --summary
# State read / durable pause / incident acknowledgement (no provider mutation):
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/social/run.mjs --status
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/social/run.mjs --pause
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/social/run.mjs --pause --channel=EXACT_CHANNEL_ID
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/social/run.mjs --acknowledge --incident=EXACT_INCIDENT_ID
# Only after all activation requirements:
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/social/run.mjs --execute
# Separate effect, only tracked queued work; cancellation requires readback:
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/social/run.mjs --cancel-queued --channel=EXACT_CHANNEL_ID
```

Slots are civil Eastern noon, converted per date including DST. Only unused
content receives the next unoccupied permitted slot; old intents never move.
The entire bounded catalogue is scanned and selection is channel-fair. Dry-run
dates are proposals, not booked slots. Fourteen concepts are a finite library.
No infinite duplicate recycling or paid model fallback. Exhaustion must hold and
notify the operator; it is not evidence of a replenishing autonomous operation.
R2's source registry and its marketing=false grant remain unchanged. The social
offers use the existing owner-approved kit under a separate advertising gate,
not a promotion or rights expansion of an intelligence source.
The old Monday Boolean is only a reminder; no weekly review is claimed completed.
The existing owner GitHub workflow-failure notification is the proposed alert
path, not a new email transport. Its delivery has NOT been tested.

`--observe` never writes state. `--reconcile` writes known provider results even
when publishing is paused or no new content is eligible. Missing scheduled rows
become UNKNOWN, not assumed published or reusable. Incomplete inventory cannot
resolve incidents. Incidents retain stable identity, first/last observations,
acknowledgement, next recheck and resolution. New or resolved/recurrent incidents
produce change IDs; unchanged daily holds do not. Full queues are ordinary
deferrals; known unsupported Facebook disclosure is a channel hold, not an
Instagram failure. Unknown remote outcomes and revoked access remain actionable.

Mutation attempts share a durable ten-minute execution allowance across manual
restarts, in addition to the three-create/50-API-call per-run cap. Each explicit
observation command is separately bounded and must not become a polling loop.
The fixed state ref/file is a software restriction, NOT a branch-limited token:
Contents write can affect the repository. Schema validation rejects unknown/private
fields and unsafe URLs; reviewed catalogue matching remains a separate activation
check. Never place private one-time introductions, friends/groups or customer data
in public state. At 1,000 entries/750KB HOLD for recoverable reviewed archival;
preserve unresolved intents and dedup identities. No silent truncation.

The workflow remains an UNINSTALLED template. No next runtime run, first real
replenishment, operator alert delivery or independent missed-run monitor is proven.
Protected immutable Preview/source acceptance remains required for PR317; the
consumed PR316 QA exception supplies no new venue authority. Keep the existing
native/Buffer queues intact while that separate release/runtime boundary is held.

One-time personal/community distribution uses stable private campaign action IDs
and exact platform readback. Missing/unknown action state requires reconciliation,
not another introduction or invitation batch. Only explicit owner authority permits
Brandon's genuine personal lane. A one-off awareness-only TikTok introduction does
not relax the publisher's clickable-destination gate. Group rules must be actually
verified; a professional directory entry is neither a join nor a publication.

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

Hosted review exposed a dated positive SQL fixture: its October17 observation
with a360-hour window expired November1at21:05:48.635UTC. Only the new synthetic
observation constructor is corrected; old-date denial remains explicitly tested.
No runtime source timestamp, grant, freshness rule or assertion was relaxed.

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
