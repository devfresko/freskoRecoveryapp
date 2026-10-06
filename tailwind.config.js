/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0E7C86',
          dark: '#075E66',
          light: '#E6F5F5',
          red: '#E53935',
        },
      },
    },
  },
  plugins: [],
}
