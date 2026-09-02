# Phase 9 WordPress page 3631 exact-source cutover readiness

Date: 2026-09-01

Mode: authenticated read-only evidence plus offline deterministic proposal

External mutation: none

## Result

The existing We Buy Homes CTA can be upgraded without replacing its Beaver
Builder page or losing its reviewed presentation copy. Publication is
intentionally blocked, however, because the already-established seller-intent
decision packet has not selected the canonical seller page, capture owner,
duplicate-page disposition, or stable placement key. The surrounding
direct-purchase and timing copy also requires a recorded BIC/compliance review
before this page is republished.

This closes two defects in the earlier change set:

1. the earlier proposed shortcode discarded the live headline, explanatory
   text, and button label; and
2. a technically valid Connector/hash precondition could incorrectly make
   page 3631 publication requestable while the seller-intent decision packet
   still prohibited any seller-page publication plan.

The corrected candidate reuses the existing Connector, `/sell` funnel,
owned-demand placement registry, seller-intent decision packet, and
publication gate. It adds no page, form, lead store, notification engine,
publisher, CRM, or dashboard.

## Exact authenticated baseline

| Field | Reviewed value |
| --- | --- |
| Page | `3631` — We Buy Homes |
| Public URL | `https://www.ourtownproperties.com/we-buy-homes/` |
| Editor | Beaver Builder enabled |
| Post status | Published |
| Source size | 2,480 UTF-8 bytes |
| Source SHA-256 | `2c6c4a1b75afd133b92840d0f846f2a82f059b25f73aa0b2914d97d02ab1b8df` |
| Current shortcode occurrences | 1 |
| Other shortcode occurrences | 0 |
| Phone / Gravity / HTML-form occurrences | 0 / 0 / 0 |
| Latest visible revision link | `4338` |

Revision 4338 was visible in the editor, but its source bytes were not
authenticated. The revision number alone is not accepted as rollback proof.
No page/postmeta backup was created or retained by this read-only inspection.

Current exact token:

```text
[ask_magic_mike_cta source="seller_page_cta" headline="Thinking about selling but not sure where to start?" text="Ask Magic Mike for local guidance before you make your next move." button="Get Local Guidance"]
```

Copy-preserving reviewed replacement:

```text
[ask_magic_mike_cta route="/sell" source="seller_page_cta" utm_source="ourtownproperties" utm_medium="owned_media" utm_campaign="amm_owned_demand_2026" utm_content="wordpress_we_buy_homes" headline="Thinking about selling but not sure where to start?" text="Ask Magic Mike for local guidance before you make your next move." button="Get Local Guidance"]
```

The proposed source is 2,624 UTF-8 bytes with SHA-256
`1919ec017662efd5dfa04e81bf789f72ec478c16cbae7d0c0e59e0f7899c08e2`.
The proposal changes exactly one shortcode token and preserves the current
headline, body, button, phone count, Gravity marker count, HTML-form count, and
all other source bytes.

## Executable guard

The source-controlled contract and verifier are:

- `config/wordpress-page3631-cutover-contract.json`;
- `scripts/amm/wordpress-page-source-cutover-lib.mjs`;
- `scripts/amm/wordpress-page3631-cutover-readiness.mjs`; and
- `tests/adminops/wordpress-page3631-cutover-readiness.test.ts`.

Page 3952 now uses the same pure exact-source engine, avoiding two divergent
cutover implementations. Each page retains its own immutable source hashes,
shortcode contract, approval gate, and prerequisites.

The verifier is read-only and emits no page source. It fails closed for source
or copy drift, duplicate/missing shortcodes, output drift, a second
application, an unproved Connector, missing postmeta/revision evidence, an
unrecorded seller-intent decision, a mismatched canonical page/capture owner/
placement key, a missing duplicate-page disposition, or a missing BIC review
digest.

Current authenticated in-memory verification returns
`status=blocked_prerequisites`, `approvalRequestable=false`, and
`publicationAuthorized=false`. The current blockers are:

1. Connector 1.1.0 is not publicly proved on page 3631.
2. No fresh postmeta backup digest exists.
3. Revision 4338 has no authenticated source digest matching the current
   2,480-byte source.
4. No approved seller-intent decision artifact and digest exists.
5. Page 3631 is not recorded as the approved canonical seller source page.
6. Ask Magic Mike is not recorded as the approved canonical capture owner.
7. No duplicate-page disposition is recorded for page 4364.
8. `wordpress_we_buy_homes` is not recorded as the approved stable placement
   key for the retained page.
9. No BIC/compliance copy-review artifact and digest exists.

## Local verification

- Nine focused WordPress, owned-demand, route-boundary, and current-authority
  files pass 66/66 tests under exact Node 24.18.0.
- Targeted ESLint, JavaScript syntax validation, JSON parsing, 14/14 release
  safety, NellySelly/deployable-source isolation, and `git diff --check` pass.
- The authenticated page source was held in memory for verification; the raw
  2,480-byte source was not written to or retained in the repository.
- Local repository-wide typecheck/build cannot be accepted from the reused
  dependency directory because it lacks this stacked branch's Better Auth,
  Svix, QRCode, Nodemailer, and PostgreSQL packages. A clean hosted install,
  typecheck, build, and route proof are mandatory before sealing this Draft.

## Controlled future sequence

1. Complete the separately gated Connector 1.1.0 upgrade and postflight.
2. Resolve and record the four values already required by
   `WORDPRESS_SELLER_INTENT_DECISION_PACKET.md`, using current Search Console,
   backlink, Regency, capture, and consent evidence.
3. Obtain and record BIC/compliance review of the retained page copy. This
   CTA-only candidate must not silently rewrite surrounding claims.
4. Only if page 3631 remains canonical and Ask Magic Mike remains the capture
   owner, capture access-restricted page source/postmeta backups and a revision
   source digest outside Git.
5. Run the verifier with all rollback and decision evidence:

   ```bash
   pnpm run amm:wordpress:page3631-readiness -- \
     --source <mode-0600-page-source-file> \
     --connector-version 1.1.0 \
     --postmeta-sha256 <verified-postmeta-backup-digest> \
     --revision-id <verified-current-revision-id> \
     --revision-source-sha256 <verified-current-revision-source-digest> \
     --seller-intent-decision-sha256 <approved-decision-artifact-digest> \
     --canonical-source-page https://www.ourtownproperties.com/we-buy-homes/ \
     --capture-owner ask_magic_mike \
     --duplicate-page-disposition <approved-decision-key> \
     --placement-key wordpress_we_buy_homes \
     --bic-copy-review-sha256 <approved-review-artifact-digest>
   ```

6. Require `status=ready_for_approval`; any other status cancels the action.
7. Only then request the exact page-only gate:

   `APPROVE PHASE 9 WE BUY HOMES CTA WORDPRESS PUBLICATION`

8. Replace the exact token once and verify the public URL, canonical metadata,
   destination, UTMs, Connector marker, desktop/mobile presentation, analytics,
   and unchanged page copy without submitting a lead.
9. If acceptance fails, restore the verified source/postmeta backup and re-run
   the public checks.

Neither the Connector gate nor any application PR approval authorizes this
page action. This page gate does not authorize the duplicate-page SEO action,
form/notification changes, cache purge, database migration, communication,
DNS, social publication, spend, deletion, or NellySelly action.
