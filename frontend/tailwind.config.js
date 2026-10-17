/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#14243A",
          dark: "#0B1728",
          light: "#1F3554",
          border: "#223956"
        },
        royal: {
          DEFAULT: "#356AE6",
          hover: "#2557CE",
          light: "#EDF2FD"
        },
        teal: {
          DEFAULT: "#16A6A1",
          light: "#E8F8F7",
          dark: "#0E7672"
        },
        ivory: "#F7F8FA",
        surface: "#FFFFFF",
        "border-subtle": "#E2E8F0"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
}
