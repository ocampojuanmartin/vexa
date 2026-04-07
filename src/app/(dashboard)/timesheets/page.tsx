'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { Plus, Search, X, FileText, ChevronRight } from 'lucide-react'

type Timesheet = {
  id: string; period_start: string; period_end: string; status: string
  total_billed_hours: number; total_billed_amount: number; total_expenses: number
  matter_id: string; created_by: string; payment_date: string|null; payment_method: string|null; payment_amount: number|null
  matters?: { title: string; clients?: { name: string } }; users?: { full_name: string }
}
type Matter = { id: string; title: string; custom_rate: number|null; clients?: any }
type TimeEntry = {
  id: string; entry_date: string; hours_logged: number; description: string; is_billable: boolean; user_id: string
  users?: { full_name: string; hourly_rate: number }
}
type Expense = { id: string; expense_date: string; category: string; amount: number; currency: string }
type ItemEdit = { time_entry_id: string; hours_billed: number; rate: number; user_id: string }

const STATUSES = ['draft','sent','approved','invoice_issued','paid','unpaid']

export default function TimesheetsPage() {
  const { locale } = useI18n()
  const es = locale === 'es'
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [matters, setMatters] = useState<Matter[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [firmId, setFirmId] = useState('')
  const [userId, setUserId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selMatter, setSelMatter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reviewing, setReviewing] = useState<string|null>(null)
  const [reviewEntries, setReviewEntries] = useState<TimeEntry[]>([])
  const [reviewExpenses, setReviewExpenses] = useState<Expense[]>([])
  const [itemEdits, setItemEdits] = useState<ItemEdit[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<Timesheet|null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [payDate, setPayDate] = useState('')
  const [payMethod, setPayMethod] = useState('')
  const [payAmount, setPayAmount] = useState('')

  const loadData = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: p } = await sb.from('users').select('firm_id').eq('id', user.id).single()
    if (!p) return
    setUserId(user.id); setFirmId(p.firm_id)
    const { data: ts } = await sb.from('timesheets').select('*, matters(title, clients(name)), users!timesheets_created_by_fkey(full_name)').order('created_at', { ascending: false })
    if (ts) setTimesheets(ts as Timesheet[])
    const { data: m } = await sb.from('matters').select('id, title, custom_rate, clients(name)').order('title')
    if (m) setMatters(m as Matter[])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function loadForReview() {
    if (!selMatter || !dateFrom || !dateTo) { setError(es?'Completá todos los campos':'Fill all fields'); return }
    setError('')
    const sb = createClient()

    // Get matter custom rate
    const matter = matters.find(m => m.id === selMatter)
    const matterRate = matter?.custom_rate || 0

    // Get per-lawyer custom rates for this matter
    const { data: mLawyers } = await sb.from('matter_lawyers').select('user_id, custom_rate').eq('matter_id', selMatter)
    const lawyerRateMap: Record<string, number> = {}
    mLawyers?.forEach((ml: any) => { if (ml.custom_rate) lawyerRateMap[ml.user_id] = ml.custom_rate })

    const { data: te } = await sb.from('time_entries')
      .select('*, users!time_entries_user_id_fkey(full_name, hourly_rate)')
      .eq('matter_id', selMatter).eq('is_billable', true).eq('is_locked', false)
      .gte('entry_date', dateFrom).lte('entry_date', dateTo)
      .order('entry_date')
    // Also include locked entries that aren't yet in any timesheet
    const { data: teLocked } = await sb.from('time_entries')
      .select('*, users!time_entries_user_id_fkey(full_name, hourly_rate)')
      .eq('matter_id', selMatter).eq('is_billable', true).eq('is_locked', true)
      .gte('entry_date', dateFrom).lte('entry_date', dateTo)
      .order('entry_date')
    // Filter out entries already in a timesheet
    const allEntries = [...(te || []), ...(teLocked || [])]
    const { data: existingItems } = await sb.from('timesheet_items').select('time_entry_id')
    const billedIds = new Set((existingItems || []).map((i: any) => i.time_entry_id))
    const unbilledEntries = allEntries.filter(e => !billedIds.has(e.id))
    const { data: ex } = await sb.from('expenses')
      .select('*').eq('matter_id', selMatter)
      .gte('expense_date', dateFrom).lte('expense_date', dateTo)
      .order('expense_date')
    if (unbilledEntries) {
      setReviewEntries(unbilledEntries as TimeEntry[])
      setItemEdits(unbilledEntries.map((e: any) => {
        // Rate cascade: matter_lawyers custom > matter custom > user hourly
        const rate = lawyerRateMap[e.user_id] || matterRate || e.users?.hourly_rate || 0
        return { time_entry_id: e.id, hours_billed: e.hours_logged, rate, user_id: e.user_id }
      }))
    }
    if (ex) setReviewExpenses(ex as Expense[])
    setReviewing('new')
  }

  function updateItem(idx: number, field: string, val: string) {
    const items = [...itemEdits]
    if (field === 'hours') items[idx].hours_billed = parseFloat(val) || 0
    if (field === 'rate') items[idx].rate = parseFloat(val) || 0
    setItemEdits(items)
  }

  async function saveTimesheet() {
    setSaving(true); setError('')
    const sb = createClient()
    const totalHrs = itemEdits.reduce((s,i) => s + i.hours_billed, 0)
    const totalAmt = itemEdits.reduce((s,i) => s + i.hours_billed * i.rate, 0)
    const totalExp = reviewExpenses.reduce((s,e) => s + e.amount, 0)
    const { data: ts, error: err } = await sb.from('timesheets').insert({
      firm_id: firmId, matter_id: selMatter, created_by: userId,
      period_start: dateFrom, period_end: dateTo, status: 'draft',
      total_billed_hours: totalHrs, total_billed_amount: totalAmt, total_expenses: totalExp,
    }).select('id').single()
    if (err || !ts) { setError(err?.message || 'Error'); setSaving(false); return }
    if (itemEdits.length > 0) {
      await sb.from('timesheet_items').insert(
        itemEdits.filter(i => i.hours_billed > 0).map(i => ({
          timesheet_id: ts.id, time_entry_id: i.time_entry_id, user_id: i.user_id,
          hours_billed: i.hours_billed, rate_applied: i.rate, amount: i.hours_billed * i.rate,
        }))
      )
    }
    if (reviewExpenses.length > 0) {
      await sb.from('timesheet_expenses').insert(
        reviewExpenses.map(e => ({ timesheet_id: ts.id, expense_id: e.id, amount_billed: e.amount }))
      )
    }
    setSaving(false); setShowCreate(false); setReviewing(null); loadData()
  }

  async function advanceStatus(ts: Timesheet, newStatus: string) {
    setStatusSaving(true)
    const sb = createClient()
    const update: any = { status: newStatus }
    if (newStatus === 'paid') {
      update.payment_date = payDate || new Date().toISOString().slice(0,10)
      update.payment_method = payMethod || null
      update.payment_amount = payAmount ? parseFloat(payAmount) : ts.total_billed_amount + ts.total_expenses
    }
    await sb.from('timesheets').update(update).eq('id', ts.id)
    setStatusSaving(false); setDetail(null); loadData()
  }

  const statusLabel = (s: string) => {
    const m: Record<string,string> = es
      ? { draft:'Borrador', sent:'Enviado', approved:'Aprobado', invoice_issued:'Factura emitida', paid:'Pagado', unpaid:'Impago' }
      : { draft:'Draft', sent:'Sent', approved:'Approved', invoice_issued:'Invoice issued', paid:'Paid', unpaid:'Unpaid' }
    return m[s] || s
  }
  const statusColor = (s: string) => {
    const c: Record<string,string> = {
      draft:'bg-gray-100 text-gray-600', sent:'bg-blue-50 text-blue-700', approved:'bg-purple-50 text-purple-700',
      invoice_issued:'bg-amber-50 text-amber-700', paid:'bg-green-50 text-green-700', unpaid:'bg-red-50 text-red-700',
    }
    return c[s] || 'bg-gray-100 text-gray-600'
  }
  const nextStatus = (s: string): string|null => {
    const flow: Record<string,string> = { draft:'sent', sent:'approved', approved:'invoice_issued', invoice_issued:'paid' }
    return flow[s] || null
  }

  const filtered = timesheets.filter(t =>
    t.matters?.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.matters?.clients?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const L = {
    title: es?'Timesheets':'Timesheets', new: es?'Nuevo timesheet':'New timesheet',
    matter: es?'Asunto':'Matter', from: es?'Desde':'From', to: es?'Hasta':'To',
    pull: es?'Buscar horas y gastos':'Pull hours & expenses',
    review: es?'Revisión':'Review', lawyer: es?'Abogado':'Lawyer',
    desc: es?'Descripción':'Description', logged: es?'Logueadas':'Logged',
    billed: es?'A facturar':'To bill', rate: es?'Tarifa':'Rate',
    subtotal: es?'Subtotal':'Subtotal',
    expenses: es?'Gastos':'Expenses',
    totalHrs: es?'Total horas':'Total hours', totalAmt: es?'Total honorarios':'Total fees',
    totalExp: es?'Total gastos':'Total expenses', grand: es?'Gran total':'Grand total',
    save: es?'Crear timesheet':'Create timesheet', cancel: es?'Cancelar':'Cancel',
    search: es?'Buscar...':'Search...', none: es?'No hay timesheets':'No timesheets yet',
    select: es?'Seleccionar':'Select',
    advance: es?'Avanzar a':'Advance to', markUnpaid: es?'Marcar impago':'Mark unpaid',
    payDate: es?'Fecha de pago':'Payment date', payMethod: es?'Método':'Method', payAmt: es?'Monto pagado':'Amount paid',
    period: es?'Período':'Period', status: es?'Estado':'Status',
    noEntries: es?'No hay horas en este período':'No hours in this period',
  }

  // CREATE FLOW
  if (showCreate && !reviewing) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{L.new}</h1>
          <button onClick={() => setShowCreate(false)} className="text-sm text-gray-500 hover:text-gray-700">{L.cancel}</button>
        </div>
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{L.matter} *</label>
            <select value={selMatter} onChange={e => setSelMatter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">{L.select}</option>
              {matters.map(m => <option key={m.id} value={m.id}>{m.title} — {m.clients?.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{L.from}</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{L.to}</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button onClick={loadForReview}
            className="px-4 py-2 bg-vexa-600 text-white rounded-lg text-sm font-medium hover:bg-vexa-700">{L.pull}</button>
        </div>
      </div>
    )
  }

  // REVIEW FLOW
  if (reviewing === 'new') {
    const totalHrs = itemEdits.reduce((s,i) => s + i.hours_billed, 0)
    const totalAmt = itemEdits.reduce((s,i) => s + i.hours_billed * i.rate, 0)
    const totalExp = reviewExpenses.reduce((s,e) => s + e.amount, 0)
    return (
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{L.review}</h1>
          <button onClick={() => { setReviewing(null); setShowCreate(true) }} className="text-sm text-gray-500 hover:text-gray-700">{L.cancel}</button>
        </div>
        <p className="mt-2 text-sm text-gray-500">{matters.find(m=>m.id===selMatter)?.title} — {dateFrom} → {dateTo}</p>

        {reviewEntries.length === 0 ? (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">{L.noEntries}</div>
        ) : (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{L.lawyer}</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{L.desc}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">{L.logged}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 bg-vexa-50">{L.billed}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 bg-vexa-50">{L.rate}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 bg-vexa-50">{L.subtotal}</th>
                </tr>
              </thead>
              <tbody>
                {reviewEntries.map((e, i) => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="px-3 py-2 text-gray-600">{e.users?.full_name}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{e.entry_date} — {e.description}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{e.hours_logged.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right bg-vexa-50/30">
                      <input type="number" step="0.25" value={itemEdits[i]?.hours_billed ?? 0}
                        onChange={ev => updateItem(i, 'hours', ev.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                    </td>
                    <td className="px-3 py-2 text-right bg-vexa-50/30">
                      <input type="number" step="1" value={itemEdits[i]?.rate ?? 0}
                        onChange={ev => updateItem(i, 'rate', ev.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                    </td>
                    <td className="px-3 py-2 text-right font-medium bg-vexa-50/30">
                      {((itemEdits[i]?.hours_billed || 0) * (itemEdits[i]?.rate || 0)).toLocaleString(undefined,{minimumFractionDigits:2})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reviewExpenses.length > 0 && (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-medium text-sm text-gray-700">{L.expenses}</div>
            <table className="w-full text-sm">
              <tbody>
                {reviewExpenses.map(e => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="px-4 py-2 text-gray-600">{e.expense_date}</td>
                    <td className="px-4 py-2 text-gray-600">{e.category}</td>
                    <td className="px-4 py-2 text-right font-medium">{e.currency} {e.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 space-y-2 max-w-sm ml-auto">
          <div className="flex justify-between text-sm"><span className="text-gray-500">{L.totalHrs}</span><span className="font-medium">{totalHrs.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">{L.totalAmt}</span><span className="font-medium">{totalAmt.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">{L.totalExp}</span><span className="font-medium">{totalExp.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
          <div className="flex justify-between text-sm border-t pt-2 border-gray-200"><span className="font-semibold">{L.grand}</span><span className="font-semibold">{(totalAmt+totalExp).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={() => { setReviewing(null); setShowCreate(true) }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{L.cancel}</button>
          <button onClick={saveTimesheet} disabled={saving || reviewEntries.length===0}
            className="px-4 py-2 bg-vexa-600 text-white rounded-lg text-sm font-medium hover:bg-vexa-700 disabled:opacity-50">{saving ? '...' : L.save}</button>
        </div>
      </div>
    )
  }

  // DETAIL VIEW
  if (detail) {
    const next = nextStatus(detail.status)
    const total = detail.total_billed_amount + detail.total_expenses
    return (
      <div>
        <button onClick={() => setDetail(null)} className="text-sm text-vexa-600 hover:text-vexa-700 mb-4">← {L.title}</button>
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{detail.matters?.title}</h2>
          <p className="text-sm text-gray-500">{detail.matters?.clients?.name}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">{L.period}:</span> <span className="font-medium">{detail.period_start} → {detail.period_end}</span></div>
            <div><span className="text-gray-500">{L.status}:</span> <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(detail.status)}`}>{statusLabel(detail.status)}</span></div>
            <div><span className="text-gray-500">{L.totalHrs}:</span> <span className="font-medium">{detail.total_billed_hours?.toFixed(2)}</span></div>
            <div><span className="text-gray-500">{L.totalAmt}:</span> <span className="font-medium">{detail.total_billed_amount?.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
            <div><span className="text-gray-500">{L.totalExp}:</span> <span className="font-medium">{detail.total_expenses?.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
            <div><span className="text-gray-500">{L.grand}:</span> <span className="font-semibold">{total.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
          </div>
          {detail.payment_date && (
            <div className="text-sm border-t pt-3 border-gray-100">
              <span className="text-gray-500">{L.payDate}:</span> {detail.payment_date} {detail.payment_method && `(${detail.payment_method})`}
              {detail.payment_amount && <> — {detail.payment_amount.toLocaleString(undefined,{minimumFractionDigits:2})}</>}
            </div>
          )}
          {next && (
            <div className="border-t pt-4 border-gray-100 space-y-3">
              {next === 'paid' && (
                <div className="grid grid-cols-3 gap-2">
                  <input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                  <input type="text" value={payMethod} onChange={e=>setPayMethod(e.target.value)} placeholder={L.payMethod}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                  <input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder={L.payAmt}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => advanceStatus(detail, next)} disabled={statusSaving}
                  className="px-4 py-2 bg-vexa-600 text-white rounded-lg text-sm font-medium hover:bg-vexa-700 disabled:opacity-50">
                  {statusSaving ? '...' : `${L.advance} ${statusLabel(next)}`}
                </button>
                {detail.status === 'invoice_issued' && (
                  <button onClick={() => advanceStatus(detail, 'unpaid')} disabled={statusSaving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                    {L.markUnpaid}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // LIST VIEW
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{L.title}</h1>
        <button onClick={() => { setShowCreate(true); setSelMatter(''); setDateFrom(''); setDateTo(''); setError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-vexa-600 text-white rounded-lg text-sm font-medium hover:bg-vexa-700 transition-colors">
          <Plus size={16} />{L.new}
        </button>
      </div>
      {timesheets.length > 0 && (
        <div className="mt-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={L.search}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
        </div>
      )}
      {loading ? (
        <div className="mt-8 text-center text-sm text-gray-500">Loading...</div>
      ) : timesheets.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-900 font-medium">{L.none}</p>
        </div>
      ) : (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">{L.matter}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{L.period}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{L.status}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{L.grand}</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => setDetail(t)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{t.matters?.title}</div>
                    <div className="text-xs text-gray-400">{t.matters?.clients?.name}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{t.period_start} → {t.period_end}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(t.status)}`}>{statusLabel(t.status)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{(t.total_billed_amount + t.total_expenses).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                  <td className="px-4 py-3"><ChevronRight size={16} className="text-gray-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
