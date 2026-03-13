/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        sans: ['Manrope', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        sage: '#6B8E62',
        sand: '#E8D8C3',
        clay: '#C98A7D',
        cream: '#F7F3EE',
      },
    },
  },
  plugins: [],
}

