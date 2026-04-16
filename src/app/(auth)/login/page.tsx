'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { t } = useI18n()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/'); router.refresh() }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1 className="wordmark text-5xl text-vexa-600">vexa</h1>
        <p className="text-[13px] text-ink-500 mt-3 italic font-display">{t('auth.tagline')}</p>
      </div>
      <div className="surface-card rounded-lg p-8 shadow-soft-md">
        <h2 className="font-display text-xl text-ink-900 mb-6 tracking-tight">{t('auth.signInWith')}</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-[11px] uppercase tracking-[0.14em] font-medium text-ink-500 mb-1.5">{t('auth.email')}</label>
            <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 border border-canvas-200 rounded-md text-sm bg-canvas-50/60 focus:bg-white transition-colors"
              placeholder="nombre@estudio.com" />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-[11px] uppercase tracking-[0.14em] font-medium text-ink-500 mb-1.5">{t('auth.password')}</label>
            <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-2.5 border border-canvas-200 rounded-md text-sm bg-canvas-50/60 focus:bg-white transition-colors" />
          </div>
          {error && <p className="text-sm text-red-800 bg-red-50 border border-red-100 px-4 py-2.5 rounded-md">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-vexa-600 text-white rounded-md text-sm font-medium hover:bg-vexa-700 disabled:opacity-50 shadow-soft">
            {loading ? '...' : t('auth.login')}
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link href="/reset-password" className="text-xs text-ink-500 hover:text-vexa-600 transition-colors">{t('auth.forgotPassword')}</Link>
        </div>
      </div>
      <p className="text-center text-xs text-ink-500 mt-6">
        {t('auth.noAccount')}{' '}
        <Link href="/register" className="text-vexa-600 hover:text-vexa-700 font-medium">{t('auth.register')}</Link>
      </p>
    </div>
  )
}
