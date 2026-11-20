import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageSquare, Search, Send, Sparkles } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  EmptyState,
  Field,
  PageHeader,
  Spinner,
  StatusBadge,
  useToast,
} from '@/components/common'

type Message = {
  id: string
  to: string
  template: string
  body: string
  status: string
  error: string | null
  createdAt: string
  student: { id: string; name: string } | null
}

type StudentLite = { id: string; name: string; className: string; batch: string; parentPhone: string }

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed', label: 'Failed' },
  { key: 'not_configured', label: 'Not sent' },
  { key: 'simulated', label: 'Simulated' },
]

export function Messages() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')

  const [students, setStudents] = useState<StudentLite[]>([])
  const [composeOpen, setComposeOpen] = useState(false)
  const [audience, setAudience] = useState('all')
  const [audienceValue, setAudienceValue] = useState('')
  const [kind, setKind] = useState('direct')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [drafting, setDrafting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      if (q) params.set('q', q)
      const res = await api.get<{ messages: Message[]; counts: Record<string, number> }>(
        `/messages?${params.toString()}`,
      )
      setMessages(res.messages)
      setCounts(res.counts)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [status, q])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    api
      .get<{ students: StudentLite[] }>('/students?status=active')
      .then((res) => setStudents(res.students))
      .catch(() => {})
  }, [])

  const classes = useMemo(
    () => [...new Set(students.map((s) => s.className))].sort(),
    [students],
  )
  const batches = useMemo(() => [...new Set(students.map((s) => s.batch))].sort(), [students])

  const recipients = useMemo(() => {
    if (audience === 'all') return students
    if (audience === 'class') return students.filter((s) => s.className === audienceValue)
    if (audience === 'batch') return students.filter((s) => s.batch === audienceValue)
    if (audience === 'single') return students.filter((s) => s.id === audienceValue)
    return []
  }, [audience, audienceValue, students])

  async function draftWithAi() {
    setDrafting(true)
    try {
      const res = await api.post<{ text: string }>('/ai/draft', {
        prompt: text || 'Write a short announcement for parents about an upcoming test.',
        context: `Audience: ${recipients.length} parents.`,
      })
      setText(res.text)
      toast('Draft ready', { variant: 'success' })
    } catch (err) {
      toast('AI draft unavailable', { variant: 'error', description: errorMessage(err) })
    } finally {
      setDrafting(false)
    }
  }

  async function send() {
    if (!text.trim()) {
      toast('Write a message first', { variant: 'error' })
      return
    }
    if (recipients.length === 0) {
      toast('No recipients match that audience', { variant: 'error' })
      return
    }
    setSending(true)
    try {
      if (kind === 'announcement') {
        const res = await api.post<{
          total: number
          sent: number
          failed: number
          notConfigured: number
          simulated: number
        }>('/messages/announcement', {
          message: text,
          classNames: audience === 'class' ? [audienceValue] : undefined,
          batches: audience === 'batch' ? [audienceValue] : undefined,
        })
        toast(`Announcement processed for ${res.total} parents`, {
          variant: res.failed > 0 || res.notConfigured > 0 ? 'info' : 'success',
          description: `${res.sent} delivered · ${res.notConfigured} not sent · ${res.failed} failed`,
        })
      } else {
        const res = await api.post<{
          summary: { total: number; sent: number; failed: number; notConfigured: number; simulated: number }
        }>('/messages/send', {
          studentIds: recipients.map((s) => s.id),
          body: text,
        })
        toast(`Message processed for ${res.summary.total} parents`, {
          variant: res.summary.failed > 0 || res.summary.notConfigured > 0 ? 'info' : 'success',
          description: `${res.summary.sent} delivered · ${res.summary.notConfigured} not sent · ${res.summary.failed} failed`,
        })
      }
      setComposeOpen(false)
      setText('')
      await load()
    } catch (err) {
      toast('Could not send message', { variant: 'error', description: errorMessage(err) })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Messages"
        description="Every WhatsApp message the institute sends, with its real delivery status."
        actions={
          <Button size="sm" onClick={() => setComposeOpen(true)}>
            <Send className="size-4" />
            New message
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search number or message text"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatus(f.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              status === f.key
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
            {f.key !== 'all' && counts[f.key] ? (
              <span className="ml-1.5 tabular-nums opacity-70">{counts[f.key]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner /> Loading messages…
        </div>
      ) : messages.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="Messages appear here as automations run or when you send one manually."
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{m.student?.name ?? m.to}</p>
                      <p className="text-[11px] tabular-nums text-muted-foreground">{m.to}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs capitalize text-muted-foreground">
                        {m.template.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-2 text-xs text-muted-foreground">{m.body}</p>
                      {m.error ? (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-destructive">{m.error}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={m.status} />
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-muted-foreground">
                      {formatDateTime(m.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 md:hidden">
            {messages.map((m) => (
              <div key={m.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.student?.name ?? m.to}</p>
                    <p className="truncate text-[11px] tabular-nums text-muted-foreground">{m.to}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">{m.body}</p>
                {m.error ? (
                  <p className="mt-1 text-[11px] text-destructive">{m.error}</p>
                ) : null}
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {m.template.replace('_', ' ')} · {formatDateTime(m.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send a WhatsApp message</DialogTitle>
            <DialogDescription>
              Parents receive it on WhatsApp — no app or account needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Message type">
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct message</SelectItem>
                    <SelectItem value="announcement">Institute announcement</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Audience">
                <Select
                  value={audience}
                  onValueChange={(v) => {
                    setAudience(v)
                    setAudienceValue('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All active students</SelectItem>
                    <SelectItem value="class">A class</SelectItem>
                    <SelectItem value="batch">A batch</SelectItem>
                    <SelectItem value="single">One student</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {audience === 'class' ? (
              <Field label="Class">
                <Select value={audienceValue} onValueChange={setAudienceValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            {audience === 'batch' ? (
              <Field label="Batch">
                <Select value={audienceValue} onValueChange={setAudienceValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            {audience === 'single' ? (
              <Field label="Student">
                <Select value={audienceValue} onValueChange={setAudienceValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {s.className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            <Field label="Message">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="Type your message…"
              />
            </Field>

            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={draftWithAi} disabled={drafting}>
                <Sparkles className="size-3.5" />
                {drafting ? 'Drafting…' : 'Draft with AI'}
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {recipients.length} recipient{recipients.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={send} disabled={sending || recipients.length === 0}>
              <Send className="size-4" />
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <MessageSquare className="size-3.5" />
        A message is only marked “sent” when the WhatsApp Cloud API accepts it.
      </div>
    </div>
  )
}
