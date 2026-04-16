'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'
import { Plus, Search, X, Building2, Pencil, ChevronRight, Briefcase, ShieldAlert } from 'lucide-react'

type Client = { id:string; name:string; tax_id:string|null; email:string|null; phone:string|null; address:string|null; notes:string|null }
type Matter = { id:string; title:string; status:string; is_restricted:boolean; is_billable:boolean; loading_language:string; requires_authorization:boolean; rate_currency:string; use_flat_rate:boolean; flat_rate:number|null; hour_cap:number|null; client_id:string }
type User = { id:string; full_name:string; role:string }
type Category = { id:string; name:string; default_rate:number }

type ClientForm = { name:string; tax_id:string; email:string; phone:string; address:string; notes:string }
type MatterForm = {
  title:string; status:string; is_billable:boolean; loading_language:string
  requires_authorization:boolean; rate_currency:string
  use_flat_rate:boolean; flat_rate:string; hour_cap:string
  is_restricted:boolean; restricted_associates:string[]
  originators:{user_id:string;percentage:number}[]
  lead_partners:{user_id:string;percentage:number}[]
  category_rates:{category_id:string;rate:string}[]
}

const emptyClientForm=():ClientForm=>({name:'',tax_id:'',email:'',phone:'',address:'',notes:''})
const emptyMatterForm=():MatterForm=>({title:'',status:'active',is_billable:true,loading_language:'es',requires_authorization:false,rate_currency:'USD',use_flat_rate:false,flat_rate:'',hour_cap:'',is_restricted:false,restricted_associates:[],originators:[],lead_partners:[],category_rates:[]})
const STATUSES=['active','suspended','closed']
const CURRENCIES=['USD','ARS','EUR']
const LANGS=[{code:'es',flag:'🇪🇸',label:'Español'},{code:'en',flag:'🇺🇸',label:'English'},{code:'pt',flag:'🇧🇷',label:'Português'}]

