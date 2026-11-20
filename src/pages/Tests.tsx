import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  ClipboardList,
  Plus,
  Search,
  Send,
  Trash2,
} from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { formatDate, todayIso } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
  StatusBadge,
  useToast,
} from '@/components/common'

type TestRow = {
  id: string
  name: string
  subject: string
  className: string
  batch: string | null
  date: string
  maxMarks: number
  status: string
  publishedAt: string | null
  resultCount: number
  enteredCount: number
  absentCount: number
  exemptCount: number
  upcoming: boolean
}

type RosterRow = {
  studentId: string
  name: string
  rollNo: string | null
  className: string
  batch: string
  parentPhone: string
  marks: number | null
  status: string
  remarks: string | null
  resultId: string | null
}

type TestDetail = {
  test: {
    id: string
    name: string
    subject: string
    className: string
    batch: string | null
    date: string
    maxMarks: number
    status: string
    publishedAt: string | null
    publishedBy: string | null
  }
  roster: RosterRow[]
  summary: {
    total: number
    entered: number
    notEntered: number
    absent: number
    exempt: number
    average: number | null
    highest: number | null
    lowest: number | null
    publishable: number
  }
}

type Options = {
  groups: { className: string; batch: string; count: number }[]
  classes: string[]
  subjects: string[]
}

type Review = {
  test: { id: string; name: string; subject: string; className: string; batch: string | null; maxMarks: number; status: string }
  rows: { studentId: string; name: string; rollNo: string | null; marks: number | null; status: string; complete: boolean }[]
  counts: { total: number; publishable: number; incomplete: number; absent: number; exempt: number }
  incompleteRows: { studentId: string; name: string; rollNo: string | null }[]
}

type Draft = { marks: string; status: string; remarks: string }

const STATUS_LABEL: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  exempt: 'Exempt',
}

