'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { t } = useI18n()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-vexa-600 tracking-tight">vexa</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('auth.resetYourPassword')}</h2>

        {success ? (
          <div className="text-center">
            <p className="text-sm text-gray-600">{t('auth.resetSent')}</p>
            <Link href="/login" className="inline-block mt-4 text-sm text-vexa-600 hover:text-vexa-700 font-medium">
              {t('auth.login')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="nombre@estudio.com"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600 disabled:opacity-50 transition-colors"
            >
              {loading ? '...' : t('auth.resetPassword')}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-gray-500 mt-4">
        <Link href="/login" className="text-vexa-600 hover:text-vexa-700 font-medium">
          {t('auth.login')}
        </Link>
      </p>
    </div>
  )
}
