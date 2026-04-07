'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { Plus, Search, X, Clock, Pencil, Play, Square, Lock } from 'lucide-react'

type TimeEntry = {
  id: string; entry_date: string; hours_logged: number; description: string
  is_billable: boolean; is_locked: boolean; matter_id: string; user_id: string
  matters?: { title: string; clients?: { name: string } }; users?: { full_name: string }
}
type Matter = { id: string; title: string; clients?: any }
type Form = { entry_date: string; matter_id: string; description: string; hours: string; is_billable: boolean }

const emptyForm = (): Form => ({
  entry_date: new Date().toISOString().slice(0, 10), matter_id: '', description: '', hours: '', is_billable: true
})

export default function TimePage() {
  const { locale } = useI18n()
  const es = locale === 'es'
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [matters, setMatters] = useState<Matter[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TimeEntry | null>(null)
  const [form, setForm] = useState<Form>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')
  const [firmId, setFirmId] = useState('')
  const [userRole, setUserRole] = useState('')
  // Timer
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerMatterId, setTimerMatterId] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadData = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: p } = await sb.from('users').select('firm_id, role').eq('id', user.id).single()
    if (!p) return
    setUserId(user.id); setFirmId(p.firm_id); setUserRole(p.role)

    const isAdmin = p.role === 'admin' || p.role === 'partner'
    let q = sb.from('time_entries').select('*, matters(title, clients(name)), users!time_entries_user_id_fkey(full_name)').order('entry_date', { ascending: false }).limit(200)
    if (!isAdmin) q = q.eq('user_id', user.id)
    const { data } = await q
    if (data) setEntries(data as TimeEntry[])

    const { data: m } = await sb.from('matters').select('id, title, clients(name)').eq('status', 'active').order('title')
    if (m) setMatters(m as any)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function startTimer() {
    if (!timerMatterId) return
    setTimerRunning(true); setTimerSeconds(0)
    intervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
  }
  function stopTimer() {
    setTimerRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    const hrs = (timerSeconds / 3600).toFixed(2)
    setForm({ ...emptyForm(), matter_id: timerMatterId, hours: hrs })
    setEditing(null); setError(''); setShowModal(true)
  }
  const fmtTimer = (s: number) => {
    const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = s%60
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`
  }

  function openCreate() { setEditing(null); setForm(emptyForm()); setError(''); setShowModal(true) }
  function openEdit(e: TimeEntry) {
    if (e.is_locked) return
    setEditing(e)
    setForm({ entry_date: e.entry_date, matter_id: e.matter_id, description: e.description, hours: e.hours_logged.toString(), is_billable: e.is_billable })
    setError(''); setShowModal(true)
  }

  async function handleSave() {
    if (!form.matter_id || !form.hours || !form.description.trim()) {
      setError(es ? 'Asunto, descripción y horas son obligatorios' : 'Matter, description and hours are required'); return
    }
    const hrs = parseFloat(form.hours)
    if (isNaN(hrs) || hrs <= 0) { setError(es ? 'Horas inválidas' : 'Invalid hours'); return }
    setSaving(true); setError('')
    const sb = createClient()
    // Check period lock
    const entryDate = new Date(form.entry_date)
    const { data: lock } = await sb.from('period_locks')
      .select('id').eq('year', entryDate.getFullYear()).eq('month', entryDate.getMonth() + 1).maybeSingle()
    if (lock && !editing) {
      setError(es ? 'Este período está bloqueado. Solicitá desbloqueo al administrador.' : 'This period is locked. Request unlock from admin.')
      setSaving(false); return
    }
    const payload = {
      entry_date: form.entry_date, matter_id: form.matter_id, description: form.description.trim(),
      hours_logged: hrs, is_billable: form.is_billable, user_id: userId, firm_id: firmId,
    }
    if (editing) {
      const { error: err } = await sb.from('time_entries').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await sb.from('time_entries').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaving(false); setShowModal(false); loadData()
  }

  const filtered = entries.filter(e =>
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.matters?.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.matters?.clients?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalHours = filtered.reduce((sum, e) => sum + e.hours_logged, 0)

  const L = {
    title: es ? 'Horas' : 'Time tracking', new: es ? 'Cargar horas' : 'Log time',
    edit: es ? 'Editar entrada' : 'Edit entry', date: es ? 'Fecha' : 'Date',
    matter: es ? 'Asunto' : 'Matter', desc: es ? 'Descripción del trabajo' : 'Work description',
    hours: es ? 'Horas' : 'Hours', billable: es ? 'Facturable' : 'Billable',
    save: es ? 'Guardar' : 'Save', cancel: es ? 'Cancelar' : 'Cancel',
    search: es ? 'Buscar...' : 'Search...', none: es ? 'No hay horas cargadas' : 'No time entries yet',
    addFirst: es ? 'Cargá tu primera hora' : 'Log your first hours',
    select: es ? 'Seleccionar asunto' : 'Select matter',
    total: es ? 'Total' : 'Total', client: es ? 'Cliente' : 'Client',
    lawyer: es ? 'Abogado' : 'Lawyer', locked: es ? 'Bloqueado' : 'Locked',
    timer: es ? 'Cronómetro' : 'Timer', start: es ? 'Iniciar' : 'Start', stop: es ? 'Detener' : 'Stop',
    selectMatter: es ? 'Elegí un asunto para el cronómetro' : 'Pick a matter for the timer',
  }

  const canSeeAll = userRole === 'admin' || userRole === 'partner'

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{L.title}</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-vexa-600 text-white rounded-lg text-sm font-medium hover:bg-vexa-700 transition-colors">
          <Plus size={16} />{L.new}
        </button>
      </div>

      {/* Timer */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 flex-wrap">
        <Clock size={18} className="text-gray-400" />
        <select value={timerMatterId} onChange={e => setTimerMatterId(e.target.value)}
          disabled={timerRunning}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white flex-1 min-w-[200px]">
          <option value="">{L.selectMatter}</option>
          {matters.map(m => <option key={m.id} value={m.id}>{m.title} — {m.clients?.name}</option>)}
        </select>
        <span className="font-mono text-lg text-gray-900 w-24 text-center">{fmtTimer(timerSeconds)}</span>
        {!timerRunning ? (
          <button onClick={startTimer} disabled={!timerMatterId}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 transition-colors">
            <Play size={14} />{L.start}
          </button>
        ) : (
          <button onClick={stopTimer}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
            <Square size={14} />{L.stop}
          </button>
        )}
      </div>

      {entries.length > 0 && (
        <div className="mt-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={L.search}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-center text-sm text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-900 font-medium">{L.none}</p>
          <p className="text-sm text-gray-500 mt-1">{L.addFirst}</p>
        </div>
      ) : (
        <>
          <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{L.date}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{L.matter}</th>
                  {canSeeAll && <th className="text-left px-4 py-3 font-medium text-gray-600">{L.lawyer}</th>}
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{L.desc}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">{L.hours}</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.entry_date}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{e.matters?.title}</div>
                      <div className="text-xs text-gray-400">{e.matters?.clients?.name}</div>
                    </td>
                    {canSeeAll && <td className="px-4 py-3 text-gray-600">{e.users?.full_name}</td>}
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{e.description}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {e.hours_logged.toFixed(2)}
                      {!e.is_billable && <span className="ml-1 text-xs text-gray-400">(NB)</span>}
                    </td>
                    <td className="px-4 py-3">
                      {e.is_locked ? (
                        <Lock size={14} className="text-gray-300 mx-auto" />
                      ) : (
                        <button onClick={() => openEdit(e)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400">
                          <Pencil size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-right text-sm text-gray-500">
            {L.total}: <span className="font-semibold text-gray-900">{totalHours.toFixed(2)} hrs</span>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? L.edit : L.new}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-md">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{L.date}</label>
                  <input type="date" value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{L.hours} *</label>
                  <input type="number" step="0.25" min="0.01" value={form.hours}
                    onChange={e => setForm({...form, hours: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="1.50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.matter} *</label>
                <select value={form.matter_id} onChange={e => setForm({...form, matter_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="">{L.select}</option>
                  {matters.map(m => <option key={m.id} value={m.id}>{m.title} — {m.clients?.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.desc} *</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                  placeholder={es ? 'Describí el trabajo realizado...' : 'Describe the work done...'} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_billable}
                  onChange={e => setForm({...form, is_billable: e.target.checked})} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">{L.billable}</span>
              </label>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{L.cancel}</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-vexa-600 text-white rounded-lg text-sm font-medium hover:bg-vexa-700 disabled:opacity-50">{saving ? '...' : L.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}