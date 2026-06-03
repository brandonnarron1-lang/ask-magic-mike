/**
 * Ask Magic Mike visual tokens — professional trust-first.
 *
 * Composed with Tailwind utilities + the helpers in globals.css. Replaces the
 * earlier lamp-forward palette with a darker, more restrained surface set
 * that lets Mike's headshot and the Our Town wordmark do the brand work.
 *
 * Palette anchors (also used inline as needed):
 *   bg          #05070A   page base
 *   surface     #0F131A   primary card
 *   surface alt #111827   secondary card
 *   warm text   #F7F1E8
 *   slate text  #94A3B8
 *   gold        #D4A017   primary accent
 *   cyan        #67E8F9   AI-assist micro-accent only
 */

export const ammTokens = {
  // Page shells
  pageShell:
    "relative min-h-screen w-full overflow-hidden bg-[#05070A] text-[#F7F1E8] antialiased",
  pageShellPadded:
    "relative min-h-screen w-full overflow-hidden bg-[#05070A] text-[#F7F1E8] antialiased flex flex-col",

  // Card surfaces
  trustCard:
    "relative rounded-2xl border border-white/10 bg-[#0F131A]/95 backdrop-blur-sm shadow-[0_24px_60px_-32px_rgba(0,0,0,0.8)]",
  panel:
    "relative rounded-2xl border border-white/[0.08] bg-[#0F131A]/85 backdrop-blur-sm",
  inputShell:
    "relative rounded-xl border border-white/12 bg-[#0B0E14] transition-all duration-200",
  inputShellFocused:
    "border-gold-400/55 shadow-[0_0_28px_rgba(212,160,23,0.10)]",

  // Step card (intake)
  stepCard:
    "relative rounded-2xl border border-white/10 bg-[#0F131A]/92 backdrop-blur-sm p-6 sm:p-8 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.8)]",

  // Buttons
  buttonGold:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-gold-400 px-5 py-2.5 text-sm font-bold text-[#0A0A0A] shadow-[0_10px_30px_-10px_rgba(212,160,23,0.50)] transition-all duration-200 hover:bg-gold-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
  buttonGoldLg:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gold-400 px-7 py-3.5 text-base font-bold text-[#0A0A0A] shadow-[0_18px_40px_-12px_rgba(212,160,23,0.55)] transition-all duration-200 hover:bg-gold-300 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed",
  buttonSecondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-[#F7F1E8] transition-all duration-200 hover:border-gold-400/40 hover:bg-gold-400/[0.06]",

  // Eyebrow
  eyebrow:
    "inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/[0.06] px-3 py-1.5 text-[10.5px] font-semibold tracking-[0.18em] uppercase text-gold-300",
  eyebrowDot: "h-1.5 w-1.5 rounded-full bg-gold-400",

  // Typography
  headlineDisplay:
    "font-display font-semibold leading-[0.98] text-[#F7F1E8]",
  subhead:
    "text-slate-300 text-base sm:text-[17px] leading-relaxed",

  // Microcopy
  microWarm:
    "text-[12px] text-[#F7F1E8]/75",
  microSlate:
    "text-[11.5px] text-slate-400",
  microMuted:
    "text-[11px] text-slate-500",

  // Compliance text
  complianceText:
    "text-[11px] leading-relaxed text-slate-500",
  complianceTextFooter:
    "text-[10.5px] leading-relaxed text-slate-500 text-center",
} as const;

export type AmmToken = keyof typeof ammTokens;
