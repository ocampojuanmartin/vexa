'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/context'

function hrsToHM(h:number){const hrs=Math.floor(h);const mins=Math.round((h-hrs)*60);return `${hrs}h ${String(mins).padStart(2,'0')}m`}

type UserStat = {
  user_id:string; full_name:string; role:string; expected_monthly_hours:number
  hours_logged:number; hours_billed:number; revenue:number; collected:number; billed_total:number
}
type MatterStat = {
  matter_id:string; title:string; client_name:string; hours_logged:number; hours_billed:number
  revenue:number; originators: { name:string; percentage:number }[]
}
type PartnerEfficiency = {
  user_id:string; name:string; originated_revenue:number; originated_hours:number
  avg_rate:number; efficiency_ratio:number; matter_count:number
}

export default function StatsPage(){
  const{locale}=useI18n()
  const es=locale==='es'
  const[userStats,setUserStats]=useState<UserStat[]>([])
  const[matterStats,setMatterStats]=useState<MatterStat[]>([])
  const[partnerEff,setPartnerEff]=useState<PartnerEfficiency[]>([])
  const[loading,setLoading]=useState(true)
  const[dateFrom,setDateFrom]=useState(()=>{const d=new Date();d.setDate(1);return d.toISOString().slice(0,10)})
  const[dateTo,setDateTo]=useState(()=>new Date().toISOString().slice(0,10))
  const[userRole,setUserRole]=useState('')
  const[currentUserId,setCurrentUserId]=useState('')
  const[tab,setTab]=useState<'lawyers'|'matters'|'partners'>('lawyers')

  const loadStats=useCallback(async()=>{
    setLoading(true)
    const sb=createClient()
    const{data:{user}}=await sb.auth.getUser()
    if(!user)return
    const{data:p}=await sb.from('users').select('firm_id, role').eq('id',user.id).single()
    if(!p)return
    setUserRole(p.role)
    setCurrentUserId(user.id)

    // Associates see only their own row; partners/admin see the whole firm.
    let usersQ=sb.from('users').select('id, full_name, role, expected_monthly_hours').eq('is_active',true)
    if(p.role==='associate')usersQ=usersQ.eq('id',user.id)
    const{data:users}=await usersQ
    if(!users)return

    const{data:timeEntries}=await sb.from('time_entries').select('user_id, hours_logged, matter_id').gte('entry_date',dateFrom).lte('entry_date',dateTo)
    const{data:tsInPeriod}=await sb.from('timesheets').select('id, status, matter_id').gte('period_start',dateFrom).lte('period_end',dateTo)
    const tsIds=tsInPeriod?.map(t=>t.id)||[]
    const paidTsIds=tsInPeriod?.filter(t=>t.status==='paid').map(t=>t.id)||[]

    let billedItems:any[]=[]
    if(tsIds.length>0){const{data}=await sb.from('timesheet_items').select('user_id, hours_billed, amount, timesheet_id').in('timesheet_id',tsIds);if(data)billedItems=data}
    let paidItems:any[]=[]
    if(paidTsIds.length>0){const{data}=await sb.from('timesheet_items').select('user_id, amount').in('timesheet_id',paidTsIds);if(data)paidItems=data}

    // Per-user stats
    const stats:UserStat[]=users.map(u=>{
      const logged=(timeEntries||[]).filter(t=>t.user_id===u.id).reduce((s,t)=>s+t.hours_logged,0)
      const userBilled=billedItems.filter(b=>b.user_id===u.id)
      const billed=userBilled.reduce((s,b)=>s+b.hours_billed,0)
      const revenue=userBilled.reduce((s,b)=>s+b.amount,0)
      const collected=paidItems.filter(b=>b.user_id===u.id).reduce((s,b)=>s+b.amount,0)
      return{user_id:u.id,full_name:u.full_name,role:u.role,expected_monthly_hours:u.expected_monthly_hours,hours_logged:logged,hours_billed:billed,revenue,collected,billed_total:revenue}
    })
    setUserStats(stats.sort((a,b)=>b.revenue-a.revenue))

    // Per-matter stats
    const{data:matters}=await sb.from('matters').select('id, title, clients(name)')
    const{data:originators}=await sb.from('matter_originators').select('matter_id, user_id, percentage')
    
    if(matters){
      const mStats:MatterStat[]=matters.map((m:any)=>{
        const mLogged=(timeEntries||[]).filter(t=>t.matter_id===m.id).reduce((s,t)=>s+t.hours_logged,0)
        const mTsIds=tsInPeriod?.filter(t=>t.matter_id===m.id).map(t=>t.id)||[]
        const mBilled=billedItems.filter(b=>mTsIds.includes(b.timesheet_id))
        const mHrsBilled=mBilled.reduce((s,b)=>s+b.hours_billed,0)
        const mRevenue=mBilled.reduce((s,b)=>s+b.amount,0)
        const mOrig=(originators||[]).filter((o:any)=>o.matter_id===m.id).map((o:any)=>{
          const u=users.find(u=>u.id===o.user_id)
          return{name:u?.full_name||'?',percentage:o.percentage}
        })
        return{matter_id:m.id,title:m.title,client_name:m.clients?.name||'',hours_logged:mLogged,hours_billed:mHrsBilled,revenue:mRevenue,originators:mOrig}
      }).filter(m=>m.hours_logged>0||m.revenue>0).sort((a,b)=>b.revenue-a.revenue)
      setMatterStats(mStats)

      // Partner efficiency — keyed by user_id so duplicate names don't collide.
      const partnerMap:Record<string,{user_id:string;name:string;revenue:number;hours:number;count:number}>={}
      const origByMatter:Record<string,{user_id:string;percentage:number}[]>={}
      ;(originators||[]).forEach((o:any)=>{
        if(!origByMatter[o.matter_id])origByMatter[o.matter_id]=[]
        origByMatter[o.matter_id].push({user_id:o.user_id,percentage:o.percentage})
      })
      mStats.forEach(m=>{
        (origByMatter[m.matter_id]||[]).forEach(o=>{
          const u=users.find(x=>x.id===o.user_id)
          if(!u)return
          if(!partnerMap[o.user_id])partnerMap[o.user_id]={user_id:o.user_id,name:u.full_name,revenue:0,hours:0,count:0}
          partnerMap[o.user_id].revenue+=m.revenue*(o.percentage/100)
          partnerMap[o.user_id].hours+=m.hours_billed*(o.percentage/100)
          partnerMap[o.user_id].count+=1
        })
      })
      const pEff:PartnerEfficiency[]=Object.values(partnerMap).map(p=>({
        user_id:p.user_id,name:p.name,originated_revenue:p.revenue,originated_hours:p.hours,
        avg_rate:p.hours>0?p.revenue/p.hours:0,
        efficiency_ratio:p.hours>0?p.revenue/p.hours:0,
        matter_count:p.count,
      })).sort((a,b)=>b.originated_revenue-a.originated_revenue)
      setPartnerEff(pEff)
    }

    setLoading(false)
  },[dateFrom,dateTo])

  useEffect(()=>{loadStats()},[loadStats])

  if(userRole==='associate'){
    const me=userStats.find(u=>u.user_id===currentUserId)
    return(
      <div>
        <h1 className="font-display text-3xl text-ink-900 tracking-tight">{es?'Mis estadísticas':'My stats'}</h1>
        {me&&(
          <div className="mt-6 grid grid-cols-2 gap-4 max-w-md">
            <div className="bg-white rounded-xl border border-canvas-100 p-4"><p className="text-xs text-ink-500">{es?'Horas logueadas':'Hours logged'}</p><p className="text-2xl font-bold mt-1">{hrsToHM(me.hours_logged)}</p></div>
            <div className="bg-white rounded-xl border border-canvas-100 p-4"><p className="text-xs text-ink-500">{es?'Horas facturadas':'Hours billed'}</p><p className="text-2xl font-bold mt-1">{hrsToHM(me.hours_billed)}</p></div>
            <div className="bg-white rounded-xl border border-canvas-100 p-4"><p className="text-xs text-ink-500">{es?'Ratio facturable':'Billable ratio'}</p><p className="text-2xl font-bold mt-1">{me.expected_monthly_hours>0?Math.round(me.hours_billed/me.expected_monthly_hours*100):0}%</p></div>
            <div className="bg-white rounded-xl border border-canvas-100 p-4"><p className="text-xs text-ink-500">{es?'Gap log/fact':'Log/bill gap'}</p><p className="text-2xl font-bold mt-1">{hrsToHM(me.hours_logged-me.hours_billed)}</p></div>
          </div>
        )}
      </div>
    )
  }

  const totalLogged=userStats.reduce((s,u)=>s+u.hours_logged,0)
  const totalBilled=userStats.reduce((s,u)=>s+u.hours_billed,0)
  const totalRevenue=userStats.reduce((s,u)=>s+u.revenue,0)
  const totalCollected=userStats.reduce((s,u)=>s+u.collected,0)

  const L={
    title:es?'Estadísticas':'Stats',
    from:es?'Desde':'From',to:es?'Hasta':'To',
    lawyers:es?'Por abogado':'By lawyer',matters:es?'Por asunto':'By matter',partners:es?'Rendimiento socios':'Partner efficiency',
    lawyer:es?'Abogado':'Lawyer',logged:es?'Logueadas':'Logged',billed:es?'Facturadas':'Billed',
    gap:'Gap',ratio:'Ratio',revenue:es?'Ingresos':'Revenue',
    collected:es?'Cobrado':'Collected',collRate:es?'% Cobro':'Coll. %',
    totalLogged:es?'Total logueadas':'Total logged',totalBilled:es?'Total facturadas':'Total billed',
    totalRevenue:es?'Total ingresos':'Total revenue',totalCollected:es?'Total cobrado':'Total collected',
    matter:es?'Asunto':'Matter',client:es?'Cliente':'Client',originator:es?'Originador':'Originator',
    partner:es?'Socio':'Partner',originated:es?'Ingresos originados':'Originated revenue',
    avgRate:es?'Tarifa promedio':'Avg rate',matterCount:es?'Asuntos':'Matters',
    effDesc:es?'Relación entre ingresos generados y horas consumidas por los asuntos de cada socio':'Ratio of revenue generated to hours consumed by each partner\'s matters',
  }

  return(
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-3xl text-ink-900 tracking-tight">{L.title}</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-500">{L.from}</span>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-2 py-1.5 border border-canvas-200 rounded-lg text-sm"/>
          <span className="text-ink-500">{L.to}</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="px-2 py-1.5 border border-canvas-200 rounded-lg text-sm"/>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-canvas-100 p-4"><p className="text-xs text-ink-500">{L.totalLogged}</p><p className="text-2xl font-bold mt-1">{hrsToHM(totalLogged)}</p></div>
        <div className="bg-white rounded-xl border border-canvas-100 p-4"><p className="text-xs text-ink-500">{L.totalBilled}</p><p className="text-2xl font-bold mt-1">{hrsToHM(totalBilled)}</p><p className="text-xs text-ink-500 mt-1">Gap: {hrsToHM(totalLogged-totalBilled)}</p></div>
        <div className="bg-white rounded-xl border border-canvas-100 p-4"><p className="text-xs text-ink-500">{L.totalRevenue}</p><p className="text-2xl font-bold mt-1">{totalRevenue.toLocaleString(undefined,{minimumFractionDigits:0})}</p></div>
        <div className="bg-white rounded-xl border border-canvas-100 p-4"><p className="text-xs text-ink-500">{L.totalCollected}</p><p className="text-2xl font-bold mt-1">{totalCollected.toLocaleString(undefined,{minimumFractionDigits:0})}</p><p className="text-xs text-ink-500 mt-1">{totalRevenue>0?Math.round(totalCollected/totalRevenue*100):0}%</p></div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-4 border-b border-canvas-200">
        {(['lawyers','matters','partners'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`pb-3 text-sm ${tab===t?'font-medium text-vexa-600 border-b-2 border-vexa-500':'text-ink-500 hover:text-ink-700'}`}>
            {L[t]}
          </button>
        ))}
      </div>

      {loading?<div className="mt-8 text-center text-sm text-ink-500">Loading...</div>:(
        <>
          {/* BY LAWYER */}
          {tab==='lawyers'&&(
            <div className="mt-4 bg-white rounded-xl border border-canvas-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-canvas-100 bg-canvas-100">
                  <th className="text-left px-4 py-3 font-medium text-ink-700">{L.lawyer}</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-700">{L.logged}</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-700">{L.billed}</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-700">{L.gap}</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-700">{L.ratio}</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-700">{L.revenue}</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-700">{L.collected}</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-700">{L.collRate}</th>
                </tr></thead>
                <tbody>
                  {userStats.map(u=>{
                    const gap=u.hours_logged-u.hours_billed
                    const ratio=u.expected_monthly_hours>0?Math.round(u.hours_billed/u.expected_monthly_hours*100):0
                    const collRate=u.billed_total>0?Math.round(u.collected/u.billed_total*100):0
                    return(
                      <tr key={u.user_id} className="border-b border-canvas-100">
                        <td className="px-4 py-3"><span className="font-medium text-ink-900">{u.full_name}</span><span className="ml-2 text-xs text-ink-500 capitalize">{u.role}</span></td>
                        <td className="px-4 py-3 text-right text-ink-700">{hrsToHM(u.hours_logged)}</td>
                        <td className="px-4 py-3 text-right text-ink-900 font-medium">{hrsToHM(u.hours_billed)}</td>
                        <td className="px-4 py-3 text-right"><span className={gap>0?'text-amber-600':'text-ink-500'}>{hrsToHM(gap)}</span></td>
                        <td className="px-4 py-3 text-right"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ratio>=80?'bg-green-50 text-green-700':ratio>=50?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700'}`}>{ratio}%</span></td>
                        <td className="px-4 py-3 text-right font-medium text-ink-900">{u.revenue.toLocaleString(undefined,{minimumFractionDigits:0})}</td>
                        <td className="px-4 py-3 text-right text-ink-700">{u.collected.toLocaleString(undefined,{minimumFractionDigits:0})}</td>
                        <td className="px-4 py-3 text-right"><span className={`text-xs ${collRate>=80?'text-green-600':collRate>=50?'text-amber-600':'text-red-600'}`}>{collRate}%</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* BY MATTER */}
          {tab==='matters'&&(
            <div className="mt-4 bg-white rounded-xl border border-canvas-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-canvas-100 bg-canvas-100">
                  <th className="text-left px-4 py-3 font-medium text-ink-700">{L.matter}</th>
                  <th className="text-left px-4 py-3 font-medium text-ink-700">{L.client}</th>
                  <th className="text-left px-4 py-3 font-medium text-ink-700">{L.originator}</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-700">{L.logged}</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-700">{L.billed}</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-700">{L.revenue}</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-700">{L.avgRate}</th>
                </tr></thead>
                <tbody>
                  {matterStats.map(m=>{
                    const avgRate=m.hours_billed>0?m.revenue/m.hours_billed:0
                    return(
                      <tr key={m.matter_id} className="border-b border-canvas-100">
                        <td className="px-4 py-3 font-medium text-ink-900">{m.title}</td>
                        <td className="px-4 py-3 text-ink-700">{m.client_name}</td>
                        <td className="px-4 py-3 text-ink-700">{m.originators.map(o=>`${o.name} (${o.percentage}%)`).join(', ')||'—'}</td>
                        <td className="px-4 py-3 text-right text-ink-700">{hrsToHM(m.hours_logged)}</td>
                        <td className="px-4 py-3 text-right font-medium">{hrsToHM(m.hours_billed)}</td>
                        <td className="px-4 py-3 text-right font-medium text-ink-900">{m.revenue.toLocaleString(undefined,{minimumFractionDigits:0})}</td>
                        <td className="px-4 py-3 text-right text-ink-700">{avgRate>0?`$${Math.round(avgRate)}`:es?'—':'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PARTNER EFFICIENCY */}
          {tab==='partners'&&(
            <div className="mt-4">
              <p className="text-sm text-ink-500 mb-4">{L.effDesc}</p>
              <div className="bg-white rounded-xl border border-canvas-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-canvas-100 bg-canvas-100">
                    <th className="text-left px-4 py-3 font-medium text-ink-700">{L.partner}</th>
                    <th className="text-right px-4 py-3 font-medium text-ink-700">{L.matterCount}</th>
                    <th className="text-right px-4 py-3 font-medium text-ink-700">{L.originated}</th>
                    <th className="text-right px-4 py-3 font-medium text-ink-700">{es?'Horas consumidas':'Hours consumed'}</th>
                    <th className="text-right px-4 py-3 font-medium text-ink-700">{L.avgRate}</th>
                    <th className="text-right px-4 py-3 font-medium text-ink-700">{es?'$/hora consumida':'$/hour consumed'}</th>
                  </tr></thead>
                  <tbody>
                    {partnerEff.map(p=>(
                      <tr key={p.user_id} className="border-b border-canvas-100">
                        <td className="px-4 py-3 font-medium text-ink-900">{p.name}</td>
                        <td className="px-4 py-3 text-right text-ink-700">{p.matter_count}</td>
                        <td className="px-4 py-3 text-right font-medium text-ink-900">{p.originated_revenue.toLocaleString(undefined,{minimumFractionDigits:0})}</td>
                        <td className="px-4 py-3 text-right text-ink-700">{hrsToHM(p.originated_hours)}</td>
                        <td className="px-4 py-3 text-right text-ink-700">${Math.round(p.avg_rate)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.efficiency_ratio>=200?'bg-green-50 text-green-700':p.efficiency_ratio>=100?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700'}`}>
                            ${Math.round(p.efficiency_ratio)}/hr
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* REVENUE BAR CHART */}
          {tab==='lawyers'&&userStats.length>0&&(
            <div className="mt-6 bg-white rounded-xl border border-canvas-100 p-5">
              <h3 className="text-sm font-semibold text-ink-900 mb-4">{es?'Ingresos por abogado':'Revenue per lawyer'}</h3>
              <div className="space-y-2">
                {userStats.filter(u=>u.revenue>0).map(u=>{
                  const maxRev=Math.max(...userStats.map(s=>s.revenue))
                  const pct=maxRev>0?Math.round(u.revenue/maxRev*100):0
                  return(
                    <div key={u.user_id} className="flex items-center gap-3">
                      <span className="text-xs text-ink-700 w-28 truncate">{u.full_name}</span>
                      <div className="flex-1 h-5 bg-canvas-100 rounded-full overflow-hidden">
                        <div className="h-full bg-vexa-600 rounded-full transition-all" style={{width:`${pct}%`}}></div>
                      </div>
                      <span className="text-xs font-medium text-ink-700 w-20 text-right">{u.revenue.toLocaleString(undefined,{minimumFractionDigits:0})}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* REQUEST CUSTOM REPORT */}
          <div className="mt-8 bg-gradient-to-r from-vexa-600 to-vexa-500 rounded-xl p-6 text-white">
            <h3 className="font-semibold text-lg">{es?'¿Necesitás estadísticas personalizadas?':'Need custom statistics?'}</h3>
            <p className="text-sm text-white/80 mt-2 max-w-lg">{es?'Podemos crear reportes a medida para tu estudio: compensación de socios, rentabilidad por área de práctica, tendencias mensuales, y más.':'We can create custom reports for your firm: partner compensation, practice area profitability, monthly trends, and more.'}</p>
            <a href="mailto:info@vexa.app?subject=Custom%20Report%20Request" className="inline-block mt-4 px-5 py-2.5 bg-white text-vexa-600 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors">{es?'Solicitar reporte personalizado':'Request custom report'}</a>
          </div>
        </>
      )}
    </div>
  )
}
