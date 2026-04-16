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

    if (error) setError(error.message)
    else setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1 className="wordmark text-5xl text-vexa-600">vexa</h1>
      </div>

      <div className="surface-card rounded-lg p-7 shadow-soft-md">
        <h2 className="font-display text-xl text-ink-900 mb-6 tracking-tight">{t('auth.resetYourPassword')}</h2>

        {success ? (
          <div className="text-center">
            <p className="text-sm text-ink-700 leading-relaxed">{t('auth.resetSent')}</p>
            <Link href="/login" className="inline-block mt-5 text-sm text-vexa-600 hover:text-vexa-700 font-medium">
              {t('auth.login')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-[11px] uppercase tracking-[0.14em] font-medium text-ink-500 mb-1.5">{t('auth.email')}</label>
              <input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 border border-canvas-200 rounded-md text-sm bg-canvas-50/60 focus:bg-white transition-colors"
                placeholder="nombre@estudio.com" />
            </div>

            {error && <p className="text-sm text-red-800 bg-red-50 border border-red-100 px-4 py-2.5 rounded-md">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-vexa-600 text-white rounded-md text-sm font-medium hover:bg-vexa-700 disabled:opacity-50 shadow-soft">
              {loading ? '...' : t('auth.resetPassword')}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-ink-500 mt-6">
        <Link href="/login" className="text-vexa-600 hover:text-vexa-700 font-medium">
          {t('auth.login')}
        </Link>
      </p>
    </div>
  )
}
