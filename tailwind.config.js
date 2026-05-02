/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0b1020",
        "surface-soft": "#111831",
        accent: "#4f46e5",
        "accent-soft": "#7c85ff"
      },
      boxShadow: {
        glass: "0 8px 32px rgba(16, 24, 40, 0.25)"
      }
    }
  },
  plugins: []
};
