'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/context'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Clock,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Globe,
  UserCog,
} from 'lucide-react'

type UserProfile = {
  full_name: string
  role: 'admin' | 'partner' | 'associate'
  module_permissions: Record<string, boolean>
}

const navItems = [
  { key: 'nav.dashboard', href: '/', icon: LayoutDashboard, module: null },
  { key: 'nav.clients', href: '/clients', icon: Users, module: 'clients' },
  { key: 'nav.matters', href: '/matters', icon: Briefcase, module: 'matters' },
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

  const filteredNav = navItems.filter((item) => canAccess(item.module))
  const isAdmin = profile?.role === 'admin'

  return (
    <aside
      className={`flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
        {!collapsed && (
          <span className="text-xl font-bold text-vexa-600 tracking-tight">
            vexa
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"
        >
          <ChevronLeft
            size={18}
            className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-vexa-50 text-vexa-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={collapsed ? t(item.key) : undefined}
            >
              <Icon size={20} strokeWidth={1.75} />
              {!collapsed && <span>{t(item.key)}</span>}
            </button>
          )
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-gray-100" />
            {adminItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-vexa-50 text-vexa-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={collapsed ? t(item.key) : undefined}
                >
                  <Icon size={20} strokeWidth={1.75} />
                  {!collapsed && <span>{t(item.key)}</span>}
                </button>
              )
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-2 space-y-1">
        {/* Language toggle */}
        <button
          onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
          title={collapsed ? (locale === 'en' ? 'Español' : 'English') : undefined}
        >
          <Globe size={18} strokeWidth={1.75} />
          {!collapsed && (
            <span>{locale === 'en' ? 'Español' : 'English'}</span>
          )}
        </button>

        {/* User info + logout */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-vexa-100 flex items-center justify-center text-vexa-700 text-xs font-medium flex-shrink-0">
            {profile?.full_name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || '...'}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {profile?.role || '...'}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"
            title={t('auth.logout')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
