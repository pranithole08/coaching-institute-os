import { Hono } from 'hono'
import { prisma } from '../../src/lib/db'
import { requireAdmin } from './shared'
import { requireAuth } from '../auth'
import { isoDate, str, todayIso } from './shared'

const analytics = new Hono()

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function lastMonths(count: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i -= 1) {
    out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)))
  }
  return out
}

analytics.get('/analytics', requireAuth, requireAdmin, async (c) => {
  const className = str(c.req.query('className'))
  const batch = str(c.req.query('batch'))
  const from = str(c.req.query('from'))
  const to = str(c.req.query('to')) || todayIso()

  const studentWhere: Record<string, unknown> = {}
  if (className) studentWhere.className = className
  if (batch) studentWhere.batch = batch

  const students = await prisma.student.findMany({
    where: studentWhere,
    select: {
      id: true,
      name: true,
      className: true,
      batch: true,
      status: true,
      admissionDate: true,
      feeAmount: true,
    },
  })
  const studentIds = students.map((s) => s.id)
  const idSet = new Set(studentIds)

  const attendance = await prisma.attendance.findMany({
    where: {
      ...(studentIds.length ? { studentId: { in: studentIds } } : {}),
      ...(from ? { date: { gte: from } } : {}),
      ...(to ? { date: { lte: to } } : {}),
    },
    select: { studentId: true, date: true, status: true },
  })

  const results = await prisma.testResult.findMany({
    where: {
      ...(studentIds.length ? { studentId: { in: studentIds } } : {}),
      marks: { not: null },
    },
    include: {
      test: { select: { id: true, name: true, subject: true, date: true, maxMarks: true, className: true, batch: true } },
      student: { select: { id: true, name: true, className: true, batch: true } },
    },
  })

  const invoices = await prisma.feeInvoice.findMany({
    where: studentIds.length ? { studentId: { in: studentIds } } : {},
    select: { amount: true, discount: true, paidAmount: true, dueDate: true, period: true, status: true },
  })

  const payments = await prisma.feePayment.findMany({
    where: {
      ...(studentIds.length ? { studentId: { in: studentIds } } : {}),
      ...(from ? { paidAt: { gte: new Date(`${from}T00:00:00`) } } : {}),
      ...(to ? { paidAt: { lte: new Date(`${to}T23:59:59`) } } : {}),
    },
    select: { amount: true, paidAt: true },
  })

  const expenses = await prisma.expense.findMany({
    where: {
      ...(from ? { date: { gte: from } } : {}),
      ...(to ? { date: { lte: to } } : {}),
    },
    select: { amount: true, date: true, category: true },
  })

  // --- Enrollment trend (last 12 months) -----------------------------------
  const months = lastMonths(12)
  const enrollment = months.map((m) => ({
    month: m,
    joined: students.filter((s) => monthKey(new Date(s.admissionDate)) === m).length,
  }))
  let running = students.filter(
    (s) => monthKey(new Date(s.admissionDate)) < months[0],
  ).length
  const enrollmentTrend = enrollment.map((row) => {
    running += row.joined
    return { ...row, total: running }
  })

  // --- Attendance ----------------------------------------------------------
  const dayMap = new Map<string, { present: number; absent: number; late: number }>()
  for (const a of attendance) {
    const row = dayMap.get(a.date) ?? { present: 0, absent: 0, late: 0 }
    if (a.status === 'present') row.present += 1
    else if (a.status === 'absent') row.absent += 1
    else if (a.status === 'late') row.late += 1
    dayMap.set(a.date, row)
  }
  const dailyAttendance = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-45)
    .map(([date, v]) => {
      const total = v.present + v.absent + v.late
      return {
        date,
        ...v,
        total,
        rate: total ? Math.round(((v.present + v.late) / total) * 100) : 0,
      }
    })

  const monthAtt = new Map<string, { present: number; absent: number; late: number }>()
  for (const a of attendance) {
    const key = a.date.slice(0, 7)
    const row = monthAtt.get(key) ?? { present: 0, absent: 0, late: 0 }
    if (a.status === 'present') row.present += 1
    else if (a.status === 'absent') row.absent += 1
    else if (a.status === 'late') row.late += 1
    monthAtt.set(key, row)
  }
  const monthlyAttendance = [...monthAtt.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => {
      const total = v.present + v.absent + v.late
      return { month, ...v, total, rate: total ? Math.round(((v.present + v.late) / total) * 100) : 0 }
    })

  // --- Batch-wise attendance & performance ---------------------------------
  const batchKey = (s: { className: string; batch: string }) => `${s.className}||${s.batch}`
  const studentById = new Map(students.map((s) => [s.id, s]))

  const batchAtt = new Map<string, { present: number; total: number }>()
  for (const a of attendance) {
    const s = studentById.get(a.studentId)
    if (!s) continue
    const key = batchKey(s)
    const row = batchAtt.get(key) ?? { present: 0, total: 0 }
    row.total += 1
    if (a.status === 'present' || a.status === 'late') row.present += 1
    batchAtt.set(key, row)
  }

  const batchPerf = new Map<string, { sum: number; count: number }>()
  for (const r of results) {
    if (r.marks === null) continue
    const key = batchKey(r.student)
    const row = batchPerf.get(key) ?? { sum: 0, count: 0 }
    row.sum += (r.marks / r.test.maxMarks) * 100
    row.count += 1
    batchPerf.set(key, row)
  }

  const batchWise = [...new Set(students.map(batchKey))]
    .map((key) => {
      const [cls, bat] = key.split('||')
      const att = batchAtt.get(key)
      const perf = batchPerf.get(key)
      return {
        className: cls,
        batch: bat,
        students: students.filter((s) => batchKey(s) === key).length,
        attendanceRate: att && att.total ? Math.round((att.present / att.total) * 100) : 0,
        avgScore: perf && perf.count ? Math.round(perf.sum / perf.count) : 0,
      }
    })
    .sort((a, b) => a.className.localeCompare(b.className) || a.batch.localeCompare(b.batch))

  // --- Test performance trend ---------------------------------------------
  const testMap = new Map<
    string,
    { name: string; subject: string; date: Date; maxMarks: number; sum: number; count: number }
  >()
  for (const r of results) {
    if (r.marks === null) continue
    const row = testMap.get(r.test.id) ?? {
      name: r.test.name,
      subject: r.test.subject,
      date: r.test.date,
      maxMarks: r.test.maxMarks,
      sum: 0,
      count: 0,
    }
    row.sum += (r.marks / r.test.maxMarks) * 100
    row.count += 1
    testMap.set(r.test.id, row)
  }
  const testTrend = [...testMap.entries()]
    .map(([id, v]) => ({
      id,
      name: v.name,
      subject: v.subject,
      date: isoDate(v.date),
      maxMarks: v.maxMarks,
      avgPercent: v.count ? Math.round(v.sum / v.count) : 0,
      results: v.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // --- Student improvement / decline --------------------------------------
  const perStudent = new Map<string, { sum: number; count: number; first: number; last: number; firstDate: string; lastDate: string }>()
  const sortedResults = results
    .filter((r) => r.marks !== null)
    .sort((a, b) => a.test.date.getTime() - b.test.date.getTime())
  for (const r of sortedResults) {
    const pct = ((r.marks as number) / r.test.maxMarks) * 100
    const date = isoDate(r.test.date)
    const row = perStudent.get(r.studentId)
    if (!row) {
      perStudent.set(r.studentId, {
        sum: pct,
        count: 1,
        first: pct,
        last: pct,
        firstDate: date,
        lastDate: date,
      })
    } else {
      row.sum += pct
      row.count += 1
      row.last = pct
      row.lastDate = date
    }
  }

  const movers = [...perStudent.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([studentId, v]) => {
      const s = studentById.get(studentId)
      return {
        studentId,
        name: s?.name ?? 'Student',
        className: s?.className ?? '',
        batch: s?.batch ?? '',
        firstPercent: Math.round(v.first),
        lastPercent: Math.round(v.last),
        avgPercent: Math.round(v.sum / v.count),
        delta: Math.round(v.last - v.first),
        tests: v.count,
      }
    })
    .sort((a, b) => b.delta - a.delta)

  // --- Finance -------------------------------------------------------------
  const billed = invoices.reduce((s, i) => s + i.amount - i.discount, 0)
  const collected = invoices.reduce((s, i) => s + i.paidAmount, 0)
  const outstanding = Math.max(0, billed - collected)
  const overdue = invoices
    .filter((i) => i.amount - i.discount - i.paidAmount > 0 && i.dueDate.getTime() < Date.now())
    .reduce((s, i) => s + (i.amount - i.discount - i.paidAmount), 0)

  const collectionByMonth = new Map<string, number>()
  for (const p of payments) {
    const key = monthKey(p.paidAt)
    collectionByMonth.set(key, (collectionByMonth.get(key) ?? 0) + p.amount)
  }
  const expenseByMonth = new Map<string, number>()
  for (const e of expenses) {
    const key = e.date.slice(0, 7)
    expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + e.amount)
  }
  const financeTrend = months.map((m) => ({
    month: m,
    collected: collectionByMonth.get(m) ?? 0,
    expenses: expenseByMonth.get(m) ?? 0,
    net: (collectionByMonth.get(m) ?? 0) - (expenseByMonth.get(m) ?? 0),
  }))

  const expenseByCategory = new Map<string, number>()
  for (const e of expenses) {
    expenseByCategory.set(e.category, (expenseByCategory.get(e.category) ?? 0) + e.amount)
  }

  // --- Faculty load --------------------------------------------------------
  const teachers = await prisma.teacher.findMany({
    include: { assignments: true, slots: true },
  })
  const facultyLoad = teachers.map((t) => ({
    id: t.id,
    name: t.name,
    batches: t.assignments.length,
    sessions: t.slots.length,
    subjects: t.subjects,
  }))

  return c.json({
    range: { from: from || null, to },
    filters: { className: className || null, batch: batch || null },
    totals: {
      students: students.length,
      activeStudents: students.filter((s) => s.status === 'active').length,
      attendanceRecords: attendance.length,
      tests: testMap.size,
      results: results.length,
    },
    enrollmentTrend,
    dailyAttendance,
    monthlyAttendance,
    batchWise,
    testTrend,
    movers: {
      improving: movers.filter((m) => m.delta > 0).slice(0, 5),
      declining: movers.filter((m) => m.delta < 0).slice(-5).reverse(),
    },
    finance: {
      billed,
      collected,
      outstanding,
      overdue,
      trend: financeTrend,
      expenseByCategory: [...expenseByCategory.entries()].map(([category, amount]) => ({
        category,
        amount,
      })),
    },
    facultyLoad,
  })
})

export default analytics
