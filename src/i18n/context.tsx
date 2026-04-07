'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { locales, type Locale } from './locales'

type I18nContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  ready: boolean
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('vexa-locale') as Locale
    if (saved && locales[saved]) {
      setLocaleState(saved)
    } else {
      const browserLang = navigator.language.slice(0, 2)
      if (browserLang === 'es') setLocaleState('es')
    }
    setReady(true)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('vexa-locale', newLocale)
  }, [])

  const t = useCallback(
    (key: string) => locales[locale][key] || key,
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, ready }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used within I18nProvider')
  return context
}