export function Tests({ isAdmin = false }: { isAdmin?: boolean }) {
  const { toast } = useToast()
  const [tests, setTests] = useState<TestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<Options>({ groups: [], classes: [], subjects: [] })
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [customSubject, setCustomSubject] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    subject: '',
    className: '',
    batch: '',
    date: todayIso(),
    maxMarks: '100',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [detail, setDetail] = useState<TestDetail | null>(null)
  const [draft, setDraft] = useState<Record<string, Draft>>({})
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'roll' | 'name' | 'status'>('roll')
  const [marksBusy, setMarksBusy] = useState(false)
  const [deleting, setDeleting] = useState<TestRow | null>(null)

  const [review, setReview] = useState<Review | null>(null)
  const [publishNotify, setPublishNotify] = useState(true)
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishConfirm, setPublishConfirm] = useState(false)

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ tests: TestRow[] }>('/tests')
      setTests(res.tests)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    api
      .get<Options>('/tests/options')
      .then(setOptions)
      .catch(() => {})
  }, [load])

  const batchesForClass = useMemo(
    () => options.groups.filter((g) => g.className === form.className),
    [options.groups, form.className],
  )

  const eligible = useMemo(() => {
    const match = options.groups.find(
      (g) => g.className === form.className && g.batch === form.batch,
    )
    return match?.count ?? 0
  }, [options.groups, form.className, form.batch])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.className || !form.batch) {
      setFormError('Pick a class and a batch')
      return
    }
    if (eligible === 0) {
      setFormError('No active students in that class and batch')
      return
    }
    setSaving(true)
    try {
      await api.post('/tests', {
        name: form.name,
        subject: form.subject,
        className: form.className,
        batch: form.batch,
        date: form.date,
        maxMarks: Number(form.maxMarks) || 100,
      })
      toast('Test created', {
        variant: 'success',
        description: `${eligible} eligible students will appear in the marks sheet.`,
      })
      setCreateOpen(false)
      setCustomSubject(false)
      setForm({
        name: '',
        subject: '',
        className: '',
        batch: '',
        date: todayIso(),
        maxMarks: '100',
      })
      await load()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function openDetail(test: { id: string }) {
    try {
      const res = await api.get<TestDetail>(`/tests/${test.id}`)
      setDetail(res)
      const next: Record<string, Draft> = {}
      for (const r of res.roster) {
        next[r.studentId] = {
          marks: r.marks === null ? '' : String(r.marks),
          status: r.status,
          remarks: r.remarks ?? '',
        }
      }
      setDraft(next)
      setSearch('')
      setSort('roll')
    } catch (err) {
      toast('Could not open test', { variant: 'error', description: errorMessage(err) })
    }
  }

  const visibleRoster = useMemo(() => {
    if (!detail) return []
    const q = search.trim().toLowerCase()
    const rows = detail.roster.filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.rollNo ?? '').toLowerCase().includes(q),
    )
    const sorted = rows.slice()
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'status') sorted.sort((a, b) => a.status.localeCompare(b.status))
    else
      sorted.sort((a, b) =>
        (a.rollNo ?? '').localeCompare(b.rollNo ?? '', undefined, { numeric: true }),
      )
    return sorted
  }, [detail, search, sort])

  const draftStats = useMemo(() => {
    if (!detail) return { entered: 0, blank: 0, absent: 0, exempt: 0, invalid: 0 }
    let entered = 0
    let blank = 0
    let absent = 0
    let exempt = 0
    let invalid = 0
    for (const r of detail.roster) {
      const d = draft[r.studentId]
      if (!d) continue
      if (d.status === 'absent') absent += 1
      else if (d.status === 'exempt') exempt += 1
      else if (d.marks.trim() === '') blank += 1
      else if (Number(d.marks) > detail.test.maxMarks || Number(d.marks) < 0) invalid += 1
      else entered += 1
    }
    return { entered, blank, absent, exempt, invalid }
  }, [detail, draft])

  function setRow(studentId: string, patch: Partial<Draft>) {
    setDraft((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? { marks: '', status: 'present', remarks: '' }), ...patch },
    }))
  }

  function focusNext(studentId: string, direction: 1 | -1) {
    const index = visibleRoster.findIndex((r) => r.studentId === studentId)
    const next = visibleRoster[index + direction]
    if (next) inputRefs.current[next.studentId]?.focus()
  }

  async function saveDraft() {
    if (!detail) return
    if (draftStats.invalid > 0) {
      toast('Fix the highlighted marks first', {
        variant: 'error',
        description: `Marks must be between 0 and ${detail.test.maxMarks}.`,
      })
      return
    }
    setMarksBusy(true)
    try {
      const rows = detail.roster.map((r) => {
        const d = draft[r.studentId] ?? { marks: '', status: 'present', remarks: '' }
        return {
          studentId: r.studentId,
          marks: d.status === 'present' && d.marks.trim() !== '' ? Number(d.marks) : null,
          status: d.status,
          remarks: d.remarks,
        }
      })
      const res = await api.put<{ saved: number; failures: { studentId: string; error: string }[] }>(
        `/tests/${detail.test.id}/results`,
        { rows },
      )
      toast(`${res.saved} draft result(s) saved`, {
        variant: 'success',
        description:
          res.failures.length > 0
            ? `${res.failures.length} row(s) rejected: ${res.failures[0].error}`
            : 'Nothing was sent to parents. Publish when you are ready.',
      })
      await openDetail({ id: detail.test.id })
      await load()
    } catch (err) {
      toast('Could not save marks', { variant: 'error', description: errorMessage(err) })
    } finally {
      setMarksBusy(false)
    }
  }

  async function openReview() {
    if (!detail) return
    try {
      const res = await api.get<Review>(`/tests/${detail.test.id}/review`)
      setReview(res)
      setPublishNotify(true)
      setPublishConfirm(false)
    } catch (err) {
      toast('Could not load the review', { variant: 'error', description: errorMessage(err) })
    }
  }

  async function publish() {
    if (!review) return
    setPublishBusy(true)
    try {
      const res = await api.post<{
        published: number
        notified: number
        skipped: number
        failures: string[]
      }>(`/tests/${review.test.id}/publish`, { confirm: true, notify: publishNotify })
      toast(`${res.published} result(s) published`, {
        variant: 'success',
        description: publishNotify
          ? `${res.notified} parent(s) notified${res.skipped ? `, ${res.skipped} already notified` : ''}.`
          : 'Published without sending WhatsApp messages.',
      })
      setReview(null)
      setDetail(null)
      await load()
    } catch (err) {
      toast('Could not publish', { variant: 'error', description: errorMessage(err) })
    } finally {
      setPublishBusy(false)
    }
  }

  async function remove() {
    if (!deleting) return
    try {
      await api.del(`/tests/${deleting.id}`)
      toast('Test deleted', { variant: 'success' })
      setDeleting(null)
      await load()
    } catch (err) {
      toast('Could not delete test', { variant: 'error', description: errorMessage(err) })
    }
  }

  const subjectsPresent = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of tests) map.set(t.subject, (map.get(t.subject) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [tests])

  const shown = useMemo(
    () =>
      (subjectFilter === 'all' ? tests : tests.filter((t) => t.subject === subjectFilter))
        .slice()
        .sort(
          (a, b) =>
            a.subject.localeCompare(b.subject) || new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [tests, subjectFilter],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tests & performance"
        description="Enter marks as a draft, review, then publish. Parents are only messaged after you publish."
        actions={
          isAdmin ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New test
            </Button>
          ) : null
        }
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {subjectsPresent.length > 0 && !loading ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubjectFilter('all')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              subjectFilter === 'all'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            All subjects · {tests.length}
          </button>
          {subjectsPresent.map(([subject, count]) => (
            <button
              key={subject}
              type="button"
              onClick={() => setSubjectFilter(subject)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                subjectFilter === subject
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {subject} · {count}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner /> Loading tests…
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          title={tests.length === 0 ? 'No tests yet' : 'No tests for this subject'}
          description={
            tests.length === 0
              ? 'Create a test for a class and batch, then enter marks.'
              : 'Pick another subject, or create a test for this one.'
          }
          action={
            isAdmin ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> New test
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Class / batch</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">{t.subject}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.className}
                      {t.batch ? <span className="text-muted-foreground"> · {t.batch}</span> : null}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(t.date)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{t.maxMarks}</TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {t.enteredCount} entered
                      {t.absentCount ? (
                        <span className="text-muted-foreground"> · {t.absentCount} absent</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                          t.status === 'published'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-secondary text-muted-foreground',
                        )}
                      >
                        {t.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                      {t.status === 'published' && t.publishedAt ? (
                        <span className="ml-1.5 text-[11px] text-muted-foreground">
                          {formatDate(t.publishedAt)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" className="h-8" onClick={() => openDetail(t)}>
                          {t.status === 'published' ? 'View' : 'Enter marks'}
                        </Button>
                        {isAdmin ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleting(t)}
                            aria-label={`Delete ${t.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 md:hidden">
            {shown.map((t) => (
              <div key={t.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.subject} · {t.className}
                      {t.batch ? ` · ${t.batch}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                      t.status === 'published'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {t.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDate(t.date)} · out of {t.maxMarks} · {t.enteredCount} entered
                </p>
                <div className="mt-2 flex gap-2 border-t pt-2">
                  <Button size="sm" className="flex-1" onClick={() => openDetail(t)}>
                    {t.status === 'published' ? 'View' : 'Enter marks'}
                  </Button>
                  {isAdmin ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => setDeleting(t)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New test</DialogTitle>
            <DialogDescription>
              Classes and batches come from your student records.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Test name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Unit Test 4"
                  required
                />
              </Field>
              <Field label="Subject" hint={customSubject ? undefined : 'From the subjects configured for your institute'}>
                {customSubject || options.subjects.length === 0 ? (
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Mathematics"
                    required
                  />
                ) : (
                  <Select
                    value={form.subject}
                    onValueChange={(v) => {
                      if (v === '__custom__') {
                        setCustomSubject(true)
                        setForm({ ...form, subject: '' })
                        return
                      }
                      setForm({ ...form, subject: v })
                    }}
                  >
                    <SelectTrigger aria-label="Subject">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.subjects.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Add a new subject…</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <Field label="Class">
                <Select
                  value={form.className}
                  onValueChange={(v) => setForm({ ...form, className: v, batch: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.classes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Batch" hint={form.className ? undefined : 'Pick a class first'}>
                <Select
                  value={form.batch}
                  onValueChange={(v) => setForm({ ...form, batch: v })}
                  disabled={!form.className}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batchesForClass.map((g) => (
                      <SelectItem key={g.batch} value={g.batch}>
                        {g.batch} · {g.count} students
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label="Max marks">
                <Input
                  type="number"
                  min={1}
                  value={form.maxMarks}
                  onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
                />
              </Field>
            </div>

            <div
              className={cn(
                'rounded-lg border p-3 text-xs',
                eligible > 0
                  ? 'border-primary/30 bg-primary/5 text-foreground'
                  : 'border-amber-200 bg-amber-50 text-amber-900',
              )}
            >
              {form.className && form.batch ? (
                eligible > 0 ? (
                  <>
                    <span className="font-medium">{eligible} eligible active students</span> will
                    appear in the marks sheet.
                  </>
                ) : (
                  <>
                    <span className="font-medium">No eligible students.</span> Add students to this
                    class and batch before creating the test.
                  </>
                )
              ) : (
                'Select a class and batch to see how many students are eligible.'
              )}
            </div>

            {formError ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {formError}
              </p>
            ) : null}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || eligible === 0}>
                {saving ? 'Creating…' : 'Create test'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Marks entry */}
      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{detail?.test.name}</DialogTitle>
            <DialogDescription>
              {detail
                ? `${detail.test.subject} · ${detail.test.className}${detail.test.batch ? ` · ${detail.test.batch}` : ''} · out of ${detail.test.maxMarks}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {detail ? (
            <div className="space-y-3">
              {detail.test.status === 'published' ? (
                <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Published {detail.test.publishedAt ? formatDate(detail.test.publishedAt) : ''}
                    {detail.test.publishedBy ? ` by ${detail.test.publishedBy}` : ''}. Results are
                    read-only unless an administrator reopens the test.
                  </span>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or roll number"
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSort(sort === 'roll' ? 'name' : sort === 'name' ? 'status' : 'roll')
                  }
                >
                  <ArrowDownUp className="size-3.5" />
                  Sort: {sort}
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                  {draftStats.entered} entered
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
                  {draftStats.blank} not entered
                </span>
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                  {draftStats.absent} absent
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
                  {draftStats.exempt} exempt
                </span>
                {draftStats.invalid > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                    {draftStats.invalid} over max
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'Students', value: detail.summary.total },
                  { label: 'Evaluated', value: detail.summary.entered },
                  { label: 'Absent', value: detail.summary.absent },
                  {
                    label: 'Average',
                    value:
                      detail.summary.average === null
                        ? '—'
                        : `${detail.summary.average}/${detail.test.maxMarks}`,
                  },
                  {
                    label: 'Highest',
                    value:
                      detail.summary.highest === null
                        ? '—'
                        : `${detail.summary.highest}/${detail.test.maxMarks}`,
                  },
                  {
                    label: 'Lowest',
                    value:
                      detail.summary.lowest === null
                        ? '—'
                        : `${detail.summary.lowest}/${detail.test.maxMarks}`,
                  },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </p>
                    <p className="text-sm font-semibold tabular-nums">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-lg border">
                <div className="grid grid-cols-[3.5rem_1fr_5rem] gap-2 border-b bg-secondary/50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-[3.5rem_1fr_5rem_7rem_1fr]">
                  <span>Roll</span>
                  <span>Student</span>
                  <span>Marks</span>
                  <span className="hidden sm:block">Status</span>
                  <span className="hidden sm:block">Remarks</span>
                </div>
                <div className="max-h-80 divide-y overflow-y-auto">
                  {visibleRoster.map((s) => {
                    const d = draft[s.studentId] ?? { marks: '', status: 'present', remarks: '' }
                    const over =
                      d.status === 'present' &&
                      d.marks.trim() !== '' &&
                      (Number(d.marks) > detail.test.maxMarks || Number(d.marks) < 0)
                    return (
                      <div
                        key={s.studentId}
                        className={cn(
                          'grid grid-cols-[3.5rem_1fr_5rem] items-center gap-2 px-3 py-2 sm:grid-cols-[3.5rem_1fr_5rem_7rem_1fr]',
                          over && 'bg-destructive/5',
                        )}
                      >
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {s.rollNo ?? '—'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground sm:hidden">
                            {STATUS_LABEL[d.status]}
                          </p>
                        </div>
                        <Input
                          ref={(el) => {
                            inputRefs.current[s.studentId] = el
                          }}
                          type="number"
                          min={0}
                          max={detail.test.maxMarks}
                          inputMode="decimal"
                          value={d.status === 'present' ? d.marks : ''}
                          disabled={d.status !== 'present' || detail.test.status === 'published'}
                          onChange={(e) => setRow(s.studentId, { marks: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                              e.preventDefault()
                              focusNext(s.studentId, 1)
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              focusNext(s.studentId, -1)
                            }
                          }}
                          className={cn('h-8 text-sm', over && 'border-destructive')}
                          placeholder="—"
                        />
                        <div className="col-span-3 flex gap-1 sm:col-span-1">
                          {(['present', 'absent', 'exempt'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              disabled={detail.test.status === 'published'}
                              onClick={() => setRow(s.studentId, { status: st })}
                              className={cn(
                                'flex-1 rounded border px-1 py-1 text-[10px] font-medium capitalize transition-colors sm:flex-none sm:px-1.5',
                                d.status === st
                                  ? st === 'absent'
                                    ? 'border-destructive bg-destructive/10 text-destructive'
                                    : 'border-primary bg-primary/10 text-primary'
                                  : 'border-border text-muted-foreground hover:bg-secondary',
                              )}
                            >
                              {st === 'present' ? 'P' : st === 'absent' ? 'A' : 'E'}
                            </button>
                          ))}
                        </div>
                        <Input
                          value={d.remarks}
                          disabled={detail.test.status === 'published'}
                          onChange={(e) => setRow(s.studentId, { remarks: e.target.value })}
                          className="col-span-3 h-8 text-sm sm:col-span-1"
                          placeholder="Optional"
                        />
                      </div>
                    )
                  })}
                  {visibleRoster.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                      No students match that search.
                    </p>
                  ) : null}
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Blank marks are stored as “not entered”, never as zero. Press Enter or ↓ to move to
                the next student.
              </p>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Close
                </Button>
                {detail.test.status !== 'published' ? (
                  <>
                    <Button variant="outline" onClick={saveDraft} disabled={marksBusy}>
                      {marksBusy ? 'Saving…' : 'Save draft'}
                    </Button>
                    <Button onClick={openReview}>
                      <Send className="size-4" />
                      Review & publish
                    </Button>
                  </>
                ) : null}
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Publish review */}
      <Dialog open={Boolean(review)} onOpenChange={(open) => !open && setReview(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish results</DialogTitle>
            <DialogDescription>
              {review
                ? `${review.test.name} · ${review.test.className}${review.test.batch ? ` · ${review.test.batch}` : ''}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {review ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'Students', value: review.counts.total },
                  { label: 'Ready', value: review.counts.publishable },
                  { label: 'Incomplete', value: review.counts.incomplete },
                  { label: 'Absent', value: review.counts.absent },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border bg-card p-2.5 text-center">
                    <p className="text-lg font-semibold tabular-nums">{s.value}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {review.counts.incomplete > 0 ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">
                      {review.counts.incomplete} student(s) have no marks yet
                    </p>
                    <p className="mt-0.5">
                      They will be skipped. You can still publish the {review.counts.publishable}{' '}
                      complete result(s).
                    </p>
                    <ul className="mt-1 list-inside list-disc">
                      {review.incompleteRows.slice(0, 5).map((r) => (
                        <li key={r.studentId}>
                          {r.rollNo ? `${r.rollNo} · ` : ''}
                          {r.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              <label className="flex items-start gap-2 rounded-lg border bg-secondary/30 p-3">
                <input
                  type="checkbox"
                  checked={publishNotify}
                  onChange={(e) => setPublishNotify(e.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                />
                <span className="text-xs">
                  <span className="font-medium">Send results to parents on WhatsApp</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    One message per published result. Parents already notified for this test are
                    skipped.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={publishConfirm}
                  onChange={(e) => setPublishConfirm(e.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                />
                <span className="text-xs">
                  <span className="font-medium">
                    I have reviewed these results and want to publish them
                  </span>
                  <span className="mt-0.5 block text-muted-foreground">
                    Publishing locks the marks for teachers.
                  </span>
                </span>
              </label>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setReview(null)}>
                  Back
                </Button>
                <Button onClick={publish} disabled={publishBusy || !publishConfirm}>
                  <Send className="size-4" />
                  {publishBusy
                    ? 'Publishing…'
                    : `Publish ${review.counts.publishable} result(s)`}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'test'}?`}
        description="All marks entered for this test will be removed."
        confirmLabel="Delete test"
        destructive
        onConfirm={remove}
      />

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <ClipboardList className="size-3.5" />
        Drafts are saved without notifying anyone. Parents only hear from you after you publish.
      </div>
    </div>
  )
}
