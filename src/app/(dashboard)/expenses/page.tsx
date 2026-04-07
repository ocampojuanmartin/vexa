'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { Plus, Search, X, Receipt, Pencil, Lock } from 'lucide-react'

type Expense = {
  id: string; expense_date: string; category: string; amount: number; currency: string
  is_reimbursable: boolean; is_locked: boolean; matter_id: string; user_id: string; receipt_url: string|null
  matters?: { title: string; clients?: { name: string } }; users?: { full_name: string }
}
type Matter = { id: string; title: string; clients?: { name: string } }
type Form = { expense_date: string; matter_id: string; category: string; amount: string; currency: string; is_reimbursable: boolean }

const CATEGORIES = ['tasa_judicial','peritaje','viaticos','honorarios_perito','copias','notarial','mediacion','inscripcion','otros']
const CURRENCIES = ['ARS','USD','EUR','BRL']

const emptyForm = (): Form => ({
  expense_date: new Date().toISOString().slice(0,10), matter_id: '', category: 'otros', amount: '', currency: 'ARS', is_reimbursable: false
})

export default function ExpensesPage() {
  const { locale } = useI18n()
  const es = locale === 'es'
  const [entries, setEntries] = useState<Expense[]>([])
  const [matters, setMatters] = useState<Matter[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState<Form>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')
  const [firmId, setFirmId] = useState('')
  const [userRole, setUserRole] = useState('')

  const loadData = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: p } = await sb.from('users').select('firm_id, role').eq('id', user.id).single()
    if (!p) return
    setUserId(user.id); setFirmId(p.firm_id); setUserRole(p.role)
    const isAdmin = p.role === 'admin' || p.role === 'partner'
    let q = sb.from('expenses').select('*, matters(title, clients(name)), users!expenses_user_id_fkey(full_name)').order('expense_date', { ascending: false }).limit(200)
    if (!isAdmin) q = q.eq('user_id', user.id)
    const { data } = await q
    if (data) setEntries(data as Expense[])
    const { data: m } = await sb.from('matters').select('id, title, clients(name)').eq('status', 'active').order('title')
    if (m) setMatters(m as Matter[])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openCreate() { setEditing(null); setForm(emptyForm()); setError(''); setShowModal(true) }
  function openEdit(e: Expense) {
    if (e.is_locked) return
    setEditing(e)
    setForm({ expense_date: e.expense_date, matter_id: e.matter_id, category: e.category, amount: e.amount.toString(), currency: e.currency, is_reimbursable: e.is_reimbursable })
    setError(''); setShowModal(true)
  }

  async function handleSave() {
    if (!form.matter_id || !form.amount) {
      setError(es ? 'Asunto y monto son obligatorios' : 'Matter and amount are required'); return
    }
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) { setError(es ? 'Monto inválido' : 'Invalid amount'); return }
    setSaving(true); setError('')
    const sb = createClient()
    // Check period lock
    const expDate = new Date(form.expense_date)
    const { data: lock } = await sb.from('period_locks')
      .select('id').eq('year', expDate.getFullYear()).eq('month', expDate.getMonth() + 1).maybeSingle()
    if (lock && !editing) {
      setError(es ? 'Este período está bloqueado.' : 'This period is locked.')
      setSaving(false); return
    }
    const payload = {
      expense_date: form.expense_date, matter_id: form.matter_id, category: form.category,
      amount: amt, currency: form.currency, is_reimbursable: form.is_reimbursable,
      user_id: userId, firm_id: firmId,
    }
    if (editing) {
      const { error: err } = await sb.from('expenses').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await sb.from('expenses').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaving(false); setShowModal(false); loadData()
  }

  const catLabel = (c: string) => {
    const map: Record<string,string> = es
      ? { tasa_judicial:'Tasa judicial', peritaje:'Peritaje', viaticos:'Viáticos', honorarios_perito:'Honorarios perito', copias:'Copias', notarial:'Notarial', mediacion:'Mediación', inscripcion:'Inscripción', otros:'Otros' }
      : { tasa_judicial:'Court fee', peritaje:'Expert report', viaticos:'Travel', honorarios_perito:'Expert fees', copias:'Copies', notarial:'Notarial', mediacion:'Mediation', inscripcion:'Registration', otros:'Other' }
    return map[c] || c
  }

  const filtered = entries.filter(e =>
    e.category.toLowerCase().includes(search.toLowerCase()) ||
    e.matters?.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.matters?.clients?.name?.toLowerCase().includes(search.toLowerCase())
  )
  const total = filtered.reduce((s, e) => s + e.amount, 0)
  const canSeeAll = userRole === 'admin' || userRole === 'partner'

  const L = {
    title: es ? 'Gastos' : 'Expenses', new: es ? 'Nuevo gasto' : 'New expense',
    edit: es ? 'Editar gasto' : 'Edit expense', date: es ? 'Fecha' : 'Date',
    matter: es ? 'Asunto' : 'Matter', cat: es ? 'Categoría' : 'Category',
    amount: es ? 'Monto' : 'Amount', curr: es ? 'Moneda' : 'Currency',
    reimb: es ? 'Reembolsable' : 'Reimbursable',
    save: es ? 'Guardar' : 'Save', cancel: es ? 'Cancelar' : 'Cancel',
    search: es ? 'Buscar...' : 'Search...',
    none: es ? 'No hay gastos cargados' : 'No expenses yet',
    addFirst: es ? 'Cargá tu primer gasto' : 'Add your first expense',
    select: es ? 'Seleccionar asunto' : 'Select matter',
    total: es ? 'Total' : 'Total', lawyer: es ? 'Abogado' : 'Lawyer',
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{L.title}</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-vexa-600 text-white rounded-lg text-sm font-medium hover:bg-vexa-700 transition-colors">
          <Plus size={16} />{L.new}
        </button>
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
            <Receipt size={28} className="text-gray-400" />
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{L.cat}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">{L.amount}</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.expense_date}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{e.matters?.title}</div>
                      <div className="text-xs text-gray-400">{e.matters?.clients?.name}</div>
                    </td>
                    {canSeeAll && <td className="px-4 py-3 text-gray-600">{e.users?.full_name}</td>}
                    <td className="px-4 py-3 text-gray-600">{catLabel(e.category)}{e.is_reimbursable && <span className="ml-1 text-xs text-green-600">(R)</span>}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{e.currency} {e.amount.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td className="px-4 py-3">
                      {e.is_locked ? <Lock size={14} className="text-gray-300 mx-auto" /> : (
                        <button onClick={() => openEdit(e)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><Pencil size={15} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-right text-sm text-gray-500">
            {L.total}: <span className="font-semibold text-gray-900">{total.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? L.edit : L.new}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-md"><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{L.date}</label>
                  <input type="date" value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{L.cat}</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    {CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                  </select>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{L.amount} *</label>
                  <input type="number" step="0.01" min="0.01" value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{L.curr}</label>
                  <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_reimbursable}
                  onChange={e => setForm({...form, is_reimbursable: e.target.checked})} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">{L.reimb}</span>
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