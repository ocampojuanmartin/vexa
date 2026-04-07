import type { Metadata } from 'next'
import { I18nProvider } from '@/i18n/context'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vexa — Your practice, streamlined',
  description: 'Practice management for law firms',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
