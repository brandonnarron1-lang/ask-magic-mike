# Phase 9 WordPress page 3952 exact-source cutover readiness

Date: 2026-09-01

Initial mode: authenticated read-only evidence plus offline deterministic proposal

Subsequent approved mutation: one page save, two exact page-3952 builder
metadata replacements, and page-only cache invalidation as receipted below

## 2026-10-01 refreshed prepublication baseline

The September discovery record below remains historical evidence. A fresh
authenticated read found the same page, content, and single legacy shortcode,
but the database now stores nine line endings as `CRLF` instead of `LF`. The
visible content is unchanged; the exact byte contract is not.

| Field | Current reviewed value |
| --- | --- |
| Current source | 420 bytes / `36a6b4f32329ffde16aef17dc1bc1ec815fdf4154ad80bf7ff3039d4326d7160` |
| Historical revision 4332 | 411 bytes / `6710a4457945d1aba0308b07def30dfa05a8935121cd02a6baa3c66611ec2bdf` |
| Exact difference | Nine `CRLF` line endings in current source versus nine `LF` line endings in revision 4332 |
| Reviewed candidate | 573 bytes / `8bd52066b2cff51c2e2463fedd9f394d4174e5e353acdcc806bad5f691062816` |
| Matching prechange revision | 4426 / exact current-source digest |
| Serialized postmeta rows | 13 / protected backup digest recorded in the private readiness receipt |
| Readiness manifest | `00fa52f96e2bd83a32641188d6289bd9bc4bf8390f1e0706a7241bc81b5dee1d` |
| Verifier result | `ready_for_approval`; publication still blocked |

The raw post, source, candidate, serialized postmeta, revision evidence,
checksums, and rollback instructions are held in the owner-hosted private
backup outside the web root. The private path and raw backup are deliberately
not committed. Focused readiness and Connector tests pass 13/13. The exact
page-only publication phrase was unchanged at that prepublication checkpoint;
it was later received and consumed as recorded below.

## 2026-10-01 publication receipt

The page-only approval was received and consumed after the refreshed readiness
proof. The atomic precondition passed and WordPress saved page 3952 exactly
once. Postconditions are:

| Field | Verified value |
| --- | --- |
| Current source | 573 bytes / `8bd52066b2cff51c2e2463fedd9f394d4174e5e353acdcc806bad5f691062816` |
| Legacy / reviewed token count | 0 / 1 |
| New matching revision | 4427 |
| Server-rendered reviewed / legacy href count | 1 / 0 |
| Connector marker | 1.1.0, one occurrence |
| Public render | legacy href; `cache-control: max-age=600` |
| External effects | one page save only; no cache invalidation or lead/message action |

The page's two WP Super Cache files regenerated after the approved save but
still contained the legacy link, disproving a cache-only diagnosis. Beaver
Builder's published and draft metadata are the actual remaining render source:

| Metadata record | Current exact value | Reviewed exact candidate |
| --- | --- | --- |
| `_fl_builder_data` / meta ID 31311 | 158747 bytes / `1ecdf9ab75451bc4438e123eb14cb98a4ddc1192a71cf43b1a1e124037a336d5` | 158900 bytes / `801bfd5c6efefc89a666a5a5b81c4eceb4ab9dd91866635d46a20aa3a8b48cb9` |
| `_fl_builder_draft` / meta ID 31308 | 158747 bytes / `1ecdf9ab75451bc4438e123eb14cb98a4ddc1192a71cf43b1a1e124037a336d5` | 158900 bytes / `801bfd5c6efefc89a666a5a5b81c4eceb4ab9dd91866635d46a20aa3a8b48cb9` |

Each row contains one legacy token and no reviewed token at node
`70yltx6swbpf -> settings -> text`. A read-only deserialize/serialize rehearsal
is byte-exact before replacement and changes only that one string. The source,
Connector, and unrelated builder values do not need another edit. Public
postflight at this checkpoint required the independent, hash-bound
builder-alignment and page-only cache gate recorded in
`docs/OWNER_APPROVAL_QUEUE.md`.

## 2026-10-01 builder alignment and public acceptance receipt

The exact builder-alignment gate was later received and consumed. The prepared
payload passed server-native PHP lint. Its atomic preconditions passed, and one
transaction replaced only the reviewed shortcode string at node
`70yltx6swbpf -> settings -> text` in the two bound metadata rows.

| Field | Verified postcondition |
| --- | --- |
| `_fl_builder_data` / meta ID 31311 | 158900 bytes / `801bfd5c6efefc89a666a5a5b81c4eceb4ab9dd91866635d46a20aa3a8b48cb9`; legacy/reviewed count 0/1 |
| `_fl_builder_draft` / meta ID 31308 | 158900 bytes / `801bfd5c6efefc89a666a5a5b81c4eceb4ab9dd91866635d46a20aa3a8b48cb9`; legacy/reviewed count 0/1 |
| `post_content` | 573 bytes / `8bd52066b2cff51c2e2463fedd9f394d4174e5e353acdcc806bad5f691062816` |
| Database transaction | committed once; postcondition pass |
| Beaver Builder invalidation | page 3952 only |
| WP Super Cache invalidation | `wp_cache_post_id_gc(3952, false)`; no global purge |
| Normal HTTPS cache | regenerated; reviewed/legacy CTA count 1/0 |
| Public canonical | `https://www.ourtownproperties.com/how-much-is-your-home-worth/` |
| Public connector marker | 1.1.0; one occurrence |
| Public CTA | reviewed `/home-value` URL with exact four UTM values; one occurrence |
| Destination | HTTP 200; query preserved; one Home Value form |
| Desktop/mobile/keyboard | pass at desktop and iPhone 13; CTA is visible and keyboard focusable |
| Lead/message effects | none; no form submission or provider send |

