import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, KeyRound, Plus, Send, ShieldCheck } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Field,
  PageHeader,
  Spinner,
  StatusBadge,
  useToast,
} from '@/components/common'
import type { AuthUser } from '@/pages/Login'

type SettingsData = {
  settings: {
    instituteName: string
    whatsappPhoneId: string
    whatsappApiVersion: string
    whatsappTokenPreview: string | null
    whatsappTokenSet: boolean
    whatsappVerifyTokenSet: boolean
    whatsappSimulation: boolean
    ollamaUrl: string
    ollamaModel: string
    feeReminderDaysBefore: number
    feeReminderRepeatDays: number
  }
  whatsapp: { configured: boolean; simulation: boolean; source: string; apiVersion: string }
}

type Staff = { id: string; email: string; name: string | null; role: string; active: boolean }

const TEMPLATE_META: { key: string; label: string; hint: string }[] = [
  { key: 'welcome', label: 'Welcome message', hint: 'Sent when a student is added' },
  { key: 'absence', label: 'Absence notice', hint: 'Sent when a student is marked absent' },
  { key: 'fee_reminder', label: 'Fee reminder', hint: 'Sent before and after a due date' },
  { key: 'payment', label: 'Payment confirmation', hint: 'Sent when a payment is recorded' },
  { key: 'test_result', label: 'Test result', hint: 'Sent when marks are entered' },
  { key: 'announcement', label: 'Announcement', hint: 'Used for institute-wide messages' },
]

const PLACEHOLDERS = [
  '{{parent}}',
  '{{student}}',
  '{{class}}',
  '{{batch}}',
  '{{institute}}',
  '{{amount}}',
  '{{period}}',
  '{{dueDate}}',
  '{{receipt}}',
  '{{test}}',
  '{{subject}}',
  '{{marks}}',
  '{{max}}',
  '{{remarks}}',
  '{{date}}',
  '{{message}}',
]

