import { Hono } from 'hono'
import { prisma } from '../../src/lib/db'
import { currentUser, requireAuth } from '../auth'
import { audit } from '../audit'
import { logActivity } from '../settings'
import { sendTestResult } from '../automations'
import {
  actorName,
  body,
  num,
  scopeAllows,
  str,
  teacherScopes,
} from './shared'

const tests = new Hono()

const RESULT_STATUSES = ['present', 'absent', 'exempt'] as const
type ResultStatus = (typeof RESULT_STATUSES)[number]

function normalizeStatus(value: unknown): ResultStatus {
  const s = str(value)
  return (RESULT_STATUSES as readonly string[]).includes(s) ? (s as ResultStatus) : 'present'
}

/** Active students that belong to a test's class/batch. */
async function eligibleStudents(className: string, batch: string | null) {
  return prisma.student.findMany({
    where: {
      status: 'active',
      className,
      ...(batch ? { batch } : {}),
    },
    orderBy: [{ rollNo: 'asc' }, { name: 'asc' }],
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
}

// ---------------------------------------------------------------------------
// Options for the create form — real classes/batches from student records
// ---------------------------------------------------------------------------

tests.get('/tests/options', requireAuth, async (c) => {
  const me = currentUser(c)
  const scopes = await teacherScopes(me)

  const students = await prisma.student.findMany({
    where: { status: 'active' },
    select: { className: true, batch: true },
  })

  const map = new Map<string, { className: string; batch: string; count: number }>()
  for (const s of students) {
    const key = `${s.className}||${s.batch}`
    const row = map.get(key)
    if (row) row.count += 1
    else map.set(key, { className: s.className, batch: s.batch, count: 1 })
  }

  const groups = [...map.values()]
    .filter((g) => scopeAllows(scopes, g.className, g.batch))
    .sort((a, b) => a.className.localeCompare(b.className) || a.batch.localeCompare(b.batch))

  const classes = [...new Set(groups.map((g) => g.className))].sort()

  // "Subjects configured for the institute" = subjects already used by tests,
  // plus subjects assigned to faculty batches. Never a hardcoded list.
  const [testSubjects, assignments] = await Promise.all([
    prisma.test.findMany({ select: { subject: true }, distinct: ['subject'] }),
    prisma.batchAssignment.findMany({ select: { subject: true } }),
  ])
  const subjects = [
    ...new Set([
      ...testSubjects.map((t) => t.subject).filter(Boolean),
      ...assignments.map((a) => a.subject).filter(Boolean),
    ]),
  ].sort((a, b) => a.localeCompare(b))

  return c.json({ groups, classes, subjects })
})

// ---------------------------------------------------------------------------
// List / create
// ---------------------------------------------------------------------------

tests.get('/tests', requireAuth, async (c) => {
  const me = currentUser(c)
  const scopes = await teacherScopes(me)

  const rows = await prisma.test.findMany({
    orderBy: { date: 'desc' },
    include: {
      _count: { select: { results: true } },
      results: { select: { marks: true, status: true } },
    },
  })

  const visible = rows.filter((t) => scopeAllows(scopes, t.className, t.batch))

  return c.json({
    tests: visible.map((t) => {
      const entered = t.results.filter((r) => r.marks !== null).length
      return {
        id: t.id,
        name: t.name,
        subject: t.subject,
        className: t.className,
        batch: t.batch,
        date: t.date,
        maxMarks: t.maxMarks,
        status: t.status,
        publishedAt: t.publishedAt,
        resultCount: t._count.results,
        enteredCount: entered,
        absentCount: t.results.filter((r) => r.status === 'absent').length,
        exemptCount: t.results.filter((r) => r.status === 'exempt').length,
        upcoming: t.date.getTime() > Date.now(),
      }
    }),
  })
})

tests.post('/tests', requireAuth, async (c) => {
  const me = currentUser(c)
  const input = await body<Record<string, unknown>>(c)

  const name = str(input.name)
  const subject = str(input.subject)
  const className = str(input.className)
  const batch = str(input.batch) || null

  if (!name || !subject || !className) {
    return c.json({ error: 'Test name, subject and class are required' }, 400)
  }

  const scopes = await teacherScopes(me)
  if (!scopeAllows(scopes, className, batch)) {
    return c.json({ error: 'You are not assigned to that class and batch' }, 403)
  }

  const students = await eligibleStudents(className, batch)
  if (students.length === 0) {
    return c.json(
      {
        error: batch
          ? `No active students in ${className} · ${batch}. Pick another batch or add students first.`
          : `No active students in ${className}. Add students before creating a test.`,
      },
      400,
    )
  }

  const maxMarks = Math.max(1, Math.round(num(input.maxMarks, 100)))
  const date = str(input.date) ? new Date(str(input.date)) : new Date()
  if (Number.isNaN(date.getTime())) return c.json({ error: 'Invalid test date' }, 400)

  const test = await prisma.test.create({
    data: {
      name,
      subject,
      className,
      batch,
      date,
      maxMarks,
      status: 'draft',
      createdBy: actorName(c),
    },
  })

  await logActivity('test', `${test.name} (${test.subject}) created for ${className}`, actorName(c))
  await audit({
    entity: 'test',
    entityId: test.id,
    action: 'created',
    detail: `${test.name} · ${className}${batch ? ` · ${batch}` : ''} · ${students.length} eligible students`,
    actor: actorName(c),
  })

  return c.json({ test, eligible: students.length }, 201)
})

// ---------------------------------------------------------------------------
// Detail — roster + existing results merged
// ---------------------------------------------------------------------------

tests.get('/tests/:id', requireAuth, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id') ?? ''
  const test = await prisma.test.findUnique({
    where: { id },
    include: { results: true },
  })
  if (!test) return c.json({ error: 'Test not found' }, 404)

  const scopes = await teacherScopes(me)
  if (!scopeAllows(scopes, test.className, test.batch)) {
    return c.json({ error: 'You are not assigned to this class' }, 403)
  }

  const students = await eligibleStudents(test.className, test.batch)
  const byStudent = new Map(test.results.map((r) => [r.studentId, r]))

  const roster = students.map((s) => {
    const r = byStudent.get(s.id)
    return {
      studentId: s.id,
      name: s.name,
      rollNo: s.rollNo,
      className: s.className,
      batch: s.batch,
      parentPhone: s.parentPhone,
      marks: r?.marks ?? null,
      status: r?.status ?? 'present',
      remarks: r?.remarks ?? null,
      resultId: r?.id ?? null,
      updatedAt: r?.updatedAt ?? null,
    }
  })

  const entered = roster.filter((r) => r.marks !== null).length
  const absent = roster.filter((r) => r.status === 'absent').length
  const exempt = roster.filter((r) => r.status === 'exempt').length
  const notEntered = roster.filter((r) => r.marks === null && r.status === 'present').length

  const scored = roster
    .filter((r) => r.status === 'present' && r.marks !== null)
    .map((r) => r.marks as number)
  const average =
    scored.length > 0
      ? Math.round((scored.reduce((sum, m) => sum + m, 0) / scored.length) * 10) / 10
      : null
  const highest = scored.length > 0 ? Math.max(...scored) : null
  const lowest = scored.length > 0 ? Math.min(...scored) : null

  return c.json({
    test: {
      id: test.id,
      name: test.name,
      subject: test.subject,
      className: test.className,
      batch: test.batch,
      date: test.date,
      maxMarks: test.maxMarks,
      status: test.status,
      publishedAt: test.publishedAt,
      publishedBy: test.publishedBy,
    },
    roster,
    summary: {
      total: roster.length,
      entered,
      notEntered,
      absent,
      exempt,
      average,
      highest,
      lowest,
      publishable: roster.filter((r) => r.marks !== null && r.status === 'present').length,
    },
  })
})

tests.patch('/tests/:id', requireAuth, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id') ?? ''
  const test = await prisma.test.findUnique({ where: { id } })
  if (!test) return c.json({ error: 'Test not found' }, 404)

  const scopes = await teacherScopes(me)
  if (!scopeAllows(scopes, test.className, test.batch)) {
    return c.json({ error: 'You are not assigned to this class' }, 403)
  }
  if (test.status === 'published' && me.role !== 'admin') {
    return c.json({ error: 'Published tests can only be edited by an administrator' }, 403)
  }

  const input = await body<Record<string, unknown>>(c)
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = str(input.name) || test.name
  if (input.subject !== undefined) data.subject = str(input.subject) || test.subject
  if (input.date !== undefined) {
    const d = new Date(str(input.date))
    if (!Number.isNaN(d.getTime())) data.date = d
  }
  if (input.maxMarks !== undefined) {
    const max = Math.max(1, Math.round(num(input.maxMarks, test.maxMarks)))
    const highest = await prisma.testResult.aggregate({
      where: { testId: id, marks: { not: null } },
      _max: { marks: true },
    })
    if ((highest._max.marks ?? 0) > max) {
      return c.json(
        { error: `Max marks cannot be lower than an existing score (${highest._max.marks})` },
        400,
      )
    }
    data.maxMarks = max
  }

  const updated = await prisma.test.update({ where: { id }, data })
  await audit({
    entity: 'test',
    entityId: id,
    action: 'updated',
    detail: Object.keys(data).join(', '),
    actor: actorName(c),
  })
  return c.json({ test: updated })
})

