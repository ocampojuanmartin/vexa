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
        <h1 className="text-4xl font-bold text-vexa-600 tracking-tight">vexa</h1>
        <p className="text-sm text-gray-400 mt-2">{t('auth.tagline')}</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('auth.signInWith')}</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('auth.email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:bg-white" placeholder="nombre@estudio.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('auth.password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:bg-white" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-vexa-600 text-white rounded-xl text-sm font-semibold hover:bg-vexa-700 disabled:opacity-50 transition-colors shadow-sm shadow-vexa-600/20">
            {loading ? '...' : t('auth.login')}
          </button>
        </form>
        <div className="mt-5 text-center">
          <Link href="/reset-password" className="text-sm text-gray-400 hover:text-vexa-600 transition-colors">{t('auth.forgotPassword')}</Link>
        </div>
      </div>
      <p className="text-center text-sm text-gray-400 mt-6">
        {t('auth.noAccount')}{' '}
        <Link href="/register" className="text-vexa-600 hover:text-vexa-700 font-medium">{t('auth.register')}</Link>
      </p>
    </div>
  )
}
