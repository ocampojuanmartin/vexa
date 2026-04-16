'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Clock, FileText, BarChart3, Users, Shield, Globe, Check, Menu, X } from 'lucide-react'

export default function LandingPage() {
  const [lang, setLang] = useState<'es'|'en'>('en')
  const [menuOpen, setMenuOpen] = useState(false)
  const [formSent, setFormSent] = useState(false)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formFirm, setFormFirm] = useState('')
  const [formSize, setFormSize] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (navigator.language.startsWith('es')) setLang('es')
  }, [])
  const es = lang === 'es'

  const L = {
    nav: { features: es?'Funcionalidades':'Features', how: es?'Cómo funciona':'How it works', contact: es?'Contacto':'Contact', login: es?'Ingresar':'Sign in' },
    hero: {
      eyebrow: es ? 'Plataforma para estudios jurídicos' : 'Software for law firms',
      title: es ? 'De las horas al cobro, sin planillas' : 'From hours to collection, no spreadsheets',
      sub: es
        ? 'Vexa reemplaza las planillas de Excel y el control manual de horas por un sistema serio, claro y profesional.'
        : 'Vexa replaces Excel spreadsheets and manual hour tracking with a serious, clear, and professional system.',
      cta: es ? 'Solicitar demo' : 'Request a demo',
      cta2: es ? 'Ver funcionalidades' : 'See features',
    },
    features: {
      eyebrow: es ? 'Funcionalidades' : 'What it does',
      title: es ? 'Todo lo que tu estudio necesita' : 'Everything your firm needs',
      sub: es ? 'Diseñado específicamente para estudios jurídicos.' : 'Built specifically for law firms.',
      items: [
        { icon: Clock, title: es?'Carga de horas':'Time tracking', desc: es?'Calendario visual por día con horas y minutos. Cada abogado carga, el socio revisa. Descripción del trabajo en idioma configurable por asunto.':'Visual daily calendar with hours and minutes. Associates log, partners review. Per-matter work-description language.' },
        { icon: FileText, title: es?'Timesheets y facturación':'Timesheets & billing', desc: es?'Generá timesheets por asunto y período. Ajustá horas y tarifas antes de enviar. Seguimiento: borrador → emitido → enviado → aprobado → facturado → cobrado.':'Generate timesheets per matter and period. Adjust hours and rates before sending. Full tracking: draft → issued → sent → approved → invoiced → paid.' },
        { icon: BarChart3, title: es?'Estadísticas para socios':'Partner statistics', desc: es?'Horas logueadas vs facturadas, ratio de facturación, ingresos por abogado, tasa de cobro, originación de clientes. Todo filtrable por período.':'Logged vs billed hours, billing ratio, revenue per lawyer, collection rate, client origination. All filterable by period.' },
        { icon: Users, title: es?'Clientes y asuntos':'Clients & matters', desc: es?'Directorio de clientes con asuntos. Originación y liderazgo por socio con porcentaje. Tarifas por categoría o flat, topes de horas y descuentos automáticos.':'Client directory with matters. Origination and lead-partner splits. Per-category or flat rates per matter, with hour caps and automatic discounts.' },
        { icon: Shield, title: es?'Control de acceso':'Access control', desc: es?'Tres roles: admin, socio, asociado. El admin define qué módulos ve cada usuario. Los asociados solo ven sus propios datos.':'Three roles: admin, partner, associate. Admin defines module access per user. Associates see only their own data.' },
        { icon: Globe, title: es?'Español e inglés':'Spanish & English', desc: es?'Interfaz bilingüe. Cada usuario elige su idioma. Listo para estudios con operaciones en Latinoamérica y Estados Unidos.':'Fully bilingual interface. Each user picks their language. Ready for firms with Latin American and US operations.' },
      ]
    },
    how: {
      eyebrow: es ? 'El flujo' : 'The flow',
      title: es ? 'Cómo funciona' : 'How it works',
      steps: [
        { n: '01', title: es?'El asociado carga sus horas':'Associates log their hours', desc: es?'Cada abogado ingresa sus horas diarias desde el calendario, seleccionando cliente, asunto y descripción del trabajo.':'Each lawyer enters daily hours from the calendar, selecting client, matter, and work description.' },
        { n: '02', title: es?'El socio revisa y ajusta':'Partners review and adjust', desc: es?'El socio ve todas las horas del período y puede recortar o ajustar antes de generar el timesheet.':'Partners see all hours for the period, trim or adjust before generating the client timesheet.' },
        { n: '03', title: es?'Se envía el timesheet al cliente':'Timesheet sent to client', desc: es?'Se genera un detalle con horas y gastos. Una vez emitido, las horas se bloquean automáticamente.':'A detailed breakdown of hours and expenses is generated. Once issued, hours lock automatically.' },
        { n: '04', title: es?'Se registra el cobro':'Payment is recorded', desc: es?'El socio avanza el estado: aprobado → factura emitida → pagado. Las estadísticas se actualizan en tiempo real.':'Partners advance status: approved → invoice issued → paid. Stats update in real time.' },
      ]
    },
    cta: {
      title: es ? 'Empezá a usar Vexa hoy' : 'Start using Vexa today',
      sub: es ? 'Solicitá una demo personalizada para tu estudio. Sin compromiso.' : 'Request a personalized demo for your firm. No commitment.',
      name: es ? 'Nombre completo' : 'Full name',
      email: 'Email',
      firm: es ? 'Nombre del estudio' : 'Firm name',
      size: es ? 'Cantidad de abogados' : 'Number of lawyers',
      send: es ? 'Solicitar demo' : 'Request demo',
      sent: es ? '¡Listo! Te contactaremos pronto.' : 'Done! We\'ll be in touch soon.',
    },
    footer: { copy: `© ${new Date().getFullYear()} Vexa. ${es ? 'Todos los derechos reservados.' : 'All rights reserved.'}` }
  }

  return (
    <div className="min-h-screen surface-canvas text-ink-900">
      {/* NAV — editorial, thin, warm */}
      <nav className="fixed top-0 left-0 right-0 bg-canvas-50/85 backdrop-blur-md border-b border-canvas-200 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="wordmark text-2xl text-vexa-600">vexa</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] text-ink-700 hover:text-ink-900 transition-colors">{L.nav.features}</a>
            <a href="#how" className="text-[13px] text-ink-700 hover:text-ink-900 transition-colors">{L.nav.how}</a>
            <a href="#contact" className="text-[13px] text-ink-700 hover:text-ink-900 transition-colors">{L.nav.contact}</a>
            <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} className="text-[11px] uppercase tracking-[0.14em] text-ink-500 hover:text-ink-700 font-medium">{lang === 'es' ? 'EN' : 'ES'}</button>
            <Link href="/login" className="px-4 py-2 bg-vexa-600 text-white rounded-md text-[13px] font-medium hover:bg-vexa-700 shadow-soft">{L.nav.login}</Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2" aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-canvas-200 bg-canvas-50 px-6 py-5 space-y-3">
            <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm text-ink-700">{L.nav.features}</a>
            <a href="#how" onClick={() => setMenuOpen(false)} className="block text-sm text-ink-700">{L.nav.how}</a>
            <a href="#contact" onClick={() => setMenuOpen(false)} className="block text-sm text-ink-700">{L.nav.contact}</a>
            <button onClick={() => { setLang(lang === 'es' ? 'en' : 'es'); setMenuOpen(false) }} className="block text-sm text-ink-500">{lang === 'es' ? 'English' : 'Español'}</button>
            <Link href="/login" className="block px-4 py-2 bg-vexa-600 text-white rounded-md text-sm font-medium text-center">{L.nav.login}</Link>
          </div>
        )}
      </nav>

      {/* HERO — editorial, serif-led, with atmosphere */}
      <section className="relative pt-40 pb-28 px-6 canvas-texture overflow-hidden">
        {/* subtle vertical rule echoing print layouts */}
        <div aria-hidden className="absolute left-1/2 top-24 bottom-0 w-px bg-canvas-200 hidden lg:block" />
        <div className="max-w-4xl mx-auto text-center relative">
          <p className="text-[11px] uppercase tracking-[0.24em] text-brass-600 font-medium mb-6">{L.hero.eyebrow}</p>
          <h1 className="font-display text-[44px] sm:text-6xl lg:text-7xl font-normal leading-[1.02] tracking-[-0.015em] text-ink-900">
            {es ? (
              <>De las horas al cobro,<br /><span className="italic text-vexa-600">sin planillas</span></>
            ) : (
              <>From hours to collection,<br /><span className="italic text-vexa-600">no spreadsheets</span></>
            )}
          </h1>
          <p className="mt-8 text-lg text-ink-500 max-w-2xl mx-auto leading-relaxed font-light">
            {L.hero.sub}
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#contact" className="px-8 py-3.5 bg-vexa-600 text-white rounded-md text-sm font-medium hover:bg-vexa-700 transition-colors shadow-soft-md">{L.hero.cta}</a>
            <a href="#features" className="px-8 py-3.5 border border-canvas-300 text-ink-900 rounded-md text-sm font-medium hover:bg-canvas-100 transition-colors">{L.hero.cta2}</a>
          </div>
        </div>
      </section>

      {/* FEATURES — asymmetric bento, warm subtle bg */}
      <section id="features" className="py-24 px-6 surface-subtle border-y border-canvas-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.24em] text-brass-600 font-medium mb-4">{L.features.eyebrow}</p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-ink-900">{L.features.title}</h2>
            <p className="mt-4 text-ink-500 text-lg">{L.features.sub}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-canvas-200 border border-canvas-200 rounded-lg overflow-hidden">
            {L.features.items.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="bg-white p-8 hover:bg-canvas-50/50 transition-colors">
                  <div className="w-10 h-10 rounded-md bg-gradient-to-br from-vexa-600 to-vexa-700 flex items-center justify-center mb-5 shadow-soft">
                    <Icon size={18} className="text-white" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-display text-xl text-ink-900 mb-3 tracking-tight">{f.title}</h3>
                  <p className="text-sm text-ink-500 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* HOW — editorial numbered list, large numerals */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.24em] text-brass-600 font-medium mb-4">{L.how.eyebrow}</p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-ink-900">{L.how.title}</h2>
          </div>
          <div className="space-y-14">
            {L.how.steps.map((step, i) => (
              <div key={i} className="flex gap-8 items-start">
                <div className="flex-shrink-0 pt-1">
                  <span className="font-display text-5xl text-vexa-600/20 tabular-nums tracking-tighter">{step.n}</span>
                </div>
                <div className="flex-1 pt-2 border-t border-canvas-200">
                  <h3 className="font-display text-xl text-ink-900 mt-4 mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-sm text-ink-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT — warm card on subtle bg */}
      <section id="contact" className="py-24 px-6 surface-subtle border-t border-canvas-200">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-ink-900">{L.cta.title}</h2>
            <p className="mt-4 text-ink-500 text-lg">{L.cta.sub}</p>
          </div>
          {formSent ? (
            <div className="surface-card rounded-lg p-10 text-center shadow-soft">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-vexa-600 to-vexa-700 flex items-center justify-center mx-auto mb-5 shadow-soft">
                <Check size={22} className="text-white" strokeWidth={2.5} />
              </div>
              <p className="text-ink-900 font-medium">{L.cta.sent}</p>
            </div>
          ) : (
            <form onSubmit={async e => { e.preventDefault(); setSubmitting(true); try { const sb = createClient(); const { error } = await sb.from('demo_requests').insert({ full_name: formName, email: formEmail, firm_name: formFirm, firm_size: formSize }); if (!error) setFormSent(true) } catch {} finally { setSubmitting(false) } }}
              className="surface-card rounded-lg p-7 space-y-5 shadow-soft">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] font-medium text-ink-500 mb-1.5">{L.cta.name}</label>
                <input type="text" required value={formName} onChange={e=>setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-canvas-200 rounded-md text-sm bg-canvas-50/60 focus:bg-white" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] font-medium text-ink-500 mb-1.5">{L.cta.email}</label>
                <input type="email" required value={formEmail} onChange={e=>setFormEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-canvas-200 rounded-md text-sm bg-canvas-50/60 focus:bg-white" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] font-medium text-ink-500 mb-1.5">{L.cta.firm}</label>
                <input type="text" required value={formFirm} onChange={e=>setFormFirm(e.target.value)}
                  className="w-full px-4 py-2.5 border border-canvas-200 rounded-md text-sm bg-canvas-50/60 focus:bg-white" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] font-medium text-ink-500 mb-1.5">{L.cta.size}</label>
                <select required value={formSize} onChange={e=>setFormSize(e.target.value)}
                  className="w-full px-4 py-2.5 border border-canvas-200 rounded-md text-sm bg-white">
                  <option value="">—</option>
                  <option value="5-10">5-10</option>
                  <option value="10-25">10-25</option>
                  <option value="25-50">25-50</option>
                  <option value="50-100">50-100</option>
                  <option value="100+">100+</option>
                </select>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-vexa-600 text-white rounded-md text-sm font-medium hover:bg-vexa-700 disabled:opacity-50 shadow-soft">
                {submitting ? '...' : L.cta.send}
              </button>
            </form>
          )}
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-canvas-200">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="wordmark text-xl text-vexa-600">vexa</span>
          <p className="text-xs text-ink-500">{L.footer.copy}</p>
          <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} className="text-[11px] uppercase tracking-[0.14em] text-ink-500 hover:text-ink-700 font-medium">{lang === 'es' ? 'English' : 'Español'}</button>
        </div>
      </footer>
    </div>
  )
}
