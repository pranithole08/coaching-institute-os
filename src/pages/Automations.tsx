import { useCallback, useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { Switch } from '@/components/ui/switch'
import { EmptyState, PageHeader, Spinner, useToast } from '@/components/common'

type Automation = {
  id: string
  key: string
  name: string
  description: string
  enabled: boolean
}

const TRIGGERS: Record<string, string> = {
  welcome: 'New student added',
  absence: 'Student marked absent',
  fee_reminder: 'Fee approaching due date',
  payment: 'Payment recorded',
  test_result: 'Test marks entered',
}

export function Automations() {
  const { toast } = useToast()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ automations: Automation[] }>('/automations')
      setAutomations(res.automations)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggle(item: Automation, enabled: boolean) {
    setBusy(item.key)
    setAutomations((prev) =>
      prev.map((a) => (a.key === item.key ? { ...a, enabled } : a)),
    )
    try {
      await api.patch(`/automations/${item.key}`, { enabled })
      toast(`${item.name} ${enabled ? 'enabled' : 'disabled'}`, { variant: 'success' })
    } catch (err) {
      setAutomations((prev) =>
        prev.map((a) => (a.key === item.key ? { ...a, enabled: !enabled } : a)),
      )
      toast('Could not update automation', { variant: 'error', description: errorMessage(err) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Automations"
        description="Turn routine parent communication on or off. Changes apply immediately."
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner /> Loading automations…
        </div>
      ) : automations.length === 0 ? (
        <EmptyState title="No automations configured" />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="divide-y">
            {automations.map((a) => (
              <li
                key={a.key}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{a.name}</p>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {TRIGGERS[a.key] ?? 'Trigger'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <span className="text-[11px] text-muted-foreground">
                    {a.enabled ? 'On' : 'Off'}
                  </span>
                  <Switch
                    checked={a.enabled}
                    disabled={busy === a.key}
                    aria-label={`${a.name} automation`}
                    onCheckedChange={(checked) => toggle(a, checked)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Zap className="size-4" />
          </span>
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">How reminders are scheduled</p>
            <p className="mt-1">
              Fee reminders are sent for unpaid invoices that fall due within the reminder window,
              and repeat at most once every few days. Both windows are configurable in Settings.
              You can also trigger a sweep manually from the Finance page.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
