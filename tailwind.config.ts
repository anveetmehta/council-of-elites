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
        surface: {
          DEFAULT: "#0F0F0F",
          raised: "#171717",
          overlay: "#1F1F1F",
          border: "#2A2A2A",
        },
        accent: {
          DEFAULT: "#A78BFA",
          hover: "#C4B5FD",
          muted: "#4C3D6B",
        },
        text: {
          primary: "#F5F5F5",
          secondary: "#A3A3A3",
          muted: "#525252",
        },
        role: {
          advocate: "#16A34A",
          "advocate-bg": "#052E16",
          "advocate-border": "#166534",
          critic: "#DC2626",
          "critic-bg": "#450A0A",
          "critic-border": "#991B1B",
          moderator: "#7C3AED",
          "moderator-bg": "#2E1065",
          "moderator-border": "#5B21B6",
          questioner: "#2563EB",
          "questioner-bg": "#172554",
          "questioner-border": "#1D4ED8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument-serif)", "Lora", "Georgia", "serif"],
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
