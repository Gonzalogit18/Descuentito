import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#22d3ee",
          bright: "#00e5ff",
          soft: "rgba(34, 211, 238, 0.15)",
        },
        magenta: "#e879f9",
        glass: {
          DEFAULT: "rgba(255,255,255,0.05)",
          border: "rgba(255,255,255,0.1)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "24px",
        bubble: "16px",
      },
      backdropBlur: {
        glass: "15px",
      },
      boxShadow: {
        glow: "0 0 40px rgba(34, 211, 238, 0.12)",
        "glow-strong": "0 0 30px rgba(34, 211, 238, 0.25)",
        lift: "0 8px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(34, 211, 238, 0.06)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "blink": {
          "0%, 100%": { opacity: "0.25" },
          "50%": { opacity: "1" },
        },
        "hero-in": {
          "0%": { opacity: "0", transform: "translateY(24px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.85" },
        },
        // Soft pulsing glow ring around the focused search bar.
        "focus-pulse": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        // Diagonal sheen sweeping across the loading skeleton.
        shimmer: {
          "0%": { transform: "translateX(-150%)" },
          "100%": { transform: "translateX(150%)" },
        },
        // Caret pulse at the end of streaming text.
        caret: {
          "0%, 45%": { opacity: "1" },
          "55%, 100%": { opacity: "0" },
        },
        // Very slow drift/breathe of the background radial blobs.
        "drift-a": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(4%, 3%, 0) scale(1.08)" },
        },
        "drift-b": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1.05)" },
          "50%": { transform: "translate3d(-5%, -3%, 0) scale(1)" },
        },
        // Faint cyan aurora breathing.
        aurora: {
          "0%, 100%": { opacity: "0.35", transform: "translate3d(-3%, 0, 0)" },
          "50%": { opacity: "0.6", transform: "translate3d(3%, 2%, 0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
        "blink-1": "blink 1.2s infinite 0s",
        "blink-2": "blink 1.2s infinite 0.2s",
        "blink-3": "blink 1.2s infinite 0.4s",
        "hero-in": "hero-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "glow-pulse": "glow-pulse 3.5s ease-in-out infinite",
        "focus-pulse": "focus-pulse 2.4s ease-in-out infinite",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        caret: "caret 1s step-end infinite",
        "drift-a": "drift-a 26s ease-in-out infinite",
        "drift-b": "drift-b 32s ease-in-out infinite",
        aurora: "aurora 24s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
