import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
      },
      animation: {
        shake: 'shake 0.35s ease-in-out',
      },
      colors: {
        gray: {
          50:  '#f8f7f6',
          100: '#f0eeec',
          200: '#e2deda',
          300: '#c8c2bc',
          400: '#9e9690',
          500: '#6e6560',
          600: '#4a4240',
          700: '#322d2a',
          800: '#231f1c',
          900: '#161412',
          950: '#0a0908',
        },
      },
    },
  },
  plugins: [typography],
  darkMode: 'class',
}
export default config
