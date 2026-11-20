import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, Plus, Trash2 } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
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
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
  useToast,
} from '@/components/common'

type Slot = {
  id: string
  dayOfWeek: number
  dayName: string
  startTime: string
  endTime: string
  className: string
  batch: string
  subject: string
  room: string | null
  teacher: { id: string; name: string } | null
}

type Conflict = { type: string; message: string; slotId?: string }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_INDEX = [1, 2, 3, 4, 5, 6]

const EMPTY = {
  dayOfWeek: '1',
  startTime: '09:00',
  endTime: '10:30',
  className: '',
  batch: '',
  subject: '',
  teacherId: '',
  room: '',
}

export function Timetable({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [meta, setMeta] = useState<{ classes: string[]; batches: string[] }>({ classes: [], batches: [] })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Slot | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Slot | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ slots: Slot[] }>('/timetable')
      setSlots(res.slots)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    api
      .get<{ classes: string[]; batches: string[] }>('/students/meta')
      .then(setMeta)
      .catch(() => {})
    if (isAdmin) {
      api
        .get<{ teachers: { id: string; name: string }[] }>('/faculty')
        .then((res) => setTeachers(res.teachers))
        .catch(() => {})
    }
  }, [load, isAdmin])

  const byDay = useMemo(() => {
    const map = new Map<number, Slot[]>()
    for (const s of slots) {
      const list = map.get(s.dayOfWeek) ?? []
      list.push(s)
      map.set(s.dayOfWeek, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime))
    return map
  }, [slots])

  function openNew(day?: number) {
    setEditing(null)
    setForm({ ...EMPTY, dayOfWeek: String(day ?? 1) })
    setConflicts([])
    setFormError(null)
    setOpen(true)
  }

  function openEdit(slot: Slot) {
    setEditing(slot)
    setForm({
      dayOfWeek: String(slot.dayOfWeek),
      startTime: slot.startTime,
      endTime: slot.endTime,
      className: slot.className,
      batch: slot.batch,
      subject: slot.subject,
      teacherId: slot.teacher?.id ?? '',
      room: slot.room ?? '',
    })
    setConflicts([])
    setFormError(null)
    setOpen(true)
  }

  async function check() {
    try {
      const res = await api.post<{ conflicts: Conflict[]; ok: boolean }>('/timetable/check', {
        ...form,
        dayOfWeek: Number(form.dayOfWeek),
        id: editing?.id,
      })
      setConflicts(res.conflicts)
      return res.conflicts
    } catch (err) {
      setFormError(errorMessage(err))
      return null
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      const found = await check()
      if (found && found.length > 0) {
        setSaving(false)
        return
      }
      const payload = { ...form, dayOfWeek: Number(form.dayOfWeek) }
      if (editing) await api.patch(`/timetable/${editing.id}`, payload)
      else await api.post('/timetable', payload)
      toast(editing ? 'Session updated' : 'Session added', { variant: 'success' })
      setOpen(false)
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
      await api.del(`/timetable/${deleting.id}`)
      toast('Session removed', { variant: 'success' })
      setDeleting(null)
      await load()
    } catch (err) {
      toast('Could not remove session', { variant: 'error', description: errorMessage(err) })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Timetable"
        description={
          isAdmin
            ? 'Weekly schedule with conflict checks for teachers, batches and rooms.'
            : 'Your weekly teaching schedule.'
        }
        actions={
          isAdmin ? (
            <Button size="sm" onClick={() => openNew()}>
              <Plus className="size-4" />
              Add session
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner /> Loading timetable…
        </div>
      ) : slots.length === 0 ? (
        <EmptyState
          title="No sessions scheduled"
          description={
            isAdmin
              ? 'Add the weekly classes. Overlapping sessions are blocked before they are saved.'
              : 'Your administrator has not scheduled any classes yet.'
          }
          action={
            isAdmin ? (
              <Button size="sm" onClick={() => openNew()}>
                <Plus className="size-4" /> Add session
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {DAY_INDEX.map((day) => {
            const list = byDay.get(day) ?? []
            return (
              <section key={day} className="rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                    <CalendarDays className="size-3.5 text-muted-foreground" />
                    {DAYS[day - 1]}
                  </h2>
                  {isAdmin ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => openNew(day)}
                      aria-label={`Add session on ${DAYS[day - 1]}`}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
                {list.length === 0 ? (
                  <p className="px-3 py-4 text-[11px] text-muted-foreground">No classes.</p>
                ) : (
                  <ul className="divide-y">
                    {list.map((s) => (
                      <li key={s.id} className="px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium tabular-nums">
                              {s.startTime}–{s.endTime}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {s.subject} · {s.className} · {s.batch}
                              {s.room ? ` · ${s.room}` : ''}
                            </p>
                            {s.teacher ? (
                              <p className="truncate text-[11px] text-muted-foreground">
                                {s.teacher.name}
                              </p>
                            ) : null}
                          </div>
                          {isAdmin ? (
                            <div className="flex shrink-0 gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => openEdit(s)}
                                aria-label="Edit session"
                              >
                                <span className="text-[10px]">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleting(s)}
                                aria-label="Delete session"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit session' : 'Add session'}</DialogTitle>
            <DialogDescription>
              Conflicts with a teacher, batch or room are shown before saving.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Day">
                <Select
                  value={form.dayOfWeek}
                  onValueChange={(v) => setForm({ ...form, dayOfWeek: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_INDEX.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {DAYS[d - 1]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Room">
                <Input
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  placeholder="Room 1"
                />
              </Field>
              <Field label="Start">
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                />
              </Field>
              <Field label="End">
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  required
                />
              </Field>
              <Field label="Class">
                <Input
                  value={form.className}
                  onChange={(e) => setForm({ ...form, className: e.target.value })}
                  list="tt-classes"
                  required
                />
                <datalist id="tt-classes">
                  {meta.classes.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Batch">
                <Input
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                  list="tt-batches"
                  required
                />
                <datalist id="tt-batches">
                  {meta.batches.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </Field>
              <Field label="Subject">
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                />
              </Field>
              <Field label="Teacher">
                <Select
                  value={form.teacherId}
                  onValueChange={(v) => setForm({ ...form, teacherId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {conflicts.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="size-3.5" /> {conflicts.length} conflict(s)
                </p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {conflicts.map((c, i) => (
                    <li key={i}>{c.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {formError ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {formError}
              </p>
            ) : null}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="outline" onClick={check} disabled={saving}>
                Check conflicts
              </Button>
              <Button type="submit" disabled={saving || conflicts.length > 0}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add session'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remove this session?"
        description={
          deleting
            ? `${deleting.subject} · ${deleting.className} · ${deleting.batch} · ${deleting.startTime}`
            : ''
        }
        confirmLabel="Remove"
        destructive
        onConfirm={remove}
      />

      <p className={cn('text-[11px] text-muted-foreground')}>
        A teacher cannot be booked twice at the same time, and a batch cannot have overlapping
        sessions.
      </p>
    </div>
  )
}
