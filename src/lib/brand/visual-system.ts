/**
 * Ask Magic Mike — Canonical Visual System
 *
 * Single source of truth for all brand tokens, class compositions, and
 * utility helpers. Backed by brand-pack-v2 token sheet.
 *
 * Rules:
 *   - No runtime logic. Pure constants.
 *   - No framework imports. No side effects.
 *   - Safe to import from any surface (server, client, tests).
 *
 * Color palette:
 *   black      #050505   page base
 *   charcoal   #0B0B0B   ambient / strata surface
 *   panel      #111111   primary card surface
 *   panel2     #0D0B07   secondary card / alt dark
 *   gold       #D4A017   primary accent (Tailwind gold-400)
 *   goldSoft   #FFD566   hover / active highlight (gold-200)
 *   goldDeep   #9A720F   deep edge / shadow tint (gold-600)
 *   ruby       #C1272D   urgency / direct-action accent (ruby-400)
 *   rubyDeep   #8B0000   ruby shadow
 *   cyan       #00CFEA   AI status only — use sparingly
 *   offWhite   #F4F4F4   primary body text
 *   cream      #F5F0E8   warm heading text (Tailwind cream)
 *   slate300   #CBD5E1   secondary body text
 *   slate400   #94A3B8   supporting / tertiary text
 *   slate500   #64748B   subdued / meta text
 *   slate600   #475569   compliance / legal text
 */

// ---------------------------------------------------------------------------
// Raw color values (for inline styles where Tailwind can't be purge-safe)
// ---------------------------------------------------------------------------

export const colors = {
  black:      "#050505",
  charcoal:   "#0B0B0B",
  panel:      "#111111",
  panel2:     "#0D0B07",
  panelDark:  "#0A0A0A",
  pageBg:     "#080806",
  gold:       "#D4A017",
  goldSoft:   "#FFD566",
  goldDeep:   "#9A720F",
  ruby:       "#C1272D",
  rubyDeep:   "#8B0000",
  cyan:       "#00CFEA",
  offWhite:   "#F4F4F4",
  cream:      "#F5F0E8",
  bodyText:   "#F7F1E8",
} as const;

// ---------------------------------------------------------------------------
// Semantic shadow tokens
// ---------------------------------------------------------------------------

export const shadows = {
  cardDeep:  "0 24px 60px -32px rgba(0,0,0,0.85)",
  cardMid:   "0 12px 40px -20px rgba(0,0,0,0.70)",
  goldGlow:  "0 0 28px rgba(212,160,23,0.18)",
  goldLift:  "0 18px 40px -12px rgba(212,160,23,0.50)",
  rubyGlow:  "0 0 24px rgba(193,39,45,0.18)",
  none:      "none",
} as const;

// ---------------------------------------------------------------------------
// Border tokens
// ---------------------------------------------------------------------------

export const borders = {
  subtleDark:   "1px solid rgba(255,255,255,0.06)",
  subtleMid:    "1px solid rgba(255,255,255,0.09)",
  goldFaint:    "1px solid rgba(212,160,23,0.12)",
  goldSoft:     "1px solid rgba(212,160,23,0.25)",
  goldActive:   "1px solid rgba(212,160,23,0.45)",
  rubyFaint:    "1px solid rgba(193,39,45,0.20)",
  white10:      "1px solid rgba(255,255,255,0.10)",
} as const;

// ---------------------------------------------------------------------------
// Typography scale (Tailwind class strings)
// ---------------------------------------------------------------------------

export const type = {
  // Display headings — Playfair Display
  displayXl:  "font-display text-6xl sm:text-7xl lg:text-8xl font-bold leading-[0.95]",
  displayLg:  "font-display text-5xl sm:text-6xl font-bold leading-tight",
  displayMd:  "font-display text-4xl sm:text-5xl font-semibold leading-tight",
  displaySm:  "font-display text-3xl font-semibold leading-snug",

  // Metric numbers — Bebas Neue
  metricXl:   "font-bebas text-5xl leading-none tracking-wider",
  metricLg:   "font-bebas text-4xl leading-none",
  metricMd:   "font-bebas text-3xl leading-none",
  metricSm:   "font-bebas text-2xl leading-none",

  // Body — Inter
  bodyLg:     "text-lg leading-relaxed font-light",
  bodyBase:   "text-base leading-relaxed",
  bodySm:     "text-sm leading-relaxed",
  bodyXs:     "text-xs leading-relaxed",

  // Labels / kickers
  label:      "text-[10.5px] font-semibold tracking-[0.18em] uppercase",
  labelGold:  "text-[10.5px] font-semibold tracking-[0.18em] uppercase text-gold-400",
  kicker:     "text-xs font-semibold tracking-[0.22em] uppercase text-gold-400",
  kickerSlate:"text-[11px] tracking-[0.16em] uppercase text-slate-400",
  mono:       "font-mono text-[11px] tabular-nums",
} as const;

// ---------------------------------------------------------------------------
// Surface / card tokens
// ---------------------------------------------------------------------------

export const surface = {
  // Standard dark glass card
  card:
    "rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4",
  cardLg:
    "rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-6",
  cardGold:
    "rounded-xl border border-gold-400/20 bg-gold-400/[0.04] px-5 py-4",
  // Deep dark panel
  panel:
    "rounded-2xl border border-white/[0.08] bg-[#111111]/85 backdrop-blur-sm",
  // Step card (intake / embed)
  stepCard:
    "rounded-2xl border border-white/10 bg-[#111111]/92 backdrop-blur-sm p-6 sm:p-8 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.85)]",
  // Glass morphism
  glass:
    "bg-[rgba(10,10,10,0.72)] backdrop-blur-[24px] border border-white/[0.07]",
  glassGold:
    "bg-[rgba(212,160,23,0.05)] backdrop-blur-[20px] border border-gold-400/18",
  // Command center section card (admin)
  commandCard:
    "rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4",
  commandWarn:
    "rounded-xl border border-amber-400/40 bg-amber-400/[0.05] px-5 py-4",
  commandOk:
    "rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] px-5 py-4",
  commandRuby:
    "rounded-xl border border-ruby-400/30 bg-ruby-400/[0.04] px-5 py-4",
} as const;

