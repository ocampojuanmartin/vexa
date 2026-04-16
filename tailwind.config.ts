import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Vexa navy — brand authority. Per ui-ux-pro-max "Trust & Authority" palette.
        vexa: {
          50: '#EEF2F9',
          100: '#D9E0EF',
          200: '#B4C1DE',
          300: '#8EA1CE',
          400: '#6982BD',
          500: '#3182CE',  // legacy accent blue — kept for compatibility
          600: '#1E3A8A',  // primary navy (deeper per skill recommendation)
          700: '#1E40AF',  // secondary
          800: '#17307A',
          900: '#0F1F4C',
          950: '#080F26',
        },
        // Warm canvas neutrals — reduces sterile-white feel.
        canvas: {
          50: '#FAF7F2',
          100: '#F3EEE5',
          200: '#E7E0D2',
          300: '#D6CAB2',
        },
        // Ink — deliberate charcoal.
        ink: {
          900: '#0F172A',  // per skill's #0F172A text color
          700: '#334155',
          500: '#64748B',
          300: '#94A3B8',
        },
        // Accent — burnt amber / bronze for CTAs. Contrasts the navy
        // and pulls the eye without feeling flashy.
        // Per ui-ux-pro-max: CTA color #B45309.
        amber: {
          50: '#FEF7E8',
          100: '#FBEBCC',
          200: '#F6D188',
          300: '#EFAE3E',
          400: '#D98A1E',
          500: '#B45309',  // primary CTA
          600: '#92400E',  // pressed / hover
          700: '#78350F',
        },
        // Muted brass — subtle highlights, eyebrows, separators.
        brass: {
          400: '#C9A96E',
          500: '#B8935B',
          600: '#9A7A47',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'Cambria', '"Times New Roman"', 'ui-serif', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.04)',
        'soft-md': '0 4px 10px -2px rgba(15, 23, 42, 0.07), 0 0 0 1px rgba(15, 23, 42, 0.04)',
        'soft-lg': '0 14px 28px -10px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.04)',
        'amber-glow': '0 0 0 3px rgba(180, 83, 9, 0.15)',
      },
      animation: {
        // Subtle — no circus effects.
        'metric-pulse': 'metric-pulse 2.4s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 500ms cubic-bezier(0.4, 0, 0.2, 1) both',
      },
      keyframes: {
        'metric-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