No rollback was needed. The private backup remains the complete page-level
rollback; the exact prechange builder rows remain the narrower builder-only
rollback when their candidate-hash guard still matches. The page and builder
approval phrases are consumed and must not be reused for a lead or message.

## Original September readiness result — historical

The established Our Town Properties Home Value page can be updated without a
page-wide Beaver Builder rewrite. At the time of the original September
readiness review, publication was intentionally blocked. That baseline source
contained one legacy Ask Magic Mike shortcode and no
other shortcode, phone number, Gravity Forms marker, or HTML form. The
reviewed proposal replaces only that token and preserves every byte before and
after it.

This closes a real precondition defect in the earlier procedure: the live
token relies on the Connector's saved default route and does not contain the
previously assumed `route="/value"` attribute. Searching for that assumed
token would fail; replacing a broader region would be unsafe.

## Exact authenticated baseline

| Field | Reviewed value |
| --- | --- |
| Page | `3952` — How Much Is Your Home Worth? |
| Public URL | `https://www.ourtownproperties.com/how-much-is-your-home-worth/` |
| Editor | Beaver Builder enabled |
| Post status | Published |
| Source size | 411 UTF-8 bytes |
| Source SHA-256 | `6710a4457945d1aba0308b07def30dfa05a8935121cd02a6baa3c66611ec2bdf` |
| Current shortcode occurrences | 1 |
| Other shortcode occurrences | 0 |
| Phone / Gravity / HTML-form occurrences | 0 / 0 / 0 |
| Latest visible revision link | `4332` |

Revision 4332 was visible in the editor but was created before this review.
Its source bytes were not authenticated, so its number alone is not accepted
as rollback evidence.

Current exact token:

```text
[ask_magic_mike_cta source="home_value_page" button_text="Ask Magic Mike"]
```

Reviewed replacement:

```text
[ask_magic_mike_cta route="/home-value" source="home_value_page" utm_source="ourtownproperties" utm_medium="owned_media" utm_campaign="amm_owned_demand_2026" utm_content="wordpress_home_value_page" button_text="Ask Magic Mike"]
```

The proposed source is 564 UTF-8 bytes with SHA-256
`ef9f4f85f3b531644010e4b5e46121a6e12db3807c1f8c928a1945bf12bc266e`.

## Executable guard

The source-controlled contract and verifier are:

- `config/wordpress-page3952-cutover-contract.json`;
- `scripts/amm/wordpress-page-source-cutover-lib.mjs`;
- `scripts/amm/wordpress-page3952-cutover-readiness.mjs`; and
- `tests/adminops/wordpress-page3952-cutover-readiness.test.ts`.

The shared engine is also used by page 3631, while each page retains its own
source hashes, shortcode contract, prerequisites, and approval gate.

The verifier is read-only. It does not fetch, write, publish, call a provider,
query a database, or include page source in its JSON manifest. It fails closed
for source/hash drift, a missing or duplicate token, output drift, a second
application, an unproved Connector version, an absent postmeta backup, or a
revision whose source digest is not the exact current page digest.

The authenticated in-memory source produced:

```text
status: blocked_prerequisites
current source: 411 bytes / 6710a445...2bdf
proposed source: 564 bytes / ef9f4f85...266e
exact substitutions: 1
preserved phone / Gravity / HTML-form counts: yes
approval requestable: false
publication authorized: false
```

Current blockers:

1. Connector 1.1.0 is not yet publicly proved on the page.
2. No fresh postmeta backup SHA-256 has been captured.
3. The visible revision has no authenticated source digest matching the
   current 411-byte source.

## Local verification

- Nine focused WordPress, owned-demand, route-boundary, and current-authority
  files pass 66/66 tests under exact Node 24.18.0.
- Targeted ESLint, JavaScript syntax validation, JSON parsing, and
  `git diff --check` pass.
- The hardened verifier was run directly against the authenticated in-memory
  page source; both exact hashes and the fail-closed blocker set matched.
- A repository-wide local typecheck was not accepted because the deliberately
  reused dependency directory belongs to an older worktree and lacks this
  stacked branch's Better Auth, Svix, QRCode, Nodemailer, and PostgreSQL
  packages. After the new test's own inferred-type issue was fixed, the rerun
  reported only those missing-dependency errors. A clean hosted install and
  typecheck remain mandatory before this Draft candidate can be sealed.

## Controlled future sequence

1. Complete the separately gated Connector 1.1.0 upgrade and public postflight.
2. Immediately before the page action, capture the exact page source and all
   page-3952 postmeta to access-restricted temporary files outside Git.
3. Create or verify a recoverable revision, hash its source, and require that
   digest to equal the current source digest.
4. Run:

   ```bash
   pnpm run amm:wordpress:page3952-readiness -- \
     --source <mode-0600-page-source-file> \
     --connector-version 1.1.0 \
     --postmeta-sha256 <verified-postmeta-backup-digest> \
     --revision-id <verified-current-revision-id> \
     --revision-source-sha256 <verified-current-revision-source-digest>
   ```

5. Require `status=ready_for_approval`; any other status cancels the action.
6. Receive the exact page-only gate:

   `APPROVE PHASE 9 HOME VALUE CTA WORDPRESS PUBLICATION`

7. Replace the exact token once, save page 3952, and verify the public URL,
   canonical URL, destination, UTMs, Connector marker, layout, keyboard path,
   analytics instrumentation, and unchanged form/phone behavior without
   submitting a lead.
8. If any acceptance check fails, restore the verified page source and
   postmeta backup and re-run the public checks.

The Connector gate does not authorize the page action, and this page gate
does not authorize a plugin, form, notification, cache, database, DNS, social,
spend, deletion, or NellySelly change.
