'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { Plus, Search, X, Building2, Pencil } from 'lucide-react'

type Client = {
  id: string
  name: string
  tax_id: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
}

type FormData = {
  name: string
  tax_id: string
  email: string
  phone: string
  address: string
  notes: string
}

const emptyForm: FormData = { name: '', tax_id: '', email: '', phone: '', address: '', notes: '' }

export default function ClientsPage() {
  const { t, locale } = useI18n()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState<string>('')

  const loadClients = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('name')
    if (data) setClients(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadClients()
    async function loadRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
        if (data) setUserRole(data.role)
      }
    }
    loadRole()
  }, [loadClients])

  const canEdit = userRole === 'admin' || userRole === 'partner'

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  function openEdit(client: Client) {
    setEditing(client)
    setForm({
      name: client.name,
      tax_id: client.tax_id || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      notes: client.notes || '',
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError(locale === 'es' ? 'El nombre es obligatorio' : 'Name is required')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('firm_id').eq('id', user.id).single()
    if (!profile) return

    const payload = {
      name: form.name.trim(),
      tax_id: form.tax_id.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      firm_id: profile.firm_id,
    }

    if (editing) {
      const { error: err } = await supabase.from('clients').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('clients').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSaving(false)
    setShowModal(false)
    loadClients()
  }

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.tax_id && c.tax_id.includes(search)) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  )

  const labels = {
    title: locale === 'es' ? 'Clientes' : 'Clients',
    newClient: locale === 'es' ? 'Nuevo cliente' : 'New client',
    editClient: locale === 'es' ? 'Editar cliente' : 'Edit client',
    name: locale === 'es' ? 'Nombre / Razón social' : 'Name / Company',
    taxId: locale === 'es' ? 'CUIT / CUIL' : 'Tax ID / EIN',
    email: locale === 'es' ? 'Correo electrónico' : 'Email',
    phone: locale === 'es' ? 'Teléfono' : 'Phone',
    address: locale === 'es' ? 'Dirección' : 'Address',
    notes: locale === 'es' ? 'Notas' : 'Notes',
    save: locale === 'es' ? 'Guardar' : 'Save',
    cancel: locale === 'es' ? 'Cancelar' : 'Cancel',
    search: locale === 'es' ? 'Buscar clientes...' : 'Search clients...',
    noClients: locale === 'es' ? 'No hay clientes aún' : 'No clients yet',
    noResults: locale === 'es' ? 'No se encontraron resultados' : 'No results found',
    addFirst: locale === 'es' ? 'Agregá tu primer cliente para empezar' : 'Add your first client to get started',
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{labels.title}</h1>
        {canEdit && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-vexa-600 text-white rounded-lg text-sm font-medium hover:bg-vexa-700 transition-colors"
          >
            <Plus size={16} />
            {labels.newClient}
          </button>
        )}
      </div>

      {clients.length > 0 && (
        <div className="mt-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.search}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-center text-sm text-gray-500">{t('common.loading')}</div>
      ) : clients.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Building2 size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-900 font-medium">{labels.noClients}</p>
          <p className="text-sm text-gray-500 mt-1">{labels.addFirst}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 text-center text-sm text-gray-500">{labels.noResults}</div>
      ) : (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">{labels.name}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{labels.taxId}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{labels.email}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{labels.phone}</th>
                {canEdit && <th className="w-12"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
                  <td className="px-4 py-3 text-gray-600">{client.tax_id || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{client.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{client.phone || '—'}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(client)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"
                      >
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? labels.editClient : labels.newClient}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-md">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels.name} *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{labels.taxId}</label>
                  <input
                    type="text"
                    value={form.tax_id}
                    onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="20-12345678-9"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{labels.phone}</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels.email}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels.address}</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels.notes}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {labels.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-vexa-600 text-white rounded-lg text-sm font-medium hover:bg-vexa-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '...' : labels.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}