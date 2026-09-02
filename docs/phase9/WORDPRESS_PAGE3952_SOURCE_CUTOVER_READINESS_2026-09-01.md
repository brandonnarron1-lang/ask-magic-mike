# Phase 9 WordPress page 3952 exact-source cutover readiness

Date: 2026-09-01

Mode: authenticated read-only evidence plus offline deterministic proposal

External mutation: none

## Result

The established Our Town Properties Home Value page can be updated without a
page-wide Beaver Builder rewrite, but publication is intentionally blocked.
The exact live source contains one legacy Ask Magic Mike shortcode and no
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
