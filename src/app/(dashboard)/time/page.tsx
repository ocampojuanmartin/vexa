'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { ChevronLeft, ChevronRight, Pencil, Lock, Trash2, UserPlus, Check, X as XIcon } from 'lucide-react'

type TimeEntry = {
  id:string; entry_date:string; hours_logged:number; description:string
  is_billable:boolean; is_locked:boolean; matter_id:string; user_id:string
  authorized_by:string|null; matters?:any; users?:any
}
type Matter = { id:string; title:string; client_id?:string; is_billable?:boolean; loading_language?:string; requires_authorization?:boolean; clients?:any }
type ClientOption = { id:string; name:string }
type UserOption = { id:string; full_name:string }
type SharedEntry = { id:string; entry_date:string; hours_logged:number; description:string; from_user_id:string; matter_id:string; status:string; authorized_by:string|null; matters?:any; users?:any }

function daysInMonth(y:number,m:number){return new Date(y,m+1,0).getDate()}
function fmtDate(y:number,m:number,d:number){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function hrsToHM(h:number){const hrs=Math.floor(h);const mins=Math.round((h-hrs)*60);return `${hrs}h ${String(mins).padStart(2,'0')}m`}
function hmToDecimal(hrs:number,mins:number){return hrs+mins/60}

const MONTHS_ES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_EN=['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_ES=['DO','LU','MA','MI','JU','VI','SA']
const DAYS_EN=['SU','MO','TU','WE','TH','FR','SA']

export default function TimePage(){
  const{locale}=useI18n()
  const es=locale==='es'
  const now=new Date()
  const[year,setYear]=useState(now.getFullYear())
  const[month,setMonth]=useState(now.getMonth())
  const[selDay,setSelDay]=useState(now.getDate())
  const[entries,setEntries]=useState<TimeEntry[]>([])
  const[allEntries,setAllEntries]=useState<TimeEntry[]>([])
  const[matters,setMatters]=useState<Matter[]>([])
  const[clients,setClients]=useState<ClientOption[]>([])
  const[allUsers,setAllUsers]=useState<UserOption[]>([])
  const[loading,setLoading]=useState(true)
  const[userId,setUserId]=useState('')
  const[firmId,setFirmId]=useState('')
  const[userRole,setUserRole]=useState('')

  const[selClient,setSelClient]=useState('')
  const[selMatter,setSelMatter]=useState('')
  const[formHrs,setFormHrs]=useState(0)
  const[formMins,setFormMins]=useState(0)
  const[formDesc,setFormDesc]=useState('')
  const[formAuth,setFormAuth]=useState('')
  const[formShareWith,setFormShareWith]=useState('')
  const[editing,setEditing]=useState<TimeEntry|null>(null)
  const[editMatter,setEditMatter]=useState('')// for admin matter reassign
  const[saving,setSaving]=useState(false)
  const[error,setError]=useState('')

  // Shared entries pending
  const[pendingShared,setPendingShared]=useState<SharedEntry[]>([])

  const selDate=fmtDate(year,month,selDay)
  const MONTHS=es?MONTHS_ES:MONTHS_EN
  const DAYS=es?DAYS_ES:DAYS_EN
  const selectedMatter=matters.find(m=>m.id===selMatter)

  const loadData=useCallback(async()=>{
    const sb=createClient()
    const{data:{user}}=await sb.auth.getUser()
    if(!user)return
    const{data:p}=await sb.from('users').select('firm_id, role').eq('id',user.id).single()
    if(!p)return
    setUserId(user.id);setFirmId(p.firm_id);setUserRole(p.role)
    const monthStart=fmtDate(year,month,1)
    const monthEnd=fmtDate(year,month,daysInMonth(year,month))
    const isAdmin=p.role==='admin'||p.role==='partner'
    let q=sb.from('time_entries').select('*, matters(title, clients(name), loading_language, requires_authorization), users!time_entries_user_id_fkey(full_name)')
      .gte('entry_date',monthStart).lte('entry_date',monthEnd).order('entry_date')
    if(!isAdmin)q=q.eq('user_id',user.id)
    const{data}=await q
    if(data)setAllEntries(data as any)
    const[c,m,u]=await Promise.all([
      sb.from('clients').select('id, name').order('name'),
      sb.from('matters').select('id, title, client_id, is_billable, loading_language, requires_authorization, clients(name)').eq('status','active').order('title'),
      sb.from('users').select('id, full_name').eq('is_active',true).order('full_name'),
    ])
    if(c.data)setClients(c.data)
    if(m.data)setMatters(m.data as any)
    if(u.data)setAllUsers(u.data)
    // Load pending shared entries for this user (include authorized_by).
    const{data:shared}=await sb.from('shared_time_entries').select('id, entry_date, hours_logged, description, from_user_id, matter_id, status, authorized_by, matters(title), users!shared_time_entries_from_user_id_fkey(full_name)').eq('to_user_id',user.id).eq('status','pending')
    if(shared)setPendingShared(shared as any)
    setLoading(false)
  },[year,month])

  useEffect(()=>{loadData()},[loadData])
  useEffect(()=>{setEntries(allEntries.filter(e=>e.entry_date===selDate))},[allEntries,selDate])

  function prevMonth(){if(month===0){setMonth(11);setYear(year-1)}else setMonth(month-1);setSelDay(1)}
  function nextMonth(){if(month===11){setMonth(0);setYear(year+1)}else setMonth(month+1);setSelDay(1)}
  function getDayHours(day:number){const d=fmtDate(year,month,day);return allEntries.filter(e=>e.entry_date===d).reduce((s,e)=>s+e.hours_logged,0)}

  const filteredMatters=selClient?matters.filter(m=>m.client_id===selClient):matters

  function resetForm(){setSelClient('');setSelMatter('');setFormHrs(0);setFormMins(0);setFormDesc('');setFormAuth('');setFormShareWith('');setEditing(null);setEditMatter('');setError('')}

  function startEdit(e:TimeEntry){
    if(e.is_locked)return
    setEditing(e);setSelMatter(e.matter_id);setEditMatter(e.matter_id)
    const hrs=Math.floor(e.hours_logged);const mins=Math.round((e.hours_logged-hrs)*60)
    setFormHrs(hrs);setFormMins(mins);setFormDesc(e.description);setFormAuth(e.authorized_by||'');setError('')
  }

  async function handleSave(){
    if(!selMatter||!formDesc.trim()||(formHrs===0&&formMins===0)){setError(es?'Completá asunto, descripción y tiempo':'Fill matter, description and time');return}
    if(selectedMatter?.requires_authorization&&!formAuth.trim()){setError(es?'Indicá quién autorizó':'Indicate who authorized');return}
    setSaving(true);setError('')
    const sb=createClient()
    const ed=new Date(selDate)
    const{data:lock}=await sb.from('period_locks').select('id').eq('year',ed.getFullYear()).eq('month',ed.getMonth()+1).maybeSingle()
    if(lock&&!editing){setError(es?'Período bloqueado':'Period locked');setSaving(false);return}

    // If sharing with another user
    if(formShareWith&&!editing){
      const sharedPayload={firm_id:firmId,matter_id:selMatter,from_user_id:userId,to_user_id:formShareWith,entry_date:selDate,hours_logged:hmToDecimal(formHrs,formMins),description:formDesc.trim(),authorized_by:formAuth.trim()||null}
      const{error:err}=await sb.from('shared_time_entries').insert(sharedPayload)
      if(err){setError(err.message);setSaving(false);return}
      setSaving(false);resetForm();loadData();return
    }

    const matterId=editing&&editMatter?editMatter:selMatter
    const payload={entry_date:selDate,matter_id:matterId,description:formDesc.trim(),hours_logged:hmToDecimal(formHrs,formMins),is_billable:matters.find(m=>m.id===matterId)?.is_billable!==false,user_id:userId,firm_id:firmId,authorized_by:formAuth.trim()||null}
    if(editing){
      const{error:err}=await sb.from('time_entries').update(payload).eq('id',editing.id)
      if(err){setError(err.message);setSaving(false);return}
    }else{
      const{error:err}=await sb.from('time_entries').insert(payload)
      if(err){setError(err.message);setSaving(false);return}
    }
    setSaving(false);resetForm();loadData()
  }

  async function handleDelete(id:string){
    const sb=createClient()
    await sb.from('time_entries').delete().eq('id',id)
    loadData()
  }

  async function handleSharedAction(id:string,accept:boolean){
    const sb=createClient()
    const entry=pendingShared.find(s=>s.id===id)
    if(!entry)return
    if(accept){
      // Create entry for the accepting user (to_user), preserving matter billability and authorization.
      const matter=matters.find(m=>m.id===entry.matter_id)
      await sb.from('time_entries').insert({
        entry_date:entry.entry_date,matter_id:entry.matter_id,description:entry.description,
        hours_logged:entry.hours_logged,is_billable:matter?.is_billable!==false,
        user_id:userId,firm_id:firmId,authorized_by:entry.authorized_by||null,
      })
      await sb.from('shared_time_entries').update({status:'accepted'}).eq('id',id)
    }else{
      // Rejected: just mark as rejected. The original user can re-log on their own account if needed.
      await sb.from('shared_time_entries').update({status:'rejected'}).eq('id',id)
    }
    loadData()
  }

  const dayTotal=entries.reduce((s,e)=>s+e.hours_logged,0)
  const dayBillable=entries.filter(e=>e.is_billable).reduce((s,e)=>s+e.hours_logged,0)
  const dayNonBill=dayTotal-dayBillable
  const monthTotal=allEntries.reduce((s,e)=>s+e.hours_logged,0)
  const monthBillable=allEntries.filter(e=>e.is_billable).reduce((s,e)=>s+e.hours_logged,0)

  const firstDow=new Date(year,month,1).getDay()
  const days=daysInMonth(year,month)
  const calDays:(number|null)[]=[]
  for(let i=0;i<firstDow;i++)calDays.push(null)
  for(let i=1;i<=days;i++)calDays.push(i)
  const isToday=(d:number)=>d===now.getDate()&&month===now.getMonth()&&year===now.getFullYear()
  const canSeeAll=userRole==='admin'||userRole==='partner'
  const isAdmin=userRole==='admin'

  // Loading language labels
  const mLang=selectedMatter?.loading_language||'es'
  const langFlags:Record<string,string>={es:'🇪🇸',en:'🇺🇸',pt:'🇧🇷'}
  const descLabel=mLang==='pt'?'Descrição do trabalho (máx. 1000)':mLang==='en'?'Work description (max 1000)':'Descripción del trabajo (máx. 1000)'
  const descPlaceholder=mLang==='pt'?'Descreva o trabalho realizado...':mLang==='en'?'Describe the work done...':'Describí el trabajo realizado...'

  const L={
    insert:es?'Insertar':'Insert',editing_:es?'Guardar cambio':'Save edit',cancel:es?'Cancelar':'Cancel',
    client:es?'Cliente':'Client',matter:es?'Asunto':'Matter',hours:es?'Horas':'Hours',mins:es?'Minutos':'Minutes',
    totalNB:es?'Total no facturable':'Total non-billable',totalB:es?'Total facturable':'Total billable',totalDay:es?'Total del día':'Day total',
    periodNB:es?'Total período no fact.':'Period non-billable',periodB:es?'Total período fact.':'Period billable',
    periodTotal:es?`Total período ${MONTHS[month]}-${year}`:`Total period ${MONTHS[month]}-${year}`,
    selectMatter:es?'Seleccionar asunto':'Select matter',selectClient:es?'Todos los clientes':'All clients',
    editDay:es?`Editando el día ${selDate}`:`Editing day ${selDate}`,
    authBy:es?'Autorizado por':'Authorized by',
    shareWith:es?'Compartir con otro abogado':'Share with another lawyer',
    selectUser:es?'No compartir':'Don\'t share',
    pendingTitle:es?'Horas compartidas pendientes':'Pending shared hours',
    accept:es?'Aceptar':'Accept',reject:es?'Rechazar':'Reject',
    reassignMatter:es?'Reasignar a asunto':'Reassign to matter',
    delete:es?'Eliminar':'Delete',
  }

  return(
    <div className="flex gap-6 flex-wrap lg:flex-nowrap">
      {/* LEFT PANEL */}
      <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-xl border border-canvas-200 p-3 text-sm">
          <p className="font-medium text-ink-700">{es?'Período activo':'Active period'}: {MONTHS[month]}-{year}</p>
          <p className="text-ink-500 text-xs mt-1">{es?'Desde':'From'} {fmtDate(year,month,1)}</p>
          <p className="text-ink-500 text-xs">{es?'Hasta':'To'} {fmtDate(year,month,days)}</p>
        </div>
        <div className="bg-white rounded-xl border border-canvas-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="p-1 hover:bg-canvas-100 rounded"><ChevronLeft size={16}/></button>
            <span className="text-sm font-medium">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="p-1 hover:bg-canvas-100 rounded"><ChevronRight size={16}/></button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs">
            {DAYS.map(d=><div key={d} className="py-1 text-ink-500 font-medium">{d}</div>)}
            {calDays.map((d,i)=>{
              if(!d)return <div key={`e${i}`}/>
              const hrs=getDayHours(d);const sel=d===selDay;const today=isToday(d)
              return(<button key={d} onClick={()=>setSelDay(d)} className={`py-1.5 text-xs rounded-md transition-colors relative ${sel?'bg-vexa-600 text-white':today?'bg-vexa-50 text-vexa-700 font-bold':'hover:bg-canvas-100 text-ink-700'}`}>{d}{hrs>0&&!sel&&<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-vexa-400"></span>}</button>)
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-canvas-200 p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-ink-500">{L.totalNB}</span><span className="font-medium">{hrsToHM(dayNonBill)}</span></div>
          <div className="flex justify-between"><span className="text-ink-500">{L.totalB}</span><span className="font-medium">{hrsToHM(dayBillable)}</span></div>
          <div className="flex justify-between border-t pt-1 border-canvas-100"><span className="font-medium text-ink-700">{L.totalDay}</span><span className="font-bold">{hrsToHM(dayTotal)}</span></div>
        </div>
        <div className="bg-white rounded-xl border border-canvas-200 p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-ink-500">{L.periodNB}</span><span className="font-medium">{hrsToHM(monthTotal-monthBillable)}</span></div>
          <div className="flex justify-between"><span className="text-ink-500">{L.periodB}</span><span className="font-medium">{hrsToHM(monthBillable)}</span></div>
          <div className="flex justify-between border-t pt-1 border-canvas-100"><span className="font-medium text-ink-700">{L.periodTotal}</span><span className="font-bold">{hrsToHM(monthTotal)}</span></div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 min-w-0 space-y-4">
        <p className="text-sm text-ink-500 font-medium">{L.editDay}</p>

        {/* Pending shared entries */}
        {pendingShared.length>0&&(
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <p className="text-sm font-medium text-amber-800 mb-3">{L.pendingTitle}</p>
            {pendingShared.map(s=>(
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-amber-100 last:border-0">
                <div>
                  <p className="text-sm text-ink-900">{s.matters?.title} — {hrsToHM(s.hours_logged)}</p>
                  <p className="text-xs text-ink-500">{s.users?.full_name}: {s.description}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>handleSharedAction(s.id,true)} className="p-1.5 bg-green-600 text-white rounded-lg"><Check size={14}/></button>
                  <button onClick={()=>handleSharedAction(s.id,false)} className="p-1.5 bg-red-600 text-white rounded-lg"><XIcon size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Entry form */}
        <div className="bg-white rounded-xl border border-canvas-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4">
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-ink-700 mb-1">{L.client}</label>
                <select value={selClient} onChange={e=>{setSelClient(e.target.value);setSelMatter('')}} className="w-full px-3 py-2 border border-canvas-200 rounded-lg text-sm bg-white"><option value="">{L.selectClient}</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-ink-700 mb-1">{L.matter} {selectedMatter&&<span className="ml-1">{langFlags[mLang]||'🇪🇸'}</span>}</label>
                <select value={selMatter} onChange={e=>setSelMatter(e.target.value)} className="w-full px-3 py-2 border border-canvas-200 rounded-lg text-sm bg-white"><option value="">{L.selectMatter}</option>{filteredMatters.map(m=><option key={m.id} value={m.id}>{m.title}{m.clients?.name?` — ${m.clients.name}`:''}</option>)}</select></div>
              {/* Admin: matter reassign when editing */}
              {editing&&isAdmin&&(
                <div><label className="block text-xs font-medium text-ink-700 mb-1">{L.reassignMatter}</label>
                  <select value={editMatter} onChange={e=>setEditMatter(e.target.value)} className="w-full px-3 py-2 border border-canvas-200 rounded-lg text-sm bg-white">{matters.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></div>
              )}
              <div className="flex gap-3">
                <div className="flex-1"><label className="block text-xs font-medium text-ink-700 mb-1">{L.hours}</label><input type="number" min="0" max="24" value={formHrs} onChange={e=>setFormHrs(parseInt(e.target.value)||0)} className="w-full px-3 py-2 border border-canvas-200 rounded-lg text-sm"/></div>
                <div className="flex-1"><label className="block text-xs font-medium text-ink-700 mb-1">{L.mins}</label><input type="number" min="0" max="59" value={formMins} onChange={e=>setFormMins(parseInt(e.target.value)||0)} className="w-full px-3 py-2 border border-canvas-200 rounded-lg text-sm"/></div>
              </div>
              {/* Authorization */}
              {selectedMatter?.requires_authorization&&(
                <div><label className="block text-xs font-medium text-ink-700 mb-1">{L.authBy} *</label><input type="text" value={formAuth} onChange={e=>setFormAuth(e.target.value)} className="w-full px-3 py-2 border border-canvas-200 rounded-lg text-sm" placeholder={es?'Nombre de quien autorizó':'Name of authorizer'}/></div>
              )}
              {/* Share with */}
              {!editing&&(
                <div><label className="block text-xs font-medium text-ink-700 mb-1 flex items-center gap-1"><UserPlus size={13}/>{L.shareWith}</label>
                  <select value={formShareWith} onChange={e=>setFormShareWith(e.target.value)} className="w-full px-3 py-2 border border-canvas-200 rounded-lg text-sm bg-white"><option value="">{L.selectUser}</option>{allUsers.filter(u=>u.id!==userId).map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}</select></div>
              )}
            </div>
            <div className="flex flex-col">
              <label className="block text-xs font-medium text-ink-700 mb-1">{langFlags[mLang]||'🇪🇸'} {descLabel}</label>
              <textarea value={formDesc} onChange={e=>setFormDesc(e.target.value.slice(0,1000))} className="flex-1 w-full px-3 py-2 border border-canvas-200 rounded-lg text-sm resize-none min-h-[120px]" placeholder={descPlaceholder}/>
              <div className="text-right text-xs text-ink-500 mt-1">{formDesc.length}/1000</div>
            </div>
            <div className="flex flex-col justify-between">
              {error&&<p className="text-xs text-red-600 mb-2">{error}</p>}
              <div className="space-y-2">
                <button onClick={handleSave} disabled={saving} className="w-full px-4 py-2.5 bg-amber-500 text-white rounded-lg active:scale-[0.98] text-sm font-medium hover:bg-amber-600 disabled:opacity-50">{saving?'...':editing?L.editing_:formShareWith?(es?'Enviar para aprobación':'Send for approval'):L.insert}</button>
                {editing&&<button onClick={resetForm} className="w-full px-4 py-2 text-sm text-ink-700 hover:bg-canvas-100 rounded-lg">{L.cancel}</button>}
              </div>
            </div>
          </div>
        </div>

        {/* Day entries list */}
        {entries.length>0&&(
          <div className="bg-white rounded-xl border border-canvas-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-canvas-100 bg-canvas-100">
                <th className="text-left px-4 py-2 font-medium text-ink-700">{L.matter}</th>
                {canSeeAll&&<th className="text-left px-4 py-2 font-medium text-ink-700">{es?'Abogado':'Lawyer'}</th>}
                <th className="text-left px-4 py-2 font-medium text-ink-700">{es?'Descripción':'Description'}</th>
                <th className="text-right px-4 py-2 font-medium text-ink-700">{L.hours}</th>
                <th className="w-20"></th>
              </tr></thead>
              <tbody>
                {entries.map(e=>(
                  <tr key={e.id} className="border-b border-canvas-100 hover:bg-canvas-100/60">
                    <td className="px-4 py-2"><div className="font-medium text-ink-900 text-xs">{e.matters?.title}</div><div className="text-xs text-ink-500">{e.matters?.clients?.name}</div></td>
                    {canSeeAll&&<td className="px-4 py-2 text-xs text-ink-700">{e.users?.full_name}</td>}
                    <td className="px-4 py-2 text-xs text-ink-700 max-w-xs truncate">{e.description}{e.authorized_by&&<span className="ml-1 text-ink-500">[{e.authorized_by}]</span>}</td>
                    <td className="px-4 py-2 text-right text-xs font-medium">{hrsToHM(e.hours_logged)}{!e.is_billable&&<span className="ml-1 text-ink-500">(NB)</span>}</td>
                    <td className="px-4 py-2">
                      {e.is_locked?<Lock size={13} className="text-ink-300 mx-auto"/>:(
                        <div className="flex gap-1 justify-end">
                          <button onClick={()=>startEdit(e)} className="p-1 rounded hover:bg-canvas-100 text-ink-500"><Pencil size={13}/></button>
                          <button onClick={()=>handleDelete(e.id)} className="p-1 rounded hover:bg-canvas-100 text-red-400"><Trash2 size={13}/></button>
                        </div>
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
