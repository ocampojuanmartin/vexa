import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Vexa brand — navy + action blue. Kept for backward compat.
        vexa: {
          50: '#f7fafc',
          100: '#e2e8f0',
          200: '#cbd5e1',
          300: '#94a3b8',
          400: '#718096',
          500: '#3182ce', // action blue — CTAs / primary actions
          600: '#1a365d', // navy — authority
          700: '#152d4f',
          800: '#0f2440',
          900: '#0a1929',
          950: '#060f1a',
        },
        // Warm canvas neutrals — the editorial surface.
        canvas: {
          50: '#FAF7F2', // base — replaces bg-gray-50
          100: '#F3EEE5', // subtle sections
          200: '#E7E0D2', // warm borders
          300: '#D6CAB2',
        },
        // Ink scale — deliberate charcoal, not pure black.
        ink: {
          900: '#1F2937',
          700: '#374151',
          500: '#6B7280',
          300: '#9CA3AF',
        },
        // Muted gold — status accents, subtle highlights.
        brass: {
          400: '#C9A96E',
          500: '#B8935B',
          600: '#9A7A47',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'ui-serif', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Softer, warmer shadows than the default.
        'soft': '0 1px 2px rgba(24, 30, 50, 0.04), 0 0 0 1px rgba(24, 30, 50, 0.03)',
        'soft-md': '0 4px 8px -2px rgba(24, 30, 50, 0.06), 0 0 0 1px rgba(24, 30, 50, 0.04)',
        'soft-lg': '0 12px 24px -8px rgba(24, 30, 50, 0.08), 0 0 0 1px rgba(24, 30, 50, 0.04)',
      },
    },
  },
  plugins: [],
}
export default config
