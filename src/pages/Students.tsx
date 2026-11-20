import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Eye, Pencil, Plus, Search, Trash2, Upload, Users } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { formatDate, inr } from '@/lib/format'
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
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
  StatusBadge,
  useToast,
} from '@/components/common'
import { StudentProfile } from '@/components/StudentProfile'

type Student = {
  id: string
  name: string
  className: string
  batch: string
  rollNo: string | null
  parentName: string
  parentPhone: string
  parentEmail: string | null
  admissionDate: string
  status: string
  feeAmount: number
  feeDueDay: number
  notes: string | null
  pendingInvoice: { id: string; amount: number; dueDate: string; period: string } | null
  _count: { attendance: number; results: number }
}

type FormState = {
  name: string
  className: string
  batch: string
  rollNo: string
  parentName: string
  parentPhone: string
  parentEmail: string
  feeAmount: string
  feeDueDay: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: '',
  className: '',
  batch: '',
  rollNo: '',
  parentName: '',
  parentPhone: '+91',
  parentEmail: '',
  feeAmount: '3000',
  feeDueDay: '5',
  notes: '',
}

export function Students({ isAdmin = false }: { isAdmin?: boolean }) {
  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [className, setClassName] = useState('all')
  const [batch, setBatch] = useState('all')
  const [status, setStatus] = useState('all')
  const [meta, setMeta] = useState<{
    classes: string[]
    batches: string[]
    pairs: { className: string; batch: string; students: number }[]
  }>({
    classes: [],
    batches: [],
    pairs: [],
  })
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 24

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState<Student | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [csv, setCsv] = useState('')
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (className !== 'all') params.set('className', className)
      if (batch !== 'all') params.set('batch', batch)
      if (status !== 'all') params.set('status', status)
      const res = await api.get<{ students: Student[] }>(`/students?${params.toString()}`)
      setStudents(res.students)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [q, className, batch, status])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    api
      .get<{
        classes: string[]
        batches: string[]
        pairs: { className: string; batch: string; students: number }[]
      }>('/students/meta')
      .then(setMeta)
      .catch(() => {})
  }, [students.length, formOpen])

  // Batches that actually exist for the selected class. Used by both the
  // filter row and the add/edit form so a student can never be filed under a
  // class/batch combination the institute does not run.
  const batchesForClass = useMemo(() => {
    const target = className === 'all' ? form.className : className
    return [...new Set(meta.pairs.filter((p) => p.className === target).map((p) => p.batch))].sort()
  }, [meta.pairs, className, form.className])

  const formBatches = useMemo(
    () =>
      [...new Set(meta.pairs.filter((p) => p.className === form.className).map((p) => p.batch))].sort(),
    [meta.pairs, form.className],
  )

  useEffect(() => {
    setPage(1)
  }, [q, className, batch, status])

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(student: Student) {
    setEditing(student)
    setForm({
      name: student.name,
      className: student.className,
      batch: student.batch,
      rollNo: student.rollNo ?? '',
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail ?? '',
      feeAmount: String(student.feeAmount),
      feeDueDay: String(student.feeDueDay),
      notes: student.notes ?? '',
    })
    setFormError(null)
    setFormOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.className || !form.batch) {
      setFormError('Select a class and a batch for this student.')
      return
    }
    setSaving(true)
    setFormError(null)
    const payload = {
      name: form.name,
      className: form.className,
      batch: form.batch,
      rollNo: form.rollNo,
      parentName: form.parentName,
      parentPhone: form.parentPhone,
      parentEmail: form.parentEmail,
      feeAmount: Number(form.feeAmount) || 0,
      feeDueDay: Number(form.feeDueDay) || 5,
      notes: form.notes,
    }
    try {
      if (editing) {
        await api.patch(`/students/${editing.id}`, payload)
        toast('Student updated', { variant: 'success' })
      } else {
        const res = await api.post<{
          welcome?: { result?: { status: string; error?: string | null } }
        }>('/students', payload)
        const status = res.welcome?.result?.status
        toast('Student added', {
          variant: 'success',
          description:
            status === 'sent'
              ? 'Welcome message sent to the parent on WhatsApp.'
              : status === 'simulated'
                ? 'Welcome message logged (simulation mode).'
                : status === 'not_configured'
                  ? 'Welcome message logged — WhatsApp is not connected yet.'
                  : status === 'failed'
                    ? `Welcome message failed: ${res.welcome?.result?.error ?? 'unknown error'}`
                    : 'Student saved.',
        })
      }
      setFormOpen(false)
      await load()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!deleting) return
    try {
      await api.del(`/students/${deleting.id}`)
      toast('Student removed', { variant: 'success' })
      setDeleting(null)
      await load()
    } catch (err) {
      toast('Could not remove student', { variant: 'error', description: errorMessage(err) })
    }
  }

  async function runImport() {
    setImporting(true)
    try {
      const res = await api.post<{ created: number; failed: number; errors: string[] }>(
        '/students/import',
        { csv },
      )
      toast(`Imported ${res.created} students`, {
        variant: res.failed > 0 ? 'info' : 'success',
        description: res.failed > 0 ? `${res.failed} rows skipped. ${res.errors[0] ?? ''}` : undefined,
      })
      setImportOpen(false)
      setCsv('')
      await load()
    } catch (err) {
      toast('Import failed', { variant: 'error', description: errorMessage(err) })
    } finally {
      setImporting(false)
    }
  }

  const pendingTotal = useMemo(
    () => students.reduce((sum, s) => sum + (s.pendingInvoice?.amount ?? 0), 0),
    [students],
  )

  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = useMemo(
    () => students.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [students, safePage],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        description={`${students.length} students${pendingTotal > 0 ? ` · ${inr(pendingTotal)} pending` : ''}`}
        actions={
          <>
            {isAdmin ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Upload className="size-4" />
                  Import
                </Button>
                <Button size="sm" onClick={openAdd}>
                  <Plus className="size-4" />
                  Add student
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, parent or phone"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={className}
            onValueChange={(v) => {
              setClassName(v)
              setBatch('all')
            }}
          >
            <SelectTrigger aria-label="Filter by class" className="min-w-24 flex-1 sm:w-36 sm:flex-none">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {meta.classes.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={batch} onValueChange={setBatch}>
            <SelectTrigger aria-label="Filter by batch" className="min-w-24 flex-1 sm:w-36 sm:flex-none">
              <SelectValue placeholder="Batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All batches</SelectItem>
              {(className === 'all' ? meta.batches : batchesForClass).map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter by status" className="min-w-24 flex-1 sm:w-32 sm:flex-none">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner /> Loading students…
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          title="No students found"
          description="Add your first student or import an existing list from CSV."
          action={
            <Button size="sm" onClick={openAdd}>
              <Plus className="size-4" /> Add student
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class / batch</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="text-right">Monthly fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setProfileId(s.id)}
                        className="text-left font-medium hover:text-primary hover:underline"
                      >
                        {s.name}
                      </button>
                      <p className="text-[11px] text-muted-foreground">
                        {s.rollNo ? `Roll ${s.rollNo} · ` : 'No roll no · '}Joined{' '}
                        {formatDate(s.admissionDate)}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.className}
                      <span className="text-muted-foreground"> · {s.batch}</span>
                    </TableCell>
                    <TableCell className="text-sm">{s.parentName}</TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {s.parentPhone}
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm font-medium tabular-nums">{inr(s.feeAmount)}</p>
                      {s.pendingInvoice ? (
                        <p className="text-[11px] text-amber-600">
                          {inr(s.pendingInvoice.amount)} due
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">No dues</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setProfileId(s.id)}
                          aria-label={`Open profile for ${s.name}`}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        {isAdmin ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => openEdit(s)}
                              aria-label={`Edit ${s.name}`}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleting(s)}
                              aria-label={`Remove ${s.name}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {paged.map((s) => (
              <div key={s.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setProfileId(s.id)}
                      className="truncate text-sm font-medium hover:text-primary hover:underline"
                    >
                      {s.name}
                    </button>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {s.rollNo ? `Roll ${s.rollNo} · ` : ''}
                      {s.className} · {s.batch}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <div>
                    <dt className="text-muted-foreground">Parent</dt>
                    <dd className="truncate">{s.parentName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">WhatsApp</dt>
                    <dd className="truncate tabular-nums">{s.parentPhone}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Fee</dt>
                    <dd className="tabular-nums">{inr(s.feeAmount)}/mo</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Dues</dt>
                    <dd className={s.pendingInvoice ? 'text-amber-600' : ''}>
                      {s.pendingInvoice ? inr(s.pendingInvoice.amount) : 'None'}
                    </dd>
                  </div>
                </dl>
                <div className="mt-2 flex gap-2 border-t pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setProfileId(s.id)}>
                    <Eye className="size-3.5" /> Profile
                  </Button>
                  {isAdmin ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive"
                        onClick={() => setDeleting(s)}
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-2 pt-1 sm:flex-row">
            <p className="text-[11px] text-muted-foreground">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, students.length)} of {students.length}
              {pendingTotal > 0 ? ` · ${inr(pendingTotal)} pending` : ''}
            </p>
            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* Add / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit student' : 'Add student'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the student record. Changes are saved immediately.'
                : 'A welcome message is sent to the parent on WhatsApp when the student is added.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Student name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Roll number">
                <Input
                  value={form.rollNo}
                  onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                  placeholder="Optional"
                />
              </Field>
              <Field
                label="Class"
                hint={meta.classes.length === 0 ? 'No classes yet — add students or create one in Classes' : undefined}
              >
                <Select
                  value={form.className}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      className: v,
                      // Changing class invalidates the batch unless it also exists there.
                      batch: meta.pairs.some((p) => p.className === v && p.batch === prev.batch)
                        ? prev.batch
                        : '',
                    }))
                  }
                  disabled={meta.classes.length === 0}
                >
                  <SelectTrigger aria-label="Class">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {meta.classes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Batch"
                hint={
                  !form.className
                    ? 'Pick a class first'
                    : formBatches.length === 0
                      ? 'No batches in this class yet'
                      : undefined
                }
              >
                <Select
                  value={form.batch}
                  onValueChange={(v) => setForm({ ...form, batch: v })}
                  disabled={formBatches.length === 0}
                >
                  <SelectTrigger aria-label="Batch">
                    <SelectValue placeholder="Select a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {formBatches.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Parent name">
                <Input
                  value={form.parentName}
                  onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                  required
                />
              </Field>
              <Field label="Parent WhatsApp" hint="Include country code, e.g. +919876543210">
                <Input
                  value={form.parentPhone}
                  onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                  required
                />
              </Field>
              <Field label="Monthly fee (₹)">
                <Input
                  type="number"
                  min={0}
                  value={form.feeAmount}
                  onChange={(e) => setForm({ ...form, feeAmount: e.target.value })}
                />
              </Field>
              <Field label="Fee due day" hint="Day of the month (1–28)">
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={form.feeDueDay}
                  onChange={(e) => setForm({ ...form, feeDueDay: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Optional"
              />
            </Field>
            {formError ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {formError}
              </p>
            ) : null}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add student'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import students from CSV</DialogTitle>
            <DialogDescription>
              Paste rows from your existing records. The first line must be a header.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-secondary/60 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
              name,class,batch,parentName,parentPhone,feeAmount,feeDueDay
              <br />
              Aarav Sharma,Class 10,Morning A,Rakesh Sharma,+919812340001,3500,5
            </div>
            <Textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={8}
              placeholder="Paste CSV here…"
              className="font-mono text-xs"
            />
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const sample =
                    'name,class,batch,parentName,parentPhone,feeAmount,feeDueDay\n' +
                    'Aarav Sharma,Class 10,Morning A,Rakesh Sharma,+919812340001,3500,5\n' +
                    'Diya Patel,Class 10,Morning A,Nilesh Patel,+919812340002,3500,5'
                  setCsv(sample)
                }}
              >
                <Download className="size-3.5" /> Use sample
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={runImport} disabled={importing || !csv.trim()}>
                  {importing ? 'Importing…' : 'Import'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Remove ${deleting?.name ?? 'student'}?`}
        description="This deletes the student along with their attendance, fee and test records. This cannot be undone."
        confirmLabel="Remove student"
        destructive
        onConfirm={remove}
      />

      <StudentProfile studentId={profileId} onClose={() => setProfileId(null)} />

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Users className="size-3.5" />
        Parents receive updates on WhatsApp — no app or account needed.
      </div>
    </div>
  )
}