tests.delete('/tests/:id', requireAuth, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id') ?? ''
  const test = await prisma.test.findUnique({ where: { id } })
  if (!test) return c.json({ error: 'Test not found' }, 404)

  const scopes = await teacherScopes(me)
  if (!scopeAllows(scopes, test.className, test.batch)) {
    return c.json({ error: 'You are not assigned to this class' }, 403)
  }
  if (test.status === 'published' && me.role !== 'admin') {
    return c.json({ error: 'Published tests can only be deleted by an administrator' }, 403)
  }

  await prisma.test.delete({ where: { id } })
  await audit({
    entity: 'test',
    entityId: id,
    action: 'deleted',
    detail: test.name,
    actor: actorName(c),
  })
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Draft marks — saved without notifying anyone
// ---------------------------------------------------------------------------

tests.put('/tests/:id/results', requireAuth, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id') ?? ''
  const test = await prisma.test.findUnique({ where: { id } })
  if (!test) return c.json({ error: 'Test not found' }, 404)

  const scopes = await teacherScopes(me)
  if (!scopeAllows(scopes, test.className, test.batch)) {
    return c.json({ error: 'You are not assigned to this class' }, 403)
  }
  if (test.status === 'published' && me.role !== 'admin') {
    return c.json(
      { error: 'Results are published. Ask an administrator to reopen the test before editing.' },
      403,
    )
  }

  const input = await body<{
    rows?: { studentId?: string; marks?: number | string | null; status?: string; remarks?: string }[]
  }>(c)

  if (!Array.isArray(input.rows)) return c.json({ error: 'rows array is required' }, 400)

  const roster = await eligibleStudents(test.className, test.batch)
  const allowed = new Set(roster.map((s) => s.id))

  const failures: { studentId: string; error: string }[] = []
  let saved = 0

  for (const row of input.rows) {
    const studentId = str(row.studentId)
    if (!studentId) continue
    if (!allowed.has(studentId)) {
      failures.push({ studentId, error: 'Student is not in this test’s class and batch' })
      continue
    }

    const status = normalizeStatus(row.status)
    const raw = row.marks
    const blank = raw === null || raw === undefined || raw === ''
    const marks = blank ? null : num(raw, Number.NaN)

    if (marks !== null) {
      if (!Number.isFinite(marks)) {
        failures.push({ studentId, error: 'Marks must be a number' })
        continue
      }
      if (marks < 0) {
        failures.push({ studentId, error: 'Marks cannot be negative' })
        continue
      }
      if (marks > test.maxMarks) {
        failures.push({ studentId, error: `Marks cannot exceed ${test.maxMarks}` })
        continue
      }
    }

    // Absent / exempt students never carry a score.
    const finalMarks = status === 'present' ? marks : null

    await prisma.testResult.upsert({
      where: { testId_studentId: { testId: id, studentId } },
      create: {
        testId: id,
        studentId,
        marks: finalMarks,
        status,
        remarks: str(row.remarks) || null,
        enteredBy: actorName(c),
      },
      update: {
        marks: finalMarks,
        status,
        remarks: str(row.remarks) || null,
        enteredBy: actorName(c),
      },
    })
    saved += 1
  }

  await logActivity('test', `${saved} draft result(s) saved for ${test.name}`, actorName(c))

  return c.json({ saved, failures })
})

