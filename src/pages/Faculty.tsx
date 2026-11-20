import { useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  Plus,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { formatDate, todayIso } from '@/lib/format'
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
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
  useToast,
} from '@/components/common'

type Assignment = { id: string; className: string; batch: string; subject: string; studentCount?: number }

type Teacher = {
  id: string
  name: string
  email: string | null
  phone: string | null
  subjects: string
  active: boolean
  userId: string | null
  assignments: Assignment[]
  slotCount: number
}

type Me = {
  isAdmin: boolean
  teacher: { id: string; name: string; email: string | null; phone: string | null; subjects: string } | null
  assignments: Assignment[]
  today: { id: string; startTime: string; endTime: string; className: string; batch: string; subject: string; room: string | null }[]
  upcoming: { id: string; dayName: string; startTime: string; endTime: string; className: string; batch: string; subject: string; room: string | null }[]
  batches: { className: string; batch: string; subject: string; studentCount: number }[]
  materials: { id: string; title: string; kind: string; className: string; batch: string; createdAt: string }[]
  message?: string
}

type Student = {
  id: string
  name: string
  rollNo: string | null
  className: string
  batch: string
  parentName: string
  parentPhone: string
}

export function Faculty() {
  const { toast } = useToast()
  const [me, setMe] = useState<Me | null>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', subjects: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [assignFor, setAssignFor] = useState<Teacher | null>(null)
  const [assign, setAssign] = useState({ className: '', batch: '', subject: '' })
  const [assignBusy, setAssignBusy] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState<Teacher | null>(null)

  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)

  const [materialOpen, setMaterialOpen] = useState(false)
  const [material, setMaterial] = useState({
    title: '',
    description: '',
    kind: 'material',
    className: '',
    batch: '',
    subject: '',
    url: '',
    dueDate: '',
  })
  const [materialBusy, setMaterialBusy] = useState(false)
  const [materialError, setMaterialError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const meRes = await api.get<Me>('/faculty/me')
      setMe(meRes)
      if (meRes.isAdmin) {
        const res = await api.get<{ teachers: Teacher[] }>('/faculty')
        setTeachers(res.teachers)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true)
    try {
      const res = await api.get<{ students: Student[] }>('/faculty/me/students')
      setStudents(res.students)
    } catch {
      setStudents([])
    } finally {
      setStudentsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (me && !me.isAdmin) loadStudents()
  }, [me, loadStudents])

  async function addTeacher(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      await api.post('/faculty', form)
      toast('Faculty added', { variant: 'success' })
      setAddOpen(false)
      setForm({ name: '', email: '', phone: '', subjects: '' })
      await load()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function addAssignment(e: React.FormEvent) {
    e.preventDefault()
    if (!assignFor) return
    setAssignError(null)
    setAssignBusy(true)
    try {
      await api.post(`/faculty/${assignFor.id}/assignments`, assign)
      toast('Batch assigned', { variant: 'success' })
      setAssignFor(null)
      setAssign({ className: '', batch: '', subject: '' })
      await load()
    } catch (err) {
      setAssignError(errorMessage(err))
    } finally {
      setAssignBusy(false)
    }
  }

  async function removeAssignment(teacherId: string, assignmentId: string) {
    try {
      await api.del(`/faculty/assignments/${assignmentId}`)
      await load()
    } catch (err) {
      toast('Could not remove assignment', { variant: 'error', description: errorMessage(err) })
    }
  }

  async function removeTeacher() {
    if (!deleting) return
    try {
      await api.del(`/faculty/${deleting.id}`)
      toast('Faculty removed', { variant: 'success' })
      setDeleting(null)
      await load()
    } catch (err) {
      toast('Could not remove faculty', { variant: 'error', description: errorMessage(err) })
    }
  }

  async function shareMaterial(e: React.FormEvent) {
    e.preventDefault()
    setMaterialError(null)
    setMaterialBusy(true)
    try {
      await api.post('/materials', material)
      toast('Shared with the batch', { variant: 'success' })
      setMaterialOpen(false)
      setMaterial({
        title: '',
        description: '',
        kind: 'material',
        className: '',
        batch: '',
        subject: '',
        url: '',
        dueDate: '',
      })
      await load()
    } catch (err) {
      setMaterialError(errorMessage(err))
    } finally {
      setMaterialBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted-foreground">
        <Spinner /> Loading faculty…
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Faculty" />
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Admin view
  // -------------------------------------------------------------------------
  if (me?.isAdmin) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Faculty"
          description="Assign batches and subjects. Teachers only see the batches they are assigned to."
          actions={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="size-4" />
              Add faculty
            </Button>
          }
        />

        {teachers.length === 0 ? (
          <EmptyState
            title="No faculty yet"
            description="Add a teacher, then assign them the batches they teach."
            action={
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <UserPlus className="size-4" /> Add faculty
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {teachers.map((t) => (
              <div key={t.id} className="rounded-xl border bg-card p-3 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{t.name}</p>
                      {t.userId ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          can sign in
                        </span>
                      ) : (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          no login
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {t.email ?? 'No email'}
                      {t.phone ? ` · ${t.phone}` : ''}
                      {t.subjects ? ` · ${t.subjects}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setAssignFor(t)}>
                      <Plus className="size-3.5" /> Assign batch
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleting(t)}
                      aria-label={`Remove ${t.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {t.assignments.length === 0 ? (
                  <p className="mt-2 rounded-md border border-dashed p-2 text-[11px] text-muted-foreground">
                    No batches assigned yet.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {t.assignments.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-1.5 rounded-full border bg-secondary/50 px-2.5 py-1 text-[11px]"
                      >
                        <span className="font-medium">{a.className}</span>
                        <span className="text-muted-foreground">· {a.batch}</span>
                        <span className="text-muted-foreground">· {a.subject}</span>
                        {a.studentCount !== undefined ? (
                          <span className="text-muted-foreground">({a.studentCount})</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeAssignment(t.id, a.id)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Remove assignment"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add faculty</DialogTitle>
              <DialogDescription>
                Use the same email as an existing staff login to link the account.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={addTeacher} className="space-y-3">
              <Field label="Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Email" hint="Optional — links to a staff login">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="Subjects" hint="Comma separated">
                <Input
                  value={form.subjects}
                  onChange={(e) => setForm({ ...form, subjects: e.target.value })}
                  placeholder="Mathematics, Physics"
                />
              </Field>
              {formError ? (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {formError}
                </p>
              ) : null}
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Add faculty'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(assignFor)} onOpenChange={(o) => !o && setAssignFor(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign a batch</DialogTitle>
              <DialogDescription>{assignFor?.name}</DialogDescription>
            </DialogHeader>
            <form onSubmit={addAssignment} className="space-y-3">
              <Field label="Class">
                <Input
                  value={assign.className}
                  onChange={(e) => setAssign({ ...assign, className: e.target.value })}
                  placeholder="Class 10"
                  required
                />
              </Field>
              <Field label="Batch">
                <Input
                  value={assign.batch}
                  onChange={(e) => setAssign({ ...assign, batch: e.target.value })}
                  placeholder="Morning A"
                  required
                />
              </Field>
              <Field label="Subject">
                <Input
                  value={assign.subject}
                  onChange={(e) => setAssign({ ...assign, subject: e.target.value })}
                  placeholder="Mathematics"
                  required
                />
              </Field>
              {assignError ? (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {assignError}
                </p>
              ) : null}
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setAssignFor(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={assignBusy}>
                  {assignBusy ? 'Assigning…' : 'Assign'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={Boolean(deleting)}
          onOpenChange={(o) => !o && setDeleting(null)}
          title={`Remove ${deleting?.name ?? 'faculty'}?`}
          description="Their batch assignments and timetable sessions are removed. The staff login is kept."
          confirmLabel="Remove faculty"
          destructive
          onConfirm={removeTeacher}
        />
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Teacher view
  // -------------------------------------------------------------------------
  if (!me?.teacher) {
    return (
      <div className="space-y-4">
        <PageHeader title="My workspace" />
        <EmptyState
          title="No faculty profile linked"
          description={
            me?.message ??
            'Ask an administrator to create your faculty profile and assign your batches.'
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Welcome, ${me.teacher.name.split(' ')[0]}`}
        description={`${me.assignments.length} batch assignment(s)${me.teacher.subjects ? ` · ${me.teacher.subjects}` : ''}`}
        actions={
          <Button size="sm" onClick={() => setMaterialOpen(true)}>
            <Upload className="size-4" />
            Share material
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="size-3.5" /> Today
          </div>
          {me.today.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No classes scheduled today.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {me.today.map((s) => (
                <li key={s.id} className="text-sm">
                  <span className="font-medium tabular-nums">
                    {s.startTime}–{s.endTime}
                  </span>
                  <span className="text-muted-foreground">
                    {' '}
                    · {s.subject} · {s.className} {s.batch}
                    {s.room ? ` · ${s.room}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <GraduationCap className="size-3.5" /> My batches
          </div>
          {me.batches.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No batches assigned.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {me.batches.map((b) => (
                <li key={`${b.className}-${b.batch}-${b.subject}`} className="text-sm">
                  <span className="font-medium">{b.className}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    · {b.batch} · {b.subject} · {b.studentCount} students
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <BookOpen className="size-3.5" /> Upcoming
          </div>
          {me.upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nothing else scheduled.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {me.upcoming.slice(0, 5).map((s) => (
                <li key={s.id} className="text-sm">
                  <span className="font-medium">{s.dayName}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    {s.startTime} · {s.subject} · {s.className}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4" /> My students
          </h2>
          <span className="text-[11px] text-muted-foreground">{students.length} active</span>
        </div>
        {studentsLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Spinner /> Loading…
          </div>
        ) : students.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No students in your batches" />
          </div>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {students.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{s.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {s.rollNo ? `Roll ${s.rollNo} · ` : ''}
                    {s.className} · {s.batch}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {s.parentPhone}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="size-4" /> Shared materials
          </h2>
        </div>
        {me.materials.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Nothing shared yet"
              description="Upload notes or assignments for your batches."
            />
          </div>
        ) : (
          <ul className="divide-y">
            {me.materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{m.title}</p>
                  <p className="text-[11px] capitalize text-muted-foreground">
                    {m.kind} · {m.className} {m.batch} · {formatDate(m.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={materialOpen} onOpenChange={setMaterialOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share material or assignment</DialogTitle>
            <DialogDescription>Visible to the students in that batch.</DialogDescription>
          </DialogHeader>
          <form onSubmit={shareMaterial} className="space-y-3">
            <Field label="Title">
              <Input
                value={material.title}
                onChange={(e) => setMaterial({ ...material, title: e.target.value })}
                required
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Type">
                <Select
                  value={material.kind}
                  onValueChange={(v) => setMaterial({ ...material, kind: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">Study material</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Subject">
                <Input
                  value={material.subject}
                  onChange={(e) => setMaterial({ ...material, subject: e.target.value })}
                />
              </Field>
              <Field label="Class">
                <Select
                  value={material.className}
                  onValueChange={(v) => {
                    const match = me.batches.find((b) => b.className === v)
                    setMaterial({ ...material, className: v, batch: match?.batch ?? '' })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set(me.batches.map((b) => b.className))].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Batch">
                <Select
                  value={material.batch}
                  onValueChange={(v) => setMaterial({ ...material, batch: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {me.batches
                      .filter((b) => b.className === material.className)
                      .map((b) => (
                        <SelectItem key={b.batch} value={b.batch}>
                          {b.batch}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Link" hint="Optional — a URL to the file or resource">
              <Input
                value={material.url}
                onChange={(e) => setMaterial({ ...material, url: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            {material.kind === 'assignment' ? (
              <Field label="Due date">
                <Input
                  type="date"
                  value={material.dueDate || todayIso()}
                  onChange={(e) => setMaterial({ ...material, dueDate: e.target.value })}
                />
              </Field>
            ) : null}
            <Field label="Description">
              <Textarea
                value={material.description}
                onChange={(e) => setMaterial({ ...material, description: e.target.value })}
                rows={2}
              />
            </Field>
            {materialError ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {materialError}
              </p>
            ) : null}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setMaterialOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={materialBusy}>
                {materialBusy ? 'Sharing…' : 'Share'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
