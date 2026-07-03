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
        // Existing warm-gray palette (keep — many dark: classes depend on it)
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
        // Token-based colors — reference CSS custom properties so light mode is a future :root swap
        surface: {
          0: 'var(--bg)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        edge: {
          DEFAULT: 'var(--border)',
          2: 'var(--border-2)',
        },
        ink: {
          DEFAULT: 'var(--text)',
          body: 'var(--body)',
          muted: 'var(--muted)',
        },
        accent: {
          DEFAULT: 'var(--purple)',
          light: 'var(--purple-l)',
          pink: 'var(--pink)',
        },
      },
      boxShadow: {
        'lv1':      'var(--shadow-1)',
        'lv2':      'var(--shadow-2)',
        'lv2-h':    'var(--shadow-2h)',
        'lv3':      'var(--shadow-3)',
        'glow':     '0 0 20px var(--glow)',
        'glow-lg':  '0 0 40px var(--glow)',
      },
    },
  },
  plugins: [typography],
  darkMode: 'class',
}
export default config
