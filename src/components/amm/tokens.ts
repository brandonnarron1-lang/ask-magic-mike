/**
 * Ask Magic Mike — visual tokens.
 *
 * Backed by the brand pack v2 token sheet
 * (06_brand_system/json/ask-magic-mike-brand-tokens.json). Tailwind
 * utilities + globals.css helpers do the heavy lifting; this file is the
 * reusable composition layer.
 *
 * Palette (raw values exported via `brandColors` for inline styles):
 *   black       #050505   page base
 *   charcoal    #0B0B0B   ambient strata
 *   panel       #111111   primary card surface
 *   gold        #D4AF37   primary accent
 *   goldSoft    #F5D76E   hover/active highlight
 *   goldDeep    #B8860B   shadow / deep edge
 *   ruby        #B11226   direct-purchase / urgency detail (sparingly)
 *   rubyDeep    #8B0000   ruby shadow
 *   cyanAI      #00CFEA   AI pulse / status only
 *   white       #FFFFFF
 *   offWhite    #F4F4F4   primary body text
 *   gray        #B8B8B8   secondary body text
 */

export const brandColors = {
  black:     "#050505",
  charcoal:  "#0B0B0B",
  panel:     "#111111",
  gold:      "#D4AF37",
  goldSoft:  "#F5D76E",
  goldDeep:  "#B8860B",
  ruby:      "#B11226",
  rubyDeep:  "#8B0000",
  cyanAI:    "#00CFEA",
  white:     "#FFFFFF",
  offWhite:  "#F4F4F4",
  gray:      "#B8B8B8",
} as const;

export const ammTokens = {
  // Page shells
  pageShell:
    "relative min-h-screen w-full overflow-hidden bg-[#050505] text-[#F4F4F4] antialiased",
  pageShellPadded:
    "relative min-h-screen w-full overflow-hidden bg-[#050505] text-[#F4F4F4] antialiased flex flex-col",

  // Card surfaces
  trustCard:
    "relative rounded-2xl border border-white/10 bg-[#111111]/95 backdrop-blur-sm shadow-[0_24px_60px_-32px_rgba(0,0,0,0.85)]",
  panel:
    "relative rounded-2xl border border-white/[0.08] bg-[#111111]/85 backdrop-blur-sm",
  inputShell:
    "relative rounded-xl border border-white/12 bg-[#0B0B0B] transition-all duration-200",
  inputShellFocused:
    "border-gold-400/55 shadow-[0_0_28px_rgba(212,175,55,0.12)]",

  // Step card (intake)
  stepCard:
    "relative rounded-2xl border border-white/10 bg-[#111111]/92 backdrop-blur-sm p-6 sm:p-8 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.85)]",

  // Buttons
  buttonGold:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-gold-400 px-5 py-2.5 text-sm font-bold text-[#050505] shadow-[0_10px_30px_-10px_rgba(212,175,55,0.55)] transition-all duration-200 hover:bg-gold-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
  buttonGoldLg:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gold-400 px-7 py-3.5 text-base font-bold text-[#050505] shadow-[0_18px_40px_-12px_rgba(212,175,55,0.55)] transition-all duration-200 hover:bg-gold-300 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed",
  buttonSecondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-[#F4F4F4] transition-all duration-200 hover:border-gold-400/40 hover:bg-gold-400/[0.06]",

  // Eyebrow
  eyebrow:
    "inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/[0.08] px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-300",
  eyebrowDot: "h-1.5 w-1.5 rounded-full bg-gold-400",
  rubyChip:
    "inline-flex items-center gap-1.5 rounded-full border border-ruby-400/40 bg-ruby-400/[0.10] px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.18em] uppercase text-ruby-200",
  cyanPulse:
    "inline-flex items-center gap-1.5 rounded-full border border-cyan-400/35 bg-cyan-400/[0.06] px-2.5 py-1 text-[11px] tracking-[0.16em] uppercase text-cyan-100",

  // Typography
  headlineDisplay:
    "font-display font-semibold leading-[0.98] text-[#F4F4F4]",
  subhead:
    "text-[#F4F4F4]/85 text-base sm:text-[17px] leading-relaxed",

  // Microcopy floors (set by the readability QA pass)
  microWarm:
    "text-[12.5px] text-[#F4F4F4]/85",
  microSlate:
    "text-[12px] text-slate-300",
  microMuted:
    "text-[11.5px] text-slate-400",

  // Compliance text
  complianceText:
    "text-[12px] sm:text-[12.5px] leading-relaxed text-slate-400",
  complianceTextFooter:
    "text-[12px] sm:text-[12.5px] leading-relaxed text-slate-400 text-center",
} as const;

export type AmmToken = keyof typeof ammTokens;
