# Ask Magic Mike — Professional Visual Strategy

## Why we pivoted away from "Rub the lamp."

The first visual pass leaned hard into the genie/lamp motif: a "Rub the lamp"
headline, a cyan-flame lamp glyph as the primary identity, sparkle fields,
and a lamp-shaped success mark on the confirmation screen. It looked
distinctive but it sent the wrong signal for a real estate landing page:

- The brand promise (a licensed Wilson-area broker doing real follow-up) was
  underweighted relative to the novelty of the lamp.
- Paid traffic readers had to work to decode what this product actually is.
- The lamp framing risks reading as "AI valuation gimmick," which is exactly
  the bucket Mike's brand needs to stay out of.

We've swapped that for a trust-first design where Mike Eatmon and Our Town
Properties are the visual anchors and AI assistance is a small badge, not
the headline.

## Hierarchy

1. **Mike Eatmon + Our Town Properties.** The trust card with Mike's real
   headshot, his credentials, and the Our Town wordmark do the brand work.
2. **AI-assisted convenience.** A single restrained badge ("AI-assisted
   intake · Local human follow-up · Reviewed by Our Town Properties").
3. **Subtle Magic Mike brand accent.** Eyebrow text, gold accents, the small
   gold "✦" dot in the AmmLockup. No cartoon lamp anywhere in the public UI.

## Positioning

Brand line: **Ask Magic Mike by Our Town Properties**

Public-facing copy on `/value`:

- Eyebrow: "Ask Magic Mike by Our Town Properties"
- Headline: "Start with your address. Get a local read on your home."
- Sub: "Ask Magic Mike helps Wilson-area homeowners see a preliminary home
  value range, compare selling options, and get follow-up from Mike Eatmon's
  Our Town Properties team."
- Primary CTA: "Start With Your Address"
- Secondary chips: "Compare selling options" · "Request direct-purchase
  review" · "Ask Mike a question"
- AI line under the CTA: "AI-assisted intake. Local human follow-up."

Public-facing copy on confirmation:

- "Your request is in"
- "Thanks, {firstName}." / "Thanks for reaching out."
- "Mike Eatmon or the Our Town Properties team will follow up with local
  guidance based on what you shared."
- Primary CTA: "Call Mike"
- Secondary: "Visit Our Town Properties"

## Asset usage

See `docs/ask-magic-mike-asset-manifest.md` for the full inventory.

- Headshot — real Mike Eatmon photo, served as a 35 KB WebP
  (`/images/ask-magic-mike/mike-eatmon-headshot.webp`, 515×720). PNG
  fallback at 435 KB is kept for non-WebP tools.
- Logo — official Our Town Properties wordmark, served as a 9.4 KB WebP
  (`/images/ask-magic-mike/our-town-properties-logo.webp`, 343×180). PNG
  fallback at 41 KB is kept.
- All public images go through `next/image` with explicit dimensions; the
  hero headshot is the only `priority` image.
- No MLS / flexmls listing photos, comp tables, or confidential listing
  artifacts anywhere in the public UI. Period.

## Credentials baked in

These appear in `MikeTrustCard`:

- Mike Eatmon
- Our Town Properties, Inc.
- Licensed in North Carolina (optionally suffixed with the license number
  from `NEXT_PUBLIC_AGENT_LICENSE` when set)
- Wilson, NC · Eastern North Carolina
- Selling real estate since 1993
- Click-to-call to the env-driven phone number

These appear in the `ProofStrip`:

- Local guidance, Wilson NC
- Preliminary home value range
- Mike's team follows up directly
- Licensed in North Carolina · Not an appraisal

## Compliance guardrails

Enforced by `tests/compliance/value-copy.test.ts`:

- `ComplianceFooter` is the single source of disclosure copy and ships on
  `/value` and the confirmation screen.
- The string "Rub the lamp" must not appear in any public source file
  (`src/app/**`, `src/components/**`, excluding `admin/`).
- The word "appraisal" may appear only inside "not an appraisal" / "is not
  an appraisal".
- "guaranteed value", "guaranteed offer", "binding offer", "binding cash
  offer", and "instant cash offer" must not appear anywhere in public source.

## Performance guardrails

- All public images go through `next/image` with explicit `width` / `height`
  or a stable aspect container — no CLS.
- The trust-card headshot is loaded with `priority` so it lands above the
  fold; everything else (the small intake-shell avatar, the confirmation
  avatar) is lazy by default.
- Source images are sized before commit: headshot 515×720 / 435 KB, logo
  343×180 / 41 KB. Vercel's image optimizer takes it the rest of the way.
- No new runtime dependencies. The professional rebuild ships entirely on
  Tailwind + lucide-react + next/image, all already in the bundle.
- Build result after this pass:
  - `/value` 6.39 kB / 121 kB first-load JS
  - `/ask`   3.82 kB / 129 kB
  - `/embed/ask` 1.63 kB / 126 kB

## Reserved for social / video creative (not public UI)

The lamp / genie / sparkle motif still has a home — just not on the landing
page. Acceptable surfaces:

- Paid social ad templates (1080×1080, 1080×1920) that can lean into the
  Magic Mike personality.
- Video creative, lower-thirds, intro frames.
- Email creative headers.

When those land, keep the same hierarchy: brokerage trust first, AI second,
lamp atmosphere third.

## What we explicitly will NOT use from the MLS / flexmls exports

- Listing photos for other properties.
- Closed comps, active comps, pending comps.
- Map screenshots tied to MLS data.
- Seller / buyer / co-op agent names from listing histories.
- Any "appraisal" or "guaranteed offer" framing.

If a flexmls export is the only source of an interesting data point we want
to surface, the data point is out of scope until it has a non-MLS, public
source. Don't paper over MLS data with brand polish.
