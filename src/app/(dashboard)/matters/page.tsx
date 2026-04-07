'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { Plus, Search, X, Briefcase, Pencil, ChevronDown } from 'lucide-react'

type Matter = {
  id: string; title: string; matter_type: string; status: string
  client_id: string; lead_lawyer_id: string | null; custom_rate: number | null
  clients?: { name: string }; users?: { full_name: string }
}
type Client = { id: string; name: string }
type User = { id: string; full_name: string; role: string; hourly_rate: number }
type Originator = { user_id: string; percentage: number }

type Form = {
  title: string; matter_type: string; status: string; client_id: string
  lead_lawyer_id: string; custom_rate: string; originators: Originator[]
  assigned_lawyers: string[]
}

const emptyForm: Form = {
  title: '', matter_type: 'general', status: 'intake', client_id: '',
  lead_lawyer_id: '', custom_rate: '', originators: [], assigned_lawyers: []
}

const TYPES = ['general','civil','penal','laboral','familia','comercial','contractual','consultoria','administrativo']
const STATUSES = ['intake','active','suspended','closed']

export default function MattersPage() {
  const { locale } = useI18n()
  const [matters, setMatters] = useState<Matter[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Matter | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState('')
  const [firmId, setFirmId] = useState('')

  const es = locale === 'es'

  const loadData = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: p } = await sb.from('users').select('firm_id, role').eq('id', user.id).single()
    if (!p) return
    setUserRole(p.role); setFirmId(p.firm_id)

    const [m, c, u] = await Promise.all([
      sb.from('matters').select('*, clients(name), users!matters_lead_lawyer_id_fkey(full_name)').order('created_at', { ascending: false }),
      sb.from('clients').select('id, name').order('name'),
      sb.from('users').select('id, full_name, role, hourly_rate').eq('is_active', true).order('full_name'),
    ])
    if (m.data) setMatters(m.data as Matter[])
    if (c.data) setClients(c.data)
    if (u.data) setUsers(u.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const canEdit = userRole === 'admin' || userRole === 'partner'

  async function openEdit(matter: Matter) {
    setEditing(matter)
    const sb = createClient()
    const [orig, lawyers] = await Promise.all([
      sb.from('matter_originators').select('user_id, percentage').eq('matter_id', matter.id),
      sb.from('matter_lawyers').select('user_id').eq('matter_id', matter.id),
    ])
    setForm({
      title: matter.title, matter_type: matter.matter_type, status: matter.status,
      client_id: matter.client_id, lead_lawyer_id: matter.lead_lawyer_id || '',
      custom_rate: matter.custom_rate?.toString() || '',
      originators: orig.data || [], assigned_lawyers: (lawyers.data || []).map(l => l.user_id),
    })
    setError(''); setShowModal(true)
  }

  function openCreate() {
    setEditing(null); setForm(emptyForm); setError(''); setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.client_id) {
      setError(es ? 'Título y cliente son obligatorios' : 'Title and client are required'); return
    }
    setSaving(true); setError('')
    const sb = createClient()
    const payload = {
      title: form.title.trim(), matter_type: form.matter_type, status: form.status,
      client_id: form.client_id, lead_lawyer_id: form.lead_lawyer_id || null,
      custom_rate: form.custom_rate ? parseFloat(form.custom_rate) : null, firm_id: firmId,
    }

    let matterId: string
    if (editing) {
      const { error: err } = await sb.from('matters').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); setSaving(false); return }
      matterId = editing.id
    } else {
      const { data, error: err } = await sb.from('matters').insert(payload).select('id').single()
      if (err || !data) { setError(err?.message || 'Error'); setSaving(false); return }
      matterId = data.id
    }

    // Sync originators
    await sb.from('matter_originators').delete().eq('matter_id', matterId)
    if (form.originators.length > 0) {
      await sb.from('matter_originators').insert(
        form.originators.map(o => ({ matter_id: matterId, user_id: o.user_id, percentage: o.percentage }))
      )
    }

    // Sync assigned lawyers
    await sb.from('matter_lawyers').delete().eq('matter_id', matterId)
    if (form.assigned_lawyers.length > 0) {
      await sb.from('matter_lawyers').insert(
        form.assigned_lawyers.map(uid => ({ matter_id: matterId, user_id: uid }))
      )
    }

    setSaving(false); setShowModal(false); loadData()
  }

  function addOriginator() {
    setForm({ ...form, originators: [...form.originators, { user_id: '', percentage: 100 }] })
  }
  function removeOriginator(i: number) {
    setForm({ ...form, originators: form.originators.filter((_, idx) => idx !== i) })
  }
  function updateOriginator(i: number, field: string, val: string) {
    const o = [...form.originators]
    if (field === 'user_id') o[i].user_id = val
    else o[i].percentage = parseFloat(val) || 0
    setForm({ ...form, originators: o })
  }
  function toggleLawyer(uid: string) {
    const a = form.assigned_lawyers.includes(uid)
      ? form.assigned_lawyers.filter(id => id !== uid)
      : [...form.assigned_lawyers, uid]
    setForm({ ...form, assigned_lawyers: a })
  }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = es
      ? { intake: 'Ingreso', active: 'Activo', suspended: 'Suspendido', closed: 'Cerrado' }
      : { intake: 'Intake', active: 'Active', suspended: 'Suspended', closed: 'Closed' }
    return map[s] || s
  }
  const statusColor = (s: string) => {
    const c: Record<string, string> = {
      intake: 'bg-blue-50 text-blue-700', active: 'bg-green-50 text-green-700',
      suspended: 'bg-amber-50 text-amber-700', closed: 'bg-gray-100 text-gray-600',
    }
    return c[s] || 'bg-gray-100 text-gray-600'
  }

  const filtered = matters
    .filter(m => statusFilter === 'all' || m.status === statusFilter)
    .filter(m =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.clients?.name?.toLowerCase().includes(search.toLowerCase())
    )

  const partners = users.filter(u => u.role === 'partner' || u.role === 'admin')

  const L = {
    title: es ? 'Asuntos' : 'Matters', new: es ? 'Nuevo asunto' : 'New matter',
    edit: es ? 'Editar asunto' : 'Edit matter', matterTitle: es ? 'Título' : 'Title',
    client: es ? 'Cliente' : 'Client', type: es ? 'Tipo' : 'Type',
    status: es ? 'Estado' : 'Status', lead: es ? 'Abogado principal' : 'Lead lawyer',
    rate: es ? 'Tarifa especial ($/hr)' : 'Custom rate ($/hr)',
    originators: es ? 'Socios originadores' : 'Originating partners',
    assigned: es ? 'Abogados asignados' : 'Assigned lawyers',
    addOrig: es ? '+ Agregar originador' : '+ Add originator',
    save: es ? 'Guardar' : 'Save', cancel: es ? 'Cancelar' : 'Cancel',
    search: es ? 'Buscar asuntos...' : 'Search matters...',
    all: es ? 'Todos' : 'All', noMatters: es ? 'No hay asuntos aún' : 'No matters yet',
    addFirst: es ? 'Creá tu primer asunto' : 'Create your first matter',
    selectClient: es ? 'Seleccionar cliente' : 'Select client',
    selectLead: es ? 'Seleccionar' : 'Select',
    pct: '%',
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{L.title}</h1>
        {canEdit && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-vexa-600 text-white rounded-lg text-sm font-medium hover:bg-vexa-700 transition-colors">
            <Plus size={16} />{L.new}
          </button>
        )}
      </div>

      {matters.length > 0 && (
        <div className="mt-4 flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={L.search}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="all">{L.all}</option>
            {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-center text-sm text-gray-500">Loading...</div>
      ) : matters.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Briefcase size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-900 font-medium">{L.noMatters}</p>
          <p className="text-sm text-gray-500 mt-1">{L.addFirst}</p>
        </div>
      ) : (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">{L.matterTitle}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{L.client}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{L.type}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{L.status}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{L.lead}</th>
                {canEdit && <th className="w-12"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{m.title}</td>
                  <td className="px-4 py-3 text-gray-600">{m.clients?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{m.matter_type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(m.status)}`}>
                      {statusLabel(m.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.users?.full_name || '—'}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(m)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400">
                        <Pencil size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 px-4 pt-12 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? L.edit : L.new}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-md">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.matterTitle} *</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.client} *</label>
                <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="">{L.selectClient}</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{L.type}</label>
                  <select value={form.matter_type} onChange={e => setForm({...form, matter_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white capitalize">
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{L.status}</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{L.lead}</label>
                  <select value={form.lead_lawyer_id} onChange={e => setForm({...form, lead_lawyer_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="">{L.selectLead}</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{L.rate}</label>
                  <input type="number" step="0.01" value={form.custom_rate}
                    onChange={e => setForm({...form, custom_rate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="0.00" />
                </div>
              </div>

              {/* Originators */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{L.originators}</label>
                {form.originators.map((o, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={o.user_id} onChange={e => updateOriginator(i, 'user_id', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      <option value="">{L.selectLead}</option>
                      {partners.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                    <input type="number" value={o.percentage} onChange={e => updateOriginator(i, 'pct', e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center" />
                    <span className="self-center text-sm text-gray-400">%</span>
                    <button onClick={() => removeOriginator(i)} className="p-2 text-gray-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={addOriginator} className="text-sm text-vexa-600 hover:text-vexa-700 font-medium">
                  {L.addOrig}
                </button>
              </div>

              {/* Assigned lawyers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{L.assigned}</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={form.assigned_lawyers.includes(u.id)}
                        onChange={() => toggleLawyer(u.id)} className="rounded border-gray-300" />
                      <span className="text-sm text-gray-700">{u.full_name}</span>
                      <span className="text-xs text-gray-400 capitalize">({u.role})</span>
                    </label>
                  ))}
                </div>
              </div>

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