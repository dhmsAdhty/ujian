/** @type {import('tailwindcss').Config} */
/* Warna & bayangan diselaraskan dengan template Venus (venus/src/theme/colors.ts, palette.ts, shadows.ts) */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx,css}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"DM Sans"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        /* Primary = purple utama Venus */
        primary: {
          50: '#f3f1ff',
          100: '#ebe7ff',
          200: '#d9d2ff',
          300: '#868cff',
          400: '#6b5eff',
          500: '#4318ff',
          600: '#3814d6',
          700: '#2d10ad',
          800: '#240c85',
          900: '#1a0863',
          950: '#12044a',
        },
        /* Skala netral mengikuti nuansa biru-abu Venus (blue + gray dari template) */
        venus: {
          50: '#f4f7fe',
          100: '#e9edf7',
          200: '#dfe5f2',
          300: '#c8d0e8',
          400: '#a3aed0',
          500: '#707eae',
          600: '#2b3674',
          700: '#243060',
          800: '#1e2954',
          900: '#1b2559',
          950: '#0f1433',
        },
        accent: {
          DEFAULT: '#1c6cb7',
          50: '#e8f2fb',
          100: '#c5ddf4',
          500: '#1c6cb7',
          600: '#165a9a',
          700: '#12487c',
        },
        success: {
          DEFAULT: '#05cd99',
          500: '#05cd99',
        },
        danger: {
          DEFAULT: '#e31a1a',
          500: '#e31a1a',
        },
        warning: {
          DEFAULT: '#ffb547',
          500: '#ffb547',
        },
      },
      boxShadow: {
        /* Venus customShadows[0] & menu shadow */
        venus: '0px 18px 40px 0px rgba(112, 144, 176, 0.12)',
        'venus-sm': '2px 2px 10px 0px rgba(10, 10, 10, 0.2)',
        /* Alias untuk kompatibilitas @apply di index.css */
        'ios-sm': '2px 2px 10px 0px rgba(10, 10, 10, 0.12)',
        'ios-md': '0px 18px 40px 0px rgba(112, 144, 176, 0.12)',
        'ios-lg': '0px 18px 40px 0px rgba(112, 144, 176, 0.16)',
      },
      borderRadius: {
        venus: '1.25rem',
      },
      transitionTimingFunction: {
        ios: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'ios-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        250: '250ms',
        350: '350ms',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.45s cubic-bezier(0.25, 0.1, 0.25, 1) both',
        'fade-in': 'fadeIn 0.35s cubic-bezier(0.25, 0.1, 0.25, 1) both',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
