/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#789946",
          strong: "#526832",
          action: "#627430",
          dark: "#3c5320",
          bg: "#f6f8f2",
          fg: "#1d1d1d",
        },
        rna: {
          DEFAULT: "#156082",
          light: "#dceef4",
          dark: "#0e2841",
        },
        evidence: {
          DEFAULT: "#fec950",
          dark: "#aa820d",
        },
      },
      fontFamily: {
        sans: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [typography],
};
