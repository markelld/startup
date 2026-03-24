/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        green: { DEFAULT: 'var(--color-green)', 400: 'var(--color-green)', 500: 'var(--color-green-500)' },
        blue:  { DEFAULT: '#4A9EFF', 400: '#4A9EFF', 500: '#2B86F5' },
        red:   { DEFAULT: '#FF4D6A', 400: '#FF4D6A', 500: '#E63354' },
        amber: { DEFAULT: '#F5A623', 400: '#F5A623', 500: '#D98E0A' },
        purple:{ DEFAULT: '#9B6FFF', 400: '#9B6FFF', 500: '#7B4FDF' },
        surface: {
          DEFAULT: 'var(--surface)',
          50: 'var(--surface-50)',
          100: 'var(--surface-100)',
          200: 'var(--surface-200)',
          900: 'var(--surface-900)',
        },
        border: 'var(--color-border)',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
