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
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10)
      const today = now.toISOString().slice(0,10)

      // Hours this month (own for associate, all for partner/admin)
      let hq = sb.from('time_entries').select('hours_logged').gte('entry_date', monthStart).lte('entry_date', today)
      if (p?.role === 'associate') hq = hq.eq('user_id', user.id)
      const { data: hrs } = await hq
      if (hrs) setHours(hrs.reduce((s: number, h: any) => s + h.hours_logged, 0))

      // Active matters
      const { count: mc } = await sb.from('matters').select('id', { count: 'exact', head: true }).eq('status', 'active')
      if (mc !== null) setActiveMatters(mc)

      if (p?.role !== 'associate') {
        // Pending timesheets (draft or sent)
        const { count: tc } = await sb.from('timesheets').select('id', { count: 'exact', head: true }).in('status', ['draft', 'sent'])
        if (tc !== null) setPendingTs(tc)

        // Overdue (unpaid or invoice_issued older than 30 days)
        const thirtyAgo = new Date(now.getTime() - 30*86400000).toISOString().slice(0,10)
        const { count: oc } = await sb.from('timesheets').select('id', { count: 'exact', head: true }).in('status', ['unpaid', 'invoice_issued']).lte('updated_at', thirtyAgo)
        if (oc !== null) setOverdue(oc)
      }
    }
    load()
  }, [])

  const stats = [
    { label: t('dashboard.hoursThisMonth'), value: `${Math.floor(hours)}h ${String(Math.round((hours-Math.floor(hours))*60)).padStart(2,'0')}m`, icon: Clock, color: 'text-blue-600 bg-blue-50' },
    { label: t('dashboard.activeMatters'), value: activeMatters.toString(), icon: Briefcase, color: 'text-purple-600 bg-purple-50' },
    { label: t('dashboard.pendingTimesheets'), value: pendingTs.toString(), icon: FileText, color: 'text-amber-600 bg-amber-50' },
    { label: t('dashboard.overduePayments'), value: overdue.toString(), icon: AlertCircle, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        {t('dashboard.welcome')}{userName ? `, ${userName.split(' ')[0]}` : ''}
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        {new Date().toLocaleDateString(es ? 'es-AR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}><Icon size={20} /></div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
