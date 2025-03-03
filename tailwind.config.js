/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./src/assets/*.css"  // Make sure this includes your CSS files
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [
    function ({ addBase }) {
      addBase({
        'button': {
          '@apply select-none': {}
        },
      })
    },
    function({ matchVariant }) {
      // Creates a variant that only applies when another specific class exists
      // Usage: "has-class-[valid]:border-green-500"
      matchVariant(
        'has-class',
        (value) => {
          return `&.${value}`
        }
      )
    }
  ],
} 