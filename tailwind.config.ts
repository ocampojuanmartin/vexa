import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        vexa: {
          50: '#f7fafc',
          100: '#e2e8f0',
          200: '#cbd5e1',
          300: '#94a3b8',
          400: '#718096',
          500: '#3182ce',
          600: '#1a365d',
          700: '#152d4f',
          800: '#0f2440',
          900: '#0a1929',
          950: '#060f1a',
        }
      }
    },
  },
  plugins: [],
}
export default config
