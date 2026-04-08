'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { Clock, Briefcase, FileText, AlertCircle } from 'lucide-react'

export default function DashboardPage() {
  const { t, locale } = useI18n()
  const es = locale === 'es'
  const [userName, setUserName] = useState('')
  const [hours, setHours] = useState(0)
  const [activeMatters, setActiveMatters] = useState(0)
  const [pendingTs, setPendingTs] = useState(0)
  const [overdue, setOverdue] = useState(0)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: p } = await sb.from('users').select('full_name, role').eq('id', user.id).single()
      if (p) setUserName(p.full_name)

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const today = now.toISOString().slice(0, 10)

      let hq = sb.from('time_entries').select('hours_logged').gte('entry_date', monthStart).lte('entry_date', today)
      if (p?.role === 'associate') hq = hq.eq('user_id', user.id)
      const { data: hrs } = await hq
      if (hrs) setHours(hrs.reduce((s: number, h: any) => s + h.hours_logged, 0))

      const { count: mc } = await sb.from('matters').select('id', { count: 'exact', head: true }).eq('status', 'active')
      if (mc !== null) setActiveMatters(mc)

      if (p?.role !== 'associate') {
        const { count: tc } = await sb.from('timesheets').select('id', { count: 'exact', head: true }).in('status', ['draft', 'sent'])
        if (tc !== null) setPendingTs(tc)
        const thirtyAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
        const { count: oc } = await sb.from('timesheets').select('id', { count: 'exact', head: true }).in('status', ['unpaid', 'invoice_issued']).lte('updated_at', thirtyAgo)
        if (oc !== null) setOverdue(oc)
      }
    }
    load()
  }, [])

  const hrsDisplay = `${Math.floor(hours)}h ${String(Math.round((hours - Math.floor(hours)) * 60)).padStart(2, '0')}m`

  const stats = [
    { label: t('dashboard.hoursThisMonth'), value: hrsDisplay, icon: Clock, bg: 'bg-blue-50', fg: 'text-blue-600' },
    { label: t('dashboard.activeMatters'), value: activeMatters.toString(), icon: Briefcase, bg: 'bg-purple-50', fg: 'text-purple-600' },
    { label: t('dashboard.pendingTimesheets'), value: pendingTs.toString(), icon: FileText, bg: 'bg-amber-50', fg: 'text-amber-600' },
    { label: t('dashboard.overduePayments'), value: overdue.toString(), icon: AlertCircle, bg: 'bg-red-50', fg: 'text-red-600' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {t('dashboard.welcome')}{userName ? `, ${userName.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {new Date().toLocaleDateString(es ? 'es-AR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:border-gray-200 transition-colors">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={stat.fg} />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
