/**
 * Ask Magic Mike visual tokens.
 *
 * Small set of reusable class fragments composed with the existing Tailwind
 * utilities and globals.css helpers (`bg-glass`, `card-gradient-border`,
 * `gold-shimmer`, `mesh-bg`, `animate-float`). Used by /value, /ask, and the
 * confirmation surfaces to keep the lamp + brokerage aesthetic consistent.
 */

export const ammTokens = {
  // Page shells
  pageShell:
    "relative min-h-screen w-full overflow-hidden bg-midnight text-cream antialiased",
  pageShellPadded:
    "relative min-h-screen w-full overflow-hidden bg-midnight text-cream antialiased flex flex-col",

  // Card surfaces
  cardSurface:
    "relative rounded-2xl border border-gold-400/15 bg-white/[0.025] backdrop-blur-md shadow-[0_10px_40px_-20px_rgba(212,160,23,0.25)]",
  cardSurfaceMuted:
    "relative rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm",
  inputShell:
    "relative rounded-xl border border-gold-400/20 bg-[#0D0B08]/90 backdrop-blur-sm transition-all duration-300",
  inputShellFocused:
    "border-gold-400/55 shadow-[0_0_36px_rgba(212,160,23,0.14)]",

  // Step card (intake)
  stepCard:
    "relative rounded-2xl border border-gold-400/15 bg-white/[0.025] backdrop-blur-md p-6 sm:p-7 shadow-[0_20px_60px_-30px_rgba(212,160,23,0.35)]",

  // Buttons (compose w/ ui/button.tsx when possible; these are for inline use)
  buttonGold:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-gold-400 px-5 py-2.5 text-sm font-bold text-midnight shadow-lg shadow-gold-400/20 transition-all duration-200 hover:bg-gold-300 hover:shadow-gold-400/30 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
  buttonGoldLg:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gold-400 px-7 py-3.5 text-base font-bold text-midnight shadow-[0_18px_45px_-12px_rgba(212,160,23,0.55)] transition-all duration-200 hover:bg-gold-300 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed",
  buttonSecondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-gold-400/35 bg-transparent px-5 py-2.5 text-sm font-semibold text-gold-300 transition-all duration-200 hover:bg-gold-400/10 hover:border-gold-400/60",

  // Eyebrow / chips
  eyebrow:
    "inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/[0.06] px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-300",
  eyebrowDot: "h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse",

  // Typography
  headlineDisplay:
    "font-display font-black leading-[0.92] text-cream",
  subhead:
    "text-slate-300 text-lg leading-relaxed font-light",

  // Compliance text
  complianceText:
    "text-[11px] leading-relaxed text-slate-500",
  complianceTextMicro:
    "text-[10px] leading-relaxed text-slate-600",
} as const;

export type AmmToken = keyof typeof ammTokens;
