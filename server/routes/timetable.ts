import { Hono } from 'hono'
import { prisma } from '../../src/lib/db'
import { currentUser, requireAuth } from '../auth'
import { audit } from '../audit'
import { logActivity } from '../settings'
import {
  actorName,
  body,
  DAY_NAMES,
  num,
  overlaps,
  requireAdmin,
  str,
  teacherForUser,
} from './shared'

const timetable = new Hono()

type SlotInput = {
  dayOfWeek: number
  startTime: string
  endTime: string
  className: string
  batch: string
  subject: string
  teacherId: string | null
  room: string | null
}

type Conflict = {
  type: 'teacher' | 'batch' | 'room' | 'invalid'
  message: string
  slotId?: string
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function parseSlot(input: Record<string, unknown>): { slot?: SlotInput; error?: string } {
  const dayOfWeek = Math.round(num(input.dayOfWeek, -1))
  const startTime = str(input.startTime)
  const endTime = str(input.endTime)
  const className = str(input.className)
  const batch = str(input.batch)
  const subject = str(input.subject)
  const teacherId = str(input.teacherId) || null
  const room = str(input.room) || null

  if (dayOfWeek < 0 || dayOfWeek > 6) return { error: 'dayOfWeek must be 0 (Sunday) to 6 (Saturday)' }
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return { error: 'Start and end time must be HH:MM (24-hour)' }
  }
  if (startTime >= endTime) return { error: 'End time must be after the start time' }
  if (!className || !batch || !subject) {
    return { error: 'Class, batch and subject are required' }
  }

  return { slot: { dayOfWeek, startTime, endTime, className, batch, subject, teacherId, room } }
}

async function findConflicts(slot: SlotInput, ignoreId?: string): Promise<Conflict[]> {
  const sameDay = await prisma.timetableSlot.findMany({
    where: { dayOfWeek: slot.dayOfWeek, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    include: { teacher: { select: { name: true } } },
  })

  const conflicts: Conflict[] = []
  for (const other of sameDay) {
    if (!overlaps(slot.startTime, slot.endTime, other.startTime, other.endTime)) continue

    if (slot.teacherId && other.teacherId === slot.teacherId) {
      conflicts.push({
        type: 'teacher',
        slotId: other.id,
        message: `${other.teacher?.name ?? 'This teacher'} is already teaching ${other.subject} (${other.className} · ${other.batch}) at ${other.startTime}–${other.endTime}.`,
      })
    }
    if (other.className === slot.className && other.batch === slot.batch) {
      conflicts.push({
        type: 'batch',
        slotId: other.id,
        message: `${slot.className} · ${slot.batch} already has ${other.subject} at ${other.startTime}–${other.endTime}.`,
      })
    }
    if (slot.room && other.room && other.room.toLowerCase() === slot.room.toLowerCase()) {
      conflicts.push({
        type: 'room',
        slotId: other.id,
        message: `Room ${slot.room} is already booked for ${other.subject} at ${other.startTime}–${other.endTime}.`,
      })
    }
  }
  return conflicts
}

timetable.get('/timetable', requireAuth, async (c) => {
  const me = currentUser(c)
  const className = str(c.req.query('className'))
  const batch = str(c.req.query('batch'))
  const teacherId = str(c.req.query('teacherId'))

  let scopedTeacherId = teacherId
  if (me.role !== 'admin') {
    const teacher = await teacherForUser(me)
    if (!teacher) return c.json({ slots: [], days: DAY_NAMES })
    scopedTeacherId = teacher.id
  }

  const slots = await prisma.timetableSlot.findMany({
    where: {
      ...(className ? { className } : {}),
      ...(batch ? { batch } : {}),
      ...(scopedTeacherId ? { teacherId: scopedTeacherId } : {}),
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    include: { teacher: { select: { id: true, name: true } } },
  })

  return c.json({
    slots: slots.map((s) => ({ ...s, dayName: DAY_NAMES[s.dayOfWeek] ?? '' })),
    days: DAY_NAMES,
  })
})

timetable.post('/timetable/check', requireAuth, async (c) => {
  const input = await body<Record<string, unknown>>(c)
  const parsed = parseSlot(input)
  if (!parsed.slot) return c.json({ conflicts: [{ type: 'invalid', message: parsed.error }] })
  const conflicts = await findConflicts(parsed.slot, str(input.id) || undefined)
  return c.json({ conflicts, ok: conflicts.length === 0 })
})

timetable.post('/timetable', requireAuth, requireAdmin, async (c) => {
  const input = await body<Record<string, unknown>>(c)
  const parsed = parseSlot(input)
  if (!parsed.slot) return c.json({ error: parsed.error }, 400)

  const conflicts = await findConflicts(parsed.slot)
  if (conflicts.length > 0) {
    return c.json({ error: 'This session conflicts with the existing timetable', conflicts }, 409)
  }

  const slot = await prisma.timetableSlot.create({ data: parsed.slot })
  await logActivity(
    'timetable',
    `${slot.subject} scheduled for ${slot.className} · ${slot.batch} on ${DAY_NAMES[slot.dayOfWeek]} ${slot.startTime}`,
    actorName(c),
  )
  await audit({
    entity: 'timetable',
    entityId: slot.id,
    action: 'created',
    detail: `${DAY_NAMES[slot.dayOfWeek]} ${slot.startTime}-${slot.endTime} · ${slot.className} · ${slot.batch} · ${slot.subject}`,
    actor: actorName(c),
  })
  return c.json({ slot }, 201)
})

timetable.patch('/timetable/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id') ?? ''
  const existing = await prisma.timetableSlot.findUnique({ where: { id } })
  if (!existing) return c.json({ error: 'Session not found' }, 404)

  const input = await body<Record<string, unknown>>(c)
  const merged = {
    dayOfWeek: input.dayOfWeek ?? existing.dayOfWeek,
    startTime: input.startTime ?? existing.startTime,
    endTime: input.endTime ?? existing.endTime,
    className: input.className ?? existing.className,
    batch: input.batch ?? existing.batch,
    subject: input.subject ?? existing.subject,
    teacherId: input.teacherId !== undefined ? str(input.teacherId) || null : existing.teacherId,
    room: input.room !== undefined ? str(input.room) || null : existing.room,
  }

  const parsed = parseSlot(merged)
  if (!parsed.slot) return c.json({ error: parsed.error }, 400)

  const conflicts = await findConflicts(parsed.slot, id)
  if (conflicts.length > 0) {
    return c.json({ error: 'This session conflicts with the existing timetable', conflicts }, 409)
  }

  const slot = await prisma.timetableSlot.update({ where: { id }, data: parsed.slot })
  await audit({
    entity: 'timetable',
    entityId: id,
    action: 'updated',
    detail: `${DAY_NAMES[slot.dayOfWeek]} ${slot.startTime}-${slot.endTime}`,
    actor: actorName(c),
  })
  return c.json({ slot })
})

timetable.delete('/timetable/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id') ?? ''
  const existing = await prisma.timetableSlot.findUnique({ where: { id } })
  if (!existing) return c.json({ error: 'Session not found' }, 404)
  await prisma.timetableSlot.delete({ where: { id } })
  await audit({
    entity: 'timetable',
    entityId: id,
    action: 'deleted',
    detail: `${existing.className} · ${existing.batch} · ${existing.subject}`,
    actor: actorName(c),
  })
  return c.json({ ok: true })
})

export default timetable
