/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#1a472a', light: '#2d6a4f', glow: '#52b788' },
        cream:     { DEFAULT: '#faf7f2', dark: '#e9e0d0' },
        charcoal:  { DEFAULT: '#1c1c1e' },
      },
      fontFamily: {
        heading: ['Playfair Display', 'serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        'card':    '0 4px 24px rgba(0,0,0,0.06)',
        'hover':   '0 12px 40px rgba(26,71,42,0.15)',
        'glow':    '0 0 40px rgba(82,183,136,0.3)',
        'deep':    '0 25px 60px rgba(0,0,0,0.15)',
        '3d':      '0 25px 60px rgba(26,71,42,0.18)',
      },
      animation: {
        'float':      'float 4s ease-in-out infinite',
        'fade-up':    'fadeUp 0.7s ease forwards',
        'shimmer':    'shimmer 1.5s infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow':  'spin 8s linear infinite',
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand':  'linear-gradient(135deg, #1a472a, #52b788)',
        'gradient-hero':   'linear-gradient(160deg, #0d2b18 0%, #1a472a 50%, #2d6a4f 100%)',
      }
    }
  },
  plugins: [],
}