// ---------------------------------------------------------------------------
// Review + publish
// ---------------------------------------------------------------------------

tests.get('/tests/:id/review', requireAuth, async (c) => {
  const id = c.req.param('id') ?? ''
  const test = await prisma.test.findUnique({ where: { id }, include: { results: true } })
  if (!test) return c.json({ error: 'Test not found' }, 404)

  const roster = await eligibleStudents(test.className, test.batch)
  const byStudent = new Map(test.results.map((r) => [r.studentId, r]))

  const rows = roster.map((s) => {
    const r = byStudent.get(s.id)
    const marks = r?.marks ?? null
    const status = r?.status ?? 'present'
    const complete = status !== 'present' || marks !== null
    return {
      studentId: s.id,
      name: s.name,
      rollNo: s.rollNo,
      marks,
      status,
      remarks: r?.remarks ?? null,
      complete,
    }
  })

  const publishable = rows.filter((r) => r.complete && r.status === 'present')
  const incomplete = rows.filter((r) => !r.complete)

  return c.json({
    test: {
      id: test.id,
      name: test.name,
      subject: test.subject,
      className: test.className,
      batch: test.batch,
      maxMarks: test.maxMarks,
      status: test.status,
      publishedAt: test.publishedAt,
    },
    rows,
    counts: {
      total: rows.length,
      publishable: publishable.length,
      incomplete: incomplete.length,
      absent: rows.filter((r) => r.status === 'absent').length,
      exempt: rows.filter((r) => r.status === 'exempt').length,
    },
    incompleteRows: incomplete,
  })
})

