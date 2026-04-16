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

  // Close mobile menu on route change
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
      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <button key={item.href} onClick={() => navigate(item.href)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'sidebar-active text-vexa-700 font-medium' : 'text-gray-500 hover:bg-white/40 hover:text-gray-900'
              }`}
              title={collapsed ? t(item.key) : undefined}>
              <Icon size={19} strokeWidth={isActive ? 2 : 1.5} />
              {!collapsed && <span>{t(item.key)}</span>}
            </button>
          )
        })}
        {isAdmin && (
          <>
            <div className="my-2 mx-3 border-t border-slate-900/10" />
            {adminItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <button key={item.href} onClick={() => navigate(item.href)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive ? 'sidebar-active text-vexa-700 font-medium' : 'text-gray-500 hover:bg-white/40 hover:text-gray-900'
                  }`}
                  title={collapsed ? t(item.key) : undefined}>
                  <Icon size={19} strokeWidth={isActive ? 2 : 1.5} />
                  {!collapsed && <span>{t(item.key)}</span>}
                </button>
              )
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-900/10 p-2 space-y-0.5">
        <button onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/40 hover:text-gray-600">
          <Globe size={17} strokeWidth={1.5} />
          {!collapsed && <span>{locale === 'en' ? 'Español' : 'English'}</span>}
        </button>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vexa-500 to-vexa-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name || '...'}</p>
              <p className="text-xs text-gray-400 capitalize">{profile?.role || '...'}</p>
            </div>
          )}
          <button onClick={handleLogout} className="p-1.5 rounded-md hover:bg-white/40 text-gray-400" title={t('auth.logout')}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile header — frosted glass, lets canvas gradient show behind */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 sidebar-glass flex items-center px-4 z-40">
        <button onClick={() => setMobileOpen(true)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/50">
          <Menu size={22} className="text-gray-600" />
        </button>
        <span className="ml-3 text-lg font-semibold text-vexa-600 tracking-[3px]">vexa</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full sidebar-glass flex flex-col shadow-xl">
            <div className="flex items-center justify-between h-14 px-4 border-b border-slate-900/10">
              <span className="text-lg font-semibold text-vexa-600 tracking-[3px]">vexa</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-white/50">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar — frosted, gradient flows through */}
      <aside className={`hidden lg:flex flex-col h-screen sidebar-glass transition-all duration-200 ${collapsed ? 'w-[60px]' : 'w-56'}`}>
        <div className="flex items-center justify-between h-14 px-3 border-b border-slate-900/10">
          {!collapsed && <span className="text-lg font-semibold text-vexa-600 tracking-[3px]">vexa</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400 mx-auto">
            <ChevronLeft size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  )
}
