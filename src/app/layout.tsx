import type { Metadata } from 'next'
import { I18nProvider } from '@/i18n/context'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vexa — Your practice, streamlined',
  description: 'Practice management for law firms',
}

// Runs before React hydrates so the dark class is set on <html> on first paint.
// No flash when reloading a page while dark mode is active.
const themeInitScript = `(()=>{try{
  var s=localStorage.getItem('vexa-theme');
  var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  if(d)document.documentElement.classList.add('dark');
}catch(e){}})();`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="text-gray-900">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
