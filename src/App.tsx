import { useEffect, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { api, setToken } from '@/lib/api'
import { applyTheme, getStoredTheme } from '@/lib/theme'
import { ToastProvider } from '@/components/common'
import { AppShell } from '@/components/AppShell'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Login, type AuthUser } from '@/pages/Login'

// Keep <html> in sync with the stored preference as soon as the bundle boots.
applyTheme(getStoredTheme())

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    api
      .get<{ user: AuthUser }>('/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => {
        setToken(null)
        setUser(null)
      })
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <p className="text-xs">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <ToastProvider>
      {user ? (
        <AppShell
          user={user}
          onLogout={() => {
            setUser(null)
            window.location.hash = ''
          }}
        />
      ) : (
        <div className="relative">
          <div className="absolute right-3 top-3 z-10">
            <ThemeToggle />
          </div>
          <Login onLogin={setUser} />
        </div>
      )}
    </ToastProvider>
  )
}
