import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: "#0A0A0A",
        charcoal: "#1A1A2E",
        gold: {
          50: "#FFF9E6",
          100: "#FFE599",
          200: "#FFD566",
          300: "#F5C842",
          400: "#D4A017",
          500: "#B8860B",
          600: "#9A6F00",
          700: "#7A5800",
        },
        ruby: {
          50: "#FFF0F0",
          100: "#FFD6D6",
          200: "#FFA8A8",
          300: "#FF7070",
          400: "#C1272D",
          500: "#A01A1F",
          600: "#800E13",
          700: "#600008",
        },
        cream: "#F5F0E8",
        slate: {
          750: "#2A3342",
          850: "#1A2232",
          950: "#0D1117",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body:    ["var(--font-inter)", "system-ui", "sans-serif"],
        bebas:   ["var(--font-bebas)", "Impact", "sans-serif"],
      },
      spacing: {
        "13": "3.25rem",
      },
      transitionDuration: {
        "400": "400ms",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(160deg, #0A0A0A 0%, #141B24 60%, #1E2633 100%)",
        "gold-shimmer":
          "linear-gradient(135deg, #D4A017 0%, #FFD566 50%, #D4A017 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212, 160, 23, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(212, 160, 23, 0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
