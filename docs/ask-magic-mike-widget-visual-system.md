# Ask Magic Mike — Widget Visual System

Foundation components for the Magic Mike avatar + floating widget + answer
reveal. **Visual-only** — no backend, no chat state machine.

## Components

### `MagicMikeAvatar`

`src/components/amm/magic-mike-avatar.tsx`

Props:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `state` | `idle \| listening \| thinking \| explaining \| answerReveal \| cta \| success` | `idle` | Visual cue only |
| `size` | `sm \| md \| lg` | `md` | `sm` = 40 px, `md` = 64 px, `lg` = 88 px |
| `motion` | `subtle \| static` | `subtle` | Disable all motion regardless of OS reduced-motion |
| `label` | `string` | `Mike Eatmon, Our Town Properties` | aria-label |

Visual signals:

- Cyan ping bottom-right when `state` is `listening` or `thinking`.
- Gold pulse ring when `state` is `cta` or `success`.
- All motion gated behind `motion-safe:`.

### `MagicMikeWidgetLauncher`

`src/components/amm/magic-mike-widget-launcher.tsx`

Props:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `href` | `string` | — | If set, renders as an `<a>` |
| `onClick` | `() => void` | — | If set, renders as a `<button>` |
| `state` | `AvatarState` | `idle` | Passed through to the avatar |
| `active` | `boolean` | `false` | Forces the cyan AI ping (use when routing a session) |
| `label` | `string` | `Ask Magic Mike` | Visible label on `sm+` + aria-label |
| `side` | `right \| left` | `right` | Edge to dock against |
| `zIndex` | `number` | `50` | Stack order |

Behaviour:

- Bottom-right floating button. Mobile (< `sm`) collapses to avatar-only so it can't cover a sticky CTA.
- Gold rim, gold-soft shadow.
- Cyan AI pulse only when `active`.
- Respects `prefers-reduced-motion`.
- Always carries `aria-label="Ask Magic Mike"`.

### `MagicMikeAnswerReveal`

`src/components/amm/magic-mike-answer-reveal.tsx`

CSS-only gold smoke wash that frames a piece of answer text. Children are
live HTML — never bake answer text into an image.

| Prop | Default | Notes |
| --- | --- | --- |
| `bare` | `false` | Hide the gold smoke gradient |
| `className` | — | Style overrides |

## Wiring on `/value`

The launcher is mounted at the bottom of `ValueHero` and links to
`#value-hero-heading`. When a real widget backend lands, swap the `href` for
an `onClick` that opens the chat panel.

## Future work

1. Generate isolated transparent Mike avatar states from
   `09_external_generation_pack` and ship as transparent WebPs keyed off
   `state`.
2. Wire a real chat backend (separate phase). Until then, the launcher
   simply scrolls to the hero heading so the existing address-input flow is
   reached.
3. Add a docked panel that uses `MagicMikeAnswerReveal` for live answers.
4. Smoke transition (CSS keyframe) on state changes — already gated for
   reduced motion.

## Strict rules

- No "lamp" or "genie" identity anywhere in widget code (enforced by
  `tests/compliance/value-copy.test.ts`).
- No baked answer text inside an image.
- No MLS comp data in suggested chat answers.
- No "instant cash offer" or "guaranteed value" framing in any default
  greeting / chip / placeholder.
