import { Hono } from 'hono'
import { prisma } from '../../src/lib/db'
import { currentUser, requireAuth } from '../auth'
import { audit } from '../audit'
import { logActivity } from '../settings'
import {
  actorName,
  body,
  bool,
  DAY_NAMES,
  requireAdmin,
  str,
  teacherForUser,
} from './shared'

const faculty = new Hono()

// ---------------------------------------------------------------------------
// Admin: manage faculty
// ---------------------------------------------------------------------------

faculty.get('/faculty', requireAuth, requireAdmin, async (c) => {
  const teachers = await prisma.teacher.findMany({
    orderBy: { name: 'asc' },
    include: {
      assignments: { orderBy: [{ className: 'asc' }, { batch: 'asc' }] },
      slots: true,
      user: { select: { id: true, email: true, role: true, active: true } },
    },
  })

  const students = await prisma.student.findMany({
    where: { status: 'active' },
    select: { className: true, batch: true },
  })
  const counts = new Map<string, number>()
  for (const s of students) {
    const key = `${s.className}||${s.batch}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return c.json({
    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      subjects: t.subjects,
      active: t.active,
      userId: t.userId,
      user: t.user,
      assignments: t.assignments.map((a) => ({
        id: a.id,
        className: a.className,
        batch: a.batch,
        subject: a.subject,
        studentCount: counts.get(`${a.className}||${a.batch}`) ?? 0,
      })),
      slotCount: t.slots.length,
    })),
  })
})

faculty.post('/faculty', requireAuth, requireAdmin, async (c) => {
  const input = await body<Record<string, unknown>>(c)
  const name = str(input.name)
  if (!name) return c.json({ error: 'Teacher name is required' }, 400)

  const email = str(input.email).toLowerCase() || null
  if (email) {
    const clash = await prisma.teacher.findUnique({ where: { email } })
    if (clash) return c.json({ error: 'A teacher with that email already exists' }, 400)
  }

  let userId: string | null = null
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) userId = user.id
  }

  const teacher = await prisma.teacher.create({
    data: {
      name,
      email,
      phone: str(input.phone) || null,
      subjects: str(input.subjects),
      userId,
    },
  })

  await logActivity('faculty', `Faculty profile created for ${name}`, actorName(c))
  await audit({ entity: 'teacher', entityId: teacher.id, action: 'created', detail: name, actor: actorName(c) })
  return c.json({ teacher }, 201)
})

faculty.patch('/faculty/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id') ?? ''
  const existing = await prisma.teacher.findUnique({ where: { id } })
  if (!existing) return c.json({ error: 'Teacher not found' }, 404)

  const input = await body<Record<string, unknown>>(c)
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = str(input.name) || existing.name
  if (input.phone !== undefined) data.phone = str(input.phone) || null
  if (input.subjects !== undefined) data.subjects = str(input.subjects)
  if (input.active !== undefined) data.active = bool(input.active, existing.active)
  if (input.email !== undefined) {
    const email = str(input.email).toLowerCase() || null
    if (email && email !== existing.email) {
      const clash = await prisma.teacher.findUnique({ where: { email } })
      if (clash) return c.json({ error: 'A teacher with that email already exists' }, 400)
      const user = await prisma.user.findUnique({ where: { email } })
      data.email = email
      data.userId = user?.id ?? null
    } else if (!email) {
      data.email = null
      data.userId = null
    }
  }

  const teacher = await prisma.teacher.update({ where: { id }, data })
  await audit({ entity: 'teacher', entityId: id, action: 'updated', detail: Object.keys(data).join(', '), actor: actorName(c) })
  return c.json({ teacher })
})

faculty.delete('/faculty/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id') ?? ''
  const existing = await prisma.teacher.findUnique({ where: { id } })
  if (!existing) return c.json({ error: 'Teacher not found' }, 404)
  await prisma.teacher.delete({ where: { id } })
  await audit({ entity: 'teacher', entityId: id, action: 'deleted', detail: existing.name, actor: actorName(c) })
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Admin: batch assignments
// ---------------------------------------------------------------------------

faculty.post('/faculty/:id/assignments', requireAuth, requireAdmin, async (c) => {
  const teacherId = c.req.param('id') ?? ''
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } })
  if (!teacher) return c.json({ error: 'Teacher not found' }, 404)

  const input = await body<Record<string, unknown>>(c)
  const className = str(input.className)
  const batch = str(input.batch)
  const subject = str(input.subject)
  if (!className || !batch || !subject) {
    return c.json({ error: 'Class, batch and subject are required' }, 400)
  }

  const students = await prisma.student.count({
    where: { status: 'active', className, batch },
  })
  if (students === 0) {
    return c.json({ error: `No active students in ${className} · ${batch}` }, 400)
  }

  const existing = await prisma.batchAssignment.findUnique({
    where: { teacherId_className_batch_subject: { teacherId, className, batch, subject } },
  })
  if (existing) return c.json({ error: 'That assignment already exists' }, 400)

  const assignment = await prisma.batchAssignment.create({
    data: { teacherId, className, batch, subject },
  })
  await audit({
    entity: 'teacher',
    entityId: teacherId,
    action: 'assigned',
    detail: `${className} · ${batch} · ${subject}`,
    actor: actorName(c),
  })
  return c.json({ assignment }, 201)
})

faculty.delete('/faculty/assignments/:assignmentId', requireAuth, requireAdmin, async (c) => {
  const assignmentId = c.req.param('assignmentId') ?? ''
  const existing = await prisma.batchAssignment.findUnique({ where: { id: assignmentId } })
  if (!existing) return c.json({ error: 'Assignment not found' }, 404)
  await prisma.batchAssignment.delete({ where: { id: assignmentId } })
  await audit({
    entity: 'teacher',
    entityId: existing.teacherId,
    action: 'unassigned',
    detail: `${existing.className} · ${existing.batch} · ${existing.subject}`,
    actor: actorName(c),
  })
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Teacher: my workspace
// ---------------------------------------------------------------------------

faculty.get('/faculty/me', requireAuth, async (c) => {
  const me = currentUser(c)
  const teacher = await teacherForUser(me)

  if (!teacher) {
    return c.json({
      isAdmin: me.role === 'admin',
      teacher: null,
      assignments: [],
      today: [],
      upcoming: [],
      batches: [],
      materials: [],
      message:
        me.role === 'admin'
          ? 'Administrators are not scoped to a faculty profile.'
          : 'No faculty profile is linked to your account yet. Ask an administrator to assign your batches.',
    })
  }

  const now = new Date()
  const today = now.getDay()

  const slots = await prisma.timetableSlot.findMany({
    where: { teacherId: teacher.id },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })

  const todaySlots = slots.filter((s) => s.dayOfWeek === today)
  const upcoming = slots
    .filter((s) => s.dayOfWeek !== today)
    .slice(0, 8)
    .map((s) => ({ ...s, dayName: DAY_NAMES[s.dayOfWeek] ?? '' }))

  const batches = await Promise.all(
    teacher.assignments.map(async (a) => ({
      className: a.className,
      batch: a.batch,
      subject: a.subject,
      studentCount: await prisma.student.count({
        where: { status: 'active', className: a.className, batch: a.batch },
      }),
    })),
  )

  const materials = await prisma.studyMaterial.findMany({
    where: {
      OR: teacher.assignments.map((a) => ({ className: a.className, batch: a.batch })),
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return c.json({
    isAdmin: me.role === 'admin',
    teacher: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      subjects: teacher.subjects,
    },
    assignments: teacher.assignments.map((a) => ({
      id: a.id,
      className: a.className,
      batch: a.batch,
      subject: a.subject,
    })),
    today: todaySlots.map((s) => ({ ...s, dayName: DAY_NAMES[s.dayOfWeek] ?? '' })),
    upcoming,
    batches,
    materials,
  })
})

faculty.get('/faculty/me/students', requireAuth, async (c) => {
  const me = currentUser(c)
  const teacher = await teacherForUser(me)
  if (!teacher) return c.json({ students: [] })

  const className = str(c.req.query('className'))
  const batch = str(c.req.query('batch'))

  const allowed = teacher.assignments.filter(
    (a) => (!className || a.className === className) && (!batch || a.batch === batch),
  )
  if (allowed.length === 0) return c.json({ students: [] })

  const students = await prisma.student.findMany({
    where: {
      status: 'active',
      OR: allowed.map((a) => ({ className: a.className, batch: a.batch })),
    },
    orderBy: [{ className: 'asc' }, { rollNo: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      rollNo: true,
      className: true,
      batch: true,
      parentName: true,
      parentPhone: true,
    },
  })

  return c.json({ students })
})

export default faculty
