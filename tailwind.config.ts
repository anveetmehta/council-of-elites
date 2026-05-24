import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Light editorial palette — warm cream + ink ────────────────────
        // Layered surfaces so cards feel lifted off the page without harsh contrast
        surface: {
          DEFAULT: "#FBFAF6",      // page background — warm cream
          raised: "#FFFFFF",        // cards lift off the background
          overlay: "#F4F1E9",       // hover / muted surface
          border: "#E5E0D2",        // subtle warm border
          strong: "#D6CFBE",        // emphasized border
        },
        accent: {
          DEFAULT: "#6D5BE3",       // refined indigo — pops on cream without screaming
          hover: "#5E4DD0",
          muted: "#EDEAFB",         // light accent bg for chips/badges
          border: "#C4BCF4",
        },
        text: {
          primary: "#1A1815",       // warm near-black
          secondary: "#544E44",     // warm slate
          muted: "#8A847A",         // lighter warm gray
        },
        role: {
          advocate: "#15803D",
          "advocate-bg": "#DCFCE7",
          "advocate-border": "#86EFAC",
          critic: "#B91C1C",
          "critic-bg": "#FEE2E2",
          "critic-border": "#FCA5A5",
          moderator: "#6D28D9",
          "moderator-bg": "#EDE9FE",
          "moderator-border": "#C4B5FD",
          questioner: "#1D4ED8",
          "questioner-bg": "#DBEAFE",
          "questioner-border": "#93C5FD",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument-serif)", "Fraunces", "Georgia", "serif"],
      },
      animation: {
        "cursor-blink": "blink 1s step-end infinite",
        "fade-up": "fadeUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
