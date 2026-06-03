# Ask Magic Mike — Brand Kit v2 Evidence Report

## 1. Source ZIP

| Field | Value |
| --- | --- |
| Path | `~/Desktop/AI_Projects/AskMagicMikeWidget/AskMagicMikeClaude/MagicAIBranding/ask_magic_mike_full_branding_pack_v2.zip` |
| SHA-256 | `7a4690e64ce665457c526df7d218f50218682756c86dce1925ae5fa591613758` |
| Size | 11,950,107 bytes (11.4 MB) |
| Date inspected | 2026-06-03 |

`/mnt/data/...` was not available in this environment; the canonical path
above is where the ZIP lives locally. The ZIP is **not** committed to the
repo — only the specific safe production assets are.

## 2. ZIP contents

- 127 total files
- 108 image / SVG / GIF assets
- 12 top-level sections (see below)

| Section | Purpose | Used here |
| --- | --- | --- |
| `00_START_HERE/README_START_HERE.md` | Pack overview | Read |
| `01_selected_direction/` | Canonical brand boards | Web board imported |
| `02_source_assets/` | Headshot, avatars, Our Town logo | Imported as primary |
| `03_avatar_concept_stills/` | Expression/action/hero/walk/environment crops | Selected clean crops imported as concept references |
| `04_chat_widget_ui/` | Widget concept + smoke sequence | Both imported as reference |
| `05_motion_storyboards/` | Widget state GIF + walk sprite | Both imported as reference |
| `06_brand_system/css` + `json` + `svg` + `guidelines` | Tokens + accent SVGs + guidelines | Tokens merged into `tokens.ts`; 4 SVG accents imported |
| `07_developer_implementation/` | Widget prototype HTML/CSS/JS + notes | Notes read; structure mirrored in `MagicMikeWidgetShell` |
| `08_social_ad_templates/` | 4 baked-text ad templates | Imported as reference-only — baked copy must be rewritten before paid use |
| `09_external_generation_pack/` | Prompts + motion spec | Read for future avatar generation |
| `10_quality_control/` | `do_not_use.md` + likeness QC checklist | Read; enforced by tests |
| `11_manifest/asset_manifest.{csv,json}` | Manifest | Read |

## 3. Assets imported into the repo

Stored under `public/images/ask-magic-mike/brand-pack-v2/`:

### Primary UI (registered, used in production funnel)

| Public path | Source | Use |
| --- | --- | --- |
| `mike-headshot-source.webp` (33 KB) + `.jpg` fallback | `02_source_assets/mike_headshot_likeness_lock_source_optimized.jpg` | `MikeTrustCard` headshot · OG/Twitter image |
| `mike-avatar-circle-{64.png,128.{webp,png},256.{webp,png}}` | `02_source_assets/mike_avatar_source_circle_*.png` | Compact trust card, widget launcher, widget shell header, confirmation card |
| `our-town-logo-clean.{webp,png}` + `our-town-logo-web.jpg` | `02_source_assets/ourtown_properties_logo_source_clean.png` + `_web.jpg` | `BrandHeader` |
| `accent-{gold-arrow,ruby,smoke-glow,sparkle}.svg` | `06_brand_system/svg/*.svg` | Inline accents, ruby option-card ribbon |

### Concept references (registered, rendered only inside `/widget-preview` `BrandKitShowcase`)

