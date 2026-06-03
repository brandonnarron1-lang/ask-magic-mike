/**
 * Motion fragments for Ask Magic Mike.
 *
 * Pure class strings composed with the existing keyframes in `globals.css`
 * (`fadeUp`, `fadeIn`, `scaleIn`, `pulseGold`, `floatY`, `glowBorder`).
 * Every entrance is gated behind `motion-safe:` so reduced-motion users get
 * a still page; hovers stay instant for keyboard/touch.
 */
export const motion = {
  fadeUp:           "motion-safe:animate-fade-up",
  fadeUpDelay100:   "motion-safe:animate-fade-up motion-safe:delay-100",
  fadeUpDelay200:   "motion-safe:animate-fade-up motion-safe:delay-200",
  fadeUpDelay300:   "motion-safe:animate-fade-up motion-safe:delay-300",
  fadeUpDelay500:   "motion-safe:animate-fade-up motion-safe:delay-500",
  scaleIn:          "motion-safe:animate-scale-in",
  hoverLift:
    "transition-transform duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_24px_60px_-30px_rgba(212,160,23,0.45)]",
  hoverGold:
    "transition-colors duration-200 hover:border-gold-400/45 hover:bg-gold-400/[0.06]",
  focusGold:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070A]",
  reveal:           "opacity-0 motion-safe:animate-fade-up",
} as const;

export type MotionToken = keyof typeof motion;
