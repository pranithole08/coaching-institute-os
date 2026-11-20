import { useState } from 'react'
import { GraduationCap, Loader2 } from 'lucide-react'
import { api, errorMessage, setToken } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/common'

export type AuthUser = { id: string; email: string; name: string | null; role: string }

export function Login({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('admin@institute.test')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
        email,
        password,
      })
      setToken(res.token)
      onLogin(res.user)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-6" />
            </span>
            <h1 className="mt-4 text-lg font-semibold tracking-tight">Coaching Institute OS</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to manage students, fees and parent updates.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="space-y-4 rounded-xl border bg-card p-5 shadow-sm sm:p-6"
          >
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>

            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-4 rounded-lg border border-dashed bg-card/60 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Demo accounts</p>
            <p className="mt-1">
              Admin — admin@institute.test / admin123
              <br />
              Teacher — teacher@institute.test / teacher123
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
