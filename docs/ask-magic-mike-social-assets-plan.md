# Ask Magic Mike — Social Assets Plan

Reference for future paid-social and ad creative. **Not embedded** anywhere
in the funnel UI today.

## Assets shipped from brand pack v2

Stored under `public/images/ask-magic-mike/brand-pack-v2/`:

| File | Dim | Notes |
| --- | --- | --- |
| `social-home-value-feed.jpg` | 1080×1350 | Feed ad — home value framing |
| `social-cash-offer-feed.jpg` | 1080×1350 | Feed ad — direct-purchase framing (review brand copy before use; "cash offer" framing must be replaced with "direct-purchase review" before any paid run) |
| `social-chat-story.jpg` | 1080×1920 | Story ad — chat preview |
| `social-seller-story.jpg` | 1080×1920 | Story ad — seller framing |

These ship with baked text. **Before any paid run** the copy must be
re-rendered against the current compliance language:

- `direct-purchase review` (not "cash offer")
- `preliminary home value range` (not "home value", "instant value", or
  "guaranteed")
- `Mike Eatmon, Our Town Properties` (always)
- `not an appraisal` somewhere on the surface

## Replacement plan

Until ad copy is refreshed:

1. Use the **headshot + logo** registry entries to assemble in-tool templates
   in Figma or Canva.
2. Lean on the `MikeTrustCard` visual vocabulary for stills.
3. Keep ruby for the direct-purchase ribbon only.
4. Keep cyan for AI-status only.

## Future generation prompts

Captured for the next pass:

- 1080×1080 feed — Mike avatar + headline
- 1080×1080 feed — chat preview
- 1080×1920 story — vertical Mike + address CTA
- 1080×1920 story — direct-purchase review framing with ruby ribbon
- 1080×566 horizontal — landing companion

## Compliance reminders

- No MLS / flexmls listing photos.
- No fake comp data.
- No fake review screenshots.
- No protected-class targeting language.
- No "guaranteed value", "binding offer", "instant cash offer".
- No "appraisal" except in "not an appraisal".

## Where these get tracked

- This doc, alongside the WordPress brief at
  `docs/ask-magic-mike-wordpress-visual-brief.md`.
- Asset registry: `src/components/amm/brand-pack-assets.ts → social`.
- Manifest: `docs/ask-magic-mike-asset-manifest.md`.
