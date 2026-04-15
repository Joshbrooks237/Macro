import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        macro: {
          bg: "#0c0f14",
          ink: "#e8eaed",
          surface: "#141922",
          border: "#2a3140",
          muted: "#8b95a8",
          accent: "#3b82f6",
          glow: "#1a2744",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "macro-radial":
          "radial-gradient(ellipse 120% 80% at 50% -20%, #1a2744, #0c0f14)",
      },
    },
  },
  plugins: [],
};
export default config;
