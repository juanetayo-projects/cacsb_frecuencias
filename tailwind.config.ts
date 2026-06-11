import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Azul CACSB (del logo)
        cacsb: {
          50:  '#e8f0fa',
          100: '#c5d8f3',
          200: '#9fbdea',
          300: '#79a2e1',
          400: '#5d8dda',
          500: '#4178d3',
          600: '#2e6db4',   // azul secundario
          700: '#1a4a7a',   // azul primario (logo)
          800: '#123560',
          900: '#0a2040',
        },
        // Estados de cumplimiento
        cumplimiento: {
          ok:    '#1a4a7a',   // azul — >= 100%
          alert: '#b02020',   // rojo  — < 100%
          okBg:  '#e8f0fa',
          alertBg: '#fde8e8',
        },
      },
      boxShadow: {
        'card':     '0 1px 3px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)',
        'card-md':  '0 4px 8px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)',
        'card-lg':  '0 8px 16px rgba(0,0,0,0.12), 0 16px 32px rgba(0,0,0,0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
