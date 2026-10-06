import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: "#14261c",
        leaf: "#1f7a45",
        lime: "#d6f26a",
        paper: "#f4f1ea",
        sand: "#e7e1d4",
        indigo: {
          50: "#f3f8f1",
          100: "#e4f0df",
          200: "#c6e1bb",
          300: "#98c88c",
          400: "#62aa58",
          500: "#3b8d3f",
          600: "#1f7a45",
          700: "#186338",
          800: "#154f2e",
          900: "#123f27",
          950: "#0b2417",
        },
        primary: {
          50: "#f3f8f1",
          100: "#e4f0df",
          200: "#c6e1bb",
          300: "#98c88c",
          400: "#62aa58",
          500: "#3b8d3f",
          600: "#1f7a45",
          700: "#186338",
          800: "#154f2e",
          900: "#123f27",
          DEFAULT: "#1f7a45",
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card: "0 18px 50px -28px rgba(20, 38, 28, 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
