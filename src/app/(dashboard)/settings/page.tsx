'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { Plus, X, Pencil, GripVertical } from 'lucide-react'

type Category = { id: string; name: string; default_rate: number; sort_order: number }
type DemoRequest = { id: string; full_name: string; email: string; firm_name: string; firm_size: string; created_at: string }

export default function SettingsPage() {
  const { locale } = useI18n()
  const es = locale === 'es'
  const [categories, setCategories] = useState<Category[]>([])
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [firmId, setFirmId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category|null>(null)
  const [formName, setFormName] = useState('')
  const [formRate, setFormRate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: p } = await sb.from('users').select('firm_id, role').eq('id', user.id).single()
    if (!p) return
    setFirmId(p.firm_id); setIsAdmin(p.role === 'admin')
    const { data } = await sb.from('lawyer_categories').select('*').order('sort_order')
    if (data) setCategories(data)
    const { data: dr } = await sb.from('demo_requests').select('*').order('created_at', { ascending: false })
    if (dr) setDemoRequests(dr)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openCreate() { setEditing(null); setFormName(''); setFormRate(''); setError(''); setShowModal(true) }
  function openEdit(c: Category) { setEditing(c); setFormName(c.name); setFormRate(c.default_rate.toString()); setError(''); setShowModal(true) }

  async function handleSave() {
    if (!formName.trim()) { setError(es?'Nombre obligatorio':'Name required'); return }
    setSaving(true); setError('')
    const sb = createClient()
    const payload = { name: formName.trim(), default_rate: parseFloat(formRate)||0, firm_id: firmId, sort_order: categories.length }
    if (editing) {
      await sb.from('lawyer_categories').update({ name: formName.trim(), default_rate: parseFloat(formRate)||0 }).eq('id', editing.id)
    } else {
      await sb.from('lawyer_categories').insert(payload)
    }
    setSaving(false); setShowModal(false); loadData()
  }

  async function deleteCategory(id: string) {
    const sb = createClient()
    await sb.from('lawyer_categories').delete().eq('id', id)
    loadData()
  }

  if (!isAdmin) return <div className="text-center text-sm text-gray-500 mt-12">{es?'Sin acceso':'No access'}</div>

  const L = {
    title: es?'Configuración':'Settings',
    catTitle: es?'Categorías de abogados':'Lawyer categories',
    catDesc: es?'Definí las categorías de tu estudio (ej: Socio, Asociado Senior, Asociado Junior, Counsel). Cada categoría tiene una tarifa por defecto.':'Define your firm categories (e.g. Partner, Senior Associate, Junior Associate, Counsel). Each has a default rate.',
    new: es?'Nueva categoría':'New category', edit: es?'Editar categoría':'Edit category',
    name: es?'Nombre':'Name', rate: es?'Tarifa por defecto ($/hr)':'Default rate ($/hr)',
    save: es?'Guardar':'Save', cancel: es?'Cancelar':'Cancel', delete: es?'Eliminar':'Delete',
    noCategories: es?'No hay categorías definidas':'No categories defined',
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{L.title}</h1>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">{L.catTitle}</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">{L.catDesc}</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600">
            <Plus size={16} />{L.new}
          </button>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-gray-500">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">{L.noCategories}</div>
        ) : (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{L.name}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">{L.rate}</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">${c.default_rate}</td>
                    <td className="px-4 py-3 flex gap-1 justify-end">
                      <button onClick={()=>openEdit(c)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><Pencil size={14}/></button>
                      <button onClick={()=>deleteCategory(c.id)} className="p-1.5 rounded-md hover:bg-gray-100 text-red-400"><X size={14}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DEMO REQUESTS */}
      {demoRequests.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{es ? 'Solicitudes de demo' : 'Demo requests'}</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{es ? 'Nombre' : 'Name'}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{es ? 'Estudio' : 'Firm'}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{es ? 'Tamaño' : 'Size'}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{es ? 'Fecha' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {demoRequests.map(d => (
                  <tr key={d.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{d.email}</td>
                    <td className="px-4 py-3 text-gray-600">{d.firm_name}</td>
                    <td className="px-4 py-3 text-gray-600">{d.firm_size}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(d.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{editing ? L.edit : L.new}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.name} *</label>
                <input type="text" value={formName} onChange={e=>setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder={es?'Ej: Socio Senior':'E.g. Senior Partner'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.rate}</label>
                <input type="number" step="1" value={formRate} onChange={e=>setFormRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{L.cancel}</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600 disabled:opacity-50">{saving?'...':L.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