export default function ClientsPage(){
  const{locale}=useI18n()
  const es=locale==='es'
  const[clients,setClients]=useState<Client[]>([])
  const[matters,setMatters]=useState<Matter[]>([])
  const[users,setUsers]=useState<User[]>([])
  const[categories,setCategories]=useState<Category[]>([])
  const[search,setSearch]=useState('')
  const[loading,setLoading]=useState(true)
  const[expanded,setExpanded]=useState<string|null>(null)
  const[userRole,setUserRole]=useState('')
  const[firmId,setFirmId]=useState('')
  const[showClientModal,setShowClientModal]=useState(false)
  const[editingClient,setEditingClient]=useState<Client|null>(null)
  const[clientForm,setClientForm]=useState<ClientForm>(emptyClientForm())
  const[showMatterModal,setShowMatterModal]=useState(false)
  const[editingMatter,setEditingMatter]=useState<Matter|null>(null)
  const[matterForm,setMatterForm]=useState<MatterForm>(emptyMatterForm())
  const[matterClientId,setMatterClientId]=useState('')
  const[saving,setSaving]=useState(false)
  const[error,setError]=useState('')

  const loadData=useCallback(async()=>{
    const sb=createClient()
    const{data:{user}}=await sb.auth.getUser()
    if(!user)return
    const{data:p}=await sb.from('users').select('firm_id, role').eq('id',user.id).single()
    if(!p)return
    setUserRole(p.role);setFirmId(p.firm_id)
    const[c,m,u,cat]=await Promise.all([
      sb.from('clients').select('*').order('name'),
      sb.from('matters').select('*').order('title'),
      sb.from('users').select('id, full_name, role').eq('is_active',true).order('full_name'),
      sb.from('lawyer_categories').select('id, name, default_rate').order('sort_order'),
    ])
    if(c.data)setClients(c.data)
    if(m.data)setMatters(m.data as any)
    if(u.data)setUsers(u.data)
    if(cat.data)setCategories(cat.data)
    setLoading(false)
  },[])

  useEffect(()=>{loadData()},[loadData])
  const canEdit=userRole==='admin'||userRole==='partner'
  const partners=users.filter(u=>u.role==='partner'||u.role==='admin')
  const associates=users.filter(u=>u.role==='associate')
  function getClientMatters(cid:string){return matters.filter(m=>m.client_id===cid)}

  // Client CRUD
  function openCreateClient(){setEditingClient(null);setClientForm(emptyClientForm());setError('');setShowClientModal(true)}
  function openEditClient(c:Client,e:React.MouseEvent){e.stopPropagation();setEditingClient(c);setClientForm({name:c.name,tax_id:c.tax_id||'',email:c.email||'',phone:c.phone||'',address:c.address||'',notes:c.notes||''});setError('');setShowClientModal(true)}
  async function saveClient(){
    if(!clientForm.name.trim()){setError(es?'Nombre obligatorio':'Name required');return}
    setSaving(true);setError('')
    const sb=createClient()
    const payload={name:clientForm.name.trim(),tax_id:clientForm.tax_id.trim()||null,email:clientForm.email.trim()||null,phone:clientForm.phone.trim()||null,address:clientForm.address.trim()||null,notes:clientForm.notes.trim()||null,firm_id:firmId}
    if(editingClient){await sb.from('clients').update(payload).eq('id',editingClient.id)}
    else{await sb.from('clients').insert(payload)}
    setSaving(false);setShowClientModal(false);loadData()
  }

  // Matter CRUD
  function openCreateMatter(cid:string){
    setMatterClientId(cid);setEditingMatter(null)
    const f=emptyMatterForm()
    f.category_rates=categories.map(c=>({category_id:c.id,rate:c.default_rate.toString()}))
    setMatterForm(f);setError('');setShowMatterModal(true)
  }
  async function openEditMatter(m:Matter,e:React.MouseEvent){
    e.stopPropagation();setMatterClientId(m.client_id);setEditingMatter(m)
    const sb=createClient()
    const[orig,lp,lawyers,cr]=await Promise.all([
      sb.from('matter_originators').select('user_id, percentage').eq('matter_id',m.id),
      sb.from('matter_lead_partners').select('user_id, percentage').eq('matter_id',m.id),
      sb.from('matter_lawyers').select('user_id').eq('matter_id',m.id),
      sb.from('matter_category_rates').select('category_id, rate').eq('matter_id',m.id),
    ])
    const existingRates=(cr.data||[]).reduce((acc:Record<string,string>,r:any)=>{acc[r.category_id]=r.rate.toString();return acc},{})
    setMatterForm({
      title:m.title,status:m.status,is_billable:m.is_billable!==false,
      loading_language:m.loading_language||'es',requires_authorization:m.requires_authorization||false,
      rate_currency:m.rate_currency||'USD',use_flat_rate:m.use_flat_rate||false,
      flat_rate:m.flat_rate?.toString()||'',hour_cap:m.hour_cap?.toString()||'',
      is_restricted:m.is_restricted||false,
      restricted_associates:(lawyers.data||[]).map((l:any)=>l.user_id),
      originators:orig.data||[],lead_partners:lp.data||[],
      category_rates:categories.map(c=>({category_id:c.id,rate:existingRates[c.id]||c.default_rate.toString()})),
    })
    setError('');setShowMatterModal(true)
  }
  async function saveMatter(){
    if(!matterForm.title.trim()){setError(es?'Título obligatorio':'Title required');return}
    setSaving(true);setError('')
    const sb=createClient()
    const payload={
      title:matterForm.title.trim(),status:matterForm.status,client_id:matterClientId,
      is_billable:matterForm.is_billable,is_restricted:matterForm.is_restricted,
      loading_language:matterForm.loading_language,requires_authorization:matterForm.requires_authorization,
      rate_currency:matterForm.rate_currency,use_flat_rate:matterForm.use_flat_rate,
      flat_rate:matterForm.use_flat_rate&&matterForm.flat_rate?parseFloat(matterForm.flat_rate):null,
      hour_cap:matterForm.hour_cap?parseFloat(matterForm.hour_cap):null,
      custom_rate:null,firm_id:firmId,lead_lawyer_id:null,matter_type:'general',
    }
    let matterId:string
    if(editingMatter){
      const{error:err}=await sb.from('matters').update(payload).eq('id',editingMatter.id)
      if(err){setError(err.message);setSaving(false);return}
      matterId=editingMatter.id
    }else{
      const{data,error:err}=await sb.from('matters').insert(payload).select('id').single()
      if(err||!data){setError(err?.message||'Error');setSaving(false);return}
      matterId=data.id
    }
    // Originators
    await sb.from('matter_originators').delete().eq('matter_id',matterId)
    if(matterForm.originators.length>0){await sb.from('matter_originators').insert(matterForm.originators.filter(o=>o.user_id).map(o=>({matter_id:matterId,user_id:o.user_id,percentage:o.percentage})))}
    // Lead partners
    await sb.from('matter_lead_partners').delete().eq('matter_id',matterId)
    if(matterForm.lead_partners.length>0){await sb.from('matter_lead_partners').insert(matterForm.lead_partners.filter(o=>o.user_id).map(o=>({matter_id:matterId,user_id:o.user_id,percentage:o.percentage})))}
    // Restricted associates
    await sb.from('matter_lawyers').delete().eq('matter_id',matterId)
    if(matterForm.is_restricted&&matterForm.restricted_associates.length>0){await sb.from('matter_lawyers').insert(matterForm.restricted_associates.map(uid=>({matter_id:matterId,user_id:uid})))}
    // Category rates
    await sb.from('matter_category_rates').delete().eq('matter_id',matterId)
    if(!matterForm.use_flat_rate){
      const rateInserts=matterForm.category_rates.filter(r=>parseFloat(r.rate)>0).map(r=>({matter_id:matterId,category_id:r.category_id,rate:parseFloat(r.rate)}))
      if(rateInserts.length>0){await sb.from('matter_category_rates').insert(rateInserts)}
    }
    setSaving(false);setShowMatterModal(false);loadData()
  }

  const statusLabel=(s:string)=>(es?{active:'Activo',suspended:'Suspendido',closed:'Cerrado'}:{active:'Active',suspended:'Suspended',closed:'Closed'})[s]||s
  const statusColor=(s:string)=>({active:'bg-green-50 text-green-700',suspended:'bg-amber-50 text-amber-700',closed:'bg-gray-100 text-gray-600'})[s]||'bg-gray-100 text-gray-600'
  const langFlag=(code:string)=>LANGS.find(l=>l.code===code)?.flag||'🇪🇸'
  const filtered=clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||(c.tax_id&&c.tax_id.includes(search)))

  const L={
    title:es?'Clientes & Asuntos':'Clients & Matters',
    newClient:es?'Nuevo cliente':'New client',editClient:es?'Editar cliente':'Edit client',
    newMatter:es?'Nuevo asunto':'New matter',editMatter:es?'Editar asunto':'Edit matter',
    name:es?'Nombre / Razón social':'Name / Company',taxId:es?'Identificación tributaria':'Tax ID',
    email:'Email',phone:es?'Teléfono':'Phone',address:es?'Dirección':'Address',notes:es?'Notas':'Notes',
    matterTitle:es?'Título':'Title',status:es?'Estado':'Status',
    billable:es?'Facturable':'Billable',
    loadLang:es?'Idioma de carga':'Loading language',
    reqAuth:es?'Requiere autorización':'Requires authorization',
    reqAuthDesc:es?'El abogado deberá indicar quién autorizó':'Lawyer must indicate who authorized',
    rateCurrency:es?'Moneda':'Currency',
    useFlatRate:es?'Tarifa flat (igual para todos)':'Flat rate (same for all)',
    flatRate:es?'Tarifa flat':'Flat rate',
    rateByCategory:es?'Tarifa por categoría':'Rate per category',
    hourCap:es?'Tope de horas facturables':'Billable hours cap',
    hourCapDesc:es?'Descuento automático al superar este tope':'Auto-discount when exceeding this cap',
    originators:es?'Socios originadores':'Originating partners',
    leadPartners:es?'Socios que lideran':'Lead partners',
    leadDesc:es?'Socios que trabajan/dirigen el asunto':'Partners who work/lead the matter',
    addOrig:es?'+ Agregar':'+ Add',
    restricted:es?'Asunto restringido':'Restricted matter',
    restrictedDesc:es?'Solo los asociados seleccionados podrán ver y cargar horas':'Only selected associates can view and log hours',
    selectAssociates:es?'Asociados con acceso':'Associates with access',
    save:es?'Guardar':'Save',cancel:es?'Cancelar':'Cancel',
    search:es?'Buscar clientes...':'Search clients...',
    noClients:es?'No hay clientes':'No clients yet',noMatters:es?'Sin asuntos':'No matters',
    matters:es?'asuntos':'matters',select:es?'Seleccionar':'Select',
    taxPlaceholder:es?'Ej: CUIT, RUT, RFC, EIN':'E.g. CUIT, RUT, RFC, EIN',
  }

  // Partner selector component
  const PartnerList=({items,setItems,label,addLabel}:{items:{user_id:string;percentage:number}[];setItems:(v:any)=>void;label:string;addLabel:string})=>(
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {items.map((o,i)=>(
        <div key={i} className="flex gap-2 mb-2">
          <select value={o.user_id} onChange={e=>{const a=[...items];a[i].user_id=e.target.value;setItems(a)}} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"><option value="">{L.select}</option>{partners.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}</select>
          <input type="number" value={o.percentage} onChange={e=>{const a=[...items];a[i].percentage=parseFloat(e.target.value)||0;setItems(a)}} className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center"/>
          <span className="self-center text-sm text-gray-400">%</span>
          <button onClick={()=>setItems(items.filter((_:any,idx:number)=>idx!==i))} className="p-2 text-gray-400 hover:text-red-500"><X size={14}/></button>
        </div>
      ))}
      <button onClick={()=>setItems([...items,{user_id:'',percentage:100}])} className="text-sm text-vexa-500 hover:text-vexa-600 font-medium">{addLabel}</button>
    </div>
  )

  return(
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{L.title}</h1>
        {canEdit&&<button onClick={openCreateClient} className="flex items-center gap-2 px-4 py-2 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600"><Plus size={16}/>{L.newClient}</button>}
      </div>
      {clients.length>0&&(<div className="mt-4 relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder={L.search} className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm"/></div>)}
      {loading?<div className="mt-8 text-center text-sm text-gray-500">Loading...</div>
      :clients.length===0?<div className="mt-12 text-center"><Building2 size={28} className="text-gray-400 mx-auto mb-3"/><p className="text-gray-900 font-medium">{L.noClients}</p></div>
      :(<div className="mt-4 space-y-2">
          {filtered.map(client=>{
            const cm=getClientMatters(client.id);const isOpen=expanded===client.id
            return(<div key={client.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50/50" onClick={()=>setExpanded(isOpen?null:client.id)}>
                  <ChevronRight size={16} className={`text-gray-400 mr-3 transition-transform ${isOpen?'rotate-90':''}`}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3"><span className="font-medium text-gray-900">{client.name}</span>{client.tax_id&&<span className="text-xs text-gray-400">{client.tax_id}</span>}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{cm.length} {L.matters} · {client.email||''}{client.phone?` · ${client.phone}`:''}</div>
                  </div>
                  {canEdit&&<button onClick={e=>openEditClient(client,e)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 mr-1"><Pencil size={14}/></button>}
                </div>
                {isOpen&&(<div className="border-t border-gray-100 bg-gray-50/30 px-4 py-3">
                    {cm.length===0?<p className="text-sm text-gray-400 py-2">{L.noMatters}</p>:(<div className="space-y-1.5">{cm.map(m=>(
                        <div key={m.id} className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-100">
                          <Briefcase size={14} className="text-gray-400 flex-shrink-0"/>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900">{m.title}</span>
                            <span className="ml-2">{langFlag(m.loading_language)}</span>
                            {m.is_restricted&&<ShieldAlert size={12} className="inline ml-1 text-amber-500"/>}
                            {!m.is_billable&&<span className="text-xs text-gray-400 ml-1">(NF)</span>}
                          </div>
                          <span className="text-xs text-gray-400">{m.rate_currency}</span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(m.status)}`}>{statusLabel(m.status)}</span>
                          {canEdit&&<button onClick={e=>openEditMatter(m,e)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Pencil size={13}/></button>}
                        </div>
                      ))}</div>)}
                    {canEdit&&<button onClick={()=>openCreateMatter(client.id)} className="mt-2 flex items-center gap-1.5 text-sm text-vexa-500 hover:text-vexa-600 font-medium"><Plus size={14}/>{L.newMatter}</button>}
                  </div>)}
              </div>)
          })}
        </div>)}

      {/* CLIENT MODAL */}
      {showClientModal&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"><div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-semibold">{editingClient?L.editClient:L.newClient}</h2><button onClick={()=>setShowClientModal(false)} className="p-1 hover:bg-gray-100 rounded-md"><X size={18} className="text-gray-400"/></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.name} *</label><input type="text" value={clientForm.name} onChange={e=>setClientForm({...clientForm,name:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.taxId}</label><input type="text" value={clientForm.tax_id} onChange={e=>setClientForm({...clientForm,tax_id:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder={L.taxPlaceholder}/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.phone}</label><input type="text" value={clientForm.phone} onChange={e=>setClientForm({...clientForm,phone:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.email}</label><input type="email" value={clientForm.email} onChange={e=>setClientForm({...clientForm,email:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.address}</label><input type="text" value={clientForm.address} onChange={e=>setClientForm({...clientForm,address:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.notes}</label><textarea value={clientForm.notes} onChange={e=>setClientForm({...clientForm,notes:e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"/></div>
              {error&&<p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={()=>setShowClientModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{L.cancel}</button><button onClick={saveClient} disabled={saving} className="px-4 py-2 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600 disabled:opacity-50">{saving?'...':L.save}</button></div>
          </div></div>)}

      {/* MATTER MODAL */}
      {showMatterModal&&(<div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 px-4 pt-6 overflow-y-auto"><div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl mb-12">
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-semibold">{editingMatter?L.editMatter:L.newMatter}</h2><button onClick={()=>setShowMatterModal(false)} className="p-1 hover:bg-gray-100 rounded-md"><X size={18} className="text-gray-400"/></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.matterTitle} *</label><input type="text" value={matterForm.title} onChange={e=>setMatterForm({...matterForm,title:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/></div>

              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.status}</label><select value={matterForm.status} onChange={e=>setMatterForm({...matterForm,status:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">{STATUSES.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.rateCurrency}</label><select value={matterForm.rate_currency} onChange={e=>setMatterForm({...matterForm,rate_currency:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">{CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.loadLang}</label><select value={matterForm.loading_language} onChange={e=>setMatterForm({...matterForm,loading_language:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">{LANGS.map(l=><option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}</select></div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={matterForm.is_billable} onChange={e=>setMatterForm({...matterForm,is_billable:e.target.checked})} className="rounded border-gray-300"/><span className="text-sm text-gray-700">{L.billable}</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={matterForm.requires_authorization} onChange={e=>setMatterForm({...matterForm,requires_authorization:e.target.checked})} className="rounded border-gray-300"/><span className="text-sm text-gray-700">{L.reqAuth}</span></label>
              </div>
              {matterForm.requires_authorization&&<p className="text-xs text-gray-400 -mt-2">{L.reqAuthDesc}</p>}

              {/* Flat rate toggle + category rates */}
              <div className="border-t pt-4 border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer mb-3"><input type="checkbox" checked={matterForm.use_flat_rate} onChange={e=>setMatterForm({...matterForm,use_flat_rate:e.target.checked})} className="rounded border-gray-300"/><span className="text-sm font-medium text-gray-700">{L.useFlatRate}</span></label>
                {matterForm.use_flat_rate?(
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.flatRate} ({matterForm.rate_currency}/hr)</label><input type="number" step="1" value={matterForm.flat_rate} onChange={e=>setMatterForm({...matterForm,flat_rate:e.target.value})} className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="0"/></div>
                ):matterForm.category_rates.length>0&&(
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{L.rateByCategory} ({matterForm.rate_currency}/hr)</label>
                    <div className="space-y-2">{matterForm.category_rates.map((cr,i)=>{
                      const cat=categories.find(c=>c.id===cr.category_id)
                      return(<div key={cr.category_id} className="flex items-center gap-3"><span className="text-sm text-gray-700 flex-1">{cat?.name||'?'}</span><input type="number" step="1" value={cr.rate} onChange={e=>{const a=[...matterForm.category_rates];a[i].rate=e.target.value;setMatterForm({...matterForm,category_rates:a})}} className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right" placeholder="0"/><span className="text-xs text-gray-400">/hr</span></div>)
                    })}</div>
                  </div>
                )}
              </div>

              {/* Hour cap */}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{L.hourCap}</label>
                <input type="number" step="1" value={matterForm.hour_cap} onChange={e=>setMatterForm({...matterForm,hour_cap:e.target.value})} className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder={es?'Sin tope':'No cap'}/>
                {matterForm.hour_cap&&<p className="text-xs text-gray-400 mt-1">{L.hourCapDesc}</p>}
              </div>

              {/* Originators */}
              <div className="border-t pt-4 border-gray-100">
                <PartnerList items={matterForm.originators} setItems={(v:any)=>setMatterForm({...matterForm,originators:v})} label={L.originators} addLabel={L.addOrig}/>
              </div>

              {/* Lead partners */}
              <div className="border-t pt-4 border-gray-100">
                <p className="text-xs text-gray-400 mb-2">{L.leadDesc}</p>
                <PartnerList items={matterForm.lead_partners} setItems={(v:any)=>setMatterForm({...matterForm,lead_partners:v})} label={L.leadPartners} addLabel={L.addOrig}/>
              </div>

              {/* Restricted */}
              <div className="border-t pt-4 border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={matterForm.is_restricted} onChange={e=>setMatterForm({...matterForm,is_restricted:e.target.checked,restricted_associates:e.target.checked?matterForm.restricted_associates:[]})} className="rounded border-gray-300"/>
                  <div><span className="text-sm font-medium text-gray-900 flex items-center gap-1.5"><ShieldAlert size={14} className="text-amber-500"/>{L.restricted}</span><p className="text-xs text-gray-400 mt-0.5">{L.restrictedDesc}</p></div></label>
              </div>
              {matterForm.is_restricted&&(<div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{L.selectAssociates}</label>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {associates.map(u=>(<label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={matterForm.restricted_associates.includes(u.id)} onChange={()=>{const a=matterForm.restricted_associates.includes(u.id)?matterForm.restricted_associates.filter(id=>id!==u.id):[...matterForm.restricted_associates,u.id];setMatterForm({...matterForm,restricted_associates:a})}} className="rounded border-gray-300"/><span className="text-sm text-gray-700">{u.full_name}</span></label>))}
                  {associates.length===0&&<p className="text-xs text-gray-400 py-2 text-center">{es?'No hay asociados':'No associates'}</p>}
                </div>
              </div>)}

              {error&&<p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={()=>setShowMatterModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{L.cancel}</button><button onClick={saveMatter} disabled={saving} className="px-4 py-2 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600 disabled:opacity-50">{saving?'...':L.save}</button></div>
          </div></div>)}
    </div>
  )
}
