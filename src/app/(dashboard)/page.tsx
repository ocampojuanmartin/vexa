'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { useRouter } from 'next/navigation'
import { Clock, Briefcase, FileText, AlertCircle, ArrowRight, Plus } from 'lucide-react'

function hrsToHM(h:number){const hrs=Math.floor(h);const mins=Math.round((h-hrs)*60);return `${hrs}h ${String(mins).padStart(2,'0')}m`}

type RecentEntry = { id:string; entry_date:string; hours_logged:number; description:string; matters?:any; users?:any }
type RecentTimesheet = { id:string; status:string; total_billed_amount:number; total_expenses:number; matters?:any }

export default function DashboardPage() {
  const { t, locale } = useI18n()
  const es = locale === 'es'
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [hours, setHours] = useState(0)
  const [activeMatters, setActiveMatters] = useState(0)
  const [pendingTs, setPendingTs] = useState(0)
  const [overdue, setOverdue] = useState(0)
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([])
  const [recentTimesheets, setRecentTimesheets] = useState<RecentTimesheet[]>([])

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: p } = await sb.from('users').select('full_name, role').eq('id', user.id).single()
      if (p) { setUserName(p.full_name); setUserRole(p.role) }

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const today = now.toISOString().slice(0, 10)

      let hq = sb.from('time_entries').select('hours_logged').gte('entry_date', monthStart).lte('entry_date', today)
      if (p?.role === 'associate') hq = hq.eq('user_id', user.id)
      const { data: hrs } = await hq
      if (hrs) setHours(hrs.reduce((s: number, h: any) => s + h.hours_logged, 0))

      const { count: mc } = await sb.from('matters').select('id', { count: 'exact', head: true }).eq('status', 'active')
      if (mc !== null) setActiveMatters(mc)

      // Recent time entries
      let req = sb.from('time_entries').select('id, entry_date, hours_logged, description, matters(title, clients(name)), users!time_entries_user_id_fkey(full_name)').order('created_at', { ascending: false }).limit(5)
      if (p?.role === 'associate') req = req.eq('user_id', user.id)
      const { data: re } = await req
      if (re) setRecentEntries(re as any)

      if (p?.role !== 'associate') {
        const { count: tc } = await sb.from('timesheets').select('id', { count: 'exact', head: true }).in('status', ['draft', 'sent'])
        if (tc !== null) setPendingTs(tc)
        const thirtyAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
        const { count: oc } = await sb.from('timesheets').select('id', { count: 'exact', head: true }).in('status', ['unpaid', 'invoice_issued']).lte('updated_at', thirtyAgo)
        if (oc !== null) setOverdue(oc)
        // Recent timesheets
        const { data: rt } = await sb.from('timesheets').select('id, status, total_billed_amount, total_expenses, matters(title, clients(name))').order('created_at', { ascending: false }).limit(5)
        if (rt) setRecentTimesheets(rt as any)
      }
    }
    load()
  }, [])

  const hrsDisplay = hrsToHM(hours)

  const stats = [
    { label: t('dashboard.hoursThisMonth'), value: hrsDisplay, icon: Clock, bg: 'bg-blue-50', fg: 'text-blue-600', href: '/time' },
    { label: t('dashboard.activeMatters'), value: activeMatters.toString(), icon: Briefcase, bg: 'bg-purple-50', fg: 'text-purple-600', href: '/clients' },
    { label: t('dashboard.pendingTimesheets'), value: pendingTs.toString(), icon: FileText, bg: 'bg-amber-50', fg: 'text-amber-600', href: '/timesheets' },
    { label: t('dashboard.overduePayments'), value: overdue.toString(), icon: AlertCircle, bg: 'bg-red-50', fg: 'text-red-600', href: '/timesheets' },
  ]

  const statusLabel = (s:string) => (es?{draft:'Borrador',sent:'Enviado',approved:'Aprobado',invoice_issued:'Factura emitida',paid:'Pagado',unpaid:'Impago'}:{draft:'Draft',sent:'Sent',approved:'Approved',invoice_issued:'Invoice issued',paid:'Paid',unpaid:'Unpaid'})[s]||s
  const statusColor = (s:string) => ({draft:'bg-gray-100 text-gray-600',sent:'bg-blue-50 text-blue-700',approved:'bg-purple-50 text-purple-700',invoice_issued:'bg-amber-50 text-amber-700',paid:'bg-green-50 text-green-700',unpaid:'bg-red-50 text-red-700'})[s]||'bg-gray-100 text-gray-600'

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t('dashboard.welcome')}{userName ? `, ${userName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {new Date().toLocaleDateString(es ? 'es-AR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={() => router.push('/time')} className="flex items-center gap-2 px-4 py-2 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600">
          <Plus size={16} />{es ? 'Cargar horas' : 'Log time'}
        </button>
      </div>

      {/* Stats cards - clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} onClick={() => router.push(stat.href)}
              className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:border-gray-200 transition-colors cursor-pointer">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={stat.fg} />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Two column layout for recent activity */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent time entries */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">{es ? 'Últimas horas cargadas' : 'Recent time entries'}</h2>
            <button onClick={() => router.push('/time')} className="text-xs text-vexa-500 hover:text-vexa-600 flex items-center gap-1">
              {es ? 'Ver todo' : 'View all'}<ArrowRight size={12} />
            </button>
          </div>
          {recentEntries.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">{es ? 'Sin horas cargadas aún' : 'No time entries yet'}</p>
          ) : (
            <div className="space-y-2">
              {recentEntries.map(e => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{e.matters?.title}</p>
                    <p className="text-xs text-gray-400 truncate">{e.description}</p>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900">{hrsToHM(e.hours_logged)}</p>
                    <p className="text-xs text-gray-400">{e.entry_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent timesheets (partners/admin only) */}
        {userRole !== 'associate' ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">{es ? 'Últimos timesheets' : 'Recent timesheets'}</h2>
              <button onClick={() => router.push('/timesheets')} className="text-xs text-vexa-500 hover:text-vexa-600 flex items-center gap-1">
                {es ? 'Ver todo' : 'View all'}<ArrowRight size={12} />
              </button>
            </div>
            {recentTimesheets.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">{es ? 'Sin timesheets aún' : 'No timesheets yet'}</p>
            ) : (
              <div className="space-y-2">
                {recentTimesheets.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.matters?.title}</p>
                      <p className="text-xs text-gray-400">{t.matters?.clients?.name}</p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(t.status)}`}>{statusLabel(t.status)}</span>
                      <p className="text-xs text-gray-400 mt-1">{(t.total_billed_amount + t.total_expenses).toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">{es ? 'Acciones rápidas' : 'Quick actions'}</h2>
            <div className="space-y-2">
              <button onClick={() => router.push('/time')} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 text-left">
                <Clock size={18} className="text-blue-500" />
                <span className="text-sm text-gray-700">{es ? 'Cargar horas' : 'Log time'}</span>
              </button>
              <button onClick={() => router.push('/expenses')} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 text-left">
                <FileText size={18} className="text-amber-500" />
                <span className="text-sm text-gray-700">{es ? 'Cargar gasto' : 'Log expense'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
