import { Hono } from 'hono'
import { prisma } from '../../src/lib/db'
import { currentUser, requireAuth } from '../auth'
import { scopeAllows, str, teacherScopes } from './shared'

const profile = new Hono()

/**
 * One consolidated view of a student, assembled from the records that already
 * exist. Nothing is duplicated — every section reads the live tables.
 */
profile.get('/students/:id/profile', requireAuth, async (c) => {
  const id = c.req.param('id') ?? ''

  const student = await prisma.student.findUnique({ where: { id } })
  if (!student) return c.json({ error: 'Student not found' }, 404)

  // Teachers may only open students inside their assigned batches (if any).
  const user = currentUser(c)
  if (user.role === 'teacher') {
    const scopes = await teacherScopes(user)
    if (scopes && scopes.length > 0 && !scopeAllows(scopes, student.className, student.batch)) {
      return c.json({ error: 'You are not assigned to that class and batch' }, 403)
    }
  }

  const [attendance, results, invoices, payments, materials, messages, sheets] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: id },
      orderBy: { date: 'desc' },
      take: 120,
    }),
    prisma.testResult.findMany({
      where: { studentId: id },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            subject: true,
            date: true,
            maxMarks: true,
            className: true,
            batch: true,
            status: true,
          },
        },
      },
      orderBy: { test: { date: 'desc' } },
    }),
    prisma.feeInvoice.findMany({
      where: { studentId: id },
      orderBy: { dueDate: 'desc' },
      include: { payments: { orderBy: { paidAt: 'desc' } } },
    }),
    prisma.feePayment.findMany({
      where: { studentId: id },
      orderBy: { paidAt: 'desc' },
      take: 60,
    }),
    prisma.studyMaterial.findMany({
      where: { className: student.className, OR: [{ batch: student.batch }, { batch: '' }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.messageLog.findMany({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.attendanceSheet.findMany({
      where: { className: student.className, batch: student.batch },
      orderBy: { date: 'desc' },
      take: 10,
      select: { id: true, code: true, date: true, status: true, session: true },
    }),
  ])

  const present = attendance.filter((a) => a.status === 'present').length
  const late = attendance.filter((a) => a.status === 'late').length
  const absent = attendance.filter((a) => a.status === 'absent').length
  const total = attendance.length

  const scored = results.filter((r) => r.marks !== null)
  const avgPercent = scored.length
    ? Math.round(
        (scored.reduce((s, r) => s + ((r.marks as number) / r.test.maxMarks) * 100, 0) /
          scored.length) *
          10,
      ) / 10
    : null

  const billed = invoices.reduce((s, i) => s + i.amount - i.discount, 0)
  const paid = invoices.reduce((s, i) => s + i.paidAmount, 0)
  const outstanding = Math.max(0, billed - paid)
  const overdue = invoices
    .filter((i) => i.amount - i.discount - i.paidAmount > 0 && i.dueDate.getTime() < Date.now())
    .reduce((s, i) => s + (i.amount - i.discount - i.paidAmount), 0)

  return c.json({
    student: {
      id: student.id,
      name: student.name,
      className: student.className,
      batch: student.batch,
      rollNo: student.rollNo,
      status: student.status,
      admissionDate: student.admissionDate,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      feeAmount: student.feeAmount,
      feeDueDay: student.feeDueDay,
      notes: student.notes,
    },
    attendance: {
      total,
      present,
      late,
      absent,
      percentage: total ? Math.round(((present + late) / total) * 100) : 0,
      recent: attendance.slice(0, 30),
      byMonth: Object.entries(
        attendance.reduce<Record<string, { present: number; absent: number; late: number }>>(
          (acc, a) => {
            const key = a.date.slice(0, 7)
            acc[key] = acc[key] ?? { present: 0, absent: 0, late: 0 }
            if (a.status === 'present') acc[key].present += 1
            else if (a.status === 'absent') acc[key].absent += 1
            else acc[key].late += 1
            return acc
          },
          {},
        ),
      )
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, v]) => ({ month, ...v })),
    },
    tests: {
      count: results.length,
      avgPercent,
      best: scored.length
        ? Math.max(...scored.map((r) => Math.round(((r.marks as number) / r.test.maxMarks) * 100)))
        : null,
      results: results.map((r) => ({
        id: r.id,
        testId: r.test.id,
        name: r.test.name,
        subject: r.test.subject,
        date: r.test.date,
        maxMarks: r.test.maxMarks,
        marks: r.marks,
        status: r.status,
        remarks: r.remarks,
        percent:
          r.marks === null ? null : Math.round(((r.marks as number) / r.test.maxMarks) * 1000) / 10,
        published: r.test.status === 'published',
      })),
    },
    fees: {
      feeAmount: student.feeAmount,
      dueDay: student.feeDueDay,
      billed,
      paid,
      outstanding,
      overdue,
      invoices: invoices.map((i) => ({
        id: i.id,
        period: i.period,
        amount: i.amount,
        discount: i.discount,
        net: Math.max(0, i.amount - i.discount),
        paidAmount: i.paidAmount,
        balance: Math.max(0, i.amount - i.discount - i.paidAmount),
        outstanding: Math.max(0, i.amount - i.discount - i.paidAmount),
        dueDate: i.dueDate,
        status: i.status,
        overdue: i.amount - i.discount - i.paidAmount > 0 && i.dueDate.getTime() < Date.now(),
        payments: i.payments,
      })),
      payments,
    },
    materials,
    messages,
    sheets,
  })
})

/** Attendance history for one student, used by the profile and reports. */
profile.get('/students/:id/attendance', requireAuth, async (c) => {
  const id = c.req.param('id') ?? ''
  const from = str(c.req.query('from'))
  const to = str(c.req.query('to'))

  const target = await prisma.student.findUnique({
    where: { id },
    select: { className: true, batch: true },
  })
  if (!target) return c.json({ error: 'Student not found' }, 404)
  const user = currentUser(c)
  if (user.role === 'teacher') {
    const scopes = await teacherScopes(user)
    if (scopes && scopes.length > 0 && !scopeAllows(scopes, target.className, target.batch)) {
      return c.json({ error: 'You are not assigned to that class and batch' }, 403)
    }
  }

  const records = await prisma.attendance.findMany({
    where: {
      studentId: id,
      ...(from ? { date: { gte: from } } : {}),
      ...(to ? { date: { lte: to } } : {}),
    },
    orderBy: { date: 'desc' },
    take: 400,
  })
  return c.json({ records })
})

export default profile