export function Settings({ user }: { user: AuthUser }) {
  const { toast } = useToast()
  const [data, setData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [instituteName, setInstituteName] = useState('')
  const [phoneId, setPhoneId] = useState('')
  const [apiVersion, setApiVersion] = useState('v21.0')
  const [token, setToken] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [simulation, setSimulation] = useState(false)
  const [daysBefore, setDaysBefore] = useState('3')
  const [repeatDays, setRepeatDays] = useState('3')
  const [ollamaUrl, setOllamaUrl] = useState('')
  const [ollamaModel, setOllamaModel] = useState('')

  const [templates, setTemplates] = useState<Record<string, string>>({})
  const [templatesSaving, setTemplatesSaving] = useState(false)

  const [testPhone, setTestPhone] = useState('')
  const [testing, setTesting] = useState(false)

  const [staff, setStaff] = useState<Staff[]>([])
  const [newStaff, setNewStaff] = useState({ email: '', name: '', password: '', role: 'teacher' })
  const [addingStaff, setAddingStaff] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<SettingsData>('/settings')
      setData(res)
      setInstituteName(res.settings.instituteName)
      setPhoneId(res.settings.whatsappPhoneId)
      setApiVersion(res.settings.whatsappApiVersion)
      setSimulation(res.settings.whatsappSimulation)
      setDaysBefore(String(res.settings.feeReminderDaysBefore))
      setRepeatDays(String(res.settings.feeReminderRepeatDays))
      setOllamaUrl(res.settings.ollamaUrl)
      setOllamaModel(res.settings.ollamaModel)
    } catch (err) {
      toast('Could not load settings', { variant: 'error', description: errorMessage(err) })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    api
      .get<{ templates: Record<string, string> }>('/templates')
      .then((res) => setTemplates(res.templates))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (user.role !== 'admin') return
    api
      .get<{ staff: Staff[] }>('/staff')
      .then((res) => setStaff(res.staff))
      .catch(() => {})
  }, [user.role])

  async function saveSettings() {
    setSaving(true)
    try {
      await api.patch('/settings', {
        instituteName,
        whatsappPhoneId: phoneId,
        whatsappApiVersion: apiVersion,
        whatsappToken: token || undefined,
        whatsappVerifyToken: verifyToken || undefined,
        whatsappSimulation: simulation,
        feeReminderDaysBefore: Number(daysBefore) || 0,
        feeReminderRepeatDays: Number(repeatDays) || 3,
        ollamaUrl,
        ollamaModel,
      })
      setToken('')
      setVerifyToken('')
      toast('Settings saved', { variant: 'success' })
      await load()
    } catch (err) {
      toast('Could not save settings', { variant: 'error', description: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  async function saveTemplates() {
    setTemplatesSaving(true)
    try {
      await api.patch('/templates', templates)
      toast('Templates saved', { variant: 'success' })
    } catch (err) {
      toast('Could not save templates', { variant: 'error', description: errorMessage(err) })
    } finally {
      setTemplatesSaving(false)
    }
  }

  async function sendTest() {
    setTesting(true)
    try {
      const res = await api.post<{ result: { status: string; error: string | null } }>(
        '/whatsapp/test',
        { to: testPhone },
      )
      const status = res.result.status
      toast(
        status === 'sent'
          ? 'Test message sent'
          : status === 'simulated'
            ? 'Test message logged (simulation)'
            : status === 'not_configured'
              ? 'WhatsApp is not connected'
              : 'Test message failed',
        {
          variant: status === 'sent' ? 'success' : 'error',
          description: res.result.error ?? undefined,
        },
      )
    } catch (err) {
      toast('Could not send test message', { variant: 'error', description: errorMessage(err) })
    } finally {
      setTesting(false)
    }
  }

  async function addStaff(e: React.FormEvent) {
    e.preventDefault()
    setAddingStaff(true)
    try {
      await api.post('/staff', newStaff)
      toast('Staff account created', { variant: 'success' })
      setNewStaff({ email: '', name: '', password: '', role: 'teacher' })
      const res = await api.get<{ staff: Staff[] }>('/staff')
      setStaff(res.staff)
    } catch (err) {
      toast('Could not create account', { variant: 'error', description: errorMessage(err) })
    } finally {
      setAddingStaff(false)
    }
  }

  async function toggleStaff(member: Staff) {
    try {
      await api.patch(`/staff/${member.id}`, { active: !member.active })
      setStaff((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, active: !member.active } : s)),
      )
    } catch (err) {
      toast('Could not update account', { variant: 'error', description: errorMessage(err) })
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setChangingPassword(true)
    try {
      await api.post('/auth/password', { currentPassword, newPassword })
      toast('Password changed', {
        variant: 'success',
        description: 'You have been signed out of other sessions.',
      })
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      toast('Could not change password', { variant: 'error', description: errorMessage(err) })
    } finally {
      setChangingPassword(false)
    }
  }

  const webhookUrl = `${window.location.origin}/api/app/whatsapp/webhook`

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted-foreground">
        <Spinner /> Loading settings…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Connect WhatsApp, tune automations and manage staff access."
      />

      <Tabs defaultValue="whatsapp">
        <TabsList className="flex-wrap">
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="institute">Institute</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        {/* WhatsApp */}
        <TabsContent value="whatsapp" className="space-y-4">
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">WhatsApp Cloud API</h2>
              <StatusBadge
                status={
                  data?.whatsapp.simulation
                    ? 'simulated'
                    : data?.whatsapp.configured
                      ? 'sent'
                      : 'not_configured'
                }
              />
              {data?.whatsapp.source === 'env' ? (
                <span className="text-[11px] text-muted-foreground">using environment variables</span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Credentials are stored server-side and never returned to the browser. Messages are
              only marked “sent” when Meta accepts them.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Phone number ID" hint="From Meta → WhatsApp → API Setup">
                <Input
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.target.value)}
                  placeholder="123456789012345"
                />
              </Field>
              <Field label="API version">
                <Input value={apiVersion} onChange={(e) => setApiVersion(e.target.value)} />
              </Field>
              <Field
                label="Access token"
                hint={
                  data?.settings.whatsappTokenSet
                    ? `Saved: ${data.settings.whatsappTokenPreview} — leave blank to keep it`
                    : 'Permanent token from a System User'
                }
              >
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={data?.settings.whatsappTokenSet ? '••••••••' : 'EAAG…'}
                  autoComplete="off"
                />
              </Field>
              <Field label="Webhook verify token" hint="Any secret string you also enter in Meta">
                <Input
                  type="password"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder={data?.settings.whatsappVerifyTokenSet ? '••••••••' : 'my-verify-token'}
                  autoComplete="off"
                />
              </Field>
            </div>

            <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border bg-secondary/30 p-3">
              <div>
                <p className="text-xs font-medium">Simulation mode</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Logs messages as “simulated” without calling Meta. Useful for demos — never
                  reports a message as sent.
                </p>
              </div>
              <Switch checked={simulation} onCheckedChange={setSimulation} />
            </div>

            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-medium">Webhook URL</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-secondary px-2.5 py-1.5 text-[11px]">
                  {webhookUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(webhookUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1500)
                    } catch {
                      toast('Copy failed', { variant: 'error' })
                    }
                  }}
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Subscribe to the <span className="font-mono">messages</span> field so delivery
                statuses update automatically.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-end">
              <Field label="Send a test message" className="flex-1">
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+919876543210"
                />
              </Field>
              <Button variant="outline" onClick={sendTest} disabled={testing || !testPhone}>
                <Send className="size-4" />
                {testing ? 'Sending…' : 'Send test'}
              </Button>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? 'Saving…' : 'Save WhatsApp settings'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Institute */}
        <TabsContent value="institute" className="space-y-4">
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Institute details</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Institute name" hint="Used in every WhatsApp message">
                <Input
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                />
              </Field>
              <Field label="Fee reminder window (days before due)" hint="0 = only on/after the due date">
                <Input
                  type="number"
                  min={0}
                  value={daysBefore}
                  onChange={(e) => setDaysBefore(e.target.value)}
                />
              </Field>
              <Field label="Repeat reminders every (days)" hint="Prevents spamming parents">
                <Input
                  type="number"
                  min={1}
                  value={repeatDays}
                  onChange={(e) => setRepeatDays(e.target.value)}
                />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="size-4" /> Change your password
            </h2>
            <form onSubmit={changePassword} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Current password">
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </Field>
              <Field label="New password" hint="At least 8 characters">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" variant="outline" disabled={changingPassword}>
                  {changingPassword ? 'Updating…' : 'Update password'}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="space-y-4">
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Message templates</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Use placeholders to personalise each message. Unknown placeholders are replaced with
              an empty string.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {PLACEHOLDERS.map((p) => (
                <code
                  key={p}
                  className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {p}
                </code>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              {TEMPLATE_META.map((t) => (
                <Field key={t.key} label={t.label} hint={t.hint}>
                  <Textarea
                    value={templates[t.key] ?? ''}
                    onChange={(e) => setTemplates({ ...templates, [t.key]: e.target.value })}
                    rows={3}
                    className="text-xs"
                  />
                </Field>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={saveTemplates} disabled={templatesSaving}>
                {templatesSaving ? 'Saving…' : 'Save templates'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* AI */}
        <TabsContent value="ai" className="space-y-4">
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Ollama (optional)</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect a local or hosted Ollama instance to draft parent messages with AI. Leave
              blank to disable — the rest of the app works without it.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Base URL" hint="e.g. http://localhost:11434">
                <Input
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </Field>
              <Field label="Model" hint="e.g. llama3.1, qwen2.5">
                <Input
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="llama3.1"
                />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? 'Saving…' : 'Save AI settings'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Team */}
        <TabsContent value="team" className="space-y-4">
          {user.role !== 'admin' ? (
            <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              Only admins can manage staff accounts.
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border bg-card">
                <div className="border-b px-4 py-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="size-4" /> Staff accounts
                  </h2>
                </div>
                <ul className="divide-y">
                  {staff.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.name ?? s.email}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {s.email} · <span className="capitalize">{s.role}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={s.active ? 'active' : 'inactive'} />
                        <Switch
                          checked={s.active}
                          disabled={s.id === user.id}
                          onCheckedChange={() => toggleStaff(s)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <form onSubmit={addStaff} className="rounded-xl border bg-card p-4 sm:p-5">
                <h2 className="text-sm font-semibold">Add a staff account</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Name">
                    <Input
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Temporary password" hint="At least 8 characters">
                    <Input
                      type="password"
                      value={newStaff.password}
                      onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Role">
                    <Select
                      value={newStaff.role}
                      onValueChange={(v) => setNewStaff({ ...newStaff, role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button type="submit" disabled={addingStaff}>
                    <Plus className="size-4" />
                    {addingStaff ? 'Creating…' : 'Create account'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
