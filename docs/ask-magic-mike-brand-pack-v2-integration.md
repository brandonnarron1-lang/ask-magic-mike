# Ask Magic Mike — Brand Pack v2 Integration

This doc records how `ask_magic_mike_full_branding_pack_v2.zip` was wired into
the funnel, what was imported, what was rejected, and what remains for
production generation.

## Source

`~/Desktop/AI_Projects/AskMagicMikeWidget/AskMagicMikeClaude/MagicAIBranding/ask_magic_mike_full_branding_pack_v2.zip`

Extracted (read-only) to `/tmp/amm-brand-v2/` for inspection. The full ZIP is
**not** committed to the repo. Only the specific safe production assets
listed below were copied into `public/images/ask-magic-mike/brand-pack-v2/`.

## Imported into the repo

Production use:

| Public path | Source | Use |
| --- | --- | --- |
| `mike-headshot-source.webp` (33 KB) + `.jpg` fallback (132 KB) | `02_source_assets/mike_headshot_likeness_lock_source_optimized.jpg` | `MikeTrustCard` headshot · OG/Twitter image |
| `mike-avatar-circle-64.png` (6.6 KB) | `02_source_assets/mike_avatar_source_circle_64.png` | Future micro avatar |
| `mike-avatar-circle-128.webp` (4.9 KB) + `.png` (21 KB) | `02_source_assets/mike_avatar_source_circle_128.png` | Compact `MikeTrustCard`, widget launcher |
| `mike-avatar-circle-256.webp` (12 KB) + `.png` (69 KB) | `02_source_assets/mike_avatar_source_circle_256.png` | Confirmation card avatar, large widget states |
| `our-town-logo-clean.webp` (9.4 KB) + `.png` (41 KB) | `02_source_assets/ourtown_properties_logo_source_clean.png` | `BrandHeader` |
| `our-town-logo-web.jpg` (14 KB) | `02_source_assets/ourtown_properties_logo_web.jpg` | Web preview fallback |
| `accent-gold-arrow.svg`, `accent-ruby.svg`, `accent-smoke-glow.svg`, `accent-sparkle.svg` | `06_brand_system/svg/` | Inline accents, ruby option-card ribbon |

Reference / future (committed but not embedded in `/value` or `/ask`):

| Public path | Source | Use |
| --- | --- | --- |
| `chat-widget-concept.webp` | `04_chat_widget_ui/chat_widget_concept_full_390x430.webp` | Design comp for the widget; not embedded on a public surface |
| `answer-smoke-sequence.webp` | `04_chat_widget_ui/answer_smoke_effect_sequence_390x105.webp` | Reference for `MagicMikeAnswerReveal` (which is CSS-only) |
| `social-home-value-feed.jpg`, `social-cash-offer-feed.jpg`, `social-chat-story.jpg`, `social-seller-story.jpg` | `08_social_ad_templates/` | Future paid-social templates only |

## Rejected / not imported

- `01_selected_direction/*` (brand boards) — direction-setting only.
- `03_avatar_concept_stills/*` (expressions, walk frames, hero) — concept stills
  intended for future production avatar generation, not for the funnel surfaces.
- `05_motion_storyboards/*` — storyboards.
- `07_developer_implementation/*` — replaced by the in-repo registry +
  components.
- `09_external_generation_pack/*` — for future AI generation of isolated
  avatar states.
- `10_quality_control/*` — internal QC checklist.
- `11_manifest/*` — pack-internal manifest.
- All non-headshot avatar boards and full-body action cards — kept under
  the local extraction dir for production avatar generation, not committed.

## How components consume the pack

Every public-facing image path now comes from one registry:

```ts
// src/components/amm/brand-pack-assets.ts
export const brandPackAssets = {
  mike: { headshot, avatar64, avatar128, avatar256, ... },
  logo: { primary, fallback, web },
  widget: { concept, smokeReveal },
  accents: { goldArrow, ruby, smokeGlow, sparkle },
  social: { homeValueFeed, cashOfferFeed, chatStory, sellerStory },
} as const;
```

Updated consumers:

- `BrandHeader` → `brandPackAssets.logo.primary`
- `MikeTrustCard` (default + compact) → `brandPackAssets.mike.headshot` + `.avatar128`
- `StepConfirmation` assignment card → `brandPackAssets.mike.avatar256`
- `MagicMikeAvatar` → `brandPackAssets.mike.avatar128` / `.avatar256`
- `MagicMikeWidgetLauncher` → uses the same avatar through `MagicMikeAvatar`
- Root layout + `/value` OG metadata → `brandPackAssets.mike.headshot` (full
  absolute URL via `metadataBase`)

## Compliance posture (carried forward)

- No "lamp" or "genie" identity — enforced by
  `tests/compliance/value-copy.test.ts` (the comment-stripping sweep).
- No MLS / flexmls listing photos — `brandPackAssets` paths are recursively
  asserted to live under `public/images/ask-magic-mike/brand-pack-v2/` and
  cannot contain `flexmls` or `mls`.
- Ruby reserved for the direct-purchase ribbon ("Priority review") and
  future urgency cues — never as a dominant page color.
- Cyan reserved for the AI status pulse on `MagicMikeAvatar` and the AI
  badge inline pill.

## Production generation gaps

Listed for the next pass:

1. Isolated transparent Mike avatar states (idle, listening, thinking, explaining, success) — generate via `09_external_generation_pack` and ship as transparent WebPs.
2. CSS or Lottie smoke transitions tied to the answer reveal.
3. Real chat backend (UI foundation exists; no backend wired in this phase).
4. Live OG image generator (currently uses the static brand-pack headshot).
5. WordPress CTA visual refresh against the new pack — covered in
   `docs/ask-magic-mike-wordpress-visual-brief.md`.

## Required human confirmation

- Mike + Our Town sign-off on the v2 headshot + clean wordmark.
- Approval to use the "Priority review" copy on the direct-purchase
  OptionCard ribbon.
