'use client'

import Link from 'next/link'
import { useI18n } from '@/i18n/context'

export default function RegisterPage() {
  const { locale } = useI18n()
  const es = locale === 'es'
  return (
    <div className="w-full max-w-sm text-center">
      <h1 className="wordmark text-5xl text-vexa-600">vexa</h1>
      <div className="mt-8 surface-card rounded-lg p-7 shadow-soft">
        <p className="text-sm text-ink-700 leading-relaxed">
          {es
            ? 'Las cuentas son creadas por el administrador de tu estudio. Contactá a tu administrador para obtener acceso.'
            : 'Accounts are created by your firm administrator. Contact your admin to get access.'}
        </p>
      </div>
      <p className="text-xs text-ink-500 mt-6">
        <Link href="/login" className="text-vexa-600 hover:text-vexa-700 font-medium">
          {es ? 'Volver al login' : 'Back to login'}
        </Link>
      </p>
    </div>
  )
}
