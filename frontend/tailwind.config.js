/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        wa: {
          green: '#00a884',
          'green-dark': '#008069',
        }
      },
      animation: {
        'fade-in':    'fadeIn 0.15s ease-out',
        'slide-up':   'slideUp 0.2s ease-out',
        'bounce-dot': 'bounceDot 1.2s infinite ease-in-out',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%':           { transform: 'scale(1)',   opacity: '1'   },
        },
      },
    },
  },
  plugins: [],
};