'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { ChevronLeft, ChevronRight, Play, Square, Clock, Pencil, Lock } from 'lucide-react'

type TimeEntry = {
  id: string; entry_date: string; hours_logged: number; description: string
  is_billable: boolean; is_locked: boolean; matter_id: string; user_id: string
  matters?: any; users?: any
}
type Matter = { id: string; title: string; clients?: any }
type ClientOption = { id: string; name: string }

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function fmtDate(y: number, m: number, d: number) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` }
function hrsToHM(h: number) { const hrs = Math.floor(h); const mins = Math.round((h - hrs) * 60); return `${hrs}h ${String(mins).padStart(2, '0')}m` }
function hmToDecimal(hrs: number, mins: number) { return hrs + mins / 60 }

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS_ES = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA']
const DAYS_EN = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

export default function TimePage() {
  const { locale } = useI18n()
  const es = locale === 'es'
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selDay, setSelDay] = useState(now.getDate())
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([])
  const [matters, setMatters] = useState<Matter[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [firmId, setFirmId] = useState('')
  const [userRole, setUserRole] = useState('')

  const [selClient, setSelClient] = useState('')
  const [selMatter, setSelMatter] = useState('')
  const [formHrs, setFormHrs] = useState(0)
  const [formMins, setFormMins] = useState(0)
  const [formDesc, setFormDesc] = useState('')
  const [formBillable, setFormBillable] = useState(true)
  const [editing, setEditing] = useState<TimeEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSec, setTimerSec] = useState(0)
  const [timerMatter, setTimerMatter] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const selDate = fmtDate(year, month, selDay)
  const MONTHS = es ? MONTHS_ES : MONTHS_EN
  const DAYS = es ? DAYS_ES : DAYS_EN

  const loadData = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: p } = await sb.from('users').select('firm_id, role').eq('id', user.id).single()
    if (!p) return
    setUserId(user.id); setFirmId(p.firm_id); setUserRole(p.role)

    const monthStart = fmtDate(year, month, 1)
    const monthEnd = fmtDate(year, month, daysInMonth(year, month))
    const isAdmin = p.role === 'admin' || p.role === 'partner'
    let q = sb.from('time_entries').select('*, matters(title, clients(name)), users!time_entries_user_id_fkey(full_name)')
      .gte('entry_date', monthStart).lte('entry_date', monthEnd).order('entry_date')
    if (!isAdmin) q = q.eq('user_id', user.id)
    const { data } = await q
    if (data) setAllEntries(data as any)

    const [c, m] = await Promise.all([
      sb.from('clients').select('id, name').order('name'),
      sb.from('matters').select('id, title, clients(name)').eq('status', 'active').order('title'),
    ])
    if (c.data) setClients(c.data)
    if (m.data) setMatters(m.data as any)
    setLoading(false)
  }, [year, month])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { setEntries(allEntries.filter(e => e.entry_date === selDate)) }, [allEntries, selDate])
  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current) } }, [])

  function prevMonth() { if (month === 0) { setMonth(11); setYear(year - 1) } else setMonth(month - 1); setSelDay(1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(year + 1) } else setMonth(month + 1); setSelDay(1) }

  function getDayHours(day: number) {
    const d = fmtDate(year, month, day)
    return allEntries.filter(e => e.entry_date === d).reduce((s, e) => s + e.hours_logged, 0)
  }

  const filteredMatters = selClient
    ? matters.filter(m => m.clients?.name && clients.find(c => c.id === selClient)?.name === m.clients.name)
    : matters

  function resetForm() { setSelClient(''); setSelMatter(''); setFormHrs(0); setFormMins(0); setFormDesc(''); setFormBillable(true); setEditing(null); setError('') }

  function startEdit(e: TimeEntry) {
    if (e.is_locked) return
    setEditing(e)
    setSelMatter(e.matter_id)
    const hrs = Math.floor(e.hours_logged)
    const mins = Math.round((e.hours_logged - hrs) * 60)
    setFormHrs(hrs); setFormMins(mins); setFormDesc(e.description); setFormBillable(e.is_billable); setError('')
  }

  async function handleSave() {
    if (!selMatter || !formDesc.trim() || (formHrs === 0 && formMins === 0)) {
      setError(es ? 'Completá asunto, descripción y tiempo' : 'Fill matter, description and time'); return
    }
    setSaving(true); setError('')
    const sb = createClient()
    const ed = new Date(selDate)
    const { data: lock } = await sb.from('period_locks').select('id').eq('year', ed.getFullYear()).eq('month', ed.getMonth() + 1).maybeSingle()
    if (lock && !editing) { setError(es ? 'Período bloqueado' : 'Period locked'); setSaving(false); return }

    const payload = {
      entry_date: selDate, matter_id: selMatter, description: formDesc.trim(),
      hours_logged: hmToDecimal(formHrs, formMins), is_billable: formBillable,
      user_id: userId, firm_id: firmId,
    }
    if (editing) {
      const { error: err } = await sb.from('time_entries').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await sb.from('time_entries').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaving(false); resetForm(); loadData()
  }

  function startTimer() { if (!timerMatter) return; setTimerRunning(true); setTimerSec(0); intervalRef.current = setInterval(() => setTimerSec(s => s + 1), 1000) }
  function stopTimer() {
    setTimerRunning(false); if (intervalRef.current) clearInterval(intervalRef.current)
    const totalMin = Math.ceil(timerSec / 60)
    setFormHrs(Math.floor(totalMin / 60)); setFormMins(totalMin % 60); setSelMatter(timerMatter); setError('')
  }
  const fmtTimer = (s: number) => `${Math.floor(s / 3600).toString().padStart(2, '0')}:${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const dayTotal = entries.reduce((s, e) => s + e.hours_logged, 0)
  const dayBillable = entries.filter(e => e.is_billable).reduce((s, e) => s + e.hours_logged, 0)
  const dayNonBill = dayTotal - dayBillable
  const monthTotal = allEntries.reduce((s, e) => s + e.hours_logged, 0)
  const monthBillable = allEntries.filter(e => e.is_billable).reduce((s, e) => s + e.hours_logged, 0)

  const firstDow = new Date(year, month, 1).getDay()
  const days = daysInMonth(year, month)
  const calDays: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) calDays.push(null)
  for (let i = 1; i <= days; i++) calDays.push(i)

  const isToday = (d: number) => d === now.getDate() && month === now.getMonth() && year === now.getFullYear()
  const canSeeAll = userRole === 'admin' || userRole === 'partner'

  const L = {
    insert: es ? 'Insertar' : 'Insert',
    editing_: es ? 'Guardar cambio' : 'Save edit',
    cancel: es ? 'Cancelar' : 'Cancel',
    client: es ? 'Cliente' : 'Client',
    matter: es ? 'Asunto' : 'Matter',
    desc: es ? 'Descripción (máx. 1000)' : 'Description (max 1000)',
    hours: es ? 'Horas' : 'Hours',
    mins: es ? 'Minutos' : 'Minutes',
    billable: es ? 'Facturable' : 'Billable',
    totalNB: es ? 'Total no facturable' : 'Total non-billable',
    totalB: es ? 'Total facturable' : 'Total billable',
    totalDay: es ? 'Total del día' : 'Day total',
    periodNB: es ? 'Total período no fact.' : 'Period non-billable',
    periodB: es ? 'Total período fact.' : 'Period billable',
    periodTotal: es ? `Total período ${MONTHS[month]}-${year}` : `Total period ${MONTHS[month]}-${year}`,
    timer: es ? 'Cronómetro' : 'Timer',
    start: es ? 'Iniciar' : 'Start',
    stop: es ? 'Detener' : 'Stop',
    selectMatter: es ? 'Seleccionar asunto' : 'Select matter',
    selectClient: es ? 'Todos los clientes' : 'All clients',
    editDay: es ? `Editando el día ${selDate}` : `Editing day ${selDate}`,
  }

  return (
    <div className="flex gap-6 flex-wrap lg:flex-nowrap">
      {/* LEFT PANEL */}
      <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-sm">
          <p className="font-medium text-gray-700">{es ? 'Período activo' : 'Active period'}: {MONTHS[month]}-{year}</p>
          <p className="text-gray-400 text-xs mt-1">{es ? 'Desde' : 'From'} {fmtDate(year, month, 1)}</p>
          <p className="text-gray-400 text-xs">{es ? 'Hasta' : 'To'} {fmtDate(year, month, days)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs">
            {DAYS.map(d => <div key={d} className="py-1 text-gray-400 font-medium">{d}</div>)}
            {calDays.map((d, i) => {
              if (!d) return <div key={`e${i}`} />
              const hrs = getDayHours(d)
              const sel = d === selDay
              const today = isToday(d)
              return (
                <button key={d} onClick={() => setSelDay(d)}
                  className={`py-1.5 text-xs rounded-md transition-colors relative ${sel ? 'bg-vexa-500 text-white' : today ? 'bg-vexa-50 text-vexa-700 font-bold' : 'hover:bg-gray-100 text-gray-700'}`}>
                  {d}
                  {hrs > 0 && !sel && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-vexa-400"></span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
          <p className="text-xs font-medium text-gray-500">{L.timer}</p>
          <select value={timerMatter} onChange={e => setTimerMatter(e.target.value)} disabled={timerRunning}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white">
            <option value="">{L.selectMatter}</option>
            {matters.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg flex-1 text-center">{fmtTimer(timerSec)}</span>
            {!timerRunning ? (
              <button onClick={startTimer} disabled={!timerMatter} className="p-2 bg-green-600 text-white rounded-lg disabled:opacity-40"><Play size={14} /></button>
            ) : (
              <button onClick={stopTimer} className="p-2 bg-red-600 text-white rounded-lg"><Square size={14} /></button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-gray-500">{L.totalNB}</span><span className="font-medium">{hrsToHM(dayNonBill)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{L.totalB}</span><span className="font-medium">{hrsToHM(dayBillable)}</span></div>
          <div className="flex justify-between border-t pt-1 border-gray-100"><span className="font-medium text-gray-700">{L.totalDay}</span><span className="font-bold">{hrsToHM(dayTotal)}</span></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-gray-500">{L.periodNB}</span><span className="font-medium">{hrsToHM(monthTotal - monthBillable)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{L.periodB}</span><span className="font-medium">{hrsToHM(monthBillable)}</span></div>
          <div className="flex justify-between border-t pt-1 border-gray-100"><span className="font-medium text-gray-700">{L.periodTotal}</span><span className="font-bold">{hrsToHM(monthTotal)}</span></div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 min-w-0 space-y-4">
        <p className="text-sm text-gray-500 font-medium">{L.editDay}</p>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{L.client}</label>
                <select value={selClient} onChange={e => { setSelClient(e.target.value); setSelMatter('') }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="">{L.selectClient}</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{L.matter}</label>
                <select value={selMatter} onChange={e => setSelMatter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="">{L.selectMatter}</option>
                  {filteredMatters.map(m => <option key={m.id} value={m.id}>{m.title}{m.clients?.name ? ` — ${m.clients.name}` : ''}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">{L.hours}</label>
                  <input type="number" min="0" max="24" value={formHrs} onChange={e => setFormHrs(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">{L.mins}</label>
                  <input type="number" min="0" max="59" value={formMins} onChange={e => setFormMins(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formBillable} onChange={e => setFormBillable(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">{L.billable}</span>
              </label>
            </div>

            <div className="flex flex-col">
              <label className="block text-xs font-medium text-gray-600 mb-1">{L.desc}</label>
              <textarea value={formDesc} onChange={e => setFormDesc(e.target.value.slice(0, 1000))}
                className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none min-h-[120px]"
                placeholder={es ? 'Describí el trabajo realizado...' : 'Describe the work done...'} />
              <div className="text-right text-xs text-gray-400 mt-1">{formDesc.length}/1000</div>
            </div>

            <div className="flex flex-col justify-between">
              {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
              <div className="space-y-2">
                <button onClick={handleSave} disabled={saving}
                  className="w-full px-4 py-2.5 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600 disabled:opacity-50">
                  {saving ? '...' : editing ? L.editing_ : L.insert}
                </button>
                {editing && (
                  <button onClick={resetForm} className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{L.cancel}</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {entries.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">{L.matter}</th>
                  {canSeeAll && <th className="text-left px-4 py-2 font-medium text-gray-600">{es ? 'Abogado' : 'Lawyer'}</th>}
                  <th className="text-left px-4 py-2 font-medium text-gray-600">{L.desc}</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">{L.hours}</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900 text-xs">{e.matters?.title}</div>
                      <div className="text-xs text-gray-400">{e.matters?.clients?.name}</div>
                    </td>
                    {canSeeAll && <td className="px-4 py-2 text-xs text-gray-600">{e.users?.full_name}</td>}
                    <td className="px-4 py-2 text-xs text-gray-600 max-w-xs truncate">{e.description}</td>
                    <td className="px-4 py-2 text-right text-xs font-medium">
                      {hrsToHM(e.hours_logged)}
                      {!e.is_billable && <span className="ml-1 text-gray-400">(NB)</span>}
                    </td>
                    <td className="px-4 py-2">
                      {e.is_locked ? <Lock size={13} className="text-gray-300 mx-auto" /> : (
                        <button onClick={() => startEdit(e)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Pencil size={13} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
