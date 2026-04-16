import type { Metadata } from 'next'
import { Lato, EB_Garamond } from 'next/font/google'
import { I18nProvider } from '@/i18n/context'
import './globals.css'

// Body — Lato: humanist sans, high legibility, professional
const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-sans',
  display: 'swap',
})

// Display — EB Garamond: classic serif with legal/contract gravitas
const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Vexa — De las horas al cobro, sin planillas',
  description: 'Practice management software for law firms',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lato.variable} ${garamond.variable}`} suppressHydrationWarning>
      <body className="bg-canvas-50 text-ink-900 font-sans antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
