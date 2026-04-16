'use client'

import Link from 'next/link'
import { useI18n } from '@/i18n/context'

export default function RegisterPage() {
  const { locale } = useI18n()
  const es = locale === 'es'
  return (
    <div className="w-full max-w-sm text-center">
      <h1 className="text-3xl font-bold text-vexa-600 tracking-tight">vexa</h1>
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <p className="text-sm text-gray-600">
          {es ? 'Las cuentas son creadas por el administrador de tu estudio. Contactá a tu administrador para obtener acceso.' : 'Accounts are created by your firm administrator. Contact your admin to get access.'}
        </p>
      </div>
      <p className="text-center text-sm text-gray-500 mt-4">
        <Link href="/login" className="text-vexa-600 hover:text-vexa-700 font-medium">
          {es ? 'Volver al login' : 'Back to login'}
        </Link>
      </p>
    </div>
  )
}