| Public path | Source | Status |
| --- | --- | --- |
| `mike-expression-{welcome,thinking-chin,explaining,confident,friendly,looking-side}-clean.webp` | `03_avatar_concept_stills/expressions/mike_expression_*_clean.webp` | Truly clean crops · safe |
| `mike-expression-rubbing-hands-thinking-clean.webp` | same dir | Concept · **has baked "RUBBING HANDS" footer** · forbidden in primary UI |
| `mike-action-explaining-clean.webp` | `03_avatar_concept_stills/actions/mike_action_explaining_clean.webp` | Clean |
| `mike-action-answer-smoke-clean.webp` | same dir | Concept · **has baked "ANSWER APPEARS" footer** · forbidden in primary UI |
| `mike-hero-closeup.webp` | `03_avatar_concept_stills/hero/mike_hero_closeup_primary_360x440.webp` | Primary hero concept |
| `wordmark-lockup-concept.webp` | `03_avatar_concept_stills/hero/ask_magic_mike_wordmark_lockup_concept_430x425.webp` | Conceptual lockup — not a logo replacement |
| `brand-board-v2-web.jpg` | `01_selected_direction/magic_mike_selected_avatar_brand_board_v2_web.jpg` | Canonical board |
| `brand-elements-strip.webp` | `06_brand_system/guidelines/brand_elements_strip_1536x75.webp` | sparkle · smoke · ruby · button motif |
| `mike-walk-cycle-sprite.png` | `05_motion_storyboards/mike_walk_cycle_sprite_sheet_5frames.png` | 5-frame walk sprite |
| `widget-state-sequence-preview.gif` | `05_motion_storyboards/magic_mike_widget_state_sequence_preview.gif` | Kit state GIF |
| `chat-widget-concept.webp` | `04_chat_widget_ui/chat_widget_concept_full_390x430.webp` | Kit widget comp |
| `answer-smoke-sequence.webp` | `04_chat_widget_ui/answer_smoke_effect_sequence_390x105.webp` | Kit smoke comp |
| `social-{home-value-feed,cash-offer-feed,chat-story,seller-story}.jpg` | `08_social_ad_templates/*.jpg` | Baked-text ad templates · rewrite required before paid use |

### Tokens

Color palette merged into `src/components/amm/tokens.ts` (and exported as
`brandColors`):

- `black #050505`, `charcoal #0B0B0B`, `panel #111111`
- `gold #D4AF37`, `goldSoft #F5D76E`, `goldDeep #B8860B`
- `ruby #B11226`, `rubyDeep #8B0000`
- `cyanAI #00CFEA`
- `white #FFFFFF`, `offWhite #F4F4F4`, `gray #B8B8B8`

## 4. Assets rejected / not imported

| Asset(s) | Why |
| --- | --- |
| Card-with-footer expression variants (`mike_expression_*_card.*`) | Have baked label footers; the QC checklist forbids baked text in primary UI |
| `00_START_HERE/index.html` | Pack-internal landing page |
| `07_developer_implementation/magic_mike_widget_prototype.html` and `src/magic-mike-widget.{css,js}` | Reference prototype — replaced by `MagicMikeWidgetShell.tsx` |
| `09_external_generation_pack/` | Operational prompts for future avatar generation |
| `10_quality_control/` | Internal QC docs |
| `11_manifest/*` | Internal pack manifest |
| `01_selected_direction/magic_mike_avatar_board_alt_v1_1536x1024.png` | Alternate direction, not selected |
| Most environment crops, action board crops | Used as direction only |
| `05_motion_storyboards/mike_walk_cycle_preview.gif` | Preview only — sprite sheet is sufficient |

## 5. Current repo paths using kit assets

| Asset | Where it's wired |
| --- | --- |
| `mike.headshot` | `MikeTrustCard` default · root layout OG · `/value` page metadata |
| `mike.avatar128` | `MikeTrustCard` compact · `MagicMikeAvatar` (sm/md) · `MagicMikeWidgetShell` header |
| `mike.avatar256` | `MagicMikeAvatar` (lg) · `StepConfirmation` assignment card |
| `logo.primary` | `BrandHeader` |
| `accents.ruby` | (currently rendered as inline class colors; the SVG is available in registry for future use) |
| Concept references (expressions / actions / motion / brandBoard / social) | `BrandKitShowcase` inside `/widget-preview` |
| Tokens (`brandColors`) | Inline styles inside the showcase color row |