tests.post('/tests/:id/publish', requireAuth, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id') ?? ''
  const input = await body<{ confirm?: boolean; notify?: boolean }>(c)

  if (input.confirm !== true) {
    return c.json({ error: 'Publishing requires explicit confirmation' }, 400)
  }

  const test = await prisma.test.findUnique({ where: { id }, include: { results: true } })
  if (!test) return c.json({ error: 'Test not found' }, 404)

  const scopes = await teacherScopes(me)
  if (!scopeAllows(scopes, test.className, test.batch)) {
    return c.json({ error: 'You are not assigned to this class' }, 403)
  }

  const roster = await eligibleStudents(test.className, test.batch)
  const byStudent = new Map(test.results.map((r) => [r.studentId, r]))

  const publishable = roster.filter((s) => {
    const r = byStudent.get(s.id)
    return r && r.status === 'present' && r.marks !== null
  })

  if (publishable.length === 0) {
    return c.json({ error: 'There are no complete results to publish' }, 400)
  }

  const notify = input.notify !== false
  let notified = 0
  let skipped = 0
  const failures: string[] = []

  if (notify) {
    for (const student of publishable) {
      const result = byStudent.get(student.id)
      if (!result || result.marks === null) continue

      const refId = `test:${test.id}:${student.id}`
      const already = await prisma.messageLog.findFirst({
        where: {
          refId,
          template: 'test_result',
          status: { in: ['sent', 'delivered', 'read', 'simulated'] },
        },
      })
      if (already) {
        skipped += 1
        continue
      }

      const outcome = await sendTestResult(
        student,
        test,
        result.marks,
        result.remarks,
        actorName(c),
        refId,
      )
      if ('result' in outcome && outcome.result) {
        if (outcome.result.status === 'sent' || outcome.result.status === 'simulated') notified += 1
        else failures.push(`${student.name}: ${outcome.result.error ?? outcome.result.status}`)
      } else {
        skipped += 1
      }
    }
  }

  const updated = await prisma.test.update({
    where: { id },
    data: {
      status: 'published',
      publishedAt: new Date(),
      publishedBy: actorName(c),
    },
  })

  await logActivity(
    'test',
    `${test.name} published — ${publishable.length} result(s)${notify ? `, ${notified} parent(s) notified` : ''}`,
    actorName(c),
  )
  await audit({
    entity: 'test',
    entityId: id,
    action: 'published',
    detail: `${publishable.length} results published, ${notified} notified, ${skipped} already notified`,
    actor: actorName(c),
  })

  return c.json({
    test: updated,
    published: publishable.length,
    notified,
    skipped,
    failures,
  })
})

export default tests
