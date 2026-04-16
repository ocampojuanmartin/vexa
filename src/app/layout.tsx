import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import { I18nProvider } from '@/i18n/context'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['opsz'],
})

export const metadata: Metadata = {
  title: 'Vexa — De las horas al cobro, sin planillas',
  description: 'Practice management for law firms',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <body className="bg-canvas-50 text-ink-900 font-sans antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
