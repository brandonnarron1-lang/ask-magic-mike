# Social / Video Ad Compliance Rewrite

The brand pack v2 ships four `social-*.jpg` templates that include baked
copy. Two carry copy that is **non-compliant for paid use as-is** and
must be rewritten before any paid spend lands:

- `social-cash-offer-feed.jpg` — uses "cash offer" framing the funnel
  bans on public surfaces.
- `social-seller-story.jpg` — re-check for "we buy any house" framing
  before paid use.

The other two (`social-home-value-feed.jpg`, `social-chat-story.jpg`) are
safer in tone but still require human review before paid use.

Until the rewrites are approved, treat all four templates as
**DO NOT RUN PAID**. They are imported as design references only and
appear inside `/widget-preview` BrandKitShowcase, never on public funnel
surfaces.

## Replacement copy snippets

### A. "Cash offer" feed (1080×1350)

Old (don't run): `Get a no-obligation cash offer on your home today.`

New compliant variants:

> Need to sell a Wilson-area house without the usual headache?
> Request a preliminary direct-purchase review. Subject to review —
> not an instant offer. Ask Magic Mike.

> Inherited a house? Tired landlord? Repairs piling up?
> Start with a preliminary direct-purchase review. Mike Eatmon,
> Our Town Properties.

CTA: `Request a direct-purchase review` (link to `/value`).

### B. Seller story (1080×1920)

Old (re-check): anything that implies "we buy any home" or guarantees.

New compliant variants:

> Selling a Wilson-area home? See your options — list with Mike, or
> request a preliminary direct-purchase review. Subject to review.

> Local real estate since 1993. Mike Eatmon, Our Town Properties.
> Start with your address.

### C. Home value feed (1080×1350)

> What could your Wilson-area home sell for in today's market?
> Get a local read from Mike Eatmon's Our Town Properties team.
> Preliminary home value range — not an appraisal.

CTA: `Start with your address`.

### D. Chat story (1080×1920)

> Ask Magic Mike — your Wilson-area real estate questions, answered
> by a local human team. AI-assisted intake. Local follow-up.

## Rules (apply to all ad creative)

- No "guaranteed value", "guaranteed offer", "instant cash offer",
  "binding offer", or "no obligation cash offer".
- No protected-class targeting or signaling — describe property and
  service area, never "ideal people".
- No fake scarcity / urgency ("offer ends today", etc.).
- No "we buy any house no matter what" unless backed by a verified
  written business policy.
- Include `Mike Eatmon, Our Town Properties, Inc.` and `Licensed in NC`
  on every ad.
- Include `Wilson, NC and nearby areas` service area on every ad.
- "Direct-purchase review" is the compliant alternative to "cash offer".
- "Preliminary home value range" is the compliant alternative to
  "valuation" / "appraisal".
- Always pair valuation language with "subject to review, not an
  appraisal".

## Re-render workflow

1. Update the source design (Figma / Canva) to the copy above.
2. Re-export at the original sizes:
   - 1080×1350 for feed
   - 1080×1920 for story
   - 1200×630 for OG (optional)
3. Drop replacements into
   `public/images/ask-magic-mike/brand-pack-v2/`, replacing the existing
   files. `brand-pack-assets.ts` already points at those paths.
4. The `BrandKitShowcase` reference page auto-picks up the new assets.
5. Update this doc to mark each template as "compliant — cleared for
   paid".

## Tracking

Until human approval lands, treat any reference to the baked ad copy as
unsafe. The brand-kit evidence report
(`docs/ask-magic-mike-brand-kit-v2-evidence-report.md`) already flags
these as "reference only · BAKED COPY MUST BE REWRITTEN before paid
use".
