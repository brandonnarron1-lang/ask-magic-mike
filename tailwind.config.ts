import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs:    "420px",
      sm:    "640px",
      md:    "768px",
      lg:    "1024px",
      xl:    "1280px",
      "2xl": "1536px",
    },
    extend: {
      // ── Color system ──────────────────────────────────────────────────────
      colors: {
        midnight: "#0A0A0A",
        charcoal: "#1A1A2E",
        ink: {
          950: "#050505",
          900: "#080806",
          850: "#0A0A0A",
          800: "#0B0B0B",
          750: "#0D0B07",
          700: "#111111",
          600: "#161616",
          500: "#1E1E1E",
          400: "#282828",
          300: "#333333",
          200: "#444444",
          100: "#666666",
        },
        gold: {
          50:  "#FFF9E6",
          100: "#FFE599",
          200: "#FFD566",
          300: "#F5C842",
          400: "#D4A017",
          500: "#B8860B",
          600: "#9A6F00",
          700: "#7A5800",
          800: "#5C4200",
          900: "#3D2C00",
        },
        ruby: {
          50:  "#FFF0F0",
          100: "#FFD6D6",
          200: "#FFA8A8",
          300: "#FF7070",
          400: "#C1272D",
          500: "#A01A1F",
          600: "#800E13",
          700: "#600008",
          800: "#420005",
          900: "#280002",
        },
        cream:    "#F5F0E8",
        offwhite: "#F4F4F4",
        slate: {
          750: "#2A3342",
          850: "#1A2232",
          950: "#0D1117",
        },
        warm: {
          50:  "#FDFAF5",
          100: "#F9F4EA",
          200: "#F2E8D0",
          300: "#E8D9B5",
          400: "#D4C49A",
          500: "#BFAA7F",
          600: "#A08A5A",
          700: "#806C40",
          800: "#5C4D28",
          900: "#3A3018",
        },
        cyan: {
          DEFAULT: "#00CFEA",
          dim:     "rgba(0,207,234,0.15)",
          soft:    "rgba(0,207,234,0.30)",
        },
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body:    ["var(--font-inter)", "system-ui", "sans-serif"],
        bebas:   ["var(--font-bebas)", "Impact", "sans-serif"],
        mono:    ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      lineHeight: {
        "hero":    "0.90",
        "display": "0.95",
        "tight":   "1.05",
        "snug":    "1.20",
        "normal":  "1.45",
        "relaxed": "1.65",
        "loose":   "1.85",
      },
      letterSpacing: {
        tighter:  "-0.04em",
        tight:    "-0.025em",
        snug:     "-0.01em",
        normal:   "0em",
        wide:     "0.025em",
        wider:    "0.06em",
        widest:   "0.12em",
        label:    "0.18em",
        kicker:   "0.22em",
        spaced:   "0.30em",
      },

      // ── Spacing ───────────────────────────────────────────────────────────
      spacing: {
        "13":  "3.25rem",
        "18":  "4.5rem",
        "112": "28rem",
        "128": "32rem",
        "144": "36rem",
        "160": "40rem",
      },
      maxWidth: {
        "content": "72rem",
        "text":    "52rem",
        "narrow":  "38rem",
        "wide":    "88rem",
      },

      // ── Border radius ─────────────────────────────────────────────────────
      borderRadius: {
        "xs":  "3px",
        "sm":  "6px",
        "md":  "10px",
        "xl":  "16px",
        "2xl": "20px",
        "3xl": "28px",
        "4xl": "40px",
        "pill": "9999px",
      },

      // ── Shadows / Elevation ───────────────────────────────────────────────
      boxShadow: {
        // Elevation scale
        "z0": "none",
        "z1": "0 1px 3px rgba(0,0,0,0.50), 0 1px 2px rgba(0,0,0,0.35)",
        "z2": "0 4px 12px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.40)",
        "z3": "0 8px 24px rgba(0,0,0,0.60), 0 4px 8px rgba(0,0,0,0.45)",
        "z4": "0 16px 40px rgba(0,0,0,0.65), 0 8px 16px rgba(0,0,0,0.50)",
        "z5": "0 24px 60px rgba(0,0,0,0.75), 0 12px 24px rgba(0,0,0,0.55)",
        "z6": "0 40px 80px rgba(0,0,0,0.85), 0 20px 40px rgba(0,0,0,0.60)",
        // Card variants
        "card":      "0 4px 24px -8px rgba(0,0,0,0.70), 0 2px 8px rgba(0,0,0,0.35)",
        "card-deep": "0 24px 60px -32px rgba(0,0,0,0.85), 0 8px 20px rgba(0,0,0,0.50)",
        "card-lift": "0 32px 64px -16px rgba(0,0,0,0.80), 0 16px 32px rgba(0,0,0,0.55)",
        // Gold glows
        "gold-xs":   "0 0 8px rgba(212,160,23,0.20)",
        "gold-sm":   "0 0 16px rgba(212,160,23,0.25)",
        "gold-md":   "0 0 28px rgba(212,160,23,0.30)",
        "gold-lg":   "0 0 48px rgba(212,160,23,0.35)",
        "gold-xl":   "0 0 80px rgba(212,160,23,0.40)",
        "gold-lift": "0 18px 40px -12px rgba(212,160,23,0.55)",
        "gold-cta":  "0 10px 30px -10px rgba(212,175,55,0.55)",
        "gold-halo": "0 0 120px rgba(212,160,23,0.20), 0 0 60px rgba(212,160,23,0.12)",
        // Ruby glows
        "ruby-xs": "0 0 8px rgba(193,39,45,0.20)",
        "ruby-md": "0 0 24px rgba(193,39,45,0.28)",
        "ruby-lg": "0 0 48px rgba(193,39,45,0.35)",
        // Cyan glows
        "cyan-xs": "0 0 8px rgba(0,207,234,0.15)",
        "cyan-md": "0 0 24px rgba(0,207,234,0.22)",
        // Inset accents
        "inset-gold":  "inset 0 1px 0 rgba(212,160,23,0.15)",
        "inset-white": "inset 0 1px 0 rgba(255,255,255,0.06)",
      },

      // ── Backdrop blur ─────────────────────────────────────────────────────
      backdropBlur: {
        "xs":  "4px",
        "sm":  "8px",
        "md":  "16px",
        "lg":  "24px",
        "xl":  "40px",
        "2xl": "64px",
        "3xl": "80px",
      },

      // ── Z-index semantic ──────────────────────────────────────────────────
      zIndex: {
        "below":        "-1",
        "raised":       "10",
        "dropdown":    "100",
        "sticky":      "200",
        "overlay":     "300",
        "modal":       "400",
        "notification": "500",
        "tooltip":     "600",
        "command":     "700",
        "supreme":    "9999",
      },

      // ── Transitions ───────────────────────────────────────────────────────
      transitionDuration: {
        "0":    "0ms",
        "80":   "80ms",
        "150":  "150ms",
        "250":  "250ms",
        "350":  "350ms",
        "400":  "400ms",
        "500":  "500ms",
        "600":  "600ms",
        "700":  "700ms",
        "800":  "800ms",
        "1000": "1000ms",
        "1200": "1200ms",
      },
      transitionTimingFunction: {
        "luxury":    "cubic-bezier(0.22,1,0.36,1)",
        "spring":    "cubic-bezier(0.34,1.56,0.64,1)",
        "swift":     "cubic-bezier(0.55,0,0.1,1)",
        "cinematic": "cubic-bezier(0.76,0,0.24,1)",
        "entrance":  "cubic-bezier(0.0,0.0,0.2,1.0)",
        "exit":      "cubic-bezier(0.4,0.0,1,1)",
        "emphasis":  "cubic-bezier(0.3,0,0,1)",
        "snap":      "cubic-bezier(0.85,0,0.15,1)",
      },

      // ── Animations ────────────────────────────────────────────────────────
      animation: {
        "fade-in":    "fadeIn 0.5s ease-in-out",
        "slide-up":   "slideUp 0.4s ease-out",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
        // Luxury motion system
        "fade-up":     "fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) forwards",
        "fade-down":   "fadeDown 0.8s cubic-bezier(0.22,1,0.36,1) forwards",
        "scale-in":    "scaleIn 0.7s cubic-bezier(0.22,1,0.36,1) forwards",
        "scale-out":   "scaleOut 0.4s cubic-bezier(0.76,0,0.24,1) forwards",
        "slide-left":  "slideLeft 0.8s cubic-bezier(0.22,1,0.36,1) forwards",
        "slide-right": "slideRight 0.8s cubic-bezier(0.22,1,0.36,1) forwards",
        "slide-down":  "slideDown 0.6s cubic-bezier(0.22,1,0.36,1) forwards",
        "blur-in":     "blurIn 0.8s cubic-bezier(0.22,1,0.36,1) forwards",
        "count-up":    "countUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards",
        "ticker":      "ticker 30s linear infinite",
        "float":       "floatY 4s ease-in-out infinite",
        "glow-border": "glowBorder 4s ease-in-out infinite",
        "glow-pulse":  "glowPulse 3s ease-in-out infinite",
        "shimmer":     "shimmer 4s ease-in-out infinite",
        "rotate-mesh": "rotateMesh 20s linear infinite",
        "ripple":      "ripple 0.6s cubic-bezier(0.22,1,0.36,1) forwards",
        "reveal-clip": "revealClip 0.9s cubic-bezier(0.22,1,0.36,1) forwards",
        "gold-sweep":  "goldSweep 2s cubic-bezier(0.22,1,0.36,1) forwards",
        "noise-move":  "noiseMove 8s steps(4) infinite",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212,160,23,0.4)" },
          "50%":      { boxShadow: "0 0 0 8px rgba(212,160,23,0)" },
        },
        fadeUp: {
          "from": { opacity: "0", transform: "translateY(32px)" },
          "to":   { opacity: "1", transform: "translateY(0)" },
        },
        fadeDown: {
          "from": { opacity: "0", transform: "translateY(-20px)" },
          "to":   { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "from": { opacity: "0", transform: "scale(0.92) translateY(16px)" },
          "to":   { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        scaleOut: {
          "from": { opacity: "1", transform: "scale(1)" },
          "to":   { opacity: "0", transform: "scale(0.95)" },
        },
        slideLeft: {
          "from": { opacity: "0", transform: "translateX(-40px)" },
          "to":   { opacity: "1", transform: "translateX(0)" },
        },
        slideRight: {
          "from": { opacity: "0", transform: "translateX(40px)" },
          "to":   { opacity: "1", transform: "translateX(0)" },
        },
        slideDown: {
          "from": { opacity: "0", transform: "translateY(-16px)" },
          "to":   { opacity: "1", transform: "translateY(0)" },
        },
        blurIn: {
          "from": { opacity: "0", filter: "blur(12px)", transform: "scale(1.02)" },
          "to":   { opacity: "1", filter: "blur(0)",   transform: "scale(1)" },
        },
        countUp: {
          "from": { opacity: "0", transform: "translateY(20px) scale(0.8)" },
          "to":   { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        ticker: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        floatY: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        glowBorder: {
          "0%, 100%": { borderColor: "rgba(212,160,23,0.15)", boxShadow: "none" },
          "50%":      { borderColor: "rgba(212,160,23,0.45)", boxShadow: "0 0 20px rgba(212,160,23,0.12)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 0px 0px rgba(212,160,23,0)" },
          "50%":      { boxShadow: "0 0 28px 6px rgba(212,160,23,0.22)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "0% 50%" },
          "50%":  { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        rotateMesh: {
          "from": { transform: "rotate(0deg)" },
          "to":   { transform: "rotate(360deg)" },
        },
        ripple: {
          "0%":   { opacity: "1", transform: "scale(0)" },
          "100%": { opacity: "0", transform: "scale(2.5)" },
        },
        revealClip: {
          "from": { clipPath: "inset(0 100% 0 0)" },
          "to":   { clipPath: "inset(0 0% 0 0)" },
        },
        goldSweep: {
          "0%":   { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
        noiseMove: {
          "0%":   { transform: "translate(0, 0)" },
          "25%":  { transform: "translate(-2%, 1%)" },
          "50%":  { transform: "translate(1%, -2%)" },
          "75%":  { transform: "translate(2%, 1%)" },
          "100%": { transform: "translate(0, 0)" },
        },
      },

      // ── Background images ─────────────────────────────────────────────────
      backgroundImage: {
        "hero-gradient":   "linear-gradient(160deg, #0A0A0A 0%, #141B24 60%, #1E2633 100%)",
        "gold-shimmer":    "linear-gradient(135deg, #D4A017 0%, #FFD566 50%, #D4A017 100%)",
        "gold-foil":       "linear-gradient(135deg, #9A720F 0%, #D4A017 25%, #FFD566 50%, #D4A017 75%, #9A720F 100%)",
        "mesh-midnight":   "radial-gradient(ellipse 60% 50% at 20% 20%, rgba(212,160,23,0.07) 0%, transparent 70%), radial-gradient(ellipse 40% 60% at 80% 70%, rgba(193,39,45,0.04) 0%, transparent 70%), #0A0A0A",
        "mesh-top-gold":   "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(212,160,23,0.14) 0%, transparent 65%), #0A0A0A",
        "card-border-grad":"linear-gradient(135deg, rgba(212,160,23,0.50), rgba(212,160,23,0.05) 40%, rgba(193,39,45,0.20))",
        "glass-stroke":    "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
        "section-fade":    "linear-gradient(to bottom, transparent, #0A0A0A)",
        "section-rise":    "linear-gradient(to top, transparent, #0A0A0A)",
        "rim-top":         "linear-gradient(to bottom, rgba(212,160,23,0.08), transparent)",
        "rim-bottom":      "linear-gradient(to top, rgba(212,160,23,0.08), transparent)",
        "ambient-gold":    "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(212,160,23,0.14) 0%, transparent 65%)",
        "ambient-ruby":    "radial-gradient(ellipse 60% 40% at 80% 110%, rgba(193,39,45,0.08) 0%, transparent 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
