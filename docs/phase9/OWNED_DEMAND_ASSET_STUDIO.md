# Phase 9 owned-demand asset studio

Date: 2026-08-21

Status: incorporated into consolidated PR #185; Production and external
channels unchanged

Release branch: `codex/phase9-current-router-safety-20260821`

Source branch history is preserved. Its former standalone stack and approval
gate are superseded by the consolidated PR #185 decision recorded in
`docs/phase9/OWNED_DEMAND_COMMAND_DECISION_2026-08-22.md`.

## Decision

Extend the existing protected `/admin/distribution` command instead of creating
a second creative dashboard, campaign catalog, tracking system, publisher, lead
store, or CRM. The studio derives every export from the canonical Phase 9
channel and placement definitions already used for operator copy and measured
attribution.

The change prepares assets; it does not publish them. It makes no lead, event,
database, email, SMS, Push, WordPress, DNS, social-platform, Google Business
Profile, spend, or NellySelly mutation.

## Export matrix

The existing six owned channels each retain four approved placements:

- general real-estate question;
- seller value and sale-readiness review;
- buyer property-match review; and
- renter-to-homeownership readiness review.

Each of the 24 canonical placements can produce three protected downloads:

| Format | Output | Intended use |
|---|---|---|
| Feed | 1080×1350 PNG | 4:5 social or GBP review asset |
| Story | 1080×1920 PNG | 9:16 story/reel cover with guarded top/bottom zones |
| QR | vector SVG | Print or operator-composed placement |

Total deterministic combinations: 72. The route renders only an allowlisted
channel + placement + format tuple. It does not accept a destination URL,
remote image URL, template body, consumer field, or arbitrary file name.

## Visual and identity reuse

- Retains the current black/gold/cream/cyan Ask Magic Mike and Our Town
  Properties system.
- Uses only approved Mike Eatmon imagery already in the canonical repository.
- Keeps lead names, phone numbers, email addresses, property addresses, scores,
  notes, and other consumer PII out of campaign art.
- Preserves the lighter WebP files for ordinary page display. The server export
  path uses the retained JPEG originals, plus one mechanically derived JPEG of
  the approved renter portrait, because the Next image renderer rejected the
  PNG/WebP encodings during executable QA.
- Includes the conditional broker-review boundary and Equal Housing
  identification in every generated feed/story image.
- Does not generate a new likeness or use the deprecated genie motif.

The committed images under `output/phase9/owned-demand-assets/` are compressed
QA exemplars, not static production templates. Production downloads render from
the canonical definitions so campaign copy, destination, and QR identity cannot
drift into separate editable files.

## Attribution and QR architecture

Every final destination remains the exact canonical URL produced by the existing
UTM builder:

```text
https://www.askmagicmike.com/{offer}?utm_source=...&utm_medium=...&utm_campaign=amm_owned_demand_2026&utm_content=...
```

Encoding the full UTM URL directly made the QR too dense for reliable scanning
inside a composed story card. The studio therefore adds 24 short, public,
allowlisted paths such as:

```text
https://www.askmagicmike.com/go/fb-seller
```

`/go/[code]` resolves only a hardcoded channel/placement pair and returns a
temporary 307 redirect to the exact full UTM destination. Unknown, malformed,
or traversal-shaped codes return 404. There is no open redirect or query-string
destination. Responses are no-store, `nosniff`, and `noindex`; `/go/` is also
disallowed in `robots.txt`.

QR codes use error-correction level H and a four-module quiet zone. H tolerates
the greatest damage among the standard QR levels, but the design still avoids
logos or text over the modules.

## Protected operator workflow

1. Authenticate to the canonical Lead Center.
2. Open `/admin/distribution`.
3. Select the measured channel and expand the intended placement.
4. Download the 4:5 PNG, 9:16 PNG, or raw QR SVG.
5. Review the image, exact native account identity, destination, final copy,
   crop, facts, and legal/BIC boundary.
6. Use the existing copy control for the exact tracked URL or full placement
   packet.
7. Publish only after a separate channel-specific approval.
8. After native publication, use the stacked publication-proof ledger to record
   the external URL or screenshot evidence; attribution alone is not proof of
   publication.

Asset download requires a real Lead Center session with `report:view`.
Responses are private/no-store, attachment-only, noindex, and CSP-sandboxed.
The server performs no provider fetch and writes no database row.

## Current primary-source sizing references

- [Google Analytics campaign URL guidance](https://support.google.com/analytics/answer/10917952?hl=en-uk)
  supports source, medium, and campaign tagging, with content used to distinguish
  creative variants.
- [Google Analytics manual traffic-source guidance](https://support.google.com/analytics/answer/11242870?hl=en)
  supports the deterministic UTM contract retained here.
- [DENSO WAVE QR error-correction reference](https://www.qrcode.com/en/about/error_correction.html)
  defines level H as approximately 30% restoration capacity.
- [Instagram image-size guidance](https://www.facebook.com/help/1631821640426723?locale=en_GB)
  supports images up to 1080 px wide and accepted portrait ratios.
- [Instagram story guidance](https://www.facebook.com/help/instagram/192168966243613)
  supports the 9:16 canvas and guarded sticker/text zones.
- [Google Business Profile photo guidance](https://support.google.com/business/answer/6123536?hl=en)
  and [post policy](https://support.google.com/business/answer/7213077?hl=en)
  informed the clear, non-phone-number visual treatment and required native
  review.

Platform rules can change. The operator must recheck the native editor before
publication; these references do not authorize a post.

## Security, privacy, and compliance boundary

- Server authorization: `report:view` through Better Auth/RBAC.
- No arbitrary URL, image source, HTML, script, SQL, or file path input.
- No consumer PII or private lead context in URLs or images.
- No appraisal, guaranteed value, guaranteed offer, financing, inventory, or
  appointment claim.
- No protected-class data or neighborhood/school proxy.
- No raw credential, database URL, provider key, or BCC value.
- No NellySelly identifier, asset, domain, project, or database dependency.
- No automatic external publication or message send.

## Release order and gate

The asset work is no longer an independently releasable stack item. It is
incorporated into PR #185 on the released PR #184 baseline. After the complete
consolidated head passes Node 24 CI and exact Vercel Preview proof, its only
application gate is:

```text
APPROVE PHASE 9 OWNED-DEMAND COMMAND MERGE AND PRODUCTION DEPLOYMENT
```

That future phrase authorizes only the reviewed consolidated application merge
and canonical Vercel deployment. It does not authorize social/GBP publication,
email distribution, QR printing/distribution, a consumer message, database
migration, spend, DNS, WordPress, provider, deletion, or NellySelly action.

## Rollback

Before Production, leave PR #185 unmerged. After a separately approved release,
revert its merge commit or promote the immediately preceding Ready Vercel
deployment. The feature has no database migration and no external-provider
state to unwind.
