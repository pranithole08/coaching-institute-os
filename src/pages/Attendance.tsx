import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  ChevronRight,
  Clock,
  Layers,
  School,
  X,
} from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { formatDate, todayIso } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Spinner,
  StatusBadge,
  useToast,
} from '@/components/common'
import { AttendanceSheets } from '@/components/AttendanceSheets'

type Pair = { className: string; batch: string; students: number }

type Row = {
  id: string
  name: string
  className: string
  batch: string
  rollNo: string | null
  parentName: string
  parentPhone: string
  status: string | null
  note: string | null
  attendanceId: string | null
}

type AttendanceData = {
  date: string
  students: Row[]
  summary: { present: number; absent: number; late: number; marked: number; total: number }
}

type HistoryRecord = {
  id: string
  date: string
  status: string
  student: { name: string; className: string; batch: string }
}

type Draft = Record<string, { status: 'present' | 'absent' | ''; note: string }>

type Step = 'classes' | 'batches' | 'roster'

export function Attendance() {
  const { toast } = useToast()
  const [date, setDate] = useState(todayIso())
  const [meta, setMeta] = useState<{ pairs: Pair[]; classes: string[]; batches: string[] }>({
    pairs: [],
    classes: [],
    batches: [],
  })

  const [step, setStep] = useState<Step>('classes')
  const [activeClass, setActiveClass] = useState('')
  const [activeBatch, setActiveBatch] = useState('')

  const [data, setData] = useState<AttendanceData | null>(null)
  const [draft, setDraft] = useState<Draft>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    api
      .get<{ pairs: Pair[]; classes: string[]; batches: string[] }>('/students/meta')
      .then(setMeta)
      .catch(() => {})
  }, [])

  const classGroups = useMemo(() => {
    const map = new Map<string, { batches: number; students: number }>()
    for (const p of meta.pairs) {
      const row = map.get(p.className) ?? { batches: 0, students: 0 }
      row.batches += 1
      row.students += p.students
      map.set(p.className, row)
    }
    return [...map.entries()]
      .map(([className, agg]) => ({ className, ...agg }))
      .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }))
  }, [meta.pairs])

  const batchGroups = useMemo(
    () =>
      meta.pairs
        .filter((p) => p.className === activeClass)
        .sort((a, b) => a.batch.localeCompare(b.batch)),
    [meta.pairs, activeClass],
  )

  const loadRoster = useCallback(async () => {
    if (!activeClass || !activeBatch) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        date,
        className: activeClass,
        batch: activeBatch,
      })
      const res = await api.get<AttendanceData>(`/attendance?${params.toString()}`)
      setData(res)
      const next: Draft = {}
      for (const s of res.students) {
        next[s.id] = {
          status: s.status === 'present' || s.status === 'absent' ? s.status : '',
          note: s.note ?? '',
        }
      }
      setDraft(next)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [date, activeClass, activeBatch])

  useEffect(() => {
    if (step === 'roster') void loadRoster()
  }, [step, loadRoster])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await api.get<{ records: HistoryRecord[] }>('/attendance/history')
      setHistory(res.records)
    } catch (err) {
      toast('Could not load history', { variant: 'error', description: errorMessage(err) })
    } finally {
      setHistoryLoading(false)
    }
  }, [toast])

  const counts = useMemo(() => {
    const rows = data?.students ?? []
    let present = 0
    let absent = 0
    let unmarked = 0
    for (const s of rows) {
      const status = draft[s.id]?.status
      if (status === 'present') present += 1
      else if (status === 'absent') absent += 1
      else unmarked += 1
    }
    return { total: rows.length, present, absent, unmarked }
  }, [data, draft])

  const dirtyCount = useMemo(() => {
    if (!data) return 0
    return data.students.filter((s) => {
      const d = draft[s.id]
      if (!d) return false
      const savedStatus = s.status === 'present' || s.status === 'absent' ? s.status : ''
      return d.status !== savedStatus || d.note !== (s.note ?? '')
    }).length
  }, [data, draft])

  function setStatus(studentId: string, status: 'present' | 'absent') {
    setDraft((prev) => ({
      ...prev,
      [studentId]: { status, note: prev[studentId]?.note ?? '' },
    }))
  }

  function setNote(studentId: string, note: string) {
    setDraft((prev) => ({
      ...prev,
      [studentId]: { status: prev[studentId]?.status ?? '', note },
    }))
  }

  function markAllPresent() {
    if (!data) return
    const next: Draft = { ...draft }
    for (const s of data.students) {
      next[s.id] = { status: 'present', note: next[s.id]?.note ?? '' }
    }
    setDraft(next)
  }

  function clearAll() {
    if (!data) return
    const next: Draft = { ...draft }
    for (const s of data.students) next[s.id] = { status: '', note: next[s.id]?.note ?? '' }
    setDraft(next)
  }

  async function save() {
    if (!data) return
    const rows = data.students
      .filter((s) => draft[s.id]?.status === 'present' || draft[s.id]?.status === 'absent')
      .map((s) => ({
        studentId: s.id,
        status: draft[s.id].status,
        note: draft[s.id].note,
      }))
    if (rows.length === 0) {
      toast('Nothing to save', {
        variant: 'error',
        description: 'Mark at least one student present or absent.',
      })
      return
    }
    setSaving(true)
    try {
      const res = await api.post<{
        created: number
        corrected: number
        unchanged: number
        notified: number
      }>('/attendance/save', {
        date,
        className: activeClass,
        batch: activeBatch,
        rows,
      })
      const bits = [
        res.created ? `${res.created} new` : null,
        res.corrected ? `${res.corrected} corrected` : null,
        res.unchanged ? `${res.unchanged} unchanged` : null,
      ].filter(Boolean)
      toast('Attendance saved', {
        variant: 'success',
        description: `${activeClass} · ${activeBatch} · ${formatDate(date)} — ${bits.join(', ') || 'no changes'}${
          res.notified ? ` · ${res.notified} parent notices` : ''
        }`,
      })
      setConfirmOpen(false)
      await loadRoster()
    } catch (err) {
      toast('Could not save attendance', { variant: 'error', description: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  function openClass(name: string) {
    setActiveClass(name)
    setActiveBatch('')
    setData(null)
    setStep('batches')
  }

  function openBatch(batch: string) {
    setActiveBatch(batch)
    setStep('roster')
  }

  const breadcrumb = (
    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <button
        type="button"
        className="hover:text-foreground"
        onClick={() => {
          setStep('classes')
          setActiveClass('')
          setActiveBatch('')
          setData(null)
        }}
      >
        Institute
      </button>
      {activeClass ? (
        <>
          <ChevronRight className="size-3.5" />
          <button
            type="button"
            className={cn('hover:text-foreground', step === 'batches' && 'font-medium text-foreground')}
            onClick={() => {
              setStep('batches')
              setActiveBatch('')
              setData(null)
            }}
          >
            {activeClass}
          </button>
        </>
      ) : null}
      {activeBatch ? (
        <>
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-foreground">{activeBatch}</span>
        </>
      ) : null}
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance"
        description="Pick a class, then a batch. Mark on screen, or print a sheet, fill it in on paper and scan it back."
      />

      <Tabs defaultValue="mark">
        <TabsList>
          <TabsTrigger value="mark">Mark attendance</TabsTrigger>
          <TabsTrigger value="sheets">Paper sheets</TabsTrigger>
          <TabsTrigger value="history" onClick={loadHistory}>
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sheets" className="space-y-4">
          <AttendanceSheets meta={meta} onConfirmed={loadRoster} />
        </TabsContent>

        <TabsContent value="mark" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <CalendarCheck className="size-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="sm:w-44"
                aria-label="Attendance date"
              />
            </div>
            <div className="hidden sm:block">{breadcrumb}</div>
          </div>

          <div className="sm:hidden">{breadcrumb}</div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {step === 'classes' ? (
            classGroups.length === 0 ? (
              <EmptyState
                title="No classes yet"
                description="Classes appear here as soon as students are assigned to a class and batch. Add your first student from the Students section."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classGroups.map((c) => (
                  <button
                    key={c.className}
                    type="button"
                    onClick={() => openClass(c.className)}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <School className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{c.className}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {c.batches} {c.batches === 1 ? 'batch' : 'batches'} · {c.students} students
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )
          ) : null}

          {step === 'batches' ? (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setStep('classes')}>
                <ArrowLeft className="size-4" /> All classes
              </Button>
              {batchGroups.length === 0 ? (
                <EmptyState
                  title="No batches in this class"
                  description="Assign students to a batch from the Students section."
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {batchGroups.map((b) => (
                    <button
                      key={b.batch}
                      type="button"
                      onClick={() => openBatch(b.batch)}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                          <Layers className="size-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{b.batch}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {b.students} {b.students === 1 ? 'student' : 'students'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {step === 'roster' ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setStep('batches')}>
                  <ArrowLeft className="size-4" /> {activeClass} batches
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={markAllPresent} disabled={!data}>
                    <Check className="size-4" /> Mark all present
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAll} disabled={!data}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {activeClass} · {activeBatch}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(date)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-muted-foreground">
                      {counts.total} total
                    </span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                      {counts.present} present
                    </span>
                    <span className="rounded-full bg-destructive/10 px-2.5 py-1 font-medium text-destructive">
                      {counts.absent} absent
                    </span>
                    <span className="rounded-full border px-2.5 py-1 font-medium text-muted-foreground">
                      {counts.unmarked} unmarked
                    </span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
                  <Spinner /> Loading roster…
                </div>
              ) : !data || data.students.length === 0 ? (
                <EmptyState
                  title="No active students in this batch"
                  description="Add students to this class and batch first."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border bg-card">
                  <ul className="divide-y">
                    {data.students.map((s) => {
                      const d = draft[s.id] ?? { status: '', note: '' }
                      const marked = d.status === 'present' || d.status === 'absent'
                      return (
                        <li
                          key={s.id}
                          className={cn(
                            'flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4',
                            !marked && 'bg-amber-50/40 dark:bg-amber-950/20',
                          )}
                        >
                          <div className="min-w-0 sm:flex-1">
                            <p className="truncate text-sm font-medium">
                              <span className="mr-2 inline-block min-w-8 text-[11px] tabular-nums text-muted-foreground">
                                {s.rollNo ?? '—'}
                              </span>
                              {s.name}
                            </p>
                            <div className="mt-1 pl-10">
                              <Input
                                value={d.note}
                                onChange={(e) => setNote(s.id, e.target.value)}
                                placeholder="Optional remark"
                                className="h-7 max-w-xs text-xs"
                                aria-label={`Remark for ${s.name}`}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {s.attendanceId ? (
                              <StatusBadge status={s.status ?? 'present'} className="mr-1" />
                            ) : null}
                            <Button
                              size="sm"
                              variant={d.status === 'present' ? 'default' : 'outline'}
                              className="h-8 flex-1 px-2.5 sm:flex-none"
                              onClick={() => setStatus(s.id, 'present')}
                            >
                              <Check className="size-3.5" /> Present
                            </Button>
                            <Button
                              size="sm"
                              variant={d.status === 'absent' ? 'destructive' : 'outline'}
                              className="h-8 flex-1 px-2.5 sm:flex-none"
                              onClick={() => setStatus(s.id, 'absent')}
                            >
                              <X className="size-3.5" /> Absent
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-xl border bg-card/95 px-3 py-2.5 shadow-sm backdrop-blur sm:px-4">
                <p className="text-[11px] text-muted-foreground">
                  {dirtyCount > 0
                    ? `${dirtyCount} unsaved ${dirtyCount === 1 ? 'change' : 'changes'}`
                    : 'Everything saved'}
                  {counts.unmarked > 0 ? ` · ${counts.unmarked} unmarked (not saved as absent)` : ''}
                </p>
                <Button onClick={() => setConfirmOpen(true)} disabled={saving || dirtyCount === 0}>
                  <Check className="size-4" /> Save attendance
                </Button>
              </div>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {historyLoading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner /> Loading history…
            </div>
          ) : history.length === 0 ? (
            <EmptyState title="No attendance recorded yet" />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <ul className="divide-y">
                {history.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.student.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {r.student.className} · {r.student.batch}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{formatDate(r.date)}</span>
                      <StatusBadge status={r.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Save attendance?"
        confirmLabel={saving ? 'Saving…' : 'Save attendance'}
        description={`${activeClass} · ${activeBatch} · ${formatDate(date)} — ${counts.present} present, ${counts.absent} absent${
          counts.unmarked > 0
            ? `, ${counts.unmarked} left unmarked (they will not be recorded as absent)`
            : ''
        }. Absent students trigger one WhatsApp notice to their parent.`}
        onConfirm={save}
      />

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Clock className="size-3.5" />
        Re-saving the same day corrects existing records instead of duplicating them, and every
        correction is written to the audit trail.
      </div>
    </div>
  )
}