## 6. Components that match the kit structure

The brand kit's recommended component layer
(`07_developer_implementation/implementation_notes.md`) is:

```
MagicMikeWidget
MagicMikeLauncher
MagicMikeAvatar
MagicMikeMessageList
MagicMikePromptChips
MagicMikeLeadCapture
magicMikeMotion.ts
```

The repo equivalents (in `src/components/amm/`):

| Kit name | Repo file |
| --- | --- |
| `MagicMikeWidget` | `magic-mike-widget-shell.tsx` |
| `MagicMikeLauncher` | `magic-mike-widget-launcher.tsx` |
| `MagicMikeAvatar` | `magic-mike-avatar.tsx` |
| `MagicMikeMessageList` | inline inside `MagicMikeWidgetShell` (`amm-widget-messages`) |
| `MagicMikePromptChips` | inline inside `MagicMikeWidgetShell` (`amm-widget-chips`) |
| `MagicMikeLeadCapture` | inline `lead` slot inside `MagicMikeWidgetShell` |
| `MagicMikeAnswerReveal` | `magic-mike-answer-reveal.tsx` |
| `magicMikeMotion` | `motion.ts` |

## 7. Compliance posture

Public UI bans (enforced by `tests/compliance/value-copy.test.ts`):

- `rub the lamp` · `\\blamp\\b` · `\\bgenie\\b`
- `guaranteed value` · `guaranteed offer` · `binding offer` · `instant cash offer`
- `MLS comps` · `cash offer` (the kit's prototype chip `Can I get a cash offer?` was replaced with `Request a direct-purchase review` in `MagicMikeWidgetShell`)
- `appraisal` may only appear inside `not an appraisal`

Tests also confirm:

- every `brandPackAssets` path resolves to a real file in `public/`
- no registry path contains `flexmls` or `mls`
- `/widget-preview` ships `index: false`
- the kit's `MagicMikeMessageList` / `MagicMikePromptChips` / `MagicMikeLeadCapture` structure is present in `magic-mike-widget-shell.tsx`

## 8. Current gaps

| Gap | Owner | Status |
| --- | --- | --- |
| Isolated transparent final avatar states (`idle`, `walkOn`, `listening`, `thinkingHands`, `thinkingChin`, `explaining`, `answerReveal`, `cta`, `success`) | External generation pack | Pending — requires production AI generation per `09_external_generation_pack` |
| Wire `MagicMikeAvatar` to render those final states by `AvatarState` once they exist | App | Pending the assets above |
| Real chat backend behind `MagicMikeWidgetShell` | App / backend | Pending — current shell is visual-only |
| `cash offer` baked copy on `social-cash-offer-feed.jpg` | Creative | Must be rewritten before any paid run |
| Live OG image generator (currently the static headshot WebP) | App | Optional polish |

## 9. Required future generation items

From `09_external_generation_pack/external_generation_prompt_pack.md`:

- Transparent isolated avatar PNG/WebP set keyed by `AvatarState`.
- Smoke reveal video/Lottie keyed off the motion spec
  (`09_external_generation_pack/motion_spec.md`).
- Walk-on sequence (700–1200 ms desktop, fade fallback on reduced motion).

## 10. Final production go/no-go

**Production status: HOLD.** Branding is correctly imported and the widget
visual system reflects the kit. What still needs human + creative sign-off:

1. Mike + Our Town approve the v2 headshot, avatar circles, and the
   "Priority review" ruby ribbon on the direct-purchase OptionCard.
2. Creative team rewrites the baked ad templates (especially the
   `cash-offer-feed`) before any paid run.
3. Production transparent avatar state PNGs/clips delivered via
   `09_external_generation_pack`.
4. Atlas QA against the preview URL produced by this branch.

Once those four items are clear, the branch can be fast-forwarded onto
`main` and promoted to production exactly as the existing release flow does
it (`vercel promote …`).
