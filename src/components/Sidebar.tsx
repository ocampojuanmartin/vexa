'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/context'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, Clock, Receipt, FileText, BarChart3,
  Settings, LogOut, ChevronLeft, Globe, UserCog, Menu, X,
} from 'lucide-react'

type UserProfile = {
  full_name: string
  role: 'admin' | 'partner' | 'associate'
  module_permissions: Record<string, boolean>
}

const navItems = [
  { key: 'nav.dashboard', href: '/', icon: LayoutDashboard, module: null },
  { key: 'nav.clients', href: '/clients', icon: Users, module: 'clients' },
  { key: 'nav.timeTracking', href: '/time', icon: Clock, module: 'time' },
  { key: 'nav.expenses', href: '/expenses', icon: Receipt, module: 'expenses' },
  { key: 'nav.timesheets', href: '/timesheets', icon: FileText, module: 'timesheets' },
  { key: 'nav.stats', href: '/stats', icon: BarChart3, module: 'stats' },
]

const adminItems = [
  { key: 'nav.users', href: '/users', icon: UserCog },
  { key: 'nav.settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, locale, setLocale } = useI18n()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('full_name, role, module_permissions')
          .eq('id', user.id)
          .single()
        if (data) setProfile(data as UserProfile)
      }
    }
    loadProfile()
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function canAccess(module: string | null): boolean {
    if (!module) return true
    if (!profile) return false
    if (profile.role === 'admin') return true
    return profile.module_permissions?.[module] !== false
  }

  function navigate(href: string) {
    router.push(href)
    setMobileOpen(false)
  }

  const filteredNav = navItems.filter((item) => canAccess(item.module))
  const isAdmin = profile?.role === 'admin'
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  const sidebarContent = (
    <>
      <nav className="flex-1 py-6 px-3 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <button key={item.href} onClick={() => navigate(item.href)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-[13px] tracking-wide transition-colors ${
                isActive
                  ? 'bg-vexa-600 text-white font-medium shadow-soft'
                  : 'text-ink-700 hover:bg-canvas-100 hover:text-ink-900'
              }`}
              title={collapsed ? t(item.key) : undefined}>
              <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
              {!collapsed && <span>{t(item.key)}</span>}
            </button>
          )
        })}
        {isAdmin && (
          <>
            <div className="my-4 mx-3 border-t border-canvas-200" />
            {adminItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <button key={item.href} onClick={() => navigate(item.href)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-[13px] tracking-wide transition-colors ${
                    isActive
                      ? 'bg-vexa-600 text-white font-medium shadow-soft'
                      : 'text-ink-700 hover:bg-canvas-100 hover:text-ink-900'
                  }`}
                  title={collapsed ? t(item.key) : undefined}>
                  <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
                  {!collapsed && <span>{t(item.key)}</span>}
                </button>
              )
            })}
          </>
        )}
      </nav>

      <div className="border-t border-canvas-200 p-3 space-y-0.5">
        <button onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-[13px] text-ink-500 hover:bg-canvas-100 hover:text-ink-700 transition-colors">
          <Globe size={16} strokeWidth={1.75} />
          {!collapsed && <span>{locale === 'en' ? 'Español' : 'English'}</span>}
        </button>
        <div className="flex items-center gap-3 px-3 pt-3 pb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vexa-600 to-vexa-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ring-1 ring-canvas-200/80">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-ink-900 truncate">{profile?.full_name || '...'}</p>
              <p className="text-[11px] text-ink-500 capitalize tracking-wide">{profile?.role || '...'}</p>
            </div>
          )}
          <button onClick={handleLogout} className="p-1.5 rounded-md hover:bg-canvas-100 text-ink-500" title={t('auth.logout')}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-canvas-50/95 backdrop-blur-sm border-b border-canvas-200 flex items-center px-4 z-40">
        <button onClick={() => setMobileOpen(true)} className="p-1.5 -ml-1.5 rounded-md hover:bg-canvas-100">
          <Menu size={22} className="text-ink-700" />
        </button>
        <span className="wordmark ml-3 text-xl text-vexa-600">vexa</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full bg-canvas-50 flex flex-col shadow-soft-lg">
            <div className="flex items-center justify-between h-14 px-4 border-b border-canvas-200">
              <span className="wordmark text-xl text-vexa-600">vexa</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md hover:bg-canvas-100">
                <X size={20} className="text-ink-500" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar — warm cream instead of flat white */}
      <aside className={`hidden lg:flex flex-col h-screen bg-canvas-50 border-r border-canvas-200 transition-all duration-200 ${collapsed ? 'w-[60px]' : 'w-60'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-canvas-200">
          {!collapsed && <span className="wordmark text-2xl text-vexa-600">vexa</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hover:bg-canvas-100 text-ink-500 mx-auto">
            <ChevronLeft size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  )
}
