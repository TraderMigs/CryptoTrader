import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Space Grotesk'", "sans-serif"],
      },
      colors: {
        surface: "#0d0d0f",
        card: "#13131a",
        border: "#1e1e2e",
        accent: "#00ff88",
        accentDim: "#00cc6a",
        muted: "#4a4a6a",
        textPrimary: "#e8e8f0",
        textSecondary: "#8888aa",
        win: "#00ff88",
        loss: "#ff4466",
        neutral: "#8888aa",
      },
      animation: {
        pulse_dot: "pulse_dot 2s ease-in-out infinite",
        fadeIn: "fadeIn 0.6s ease forwards",
        slideUp: "slideUp 0.5s ease forwards",
      },
      keyframes: {
        pulse_dot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.85)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
