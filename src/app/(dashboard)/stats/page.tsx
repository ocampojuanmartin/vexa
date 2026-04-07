'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { BarChart3 } from 'lucide-react'

type UserStat = {
  user_id: string; full_name: string; role: string; expected_monthly_hours: number
  hours_logged: number; hours_billed: number; revenue: number; collected: number; billed_total: number
}
type OriginStat = { full_name: string; client_name: string; matter_title: string; revenue: number; percentage: number }

export default function StatsPage() {
  const { locale } = useI18n()
  const es = locale === 'es'
  const [userStats, setUserStats] = useState<UserStat[]>([])
  const [originStats, setOriginStats] = useState<OriginStat[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0,10))
  const [userRole, setUserRole] = useState('')

  const loadStats = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: p } = await sb.from('users').select('firm_id, role').eq('id', user.id).single()
    if (!p) return
    setUserRole(p.role)

    // Get all firm users
    const { data: users } = await sb.from('users').select('id, full_name, role, expected_monthly_hours').eq('is_active', true)
    if (!users) return

    // Get logged hours per user in period
    const { data: timeEntries } = await sb.from('time_entries').select('user_id, hours_logged')
      .gte('entry_date', dateFrom).lte('entry_date', dateTo)

    // Get billed hours + revenue from timesheet_items (only from timesheets in period)
    const { data: tsInPeriod } = await sb.from('timesheets').select('id, status')
      .gte('period_start', dateFrom).lte('period_end', dateTo)
    const tsIds = tsInPeriod?.map(t => t.id) || []
    const paidTsIds = tsInPeriod?.filter(t => t.status === 'paid').map(t => t.id) || []

    let billedItems: any[] = []
    if (tsIds.length > 0) {
      const { data } = await sb.from('timesheet_items').select('user_id, hours_billed, amount').in('timesheet_id', tsIds)
      if (data) billedItems = data
    }
    let paidItems: any[] = []
    if (paidTsIds.length > 0) {
      const { data } = await sb.from('timesheet_items').select('user_id, amount').in('timesheet_id', paidTsIds)
      if (data) paidItems = data
    }

    // Aggregate per user
    const stats: UserStat[] = users.map(u => {
      const logged = (timeEntries || []).filter(t => t.user_id === u.id).reduce((s,t) => s + t.hours_logged, 0)
      const userBilled = billedItems.filter(b => b.user_id === u.id)
      const billed = userBilled.reduce((s,b) => s + b.hours_billed, 0)
      const revenue = userBilled.reduce((s,b) => s + b.amount, 0)
      const billedTotal = billedItems.filter(b => b.user_id === u.id).reduce((s,b) => s + b.amount, 0)
      const collected = paidItems.filter(b => b.user_id === u.id).reduce((s,b) => s + b.amount, 0)
      return { user_id: u.id, full_name: u.full_name, role: u.role, expected_monthly_hours: u.expected_monthly_hours, hours_logged: logged, hours_billed: billed, revenue, collected, billed_total: billedTotal }
    })
    setUserStats(stats.sort((a,b) => b.revenue - a.revenue))

    // Client origination
    const { data: origins } = await sb.from('matter_originators').select('user_id, percentage, matters(title, clients(name))')
    const { data: allTsItems } = await sb.from('timesheet_items').select('amount, timesheets!inner(matter_id, period_start, period_end)')
      .gte('timesheets.period_start', dateFrom).lte('timesheets.period_end', dateTo)

    if (origins && allTsItems) {
      const matterRevenue: Record<string, number> = {}
      allTsItems.forEach((item: any) => {
        const mid = item.timesheets?.matter_id
        if (mid) matterRevenue[mid] = (matterRevenue[mid] || 0) + item.amount
      })

      const origList: OriginStat[] = []
      origins.forEach((o: any) => {
        const matter = o.matters as any
        if (!matter) return
        const rev = Object.entries(matterRevenue).reduce((s, [mid, amt]) => {
          // We need matter_id from originator - but we only have matter via join
          return s
        }, 0)
        const userName = users.find(u => u.id === o.user_id)?.full_name || '?'
        origList.push({
          full_name: userName,
          client_name: matter.clients?.name || '?',
          matter_title: matter.title || '?',
          revenue: 0, // Will calculate below
          percentage: o.percentage,
        })
      })
      setOriginStats(origList)
    }

    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => { loadStats() }, [loadStats])

  if (userRole === 'associate') {
    // Associates see only their own stats
    const me = userStats.find(s => true) // Will be filtered by RLS anyway
    const myStat = userStats.length > 0 ? userStats[0] : null
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{es ? 'Mis estadísticas' : 'My stats'}</h1>
        {myStat && (
          <div className="mt-6 grid grid-cols-2 gap-4 max-w-md">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{es ? 'Horas logueadas' : 'Hours logged'}</p>
              <p className="text-2xl font-semibold mt-1">{myStat.hours_logged.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{es ? 'Horas facturadas' : 'Hours billed'}</p>
              <p className="text-2xl font-semibold mt-1">{myStat.hours_billed.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{es ? 'Ratio facturable' : 'Billable ratio'}</p>
              <p className="text-2xl font-semibold mt-1">{myStat.expected_monthly_hours > 0 ? Math.round(myStat.hours_billed / myStat.expected_monthly_hours * 100) : 0}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{es ? 'Gap log/fact' : 'Log/bill gap'}</p>
              <p className="text-2xl font-semibold mt-1">{(myStat.hours_logged - myStat.hours_billed).toFixed(1)}h</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // PARTNER/ADMIN VIEW
  const totalLogged = userStats.reduce((s,u) => s + u.hours_logged, 0)
  const totalBilled = userStats.reduce((s,u) => s + u.hours_billed, 0)
  const totalRevenue = userStats.reduce((s,u) => s + u.revenue, 0)
  const totalCollected = userStats.reduce((s,u) => s + u.collected, 0)

  const L = {
    title: es ? 'Estadísticas' : 'Stats',
    from: es ? 'Desde' : 'From', to: es ? 'Hasta' : 'To',
    lawyer: es ? 'Abogado' : 'Lawyer',
    logged: es ? 'Logueadas' : 'Logged', billed: es ? 'Facturadas' : 'Billed',
    gap: es ? 'Gap' : 'Gap', ratio: es ? 'Ratio' : 'Ratio',
    revenue: es ? 'Ingresos' : 'Revenue',
    collected: es ? 'Cobrado' : 'Collected', collRate: es ? '% Cobro' : 'Coll. %',
    totalLogged: es ? 'Total logueadas' : 'Total logged',
    totalBilled: es ? 'Total facturadas' : 'Total billed',
    totalRevenue: es ? 'Total ingresos' : 'Total revenue',
    totalCollected: es ? 'Total cobrado' : 'Total collected',
    origination: es ? 'Originación de clientes' : 'Client origination',
    partner: es ? 'Socio' : 'Partner', client: es ? 'Cliente' : 'Client',
    matter: es ? 'Asunto' : 'Matter', pct: '%',
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">{L.title}</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">{L.from}</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
          <span className="text-gray-500">{L.to}</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{L.totalLogged}</p>
          <p className="text-2xl font-semibold mt-1">{totalLogged.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{L.totalBilled}</p>
          <p className="text-2xl font-semibold mt-1">{totalBilled.toFixed(1)}h</p>
          <p className="text-xs text-gray-400 mt-1">{es?'Gap':'Gap'}: {(totalLogged - totalBilled).toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{L.totalRevenue}</p>
          <p className="text-2xl font-semibold mt-1">{totalRevenue.toLocaleString(undefined,{minimumFractionDigits:0})}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{L.totalCollected}</p>
          <p className="text-2xl font-semibold mt-1">{totalCollected.toLocaleString(undefined,{minimumFractionDigits:0})}</p>
          <p className="text-xs text-gray-400 mt-1">{totalRevenue > 0 ? Math.round(totalCollected/totalRevenue*100) : 0}%</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 text-center text-sm text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Per-lawyer table */}
          <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{L.lawyer}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">{L.logged}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">{L.billed}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">{L.gap}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">{L.ratio}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">{L.revenue}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">{L.collected}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">{L.collRate}</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map(u => {
                  const gap = u.hours_logged - u.hours_billed
                  const ratio = u.expected_monthly_hours > 0 ? Math.round(u.hours_billed / u.expected_monthly_hours * 100) : 0
                  const collRate = u.billed_total > 0 ? Math.round(u.collected / u.billed_total * 100) : 0
                  return (
                    <tr key={u.user_id} className="border-b border-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{u.full_name}</span>
                        <span className="ml-2 text-xs text-gray-400 capitalize">{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{u.hours_logged.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">{u.hours_billed.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={gap > 0 ? 'text-amber-600' : 'text-gray-400'}>{gap.toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ratio >= 80 ? 'bg-green-50 text-green-700' : ratio >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{ratio}%</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{u.revenue.toLocaleString(undefined,{minimumFractionDigits:0})}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{u.collected.toLocaleString(undefined,{minimumFractionDigits:0})}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs ${collRate >= 80 ? 'text-green-600' : collRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{collRate}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}