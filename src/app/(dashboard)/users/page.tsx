'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { Plus, X, Pencil, UserCog, Shield, ShieldCheck, User } from 'lucide-react'

type UserRecord = {
  id: string; email: string; full_name: string; role: string
  hourly_rate: number; expected_monthly_hours: number
  module_permissions: Record<string,boolean>; is_active: boolean
}
type Form = {
  full_name: string; email: string; password: string; role: string
  hourly_rate: string; expected_monthly_hours: string
  modules: Record<string,boolean>
}
const MODULES = ['clients','matters','time','expenses','timesheets','stats']
const defaultModules = { clients:true, matters:true, time:true, expenses:true, timesheets:false, stats:false }
const emptyForm = (): Form => ({
  full_name:'', email:'', password:'', role:'associate', hourly_rate:'0',
  expected_monthly_hours:'160', modules: {...defaultModules}
})

export default function UsersPage() {
  const { locale } = useI18n()
  const es = locale === 'es'
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<UserRecord|null>(null)
  const [form, setForm] = useState<Form>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const loadData = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: p } = await sb.from('users').select('firm_id, role').eq('id', user.id).single()
    if (!p) return
    setIsAdmin(p.role === 'admin')
    const { data } = await sb.from('users').select('*').order('full_name')
    if (data) setUsers(data as UserRecord[])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openCreate() { setEditing(null); setForm(emptyForm()); setError(''); setShowModal(true) }
  function openEdit(u: UserRecord) {
    setEditing(u)
    setForm({
      full_name: u.full_name, email: u.email, password: '', role: u.role,
      hourly_rate: u.hourly_rate.toString(), expected_monthly_hours: u.expected_monthly_hours.toString(),
      modules: u.module_permissions || {...defaultModules}
    })
    setError(''); setShowModal(true)
  }

  async function handleSave() {
    if (!form.full_name.trim() || !form.email.trim()) {
      setError(es ? 'Nombre y email son obligatorios' : 'Name and email are required'); return
    }
    if (!editing && (!form.password || form.password.length < 6)) {
      setError(es ? 'Contraseña de al menos 6 caracteres' : 'Password must be at least 6 characters'); return
    }
    setSaving(true); setError('')
    const sb = createClient()

    if (editing) {
      const { error: err } = await sb.from('users').update({
        full_name: form.full_name.trim(), role: form.role as any,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
        expected_monthly_hours: parseInt(form.expected_monthly_hours) || 160,
        module_permissions: form.modules,
      }).eq('id', editing.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      // Use server API to avoid logging out admin
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(), password: form.password,
          full_name: form.full_name.trim(), role: form.role,
          hourly_rate: parseFloat(form.hourly_rate) || 0,
          expected_monthly_hours: parseInt(form.expected_monthly_hours) || 160,
          module_permissions: form.modules,
        }),
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Error'); setSaving(false); return }
    }
    setSaving(false); setShowModal(false); loadData()
  }

  async function toggleActive(u: UserRecord) {
    const sb = createClient()
    await sb.from('users').update({ is_active: !u.is_active }).eq('id', u.id)
    loadData()
  }

  const roleIcon = (r: string) => {
    if (r === 'admin') return <ShieldCheck size={14} className="text-vexa-600" />
    if (r === 'partner') return <Shield size={14} className="text-purple-600" />
    return <User size={14} className="text-gray-400" />
  }
  const roleLabel = (r: string) => {
    const m: Record<string,string> = es
      ? { admin:'Administrador', partner:'Socio', associate:'Asociado' }
      : { admin:'Admin', partner:'Partner', associate:'Associate' }
    return m[r] || r
  }
  const modLabel = (m: string) => {
    const map: Record<string,string> = es
      ? { clients:'Clientes', matters:'Asuntos', time:'Horas', expenses:'Gastos', timesheets:'Timesheets', stats:'Estadísticas' }
      : { clients:'Clients', matters:'Matters', time:'Time', expenses:'Expenses', timesheets:'Timesheets', stats:'Stats' }
    return map[m] || m
  }

  if (!isAdmin) return <div className="text-center text-sm text-gray-500 mt-12">{es?'Sin acceso':'No access'}</div>

  const L = {
    title: es?'Usuarios':'Users', new: es?'Nuevo usuario':'New user',
    edit: es?'Editar usuario':'Edit user', name: es?'Nombre completo':'Full name',
    email: 'Email', password: es?'Contraseña':'Password', role: es?'Rol':'Role',
    rate: es?'Tarifa ($/hr)':'Rate ($/hr)', expected: es?'Horas esperadas/mes':'Expected hrs/month',
    modules: es?'Módulos habilitados':'Enabled modules',
    save: es?'Guardar':'Save', cancel: es?'Cancelar':'Cancel',
    active: es?'Activo':'Active',
    deactivate: es?'Desactivar':'Deactivate', activate: es?'Activar':'Activate',
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{L.title}</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-vexa-600 text-white rounded-lg text-sm font-medium hover:bg-vexa-700">
          <Plus size={16} />{L.new}
        </button>
      </div>
      {loading ? (
        <div className="mt-8 text-center text-sm text-gray-500">Loading...</div>
      ) : (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">{L.name}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{L.email}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{L.role}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{L.rate}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{L.active}</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={`border-b border-gray-50 ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 capitalize">{roleIcon(u.role)}{roleLabel(u.role)}</span></td>
                  <td className="px-4 py-3 text-right text-gray-600">${u.hourly_rate}</td>
                  <td className="px-4 py-3 text-center"><span className={`inline-block w-2 h-2 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></span></td>
                  <td className="px-4 py-3 flex gap-1 justify-end">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><Pencil size={15} /></button>
                    <button onClick={() => toggleActive(u)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400" title={u.is_active ? L.deactivate : L.activate}><UserCog size={15} /></button>
                  </td>
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
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-md"><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.name} *</label>
                <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.email} *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  disabled={!!editing} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" />
              </div>
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{L.password} *</label>
                  <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" minLength={6} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.role}</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="associate">{roleLabel('associate')}</option>
                  <option value="partner">{roleLabel('partner')}</option>
                  <option value="admin">{roleLabel('admin')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{L.rate}</label>
                  <input type="number" step="1" value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{L.expected}</label>
                  <input type="number" value={form.expected_monthly_hours} onChange={e => setForm({...form, expected_monthly_hours: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              {form.role !== 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{L.modules}</label>
                  <div className="grid grid-cols-2 gap-1">
                    {MODULES.map(m => (
                      <label key={m} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={form.modules[m] !== false}
                          onChange={e => setForm({...form, modules: {...form.modules, [m]: e.target.checked}})}
                          className="rounded border-gray-300" />
                        <span className="text-sm text-gray-700">{modLabel(m)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
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
