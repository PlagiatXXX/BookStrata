import type { Config } from "tailwindcss"

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        "primary": "#bf00e6",
        "background-light": "#f8f5f8",
        "background-dark": "#200f23",
        "surface-dark": "#2a162e",
        "surface-border": "#44204b",
        "text": "var(--text-color)",
        "accent-blue": "#0ea5e9",
        "accent-green": "#22c55e",
        "accent-orange": "#f97316",
        "accent-purple": "#a855f7",
        "accent-pink": "#ec4899",
        "accent-red": "#ef4444",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config
