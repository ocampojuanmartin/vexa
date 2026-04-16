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
        const { data: rt } = await sb.from('timesheets').select('id, status, total_billed_amount, total_expenses, matters(title, clients(name))').order('created_at', { ascending: false }).limit(5)
        if (rt) setRecentTimesheets(rt as any)
      }
    }
    load()
  }, [])

  const hrsDisplay = hrsToHM(hours)

  const stats = [
    { label: t('dashboard.hoursThisMonth'), value: hrsDisplay, icon: Clock, tint: 'from-vexa-600 to-vexa-700', href: '/time' },
    { label: t('dashboard.activeMatters'), value: activeMatters.toString(), icon: Briefcase, tint: 'from-brass-500 to-brass-600', href: '/clients' },
    { label: t('dashboard.pendingTimesheets'), value: pendingTs.toString(), icon: FileText, tint: 'from-ink-700 to-ink-900', href: '/timesheets' },
    { label: t('dashboard.overduePayments'), value: overdue.toString(), icon: AlertCircle, tint: 'from-red-700 to-red-900', href: '/timesheets' },
  ]

  const statusLabel = (s:string) => (es?{draft:'Borrador',issued:'Emitido',sent:'Enviado',approved:'Aprobado',invoice_issued:'Factura emitida',paid:'Pagado',unpaid:'Impago'}:{draft:'Draft',issued:'Issued',sent:'Sent',approved:'Approved',invoice_issued:'Invoice issued',paid:'Paid',unpaid:'Unpaid'})[s]||s
  const statusColor = (s:string) => ({draft:'bg-canvas-100 text-ink-700',issued:'bg-canvas-100 text-vexa-700',sent:'bg-vexa-500/10 text-vexa-700',approved:'bg-ink-900/5 text-ink-900',invoice_issued:'bg-brass-500/15 text-brass-600',paid:'bg-emerald-600/10 text-emerald-800',unpaid:'bg-red-600/10 text-red-800'})[s]||'bg-canvas-100 text-ink-700'

  return (
    <div>
      {/* Editorial header — eyebrow + serif display */}
      <div className="flex items-end justify-between mb-10 pb-6 border-b border-canvas-200">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-500 font-medium mb-2">
            {new Date().toLocaleDateString(es ? 'es-AR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="font-display text-4xl sm:text-[42px] leading-[1.05] text-ink-900 tracking-tight">
            {t('dashboard.welcome')}{userName ? <>, <span className="italic text-vexa-600">{userName.split(' ')[0]}</span></> : ''}
          </h1>
        </div>
        <button onClick={() => router.push('/time')}
          className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-vexa-600 text-white rounded-md text-sm font-medium hover:bg-vexa-700 shadow-soft">
          <Plus size={15} />{es ? 'Cargar horas' : 'Log time'}
        </button>
      </div>

      {/* Stat cards — thin borders, tighter typography, brass/navy tints instead of rainbow */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} onClick={() => router.push(stat.href)}
              className="group surface-card rounded-lg p-5 hover:border-canvas-300 hover:shadow-soft cursor-pointer transition-all">
              <div className={`w-9 h-9 rounded-md bg-gradient-to-br ${stat.tint} flex items-center justify-center mb-4 shadow-soft`}>
                <Icon size={16} className="text-white" strokeWidth={2} />
              </div>
              <p className="font-display text-2xl sm:text-[28px] text-ink-900 tracking-tight leading-none">{stat.value}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500 mt-2.5 font-medium">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Recent activity — two panels with editorial framing */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="surface-card rounded-lg p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-canvas-200">
            <h2 className="font-display text-lg text-ink-900 tracking-tight">{es ? 'Últimas horas cargadas' : 'Recent time entries'}</h2>
            <button onClick={() => router.push('/time')} className="text-xs text-vexa-600 hover:text-vexa-700 flex items-center gap-1 font-medium">
              {es ? 'Ver todo' : 'View all'}<ArrowRight size={12} />
            </button>
          </div>
          {recentEntries.length === 0 ? (
            <p className="text-sm text-ink-500 py-6 text-center">{es ? 'Sin horas cargadas aún' : 'No time entries yet'}</p>
          ) : (
            <div className="space-y-0">
              {recentEntries.map((e, i) => (
                <div key={e.id} className={`flex items-center justify-between py-3 ${i < recentEntries.length - 1 ? 'border-b border-canvas-100' : ''}`}>
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-medium text-ink-900 truncate">{e.matters?.title}</p>
                    <p className="text-xs text-ink-500 truncate mt-0.5">{e.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display text-base text-ink-900 tabular-nums">{hrsToHM(e.hours_logged)}</p>
                    <p className="text-[11px] text-ink-500 tabular-nums mt-0.5">{e.entry_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {userRole !== 'associate' ? (
          <div className="surface-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-canvas-200">
              <h2 className="font-display text-lg text-ink-900 tracking-tight">{es ? 'Últimos timesheets' : 'Recent timesheets'}</h2>
              <button onClick={() => router.push('/timesheets')} className="text-xs text-vexa-600 hover:text-vexa-700 flex items-center gap-1 font-medium">
                {es ? 'Ver todo' : 'View all'}<ArrowRight size={12} />
              </button>
            </div>
            {recentTimesheets.length === 0 ? (
              <p className="text-sm text-ink-500 py-6 text-center">{es ? 'Sin timesheets aún' : 'No timesheets yet'}</p>
            ) : (
              <div className="space-y-0">
                {recentTimesheets.map((t, i) => (
                  <div key={t.id} className={`flex items-center justify-between py-3 ${i < recentTimesheets.length - 1 ? 'border-b border-canvas-100' : ''}`}>
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-sm font-medium text-ink-900 truncate">{t.matters?.title}</p>
                      <p className="text-xs text-ink-500 truncate mt-0.5">{t.matters?.clients?.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wide ${statusColor(t.status)}`}>{statusLabel(t.status)}</span>
                      <p className="font-display text-sm text-ink-900 mt-1 tabular-nums">{(t.total_billed_amount + t.total_expenses).toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="surface-card rounded-lg p-6">
            <h2 className="font-display text-lg text-ink-900 tracking-tight mb-5 pb-3 border-b border-canvas-200">{es ? 'Acciones rápidas' : 'Quick actions'}</h2>
            <div className="space-y-1">
              <button onClick={() => router.push('/time')} className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-canvas-100 text-left transition-colors">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-vexa-600 to-vexa-700 flex items-center justify-center shadow-soft">
                  <Clock size={15} className="text-white" />
                </div>
                <span className="text-sm text-ink-900">{es ? 'Cargar horas' : 'Log time'}</span>
              </button>
              <button onClick={() => router.push('/expenses')} className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-canvas-100 text-left transition-colors">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-brass-500 to-brass-600 flex items-center justify-center shadow-soft">
                  <FileText size={15} className="text-white" />
                </div>
                <span className="text-sm text-ink-900">{es ? 'Cargar gasto' : 'Log expense'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
