# Magic Mike Avatar State Generation Brief

The widget visual system expects up to nine isolated avatar states.
Today the funnel only ships the gold-rim circle avatars (64/128/256)
from the brand pack v2 — those cover `idle` cleanly. The other states
need transparent PNG/WebP renders generated from the source headshot
(`mike-headshot-likeness-lock-source.jpg`) using the brand kit's
`09_external_generation_pack/external_generation_prompt_pack.md`.

This brief is the contract between the generation pipeline and the
widget code so a non-engineer can deliver final assets without
ambiguity.

## States

| State key | Purpose | Pose / expression |
| --- | --- | --- |
| `idle` | Default launcher + chat header | Direct smile, shoulders-up, neutral background removed |
| `walkOn` | First-visit walk-on into the widget | Full-body 3/4 turn, mid-stride; loops 5 frames if animated |
| `listening` | User is typing / talking | Slight head tilt, attentive |
| `thinkingHands` | AI processing | Hands together, soft brow lift |
| `thinkingChin` | AI processing (alt) | Chin between thumb + index, looking slightly up |
| `explaining` | Answer in progress | Open hands, advisor posture |
| `answerReveal` | Answer card appears | Calm half-smile; smoke effect lives in CSS, not bake |
| `cta` | Post-answer CTA visible | Confident, eyes forward, subtle smile |
| `success` | After lead submit | Friendly nod, slight smile |

## File naming + sizes

Place finals under `public/images/ask-magic-mike/brand-pack-v2/states/`:

```
mike-state-idle.webp           360×440 transparent · ~30–50 KB
mike-state-listening.webp      360×440 transparent
mike-state-thinking-hands.webp 360×440 transparent
mike-state-thinking-chin.webp  360×440 transparent
mike-state-explaining.webp     360×440 transparent
mike-state-answer-reveal.webp  360×440 transparent
mike-state-cta.webp            360×440 transparent
mike-state-success.webp        360×440 transparent
mike-state-walk-on/*.webp      5 frames at 720×900 transparent  (walk-on only)
```

PNG fallback at the same dimensions is acceptable if the export pipeline
can't produce WebP. Avoid baked text or footer labels; the kit's
"clean" concept stills with `RUBBING HANDS` / `ANSWER APPEARS` baked in
are **not** acceptable for production use.

## Likeness QC checklist

Same checklist already shipped at
`10_quality_control/likeness_and_brand_qc_checklist.md`. Run each frame
through it before approving:

- Face shape matches source headshot
- Eye color + spacing matches
- Hairline + side part consistent
- No fantasy costume / lamp / genie / wizard visuals
- Hands have five fingers; no fused wrists
- Navy blazer + white shirt consistent
- Still looks like Mike when cropped to 64 px

## Where each state maps in code

`MagicMikeAvatar` currently reads a circular avatar regardless of state.
After generation:

1. Add a state→src map in `src/components/amm/brand-pack-assets.ts`
   under `mike.states.*`.
2. Update `MagicMikeAvatar.SIZE_MAP` (or a sibling resolver) to look up
   `brandPackAssets.mike.states[state]` for `lg` size; fallback to the
   current circle avatars for `sm` / `md` until small versions exist.
3. Add `loading="eager"` only to the `idle` state image; everything else
   lazy.
4. Animations are CSS-only (motion-safe). No GIFs.
5. Walk-on is opt-in: only render on first visit, behind
   `prefers-reduced-motion` gate.

## Fallback behavior when an asset is missing

`MagicMikeAvatar` must keep working even when the new assets aren't
shipped yet:

- If `state in {listening, thinking, explaining, answerReveal, cta, success}`
  and no asset is registered, render the current circular avatar with
  the existing state-cue overlay (cyan ping / gold ring). Do NOT throw.
- The widget should NEVER show a broken image icon to a real user.

## Production handoff

Drop final assets in the directory above and update
`brand-pack-assets.ts`. Tests will:

- Confirm each `mike.states.*` path resolves to a file in `public/`.
- Confirm filenames don't contain `lamp` or `genie`.
- Confirm size + transparency invariants where possible.

The widget code paths above don't need any further engineering — they
read from the registry.

## Out of scope

- Video clips / Lottie / Rive. Stills first; motion when stills are
  approved.
- Voice / audio. Widget remains silent for now.
- Background environments. Mike on transparent only.
