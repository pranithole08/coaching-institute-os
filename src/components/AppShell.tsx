import { useEffect, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings as SettingsIcon,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { api, setToken } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { AuthUser } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Students } from '@/pages/Students'
import { StudentPortal } from '@/pages/StudentPortal'
import { Attendance } from '@/pages/Attendance'
import { Tests } from '@/pages/Tests'
import { Faculty } from '@/pages/Faculty'
import { Timetable } from '@/pages/Timetable'
import { Finance } from '@/pages/Finance'
import { Analytics } from '@/pages/Analytics'
import { Messages } from '@/pages/Messages'
import { Automations } from '@/pages/Automations'
import { Settings } from '@/pages/Settings'

export type RouteKey =
  | 'dashboard'
  | 'students'
  | 'student-portal'
  | 'attendance'
  | 'tests'
  | 'faculty'
  | 'timetable'
  | 'finance'
  | 'analytics'
  | 'messages'
  | 'automations'
  | 'settings'

type NavItem = {
  key: RouteKey
  label: string
  icon: typeof Users
  adminOnly?: boolean
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'students', label: 'Students', icon: Users },
  { key: 'student-portal', label: 'Student Portal', icon: BookOpen },
  { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { key: 'tests', label: 'Tests', icon: ClipboardList },
  { key: 'faculty', label: 'Faculty', icon: GraduationCap },
  { key: 'timetable', label: 'Timetable', icon: CalendarDays },
  { key: 'finance', label: 'Finance', icon: Wallet, adminOnly: true },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'automations', label: 'Automations', icon: Zap, adminOnly: true },
  { key: 'settings', label: 'Settings', icon: SettingsIcon, adminOnly: true },
]

function readHash(visible: NavItem[]): RouteKey {
  const raw = window.location.hash.replace('#/', '').split('?')[0]
  const found = visible.find((n) => n.key === raw)
  return found?.key ?? 'dashboard'
}

export function AppShell({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const isAdmin = user.role === 'admin'
  const visible = NAV.filter((n) => !n.adminOnly || isAdmin)

  const [route, setRoute] = useState<RouteKey>(() => readHash(visible))
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onHash = () => setRoute(readHash(visible))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [visible])

  function navigate(key: RouteKey) {
    window.location.hash = `#/${key}`
    setRoute(key)
    setMobileOpen(false)
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      /* ignore */
    }
    setToken(null)
    onLogout()
  }

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {visible.map((item) => {
        const Icon = item.icon
        const active = route === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.key)}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </button>
        )
      })}
    </nav>
  )

  const brand = (
    <div className="flex items-center gap-2.5 px-1">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">Coaching Institute OS</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {isAdmin ? 'Admin console' : 'Faculty workspace'}
        </p>
      </div>
    </div>
  )

  const footer = (
    <div className="space-y-2 border-t pt-3">
      <div className="px-1">
        <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
        <p className="truncate text-[11px] capitalize text-muted-foreground">{user.role}</p>
      </div>
      <ThemeToggle className="w-full" />
      <Button variant="outline" size="sm" className="w-full justify-start" onClick={logout}>
        <LogOut className="size-3.5" />
        Sign out
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-secondary/30">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col justify-between border-r bg-card px-3 py-4 md:flex">
        <div className="space-y-5">
          {brand}
          {nav}
        </div>
        {footer}
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-card px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-4" />
          </span>
          <span className="text-sm font-semibold">Coaching Institute OS</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle className="px-2" />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu className="size-5" />
          </Button>
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col justify-between gap-4">
            <div className="space-y-5">
              {brand}
              {nav}
            </div>
            {footer}
          </div>
        </SheetContent>
      </Sheet>

      <main className="md:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {route === 'dashboard' ? <Dashboard onNavigate={navigate} /> : null}
          {route === 'students' ? <Students isAdmin={isAdmin} /> : null}
          {route === 'student-portal' ? <StudentPortal user={user} /> : null}
          {route === 'attendance' ? <Attendance /> : null}
          {route === 'tests' ? <Tests isAdmin={isAdmin} /> : null}
          {route === 'faculty' ? <Faculty /> : null}
          {route === 'timetable' ? <Timetable isAdmin={isAdmin} /> : null}
          {route === 'finance' && isAdmin ? <Finance /> : null}
          {route === 'analytics' && isAdmin ? <Analytics /> : null}
          {route === 'messages' ? <Messages /> : null}
          {route === 'automations' && isAdmin ? <Automations /> : null}
          {route === 'settings' && isAdmin ? <Settings user={user} /> : null}
        </div>
      </main>
    </div>
  )
}
