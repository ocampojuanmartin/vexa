'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Clock, FileText, BarChart3, Users, Shield, Globe, Check, Menu, X } from 'lucide-react'

// Scroll-triggered reveal — fires once when the element first enters the viewport.
// Honours prefers-reduced-motion (renders visible immediately).
function useReveal(threshold = 0.18) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true); return
    }
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) { setVisible(true); return }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { setVisible(true); io.unobserve(el) }
      }),
      { threshold, rootMargin: '0px 0px -10% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, visible }
}

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
    nav: { showcase: es?'Vexa en uso':'In action', features: es?'Funcionalidades':'Features', how: es?'Cómo funciona':'How it works', contact: es?'Contacto':'Contact', login: es?'Ingresar':'Sign in' },
    hero: {
      title: es ? 'De las horas al cobro, sin planillas' : 'From hours to collection, no spreadsheets',
      sub: es ? 'Vexa es la plataforma que reemplaza las planillas de Excel y el control manual de horas por un sistema simple, claro y profesional.' : 'Vexa replaces Excel spreadsheets and manual hour tracking with a simple, clear, and professional system.',
      cta: es ? 'Solicitar demo' : 'Request a demo',
      cta2: es ? 'Ver funcionalidades' : 'See features',
    },
    features: {
      title: es ? 'Todo lo que tu estudio necesita' : 'Everything your firm needs',
      sub: es ? 'Diseñado específicamente para estudios jurídicos.' : 'Built specifically for law firms.',
      items: [
        { icon: Clock, title: es?'Carga de horas':'Time tracking', desc: es?'Calendario visual por día con horas y minutos. Cada abogado carga sus horas y el socio las revisa. Soporte multi-idioma en la descripción del trabajo.':'Visual daily calendar with hours and minutes. Associates log, partners review. Multi-language work descriptions.' },
        { icon: FileText, title: es?'Timesheets y facturación':'Timesheets & billing', desc: es?'Generá timesheets por asunto y período. Ajustá horas y tarifas antes de enviar. Seguimiento completo: borrador → emitido → enviado → aprobado → facturado → cobrado.':'Generate timesheets per matter and period. Adjust hours and rates before sending. Full tracking: draft → issued → sent → approved → invoiced → paid.' },
        { icon: BarChart3, title: es?'Estadísticas para socios':'Partner statistics', desc: es?'Horas logueadas vs facturadas, ratio de facturación, ingresos por abogado, tasa de cobro, originación de clientes. Todo filtrable por período.':'Logged vs billed hours, billing ratio, revenue per lawyer, collection rate, client origination. All filterable by period.' },
        { icon: Users, title: es?'Clientes y asuntos':'Clients & matters', desc: es?'Directorio de clientes con sus asuntos. Originación y liderazgo por socio con porcentaje. Tarifas por categoría o tarifa flat por asunto, con tope de horas y descuentos automáticos.':'Client directory with matters. Origination and lead-partner splits. Per-category or flat rates per matter, with hour caps and automatic discounts.' },
        { icon: Shield, title: es?'Control de acceso':'Access control', desc: es?'Tres roles: admin, socio, asociado. El admin define qué módulos ve cada usuario. Los asociados solo ven sus propios datos.':'Three roles: admin, partner, associate. Admin defines module access per user. Associates see only their own data.' },
        { icon: Globe, title: es?'Español e inglés':'Spanish & English', desc: es?'Interfaz completamente bilingüe. Cada usuario elige su idioma. Listo para estudios con operaciones en Latinoamérica y Estados Unidos.':'Fully bilingual interface. Each user picks their language. Ready for firms with Latin American and US operations.' },
      ]
    },
    how: {
      title: es ? 'Cómo funciona' : 'How it works',
      steps: [
        { n: '1', title: es?'El asociado carga sus horas':'Associates log their hours', desc: es?'Cada abogado ingresa sus horas diarias desde el calendario, seleccionando cliente, asunto y descripción del trabajo.':'Each lawyer enters daily hours from the calendar, selecting client, matter, and work description.' },
        { n: '2', title: es?'El socio revisa y ajusta':'Partners review and adjust', desc: es?'El socio ve todas las horas, puede recortar o ajustar antes de generar el timesheet para el cliente.':'Partners see all hours, can trim or adjust before generating the client timesheet.' },
        { n: '3', title: es?'Se envía el timesheet al cliente':'Timesheet sent to client', desc: es?'Se genera un detalle con horas y gastos. Una vez enviado, las horas se bloquean automáticamente.':'A detailed breakdown of hours and expenses is generated. Once sent, hours lock automatically.' },
        { n: '4', title: es?'Se registra el cobro':'Payment is recorded', desc: es?'El socio avanza el estado: aprobado → factura emitida → pagado. Las estadísticas se actualizan en tiempo real.':'Partners advance status: approved → invoice issued → paid. Stats update in real time.' },
      ]
    },
    showcase: {
      eyebrow: es ? 'Vexa en uso' : 'Vexa in action',
      title: es ? 'Tres pantallas, un flujo completo' : 'Three screens, one complete flow',
      sub: es
        ? 'Cargás horas, generás el timesheet, medís el resultado. Sin planillas.'
        : 'Log hours, generate the timesheet, measure the outcome. No spreadsheets.',
      items: [
        {
          n: '01',
          src: '/screenshots/01-time.png',
          fallback: '/screenshots/01-time.svg',
          url: 'vexasolutions.app / time',
          caption: es ? 'Carga de horas' : 'Time tracking',
          desc: es
            ? 'Calendario por día, hora y minuto. Cada abogado carga; el socio revisa.'
            : 'Daily calendar, hours + minutes. Associates log, partners review.',
        },
        {
          n: '02',
          src: '/screenshots/02-timesheet.png',
          fallback: '/screenshots/02-timesheet.svg',
          url: 'vexasolutions.app / timesheets',
          caption: es ? 'Timesheet del cliente' : 'Client timesheet',
          desc: es
            ? 'Detalle por abogado, tarifa por categoría, descuentos y honorarios de éxito. PDF con tu logo.'
            : 'Per-lawyer detail, category rates, discounts, success fees. PDF with your firm logo.',
        },
        {
          n: '03',
          src: '/screenshots/03-stats.png',
          fallback: '/screenshots/03-stats.svg',
          url: 'vexasolutions.app / stats',
          caption: es ? 'Estadísticas del estudio' : 'Firm statistics',
          desc: es
            ? 'Ingresos por abogado, ratio facturable, tasa de cobro, originación. Filtrable por período.'
            : 'Revenue per lawyer, billable ratio, collection rate, origination splits. Filter by period.',
        },
      ],
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
    footer: {
      copy: `© ${new Date().getFullYear()} Vexa. ${es ? 'Todos los derechos reservados.' : 'All rights reserved.'}`,
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#top" className="text-xl font-semibold text-vexa-600 tracking-[3px] hover:tracking-[4px] transition-all">vexa</a>
          <div className="hidden md:flex items-center gap-8">
            <a href="#showcase" className="text-sm text-gray-600 hover:text-gray-900">{L.nav.showcase}</a>
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">{L.nav.features}</a>
            <a href="#how" className="text-sm text-gray-600 hover:text-gray-900">{L.nav.how}</a>
            <a href="#contact" className="text-sm text-gray-600 hover:text-gray-900">{L.nav.contact}</a>
            <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} className="text-sm text-gray-400 hover:text-gray-600">{lang === 'es' ? 'EN' : 'ES'}</button>
            <Link href="/login" className="px-4 py-2 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600">{L.nav.login}</Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2" aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3">
            <a href="#showcase" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600">{L.nav.showcase}</a>
            <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600">{L.nav.features}</a>
            <a href="#how" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600">{L.nav.how}</a>
            <a href="#contact" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600">{L.nav.contact}</a>
            <button onClick={() => { setLang(lang === 'es' ? 'en' : 'es'); setMenuOpen(false) }} className="block text-sm text-gray-400">{lang === 'es' ? 'English' : 'Español'}</button>
            <Link href="/login" className="block px-4 py-2 bg-vexa-500 text-white rounded-lg text-sm font-medium text-center">{L.nav.login}</Link>
          </div>
        )}
      </nav>

      {/* HERO — brand-forward, Kinetic-Typography wordmark as the moment */}
      <section className="relative pt-28 pb-24 px-6 overflow-hidden">
        {/* No backdrop — Big-law minimal lets the wordmark stand on white. */}
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-vexa-600/70 dark:text-vexa-500/80 font-semibold mb-8">
            {es ? 'Plataforma para estudios jurídicos' : 'Software for law firms'}
          </p>

          {/* Oversized brand wordmark — the focal point */}
          <h1 className="wordmark-hero" aria-label="Vexa">vexa</h1>

          <div className="wordmark-rule mt-8" />

          {/* Tagline — supporting, not competing. Still a heading so SEO + a11y
              treat it as a page-level title (h1 is the wordmark itself). */}
          <h2 className="mt-8 text-2xl md:text-3xl font-medium tracking-tight text-gray-900 dark:text-slate-100 max-w-2xl mx-auto leading-[1.15]">
            {L.hero.title}
          </h2>
          <p className="mt-5 text-base text-gray-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            {L.hero.sub}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#contact" className="px-8 py-3.5 bg-vexa-600 text-white rounded-md text-sm font-medium hover:bg-vexa-700 transition-colors">{L.hero.cta}</a>
            <a href="#features" className="px-8 py-3.5 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">{L.hero.cta2}</a>
          </div>
        </div>
      </section>

      {/* SHOWCASE — scroll-triggered, browser-chrome framed screenshots */}
      <section id="showcase" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-[11px] uppercase tracking-[0.28em] text-vexa-600/70 font-semibold mb-4">
              {L.showcase.eyebrow}
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
              {L.showcase.title}
            </h2>
            <p className="mt-5 text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
              {L.showcase.sub}
            </p>
          </div>

          <div className="space-y-16 sm:space-y-24">
            {L.showcase.items.map((item, i) => (
              <ShowcaseRow key={item.n} item={item} flipped={i % 2 === 1} />
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-6 bg-white border-y border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">{L.features.title}</h2>
            <p className="mt-3 text-gray-500">{L.features.sub}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {L.features.items.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="w-10 h-10 rounded-lg bg-vexa-50 flex items-center justify-center mb-4">
                    <Icon size={20} className="text-vexa-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">{L.how.title}</h2>
          <div className="space-y-12">
            {L.how.steps.map((step, i) => (
              <div key={i} className="flex gap-6">
                <div className="w-10 h-10 rounded-full bg-vexa-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{step.n}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT / DEMO FORM */}
      <section id="contact" className="py-20 px-6 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">{L.cta.title}</h2>
            <p className="mt-3 text-gray-500">{L.cta.sub}</p>
          </div>
          {formSent ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check size={24} className="text-green-600" />
              </div>
              <p className="text-gray-900 font-medium">{L.cta.sent}</p>
            </div>
          ) : (
            <form onSubmit={async e => { e.preventDefault(); setSubmitting(true); try { const sb = createClient(); const { error } = await sb.from('demo_requests').insert({ full_name: formName, email: formEmail, firm_name: formFirm, firm_size: formSize }); if (!error) setFormSent(true) } catch {} finally { setSubmitting(false) } }} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.cta.name}</label>
                <input type="text" required value={formName} onChange={e=>setFormName(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.cta.email}</label>
                <input type="email" required value={formEmail} onChange={e=>setFormEmail(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.cta.firm}</label>
                <input type="text" required value={formFirm} onChange={e=>setFormFirm(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.cta.size}</label>
                <select required value={formSize} onChange={e=>setFormSize(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="">—</option>
                  <option value="5-10">5-10</option>
                  <option value="10-25">10-25</option>
                  <option value="25-50">25-50</option>
                  <option value="50-100">50-100</option>
                  <option value="100+">100+</option>
                </select>
              </div>
              <button type="submit" disabled={submitting} className="w-full py-3 bg-vexa-500 text-white rounded-lg text-sm font-medium hover:bg-vexa-600 disabled:opacity-50 transition-colors">{submitting ? '...' : L.cta.send}</button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xl font-semibold text-vexa-600 tracking-[3px]">vexa</span>
          <p className="text-sm text-gray-400">{L.footer.copy}</p>
          <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} className="text-sm text-gray-400 hover:text-gray-600">{lang === 'es' ? 'English' : 'Español'}</button>
        </div>
      </footer>
    </div>
  )
}

// Single screenshot row — eyebrow + caption on one side, framed screenshot on the
// other. Fades in + lifts when scrolled into view (IntersectionObserver). Image
// falls back to the bundled SVG placeholder if the PNG file isn't there yet.
interface ShowcaseItem {
  n: string
  src: string
  fallback: string
  url: string
  caption: string
  desc: string
}
function ShowcaseRow({ item, flipped }: { item: ShowcaseItem; flipped: boolean }) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={`grid lg:grid-cols-12 gap-8 lg:gap-12 items-center transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      {/* Caption column */}
      <div className={`lg:col-span-3 ${flipped ? 'lg:order-2' : ''}`}>
        <div className="font-semibold text-5xl tracking-tight text-vexa-600/30 tabular-nums leading-none">{item.n}</div>
        <h3 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{item.caption}</h3>
        <p className="mt-3 text-base text-gray-500 leading-relaxed">{item.desc}</p>
      </div>

      {/* Screenshot frame */}
      <div className={`lg:col-span-9 ${flipped ? 'lg:order-1' : ''}`}>
        <div className="rounded-lg overflow-hidden bg-white border border-gray-200">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <span className="w-2.5 h-2.5 rounded-full bg-red-300/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-300/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-300/70" />
            <span className="ml-3 text-[11px] text-gray-400 font-mono tracking-tight truncate">{item.url}</span>
          </div>
          {/* Screenshot */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.src}
            alt={item.caption}
            loading="lazy"
            decoding="async"
            className="block w-full h-auto"
            onError={(e) => {
              const img = e.currentTarget
              if (img.src.endsWith('.png')) img.src = item.fallback
            }}
          />
        </div>
      </div>
    </div>
  )
}