// ---------------------------------------------------------------------------
// Button tokens
// ---------------------------------------------------------------------------

export const btn = {
  gold:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-gold-400 px-5 py-2.5 text-sm font-bold text-[#050505] shadow-[0_10px_30px_-10px_rgba(212,175,55,0.55)] transition-all duration-200 hover:bg-gold-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
  goldLg:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gold-400 px-7 py-3.5 text-base font-bold text-[#050505] shadow-[0_18px_40px_-12px_rgba(212,175,55,0.55)] transition-all duration-200 hover:bg-gold-300 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-[#F4F4F4] transition-all duration-200 hover:border-gold-400/40 hover:bg-gold-400/[0.06]",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-[#F4F4F4] hover:bg-white/[0.06]",
  ruby:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-ruby-400 px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(193,39,45,0.40)] transition-all duration-200 hover:bg-ruby-300 active:scale-[0.98]",
} as const;

// ---------------------------------------------------------------------------
// Eyebrow / badge tokens
// ---------------------------------------------------------------------------

export const badge = {
  gold:
    "inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/[0.08] px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-300",
  goldDot:
    "h-1.5 w-1.5 rounded-full bg-gold-400",
  ruby:
    "inline-flex items-center gap-1.5 rounded-full border border-ruby-400/40 bg-ruby-400/[0.10] px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.18em] uppercase text-ruby-200",
  emerald:
    "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-2.5 py-1 text-[10.5px] font-semibold text-emerald-300",
  slate:
    "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-semibold text-slate-400",
  cyan:
    "inline-flex items-center gap-1.5 rounded-full border border-cyan-400/35 bg-cyan-400/[0.06] px-2.5 py-1 text-[11px] tracking-[0.16em] uppercase text-cyan-300",
} as const;

// ---------------------------------------------------------------------------
// Background gradient helpers (inline style values)
// ---------------------------------------------------------------------------

export const gradients = {
  heroMesh: `
    radial-gradient(ellipse 60% 50% at 10% 0%, rgba(212,160,23,0.07) 0%, transparent 65%),
    radial-gradient(ellipse 40% 40% at 90% 80%, rgba(212,160,23,0.04) 0%, transparent 65%)
  `,
  goldMesh: `
    radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212,160,23,0.035) 0%, transparent 70%)
  `,
  sectionFade:
    "linear-gradient(to bottom, transparent, #0A0A0A)",
  goldShimmer:
    "linear-gradient(135deg, #9A720F 0%, #D4A017 25%, #FFD566 50%, #D4A017 75%, #9A720F 100%)",
  pageBg:
    "linear-gradient(160deg, #0A0A0A 0%, #141B24 60%, #1E2633 100%)",
  cardBorder:
    "linear-gradient(135deg, rgba(212,160,23,0.5), rgba(212,160,23,0.05) 40%, rgba(193,39,45,0.2))",
} as const;

// ---------------------------------------------------------------------------
// Animation delay helpers (ms values as strings for inline styles)
// ---------------------------------------------------------------------------

export const animDelay = {
  none:  "0ms",
  xs:    "80ms",
  sm:    "150ms",
  md:    "300ms",
  lg:    "450ms",
  xl:    "600ms",
  "2xl": "750ms",
} as const;

// ---------------------------------------------------------------------------
// URL safety helpers
// ---------------------------------------------------------------------------

const REJECTED_SOCIAL_DOMAINS = [
  "ourtownproperties.com",
  "vercel.app",
  "ask-magic-mike.vercel.app",
] as const;

const APPROVED_CANONICAL_DOMAIN = "askmagicmike.com" as const;

/**
 * Returns true if the URL is safe to use as a primary social sharing URL.
 * OTP domain is blocked for Facebook until Regency/host WAF is resolved.
 */
export function isSocialSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return REJECTED_SOCIAL_DOMAINS.every((d) => !host.includes(d));
  } catch {
    return false;
  }
}

/**
 * Returns true if the URL uses the approved canonical AMM domain.
 */
export function isCanonicalAmmUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().includes(APPROVED_CANONICAL_DOMAIN);
  } catch {
    return false;
  }
}

/**
 * Returns the list of domains that are blocked for social posting.
 */
export function getRejectedSocialDomains(): readonly string[] {
  return REJECTED_SOCIAL_DOMAINS;
}

// ---------------------------------------------------------------------------
// Section header helper
// ---------------------------------------------------------------------------

export function sectionHeaderClasses(size: "sm" | "md" | "lg" = "md") {
  const sizes = {
    sm: "text-[10px] tracking-[0.12em]",
    md: "text-[11px] tracking-[0.10em]",
    lg: "text-[11px] tracking-[0.08em]",
  };
  return `${sizes[size]} font-semibold uppercase text-slate-500`;
}

// ---------------------------------------------------------------------------
// Reduced-motion helper
// ---------------------------------------------------------------------------

/** Class string that disables animation when prefers-reduced-motion is set. */
export const motionSafe = "motion-reduce:animate-none motion-reduce:transition-none" as const;

// ---------------------------------------------------------------------------
// Version tag — used in tests to confirm the module is importable
// ---------------------------------------------------------------------------

export const VISUAL_SYSTEM_VERSION = "1.0.0" as const;
