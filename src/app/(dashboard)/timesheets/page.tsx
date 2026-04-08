'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { Plus, Search, X, FileText, ChevronRight, Eye, ArrowLeft } from 'lucide-react'

type Timesheet = {
  id:string; period_start:string; period_end:string; status:string
  total_billed_hours:number; total_billed_amount:number; total_expenses:number
  matter_id:string; created_by:string; payment_date:string|null; payment_method:string|null; payment_amount:number|null; payment_currency:string|null
  matters?:any; users?:any
}
type Matter = { id:string; title:string; custom_rate:number|null; client_id:string; clients?:any }
type ClientOption = { id:string; name:string }
type TimeEntry = { id:string; entry_date:string; hours_logged:number; description:string; is_billable:boolean; user_id:string; users?:any }
type Expense = { id:string; expense_date:string; category:string; amount:number; currency:string }
type ItemEdit = { time_entry_id:string; hours_billed:number; rate:number; user_id:string }

function hrsToHM(h:number){const hrs=Math.floor(h);const mins=Math.round((h-hrs)*60);return `${hrs}h ${String(mins).padStart(2,'0')}m`}

export default function TimesheetsPage(){
  const{locale}=useI18n()
  const es=locale==='es'
  const[tab,setTab]=useState<'view'|'create'>('view')
  const[timesheets,setTimesheets]=useState<Timesheet[]>([])
  const[matters,setMatters]=useState<Matter[]>([])
  const[clients,setClients]=useState<ClientOption[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[filterClient,setFilterClient]=useState('')
  const[filterStatus,setFilterStatus]=useState('all')
  const[firmId,setFirmId]=useState('')
  const[userId,setUserId]=useState('')

  // Create
  const[selClient,setSelClient]=useState('')
  const[selMatter,setSelMatter]=useState('')
  const[dateFrom,setDateFrom]=useState('')
  const[dateTo,setDateTo]=useState('')

  // Review
  const[step,setStep]=useState<'select'|'review'|'preview'>('select')
  const[reviewEntries,setReviewEntries]=useState<TimeEntry[]>([])
  const[reviewExpenses,setReviewExpenses]=useState<Expense[]>([])
  const[itemEdits,setItemEdits]=useState<ItemEdit[]>([])
  const[saving,setSaving]=useState(false)
  const[error,setError]=useState('')

  // Detail
  const[detail,setDetail]=useState<Timesheet|null>(null)
  const[statusSaving,setStatusSaving]=useState(false)
  const[payDate,setPayDate]=useState('')
  const[payMethod,setPayMethod]=useState('')
  const[payAmount,setPayAmount]=useState('')
  const[payCurrency,setPayCurrency]=useState('ARS')

  const loadData=useCallback(async()=>{
    const sb=createClient()
    const{data:{user}}=await sb.auth.getUser()
    if(!user)return
    const{data:p}=await sb.from('users').select('firm_id').eq('id',user.id).single()
    if(!p)return
    setUserId(user.id);setFirmId(p.firm_id)
    const[ts,m,c]=await Promise.all([
      sb.from('timesheets').select('*, matters(title, client_id, clients(name)), users!timesheets_created_by_fkey(full_name)').order('created_at',{ascending:false}),
      sb.from('matters').select('id, title, custom_rate, client_id, clients(name)').order('title'),
      sb.from('clients').select('id, name').order('name'),
    ])
    if(ts.data)setTimesheets(ts.data as any)
    if(m.data)setMatters(m.data as any)
    if(c.data)setClients(c.data)
    setLoading(false)
  },[])

  useEffect(()=>{loadData()},[loadData])

  const clientMatters=selClient?matters.filter(m=>m.client_id===selClient):matters

  async function loadForReview(){
    if(!selMatter||!dateFrom||!dateTo){setError(es?'Completá todos los campos':'Fill all fields');return}
    setError('')
    const sb=createClient()
    const matter=matters.find(m=>m.id===selMatter)
    const matterRate=matter?.custom_rate||0
    const{data:mLawyers}=await sb.from('matter_lawyers').select('user_id, custom_rate').eq('matter_id',selMatter)
    const lawyerRateMap:Record<string,number>={}
    mLawyers?.forEach((ml:any)=>{if(ml.custom_rate)lawyerRateMap[ml.user_id]=ml.custom_rate})

    const{data:te}=await sb.from('time_entries').select('*, users!time_entries_user_id_fkey(full_name, hourly_rate)').eq('matter_id',selMatter).eq('is_billable',true).gte('entry_date',dateFrom).lte('entry_date',dateTo).order('entry_date')
    const{data:existingItems}=await sb.from('timesheet_items').select('time_entry_id')
    const billedIds=new Set((existingItems||[]).map((i:any)=>i.time_entry_id))
    const unbilled=(te||[]).filter((e:any)=>!billedIds.has(e.id))

    const{data:ex}=await sb.from('expenses').select('*').eq('matter_id',selMatter).gte('expense_date',dateFrom).lte('expense_date',dateTo).order('expense_date')
    const{data:existingExp}=await sb.from('timesheet_expenses').select('expense_id')
    const billedExpIds=new Set((existingExp||[]).map((i:any)=>i.expense_id))
    const unbilledExp=(ex||[]).filter((e:any)=>!billedExpIds.has(e.id))

    setReviewEntries(unbilled as any)
    setItemEdits(unbilled.map((e:any)=>{
      const rate=lawyerRateMap[e.user_id]||matterRate||e.users?.hourly_rate||0
      return{time_entry_id:e.id,hours_billed:e.hours_logged,rate,user_id:e.user_id}
    }))
    setReviewExpenses(unbilledExp as any)
    setStep('review')
  }

  function updateItem(i:number,field:string,val:string){
    const items=[...itemEdits]
    if(field==='hours')items[i].hours_billed=parseFloat(val)||0
    if(field==='rate')items[i].rate=parseFloat(val)||0
    setItemEdits(items)
  }

  function goToPreview(){setStep('preview')}
  function goBackToReview(){setStep('review')}

  async function saveTimesheet(){
    setSaving(true);setError('')
    const sb=createClient()
    const totalHrs=itemEdits.reduce((s,i)=>s+i.hours_billed,0)
    const totalAmt=itemEdits.reduce((s,i)=>s+i.hours_billed*i.rate,0)
    const totalExp=reviewExpenses.reduce((s,e)=>s+e.amount,0)
    const{data:ts,error:err}=await sb.from('timesheets').insert({firm_id:firmId,matter_id:selMatter,created_by:userId,period_start:dateFrom,period_end:dateTo,status:'draft',total_billed_hours:totalHrs,total_billed_amount:totalAmt,total_expenses:totalExp}).select('id').single()
    if(err||!ts){setError(err?.message||'Error');setSaving(false);return}
    if(itemEdits.length>0){await sb.from('timesheet_items').insert(itemEdits.filter(i=>i.hours_billed>0).map(i=>({timesheet_id:ts.id,time_entry_id:i.time_entry_id,user_id:i.user_id,hours_billed:i.hours_billed,rate_applied:i.rate,amount:i.hours_billed*i.rate})))}
    if(reviewExpenses.length>0){await sb.from('timesheet_expenses').insert(reviewExpenses.map(e=>({timesheet_id:ts.id,expense_id:e.id,amount_billed:e.amount})))}
    setSaving(false);setStep('select');setTab('view');loadData()
  }

  async function advanceStatus(ts:Timesheet,newStatus:string){
    setStatusSaving(true)
    const sb=createClient()
    const update:any={status:newStatus}
    if(newStatus==='paid'){update.payment_date=payDate||new Date().toISOString().slice(0,10);update.payment_method=payMethod||null;update.payment_amount=payAmount?parseFloat(payAmount):ts.total_billed_amount+ts.total_expenses;update.payment_currency=payCurrency}
    await sb.from('timesheets').update(update).eq('id',ts.id)
    setStatusSaving(false);setDetail(null);loadData()
  }

  const statusLabel=(s:string)=>(es?{draft:'Borrador',sent:'Enviado',approved:'Aprobado',invoice_issued:'Factura emitida',paid:'Pagado',unpaid:'Impago'}:{draft:'Draft',sent:'Sent',approved:'Approved',invoice_issued:'Invoice issued',paid:'Paid',unpaid:'Unpaid'})[s]||s
  const statusColor=(s:string)=>({draft:'bg-gray-100 text-gray-600',sent:'bg-blue-50 text-blue-700',approved:'bg-purple-50 text-purple-700',invoice_issued:'bg-amber-50 text-amber-700',paid:'bg-green-50 text-green-700',unpaid:'bg-red-50 text-red-700'})[s]||'bg-gray-100 text-gray-600'
  const nextStatus=(s:string):string|null=>({draft:'sent',sent:'approved',approved:'invoice_issued',invoice_issued:'paid',unpaid:'paid'})[s]||null

  const filtered=timesheets.filter(t=>{
    if(filterClient&&t.matters?.client_id!==filterClient)return false
    if(filterStatus!=='all'&&t.status!==filterStatus)return false
    if(search){const s=search.toLowerCase();return t.matters?.title?.toLowerCase().includes(s)||t.matters?.clients?.name?.toLowerCase().includes(s)}
    return true
  })

  const totalHrs=itemEdits.reduce((s,i)=>s+i.hours_billed,0)
  const totalAmt=itemEdits.reduce((s,i)=>s+i.hours_billed*i.rate,0)
  const totalExp=reviewExpenses.reduce((s,e)=>s+e.amount,0)

  const L={
    timesheets:es?'Timesheets':'Timesheets',create:es?'Crear':'Create',view:es?'Ver':'View',
    new:es?'Nuevo timesheet':'New timesheet',client:es?'Cliente':'Client',matter:es?'Asunto':'Matter',
    from:es?'Desde':'From',to:es?'Hasta':'To',pull:es?'Buscar horas y gastos':'Pull hours & expenses',
    review:es?'Revisión — Ajustar horas':'Review — Adjust hours',preview:es?'Vista previa':'Preview',
    lawyer:es?'Abogado':'Lawyer',desc:es?'Descripción':'Description',
    logged:es?'Logueadas':'Logged',billed:es?'A facturar':'To bill',rate:es?'Tarifa':'Rate',
    subtotal:'Subtotal',expenses:es?'Gastos':'Expenses',
    totalHrs:es?'Total horas':'Total hours',totalAmt:es?'Total honorarios':'Total fees',
    totalExp:es?'Total gastos':'Total expenses',grand:es?'Gran total':'Grand total',
    save:es?'Confirmar y crear':'Confirm & create',cancel:es?'Cancelar':'Cancel',
    back:es?'Volver a editar':'Back to edit',next:es?'Vista previa':'Preview',
    search:es?'Buscar...':'Search...',none:es?'No hay timesheets':'No timesheets',
    select:es?'Seleccionar':'Select',all:es?'Todos':'All',allClients:es?'Todos los clientes':'All clients',
    advance:es?'Avanzar a':'Advance to',markUnpaid:es?'Marcar impago':'Mark unpaid',
    payDate:es?'Fecha pago':'Pay date',payMethod:es?'Método':'Method',payAmt:es?'Monto':'Amount',
    period:es?'Período':'Period',status:es?'Estado':'Status',
    noEntries:es?'No hay horas sin facturar en este período':'No unbilled hours in this period',
  }

  // DETAIL VIEW
  if(detail){
    const next=nextStatus(detail.status)
    const total=detail.total_billed_amount+detail.total_expenses
    return(
      <div>
        <button onClick={()=>setDetail(null)} className="flex items-center gap-1 text-sm text-vexa-600 hover:text-vexa-700 mb-4"><ArrowLeft size={14}/>{L.timesheets}</button>
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
          <h2 className="text-lg font-semibold">{detail.matters?.title}</h2>
          <p className="text-sm text-gray-500">{detail.matters?.clients?.name}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">{L.period}:</span> <span className="font-medium">{detail.period_start} → {detail.period_end}</span></div>
            <div><span className="text-gray-500">{L.status}:</span> <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(detail.status)}`}>{statusLabel(detail.status)}</span></div>
            <div><span className="text-gray-500">{L.totalHrs}:</span> <span className="font-medium">{hrsToHM(detail.total_billed_hours||0)}</span></div>
            <div><span className="text-gray-500">{L.totalAmt}:</span> <span className="font-medium">{detail.total_billed_amount?.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
            <div><span className="text-gray-500">{L.totalExp}:</span> <span className="font-medium">{detail.total_expenses?.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
            <div><span className="text-gray-500">{L.grand}:</span> <span className="font-semibold">{total.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
          </div>
          {detail.payment_date&&<div className="text-sm border-t pt-3 border-gray-100"><span className="text-gray-500">{L.payDate}:</span> {detail.payment_date} {detail.payment_method&&`(${detail.payment_method})`} {detail.payment_currency||''} {detail.payment_amount?.toLocaleString(undefined,{minimumFractionDigits:2})}</div>}
          {next&&(
            <div className="border-t pt-4 border-gray-100 space-y-3">
              {next==='paid'&&(
                <div className="grid grid-cols-4 gap-2">
                  <input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"/>
                  <input type="text" value={payMethod} onChange={e=>setPayMethod(e.target.value)} placeholder={L.payMethod} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"/>
                  <select value={payCurrency} onChange={e=>setPayCurrency(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="ARS">ARS</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="BRL">BRL</option></select>
                  <input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder={L.payAmt} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"/>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={()=>advanceStatus(detail,next)} disabled={statusSaving} className="px-4 py-2 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600 disabled:opacity-50">{statusSaving?'...':`${L.advance} ${statusLabel(next)}`}</button>
                {(detail.status==='invoice_issued')&&<button onClick={()=>advanceStatus(detail,'unpaid')} disabled={statusSaving} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">{L.markUnpaid}</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // CREATE TAB
  if(tab==='create'){
    // SELECT step
    if(step==='select'){
      return(
        <div>
          <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
            <button onClick={()=>setTab('view')} className="pb-3 text-sm text-gray-500 hover:text-gray-700">{L.view}</button>
            <button className="pb-3 text-sm font-medium text-vexa-600 border-b-2 border-vexa-600">{L.create}</button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-lg">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.client}</label>
              <select value={selClient} onChange={e=>{setSelClient(e.target.value);setSelMatter('')}} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="">{L.allClients}</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.matter} *</label>
              <select value={selMatter} onChange={e=>setSelMatter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="">{L.select}</option>
                {clientMatters.map(m=><option key={m.id} value={m.id}>{m.title}{m.clients?.name?` — ${m.clients.name}`:''}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.from}</label>
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.to}</label>
                <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/></div>
            </div>
            {error&&<p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button onClick={loadForReview} className="px-4 py-2 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600">{L.pull}</button>
          </div>
        </div>
      )
    }

    // REVIEW step (editable)
    if(step==='review'){
      return(
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">{L.review}</h2>
              <p className="text-sm text-gray-500">{matters.find(m=>m.id===selMatter)?.title} — {dateFrom} → {dateTo}</p>
            </div>
            <button onClick={()=>setStep('select')} className="text-sm text-gray-500 hover:text-gray-700">{L.cancel}</button>
          </div>
          {reviewEntries.length===0?<div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">{L.noEntries}</div>:(
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{L.lawyer}</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{L.desc}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">{L.logged}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 bg-vexa-50">{L.billed}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 bg-vexa-50">{L.rate}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 bg-vexa-50">{L.subtotal}</th>
                </tr></thead>
                <tbody>
                  {reviewEntries.map((e,i)=>(
                    <tr key={e.id} className="border-b border-gray-50">
                      <td className="px-3 py-2 text-gray-600">{e.users?.full_name}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{e.entry_date} — {e.description}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{hrsToHM(e.hours_logged)}</td>
                      <td className="px-3 py-2 text-right bg-vexa-50/30"><input type="number" step="0.25" value={itemEdits[i]?.hours_billed??0} onChange={ev=>updateItem(i,'hours',ev.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"/></td>
                      <td className="px-3 py-2 text-right bg-vexa-50/30"><input type="number" step="1" value={itemEdits[i]?.rate??0} onChange={ev=>updateItem(i,'rate',ev.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"/></td>
                      <td className="px-3 py-2 text-right font-medium bg-vexa-50/30">{((itemEdits[i]?.hours_billed||0)*(itemEdits[i]?.rate||0)).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {reviewExpenses.length>0&&(
            <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-medium text-sm text-gray-700">{L.expenses}</div>
              <table className="w-full text-sm"><tbody>
                {reviewExpenses.map(e=><tr key={e.id} className="border-b border-gray-50">
                  <td className="px-4 py-2 text-gray-600">{e.expense_date}</td><td className="px-4 py-2 text-gray-600">{e.category}</td>
                  <td className="px-4 py-2 text-right font-medium">{e.currency} {e.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                </tr>)}
              </tbody></table>
            </div>
          )}
          <div className="mt-4 flex justify-end"><button onClick={goToPreview} disabled={reviewEntries.length===0} className="px-4 py-2 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600 disabled:opacity-50">{L.next} →</button></div>
        </div>
      )
    }

    // PREVIEW step (read-only, confirm)
    if(step==='preview'){
      return(
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">{L.preview}</h2>
              <p className="text-sm text-gray-500">{matters.find(m=>m.id===selMatter)?.title} — {dateFrom} → {dateTo}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-2 font-medium text-gray-600">{L.lawyer}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">{L.desc}</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">{L.billed}</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">{L.rate}</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">{L.subtotal}</th>
              </tr></thead>
              <tbody>
                {reviewEntries.map((e,i)=>(
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="px-3 py-2 text-gray-600">{e.users?.full_name}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{e.entry_date} — {e.description}</td>
                    <td className="px-3 py-2 text-right font-medium">{hrsToHM(itemEdits[i]?.hours_billed||0)}</td>
                    <td className="px-3 py-2 text-right">{itemEdits[i]?.rate?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-medium">{((itemEdits[i]?.hours_billed||0)*(itemEdits[i]?.rate||0)).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reviewExpenses.length>0&&(
            <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-medium text-sm text-gray-700">{L.expenses}</div>
              <table className="w-full text-sm"><tbody>
                {reviewExpenses.map(e=><tr key={e.id} className="border-b border-gray-50">
                  <td className="px-4 py-2 text-gray-600">{e.expense_date}</td><td className="px-4 py-2 text-gray-600">{e.category}</td>
                  <td className="px-4 py-2 text-right font-medium">{e.currency} {e.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                </tr>)}
              </tbody></table>
            </div>
          )}
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 space-y-2 max-w-sm ml-auto">
            <div className="flex justify-between text-sm"><span className="text-gray-500">{L.totalHrs}</span><span className="font-medium">{hrsToHM(totalHrs)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">{L.totalAmt}</span><span className="font-medium">{totalAmt.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">{L.totalExp}</span><span className="font-medium">{totalExp.toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
            <div className="flex justify-between text-sm border-t pt-2 border-gray-200"><span className="font-semibold">{L.grand}</span><span className="font-semibold">{(totalAmt+totalExp).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
          </div>
          {error&&<p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="mt-4 flex justify-between">
            <button onClick={goBackToReview} className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft size={14}/>{L.back}</button>
            <button onClick={saveTimesheet} disabled={saving} className="px-4 py-2 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600 disabled:opacity-50">{saving?'...':L.save}</button>
          </div>
        </div>
      )
    }
  }

  // VIEW TAB (default)
  const STATUSES=['draft','sent','approved','invoice_issued','paid','unpaid']
  return(
    <div>
      <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
        <button className="pb-3 text-sm font-medium text-vexa-600 border-b-2 border-vexa-600">{L.view}</button>
        <button onClick={()=>{setTab('create');setStep('select');setSelClient('');setSelMatter('');setDateFrom('');setDateTo('');setError('')}} className="pb-3 text-sm text-gray-500 hover:text-gray-700">{L.create}</button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder={L.search} className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm"/>
        </div>
        <select value={filterClient} onChange={e=>setFilterClient(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">{L.allClients}</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="all">{L.all}</option>
          {STATUSES.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </div>
      {loading?<div className="mt-8 text-center text-sm text-gray-500">Loading...</div>
      :filtered.length===0?<div className="mt-12 text-center"><FileText size={28} className="text-gray-400 mx-auto mb-3"/><p className="text-gray-900 font-medium">{L.none}</p></div>
      :(
        <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">{L.matter}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{L.period}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{L.status}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">{L.grand}</th>
              <th className="w-10"></th>
            </tr></thead>
            <tbody>
              {filtered.map(t=>(
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={()=>setDetail(t)}>
                  <td className="px-4 py-3"><div className="font-medium text-gray-900">{t.matters?.title}</div><div className="text-xs text-gray-400">{t.matters?.clients?.name}</div></td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{t.period_start} → {t.period_end}</td>
                  <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(t.status)}`}>{statusLabel(t.status)}</span></td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{(t.total_billed_amount+t.total_expenses).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                  <td className="px-4 py-3"><ChevronRight size={16} className="text-gray-300"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
