/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zoom: {
          blue: '#2D8CFF',
          dark: '#0B5CFF',
        },
      },
    },
  },
  plugins: [],
}
