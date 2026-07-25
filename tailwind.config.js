/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#7c3aed",
          light: "#8b5cf6",
          dark: "#6d28d9",
        },
      },
    },
  },
  plugins: [],
};
