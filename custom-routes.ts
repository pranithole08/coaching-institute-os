import { Hono } from 'hono'
import { prisma } from './src/lib/db'
import {
  attachSessionCookie,
  clearSessionCookie,
  createSession,
  currentUser,
  destroySession,
  hashPassword,
  requireAuth,
  resolveUser,
  verifyPassword,
} from './server/auth'
import {
  AUTOMATION_DEFS,
  ensureAutomations,
  formatDate,
  formatPeriod,
  runFeeReminderSweep,
  sendAbsenceNotice,
  sendFeeReminder,
  sendPaymentConfirmation,
  sendTestResult,
  sendWelcome,
} from './server/automations'
import {
  DEFAULT_TEMPLATES,
  SETTING_KEYS,
  TEMPLATE_KEYS,
  getInstituteName,
  getSetting,
  getSettings,
  getTemplate,
  logActivity,
  renderTemplate,
  setSetting,
} from './server/settings'
import {
  getWhatsAppConfig,
  maskSecret,
  normalizePhone,
  sendAndLog,
  sendWhatsAppText,
  whatsappStatus,
} from './server/whatsapp'
import { ensureSeed } from './server/seed'
import testsRoutes from './server/routes/tests'
import sheetsRoutes from './server/routes/sheets'
import facultyRoutes from './server/routes/faculty'
import timetableRoutes from './server/routes/timetable'
import financeRoutes, { recordPayment } from './server/routes/finance'
import analyticsRoutes from './server/routes/analytics'
import profileRoutes from './server/routes/profile'
import materialsRoutes from './server/routes/materials'
import { requireAdmin, scopeAllows, teacherScopes } from './server/routes/shared'
import { audit } from './server/audit'
import { checkRateLimit, clientKey, resetRateLimit } from './server/rate-limit'

const api = new Hono()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function body<T = Record<string, unknown>>(c: {
  req: { json: () => Promise<unknown> }
}): Promise<T> {
  try {
    return ((await c.req.json()) ?? {}) as T
  } catch {
    return {} as T
  }
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function receiptNumber(period: string): string {
  const stamp = period.replace('-', '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `RCPT-${stamp}-${rand}`
}

// ---------------------------------------------------------------------------
// Bootstrap (idempotent) — runs once per server start
// ---------------------------------------------------------------------------

let bootstrapped = false
async function bootstrap() {
  if (bootstrapped) return
  bootstrapped = true
  try {
    await ensureSeed()
  } catch (err) {
    console.error('[bootstrap] seed failed', err)
    bootstrapped = false
  }
}

api.use('*', async (c, next) => {
  await bootstrap()
  await next()
})

// ---------------------------------------------------------------------------
// Feature modules. Mounted before the legacy routes so their more specific
// paths (e.g. /tests/options) are matched first.
// ---------------------------------------------------------------------------

api.route('/', testsRoutes)
api.route('/', sheetsRoutes)
api.route('/', facultyRoutes)
api.route('/', timetableRoutes)
api.route('/', financeRoutes)
api.route('/', analyticsRoutes)
api.route('/', profileRoutes)
api.route('/', materialsRoutes)

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

api.post('/auth/login', async (c) => {
  const { email, password } = await body<{ email?: string; password?: string }>(c)
  const cleanEmail = str(email).toLowerCase()

  // Throttle by client IP *and* by attempted email so one noisy client cannot
  // exhaust another account's budget.
  const ipKey = `login:ip:${clientKey(c)}`
  const accountKey = cleanEmail ? `login:acct:${cleanEmail}` : null
  for (const key of [ipKey, accountKey]) {
    if (!key) continue
    const limit = checkRateLimit(key)
    if (!limit.allowed) {
      c.header('Retry-After', String(limit.retryAfter))
      return c.json(
        {
          error:
            limit.retryAfter > 60
              ? `Too many sign-in attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.`
              : `Too many sign-in attempts. Try again in ${limit.retryAfter} seconds.`,
          retryAfter: limit.retryAfter,
        },
        429,
      )
    }
  }

  if (!cleanEmail || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }
  const user = await prisma.user.findUnique({ where: { email: cleanEmail } })
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }
  resetRateLimit(ipKey)
  if (accountKey) resetRateLimit(accountKey)
  const token = await createSession(user.id)
  attachSessionCookie(c, token)
  await logActivity('auth', `${user.name ?? user.email} signed in`, user.name ?? user.email)
  return c.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
})

api.post('/auth/logout', async (c) => {
  await destroySession(c)
  return c.json({ ok: true })
})

api.get('/auth/me', async (c) => {
  const user = await resolveUser(c)
  if (!user) return c.json({ error: 'Not signed in' }, 401)
  return c.json({ user })
})

api.post('/auth/password', requireAuth, async (c) => {
  const me = currentUser(c)
  const { currentPassword, newPassword } = await body<{
    currentPassword?: string
    newPassword?: string
  }>(c)
  if (!currentPassword || !newPassword) {
    return c.json({ error: 'Current and new password are required' }, 400)
  }
  if (newPassword.length < 8) {
    return c.json({ error: 'New password must be at least 8 characters' }, 400)
  }
  const user = await prisma.user.findUnique({ where: { id: me.id } })
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    return c.json({ error: 'Current password is incorrect' }, 400)
  }
  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: hashPassword(newPassword) },
  })
  await prisma.session.deleteMany({ where: { userId: me.id } })
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

api.get('/dashboard', requireAuth, async (c) => {
  const today = todayIso()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalStudents, inactiveStudents, todayRecords, pendingInvoices, upcomingTests, activities, messagesToday, wa] =
    await Promise.all([
      prisma.student.count({ where: { status: 'active' } }),
      prisma.student.count({ where: { status: 'inactive' } }),
      prisma.attendance.findMany({ where: { date: today } }),
      prisma.feeInvoice.findMany({
        where: { status: 'pending' },
        include: { student: { select: { name: true, className: true, batch: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.test.findMany({
        where: { date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
        orderBy: { date: 'asc' },
        take: 5,
      }),
      prisma.activity.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.messageLog.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { status: true },
      }),
      whatsappStatus(),
    ])

  const present = todayRecords.filter((r) => r.status === 'present').length
  const late = todayRecords.filter((r) => r.status === 'late').length
  const absent = todayRecords.filter((r) => r.status === 'absent').length
  const marked = todayRecords.length

  const overdue = pendingInvoices.filter((i) => i.dueDate.getTime() < Date.now())

  return c.json({
    stats: {
      totalStudents,
      inactiveStudents,
      attendance: {
        date: today,
        present,
        absent,
        late,
        marked,
        unmarked: Math.max(totalStudents - marked, 0),
      },
      pendingFees: {
        count: pendingInvoices.length,
        amount: pendingInvoices.reduce((sum, i) => sum + i.amount, 0),
        overdueCount: overdue.length,
        overdueAmount: overdue.reduce((sum, i) => sum + i.amount, 0),
      },
      messages: {
        total: messagesToday.length,
        sent: messagesToday.filter((m) => ['sent', 'delivered', 'read'].includes(m.status)).length,
        failed: messagesToday.filter((m) => m.status === 'failed').length,
        notConfigured: messagesToday.filter((m) => m.status === 'not_configured').length,
        simulated: messagesToday.filter((m) => m.status === 'simulated').length,
      },
    },
    upcomingTests,
    recentActivities: activities,
    pendingFeeList: pendingInvoices.slice(0, 6).map((i) => ({
      id: i.id,
      studentName: i.student.name,
      className: i.student.className,
      batch: i.student.batch,
      amount: i.amount,
      period: i.period,
      dueDate: i.dueDate,
      overdue: i.dueDate.getTime() < Date.now(),
    })),
    whatsapp: wa,
  })
})

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

api.get('/students/meta', requireAuth, async (c) => {
  const me = currentUser(c)
  const scopes = await teacherScopes(me)
  const students = await prisma.student.findMany({
    select: { className: true, batch: true, status: true },
  })
  const visible =
    scopes === null
      ? students
      : students.filter((s) => scopeAllows(scopes, s.className, s.batch))
  const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })
  const classes = [...new Set(visible.map((s) => s.className))].sort(natural)
  const batches = [...new Set(visible.map((s) => s.batch))].sort(natural)

  const pairMap = new Map<string, { className: string; batch: string; students: number }>()
  for (const s of visible) {
    const key = `${s.className}|||${s.batch}`
    const entry = pairMap.get(key) ?? { className: s.className, batch: s.batch, students: 0 }
    if (s.status === 'active') entry.students += 1
    pairMap.set(key, entry)
  }
  const pairs = [...pairMap.values()].sort(
    (a, b) => natural(a.className, b.className) || natural(a.batch, b.batch),
  )

  return c.json({ classes, batches, pairs })
})

api.get('/students', requireAuth, async (c) => {
  const me = currentUser(c)
  const scopes = await teacherScopes(me)
  const q = str(c.req.query('q'))
  const className = str(c.req.query('className'))
  const batch = str(c.req.query('batch'))
  const status = str(c.req.query('status'))

  const where: Record<string, unknown> = {}
  if (className) where.className = className
  if (batch) where.batch = batch
  if (status) where.status = status
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { parentName: { contains: q } },
      { parentPhone: { contains: q } },
      { rollNo: { contains: q } },
    ]
  }

  // Teachers only ever see the batches they are assigned to.
  if (scopes !== null) {
    if (scopes.length === 0) return c.json({ students: [] })
    where.AND = [{ OR: scopes.map((s) => ({ className: s.className, batch: s.batch })) }]
  }

  const students = await prisma.student.findMany({
    where,
    orderBy: [{ name: 'asc' }],
    include: {
      invoices: { where: { status: 'pending' }, orderBy: { dueDate: 'asc' }, take: 1 },
      _count: { select: { attendance: true, results: true } },
    },
  })

  return c.json({
    students: students.map((s) => ({
      ...s,
      pendingInvoice: s.invoices[0] ?? null,
      invoices: undefined,
    })),
  })
})

api.post('/students', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  const input = await body<Record<string, unknown>>(c)
  const name = str(input.name)
  const className = str(input.className)
  const batch = str(input.batch)
  const parentName = str(input.parentName)
  const phone = normalizePhone(str(input.parentPhone))

  if (!name || !className || !batch || !parentName) {
    return c.json({ error: 'Name, class, batch and parent name are required' }, 400)
  }
  if (!phone) {
    return c.json({ error: 'A valid parent WhatsApp number is required (with country code)' }, 400)
  }

  const student = await prisma.student.create({
    data: {
      name,
      className,
      batch,
      parentName,
      parentPhone: phone,
      parentEmail: str(input.parentEmail) || null,
      rollNo: str(input.rollNo) || null,
      feeAmount: Math.max(0, Math.round(num(input.feeAmount))),
      feeDueDay: Math.min(28, Math.max(1, Math.round(num(input.feeDueDay, 5)))),
      notes: str(input.notes) || null,
      admissionDate: new Date(),
    },
  })

  await logActivity('student', `${student.name} added to ${className} (${batch})`, me.name ?? me.email)

  const welcome = await sendWelcome(student, me.name ?? me.email)

  return c.json({ student, welcome }, 201)
})

api.patch('/students/:id', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id')
  const input = await body<Record<string, unknown>>(c)
  const existing = await prisma.student.findUnique({ where: { id } })
  if (!existing) return c.json({ error: 'Student not found' }, 404)

  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = str(input.name)
  if (input.className !== undefined) data.className = str(input.className)
  if (input.batch !== undefined) data.batch = str(input.batch)
  if (input.parentName !== undefined) data.parentName = str(input.parentName)
  if (input.parentPhone !== undefined) {
    const phone = normalizePhone(str(input.parentPhone))
    if (!phone) return c.json({ error: 'Invalid parent WhatsApp number' }, 400)
    data.parentPhone = phone
  }
  if (input.parentEmail !== undefined) data.parentEmail = str(input.parentEmail) || null
  if (input.rollNo !== undefined) data.rollNo = str(input.rollNo) || null
  if (input.feeAmount !== undefined) data.feeAmount = Math.max(0, Math.round(num(input.feeAmount)))
  if (input.feeDueDay !== undefined)
    data.feeDueDay = Math.min(28, Math.max(1, Math.round(num(input.feeDueDay, 5))))
  if (input.status !== undefined) data.status = str(input.status) === 'inactive' ? 'inactive' : 'active'
  if (input.notes !== undefined) data.notes = str(input.notes) || null

  const student = await prisma.student.update({ where: { id }, data })
  await logActivity('student', `${student.name} updated`, me.name ?? me.email)
  return c.json({ student })
})

api.delete('/students/:id', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id')
  const student = await prisma.student.findUnique({ where: { id } })
  if (!student) return c.json({ error: 'Student not found' }, 404)
  await prisma.student.delete({ where: { id } })
  await logActivity('student', `${student.name} removed`, me.name ?? me.email)
  return c.json({ ok: true })
})

api.post('/students/import', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  const { csv } = await body<{ csv?: string }>(c)
  if (!csv || !csv.trim()) return c.json({ error: 'CSV content is required' }, 400)

  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return c.json({ error: 'CSV needs a header row and at least one student' }, 400)

  const splitRow = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let quoted = false
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"'
          i += 1
        } else quoted = !quoted
      } else if (ch === ',' && !quoted) {
        out.push(cur.trim())
        cur = ''
      } else cur += ch
    }
    out.push(cur.trim())
    return out
  }

  const header = splitRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''))
  const idx = (name: string) => header.indexOf(name)
  const col = {
    name: idx('name') >= 0 ? idx('name') : idx('studentname'),
    className: idx('class') >= 0 ? idx('class') : idx('classname'),
    batch: idx('batch'),
    parentName: idx('parentname'),
    parentPhone: idx('parentphone') >= 0 ? idx('parentphone') : idx('whatsapp'),
    feeAmount: idx('feeamount') >= 0 ? idx('feeamount') : idx('fee'),
    feeDueDay: idx('feedueday') >= 0 ? idx('feedueday') : idx('dueday'),
  }

  if (col.name < 0 || col.className < 0 || col.batch < 0 || col.parentName < 0 || col.parentPhone < 0) {
    return c.json(
      {
        error:
          'CSV header must include: name, class, batch, parentName, parentPhone (feeAmount and feeDueDay optional)',
      },
      400,
    )
  }

  let created = 0
  const errors: string[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const row = splitRow(lines[i])
    const name = row[col.name] ?? ''
    const phone = normalizePhone(row[col.parentPhone] ?? '')
    if (!name || !phone) {
      errors.push(`Row ${i + 1}: missing name or invalid phone`)
      continue
    }
    try {
      await prisma.student.create({
        data: {
          name,
          className: row[col.className] || 'Unassigned',
          batch: row[col.batch] || 'General',
          parentName: row[col.parentName] || 'Parent',
          parentPhone: phone,
          feeAmount: col.feeAmount >= 0 ? Math.max(0, Math.round(num(row[col.feeAmount]))) : 0,
          feeDueDay: col.feeDueDay >= 0 ? Math.min(28, Math.max(1, Math.round(num(row[col.feeDueDay], 5)))) : 5,
        },
      })
      created += 1
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'failed'}`)
    }
  }

  await logActivity('student', `Imported ${created} students from CSV`, me.name ?? me.email)
  return c.json({ created, failed: errors.length, errors: errors.slice(0, 20) })
})

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

api.get('/attendance', requireAuth, async (c) => {
  const date = str(c.req.query('date')) || todayIso()
  const className = str(c.req.query('className'))
  const batch = str(c.req.query('batch'))

  const where: Record<string, unknown> = { status: 'active' }
  if (className) where.className = className
  if (batch) where.batch = batch

  const students = await prisma.student.findMany({
    where,
    orderBy: [{ className: 'asc' }, { name: 'asc' }],
  })
  const records = await prisma.attendance.findMany({ where: { date } })
  const byStudent = new Map(records.map((r) => [r.studentId, r]))

  return c.json({
    date,
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      className: s.className,
      batch: s.batch,
      rollNo: s.rollNo,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      status: byStudent.get(s.id)?.status ?? null,
      note: byStudent.get(s.id)?.note ?? null,
      attendanceId: byStudent.get(s.id)?.id ?? null,
    })),
    summary: {
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      late: records.filter((r) => r.status === 'late').length,
      marked: records.length,
      total: students.length,
    },
  })
})

api.post('/attendance/mark', requireAuth, async (c) => {
  const me = currentUser(c)
  const input = await body<{ studentId?: string; date?: string; status?: string; session?: string }>(c)
  const studentId = str(input.studentId)
  const date = str(input.date) || todayIso()
  const status = str(input.status)

  if (!studentId) return c.json({ error: 'studentId is required' }, 400)
  if (!['present', 'absent', 'late'].includes(status)) {
    return c.json({ error: 'status must be present, absent or late' }, 400)
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) return c.json({ error: 'Student not found' }, 404)

  const session = str(input.session)
  const previous = await prisma.attendance.findUnique({
    where: { studentId_date_session: { studentId, date, session } },
  })

  const record = await prisma.attendance.upsert({
    where: { studentId_date_session: { studentId, date, session } },
    create: { studentId, date, session, status, markedBy: me.name ?? me.email, source: 'manual' },
    update: { status, markedBy: me.name ?? me.email },
  })

  let notification: unknown = null
  if (status === 'absent' && previous?.status !== 'absent') {
    notification = await sendAbsenceNotice(student, date, me.name ?? me.email)
  }

  return c.json({ attendance: record, notification })
})

// Authoritative save for a marked roster. Upserts on (student, date, session)
// so re-saving corrects records instead of creating duplicates, and records an
// audit entry for every status change so corrections are attributable.
api.post('/attendance/save', requireAuth, async (c) => {
  const me = currentUser(c)
  const input = await body<{
    date?: string
    className?: string
    batch?: string
    rows?: { studentId?: string; status?: string; note?: string }[]
  }>(c)

  const date = str(input.date)
  const className = str(input.className)
  const batch = str(input.batch)
  const rows = Array.isArray(input.rows) ? input.rows : []

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: 'A valid attendance date (YYYY-MM-DD) is required' }, 400)
  }
  if (!className || !batch) {
    return c.json({ error: 'Class and batch are required' }, 400)
  }
  if (rows.length === 0) {
    return c.json({ error: 'No attendance rows to save' }, 400)
  }

  const scopes = await teacherScopes(me)
  if (!scopeAllows(scopes, className, batch)) {
    return c.json({ error: 'You are not assigned to that class and batch' }, 403)
  }

  // Only students that really belong to this class+batch may be written.
  const roster = await prisma.student.findMany({
    where: { className, batch, status: 'active' },
    select: { id: true, name: true },
  })
  const allowed = new Map(roster.map((s) => [s.id, s.name]))

  const cleaned: { studentId: string; status: string; note: string | null }[] = []
  for (const row of rows) {
    const studentId = str(row.studentId)
    const status = str(row.status)
    if (!studentId || !allowed.has(studentId)) continue
    if (status !== 'present' && status !== 'absent') continue
    cleaned.push({ studentId, status, note: str(row.note) || null })
  }

  if (cleaned.length === 0) {
    return c.json({ error: 'None of the submitted students belong to that batch' }, 400)
  }

  const existing = await prisma.attendance.findMany({
    where: { date, session: '', studentId: { in: cleaned.map((r) => r.studentId) } },
  })
  const before = new Map(existing.map((r) => [r.studentId, r]))

  let created = 0
  let corrected = 0
  let unchanged = 0
  const newlyAbsent: { id: string; name: string }[] = []

  for (const row of cleaned) {
    const prior = before.get(row.studentId)
    const actor = me.name ?? me.email

    if (!prior) {
      await prisma.attendance.create({
        data: {
          studentId: row.studentId,
          date,
          session: '',
          status: row.status,
          note: row.note,
          markedBy: actor,
          source: 'manual',
        },
      })
      created += 1
      if (row.status === 'absent') {
        newlyAbsent.push({ id: row.studentId, name: allowed.get(row.studentId) ?? row.studentId })
      }
      continue
    }

    const changed = prior.status !== row.status || (prior.note ?? null) !== row.note
    if (!changed) {
      unchanged += 1
      continue
    }

    await prisma.attendance.update({
      where: { id: prior.id },
      data: { status: row.status, note: row.note, markedBy: actor },
    })
    corrected += 1
    await audit({
      entity: 'attendance',
      entityId: prior.id,
      action: 'corrected',
      actor,
      detail: `${allowed.get(row.studentId) ?? row.studentId} · ${className} ${batch} · ${date} · ${prior.status} → ${row.status}`,
    })
    if (row.status === 'absent' && prior.status !== 'absent') {
      newlyAbsent.push({ id: row.studentId, name: allowed.get(row.studentId) ?? row.studentId })
    }
  }

  let notified = 0
  if (newlyAbsent.length > 0) {
    const students = await prisma.student.findMany({
      where: { id: { in: newlyAbsent.map((s) => s.id) } },
    })
    for (const student of students) {
      const result = await sendAbsenceNotice(student, date, me.name ?? me.email)
      if (result?.result?.status === 'sent' || result?.result?.status === 'simulated') notified += 1
    }
  }

  await logActivity(
    'attendance',
    `Attendance saved for ${className} · ${batch} (${date}) — ${cleaned.length} students`,
    me.name ?? me.email,
  )

  return c.json({
    date,
    className,
    batch,
    saved: cleaned.length,
    created,
    corrected,
    unchanged,
    notified,
  })
})

api.post('/attendance/bulk', requireAuth, async (c) => {
  const me = currentUser(c)
  const input = await body<{
    date?: string
    className?: string
    batch?: string
    status?: string
    notify?: boolean
  }>(c)
  const date = str(input.date) || todayIso()
  const status = str(input.status) || 'present'
  if (!['present', 'absent', 'late'].includes(status)) {
    return c.json({ error: 'status must be present, absent or late' }, 400)
  }

  const where: Record<string, unknown> = { status: 'active' }
  if (str(input.className)) where.className = str(input.className)
  if (str(input.batch)) where.batch = str(input.batch)

  const students = await prisma.student.findMany({ where })
  if (students.length === 0) return c.json({ error: 'No students matched that class/batch' }, 400)

  let notified = 0
  for (const student of students) {
    const previous = await prisma.attendance.findUnique({
      where: { studentId_date_session: { studentId: student.id, date, session: '' } },
    })
    await prisma.attendance.upsert({
      where: { studentId_date_session: { studentId: student.id, date, session: '' } },
      create: {
        studentId: student.id,
        date,
        session: '',
        status,
        markedBy: me.name ?? me.email,
        source: 'manual',
      },
      update: { status, markedBy: me.name ?? me.email },
    })
    if (status === 'absent' && input.notify !== false && previous?.status !== 'absent') {
      await sendAbsenceNotice(student, date, me.name ?? me.email)
      notified += 1
    }
  }

  await logActivity(
    'attendance',
    `Marked ${students.length} students ${status} for ${date}`,
    me.name ?? me.email,
  )

  return c.json({ marked: students.length, notified })
})

api.get('/attendance/history', requireAuth, async (c) => {
  const studentId = str(c.req.query('studentId'))
  const from = str(c.req.query('from'))
  const to = str(c.req.query('to'))
  const where: Record<string, unknown> = {}
  if (studentId) where.studentId = studentId
  if (from || to) {
    where.date = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    }
  }
  const records = await prisma.attendance.findMany({
    where,
    orderBy: { date: 'desc' },
    take: 200,
    include: { student: { select: { name: true, className: true, batch: true } } },
  })
  return c.json({ records })
})

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

api.get('/fees', requireAuth, requireAdmin, async (c) => {
  const status = str(c.req.query('status'))
  const period = str(c.req.query('period'))
  const q = str(c.req.query('q'))

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (period) where.period = period
  if (q) where.student = { name: { contains: q } }

  const invoices = await prisma.feeInvoice.findMany({
    where,
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    take: 300,
    include: {
      student: { select: { id: true, name: true, className: true, batch: true, parentPhone: true } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
  })

  const periods = await prisma.feeInvoice.findMany({
    select: { period: true },
    distinct: ['period'],
    orderBy: { period: 'desc' },
  })

  const outstandingOf = (i: { amount: number; discount: number; paidAmount: number }) =>
    Math.max(0, i.amount - i.discount - i.paidAmount)

  return c.json({
    invoices: invoices.map((i) => ({
      ...i,
      outstanding: outstandingOf(i),
      overdue: outstandingOf(i) > 0 && i.dueDate.getTime() < Date.now(),
    })),
    periods: periods.map((p) => p.period),
    summary: {
      pendingCount: invoices.filter((i) => outstandingOf(i) > 0).length,
      pendingAmount: invoices.reduce((s, i) => s + outstandingOf(i), 0),
      collected: invoices.reduce((s, i) => s + i.paidAmount, 0),
    },
  })
})

api.post('/fees/generate', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  const input = await body<{ period?: string }>(c)
  const period = str(input.period) || currentPeriod()
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return c.json({ error: 'period must be YYYY-MM' }, 400)

  const students = await prisma.student.findMany({ where: { status: 'active' } })
  let created = 0
  let skipped = 0

  for (const student of students) {
    if (student.feeAmount <= 0) {
      skipped += 1
      continue
    }
    const existing = await prisma.feeInvoice.findUnique({
      where: { studentId_period: { studentId: student.id, period } },
    })
    if (existing) {
      skipped += 1
      continue
    }
    await prisma.feeInvoice.create({
      data: {
        studentId: student.id,
        period,
        amount: student.feeAmount,
        dueDate: new Date(year, month - 1, student.feeDueDay),
        status: 'pending',
      },
    })
    created += 1
  }

  await logActivity('fee', `Generated ${created} fee invoices for ${formatPeriod(period)}`, me.name ?? me.email)
  return c.json({ created, skipped, period })
})

api.post('/fees/remind-all', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  const result = await runFeeReminderSweep(me.name ?? me.email)
  return c.json(result)
})

api.post('/fees/:id/pay', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id') ?? ''
  const input = await body<{ method?: string; amount?: number; note?: string }>(c)

  const invoice = await prisma.feeInvoice.findUnique({ where: { id } })
  if (!invoice) return c.json({ error: 'Invoice not found' }, 404)

  const remaining = Math.max(0, invoice.amount - invoice.discount - invoice.paidAmount)
  if (remaining <= 0) return c.json({ error: 'This invoice is already fully paid' }, 400)

  const result = await recordPayment({
    invoiceId: id,
    amount: input.amount !== undefined ? num(input.amount, remaining) : remaining,
    method: str(input.method) || 'cash',
    note: str(input.note) || null,
    actor: me.name ?? me.email,
  })
  if ('error' in result) return c.json({ error: result.error }, result.status)

  return c.json({
    invoice: result.invoice,
    payment: result.payment,
    fullyPaid: result.fullyPaid,
    confirmation: result.confirmation,
  })
})

api.post('/fees/:id/remind', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id')
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id },
    include: { student: true },
  })
  if (!invoice) return c.json({ error: 'Invoice not found' }, 404)
  if (invoice.status === 'paid') return c.json({ error: 'This invoice is already paid' }, 400)
  const reminder = await sendFeeReminder(invoice.student, invoice, me.name ?? me.email)
  return c.json({ reminder })
})

api.get('/fees/:id/receipt', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id')
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id },
    include: { student: true },
  })
  if (!invoice) return c.json({ error: 'Invoice not found' }, 404)
  if (invoice.status !== 'paid') return c.json({ error: 'Receipt is available only after payment' }, 400)
  return c.json({
    receipt: {
      receiptNo: invoice.receiptNo,
      institute: await getInstituteName(),
      studentName: invoice.student.name,
      className: invoice.student.className,
      batch: invoice.student.batch,
      parentName: invoice.student.parentName,
      period: formatPeriod(invoice.period),
      amount: invoice.amount,
      method: invoice.method,
      paidAt: invoice.paidAt,
      dueDate: invoice.dueDate,
    },
  })
})

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

api.get('/messages', requireAuth, async (c) => {
  const status = str(c.req.query('status'))
  const template = str(c.req.query('template'))
  const q = str(c.req.query('q'))
  const take = Math.min(200, Math.max(1, Math.round(num(c.req.query('take'), 100))))

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (template) where.template = template
  if (q) {
    where.OR = [{ to: { contains: q } }, { body: { contains: q } }]
  }

  const messages = await prisma.messageLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    include: { student: { select: { id: true, name: true } } },
  })

  const counts = await prisma.messageLog.groupBy({ by: ['status'], _count: { _all: true } })

  return c.json({
    messages,
    counts: Object.fromEntries(counts.map((c2) => [c2.status, c2._count._all])),
  })
})

api.post('/messages/send', requireAuth, async (c) => {
  const me = currentUser(c)
  const input = await body<{
    studentIds?: string[]
    to?: string
    body?: string
    template?: string
  }>(c)

  const text = str(input.body)
  if (!text) return c.json({ error: 'Message body is required' }, 400)

  const scopes = await teacherScopes(me)
  const recipients: { phone: string; studentId: string | null; name: string }[] = []

  if (Array.isArray(input.studentIds) && input.studentIds.length > 0) {
    const students = await prisma.student.findMany({
      where: { id: { in: input.studentIds } },
      select: { id: true, name: true, parentPhone: true, className: true, batch: true },
    })
    for (const s of students) {
      // Teachers may only message parents of students in their own batches.
      if (!scopeAllows(scopes, s.className, s.batch)) continue
      recipients.push({ phone: s.parentPhone, studentId: s.id, name: s.name })
    }
    if (recipients.length === 0) {
      return c.json({ error: 'None of those students are in your assigned batches' }, 403)
    }
  } else if (str(input.to)) {
    // Free-form numbers are an admin capability (fees reminders, announcements).
    if (scopes !== null) {
      return c.json({ error: 'Only administrators can message an arbitrary number' }, 403)
    }
    const phone = normalizePhone(str(input.to))
    if (!phone) return c.json({ error: 'Invalid phone number' }, 400)
    recipients.push({ phone, studentId: null, name: phone })
  }

  if (recipients.length === 0) return c.json({ error: 'No recipients selected' }, 400)

  const results = []
  for (const r of recipients) {
    const { log, result } = await sendAndLog({
      to: r.phone,
      body: text,
      template: str(input.template) || 'custom',
      studentId: r.studentId,
      sentBy: me.name ?? me.email,
    })
    results.push({ to: r.phone, name: r.name, status: result.status, error: result.error, id: log.id })
  }

  await logActivity(
    'message',
    `Sent ${results.length} message(s) — ${results.filter((r) => r.status === 'sent').length} delivered to WhatsApp`,
    me.name ?? me.email,
  )

  return c.json({
    results,
    summary: {
      total: results.length,
      sent: results.filter((r) => r.status === 'sent').length,
      failed: results.filter((r) => r.status === 'failed').length,
      notConfigured: results.filter((r) => r.status === 'not_configured').length,
      simulated: results.filter((r) => r.status === 'simulated').length,
    },
  })
})

api.post('/messages/announcement', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  const input = await body<{
    message?: string
    classNames?: string[]
    batches?: string[]
  }>(c)
  const message = str(input.message)
  if (!message) return c.json({ error: 'Announcement text is required' }, 400)

  const where: Record<string, unknown> = { status: 'active' }
  if (Array.isArray(input.classNames) && input.classNames.length > 0) {
    where.className = { in: input.classNames }
  }
  if (Array.isArray(input.batches) && input.batches.length > 0) {
    where.batch = { in: input.batches }
  }

  const students = await prisma.student.findMany({ where })
  if (students.length === 0) return c.json({ error: 'No students matched that audience' }, 400)

  const institute = await getInstituteName()
  const bodyText = renderTemplate(await getTemplate('announcement'), { message, institute })

  let sent = 0
  let failed = 0
  let notConfigured = 0
  let simulated = 0

  for (const student of students) {
    const { result } = await sendAndLog({
      to: student.parentPhone,
      body: bodyText,
      template: 'announcement',
      studentId: student.id,
      sentBy: me.name ?? me.email,
    })
    if (result.status === 'sent') sent += 1
    else if (result.status === 'failed') failed += 1
    else if (result.status === 'not_configured') notConfigured += 1
    else simulated += 1
  }

  await logActivity(
    'message',
    `Announcement sent to ${students.length} parents (${sent} delivered)`,
    me.name ?? me.email,
  )

  return c.json({ total: students.length, sent, failed, notConfigured, simulated })
})

// ---------------------------------------------------------------------------
// Automations
// ---------------------------------------------------------------------------

api.get('/automations', requireAuth, requireAdmin, async (c) => {
  await ensureAutomations()
  const rows = await prisma.automation.findMany({ orderBy: { key: 'asc' } })
  const order = AUTOMATION_DEFS.map((d) => d.key)
  rows.sort((a, b) => order.indexOf(a.key as never) - order.indexOf(b.key as never))
  return c.json({ automations: rows })
})

api.patch('/automations/:key', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  const key = c.req.param('key')
  const input = await body<{ enabled?: boolean }>(c)
  const existing = await prisma.automation.findUnique({ where: { key } })
  if (!existing) return c.json({ error: 'Automation not found' }, 404)
  const updated = await prisma.automation.update({
    where: { key },
    data: { enabled: Boolean(input.enabled) },
  })
  await logActivity(
    'automation',
    `${updated.name} ${updated.enabled ? 'enabled' : 'disabled'}`,
    me.name ?? me.email,
  )
  return c.json({ automation: updated })
})

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

api.get('/settings', requireAuth, requireAdmin, async (c) => {
  const s = await getSettings([
    SETTING_KEYS.instituteName,
    SETTING_KEYS.whatsappToken,
    SETTING_KEYS.whatsappPhoneId,
    SETTING_KEYS.whatsappApiVersion,
    SETTING_KEYS.whatsappVerifyToken,
    SETTING_KEYS.whatsappSimulation,
    SETTING_KEYS.ollamaUrl,
    SETTING_KEYS.ollamaModel,
    SETTING_KEYS.feeReminderDaysBefore,
    SETTING_KEYS.feeReminderRepeatDays,
  ])

  return c.json({
    settings: {
      instituteName: s[SETTING_KEYS.instituteName] ?? 'Our Institute',
      whatsappPhoneId: s[SETTING_KEYS.whatsappPhoneId] ?? '',
      whatsappApiVersion: s[SETTING_KEYS.whatsappApiVersion] ?? 'v21.0',
      whatsappTokenPreview: maskSecret(s[SETTING_KEYS.whatsappToken]),
      whatsappTokenSet: Boolean(s[SETTING_KEYS.whatsappToken]),
      whatsappVerifyTokenSet: Boolean(s[SETTING_KEYS.whatsappVerifyToken]),
      whatsappSimulation: s[SETTING_KEYS.whatsappSimulation] === '1',
      ollamaUrl: s[SETTING_KEYS.ollamaUrl] ?? '',
      ollamaModel: s[SETTING_KEYS.ollamaModel] ?? '',
      feeReminderDaysBefore: Number(s[SETTING_KEYS.feeReminderDaysBefore] ?? '3'),
      feeReminderRepeatDays: Number(s[SETTING_KEYS.feeReminderRepeatDays] ?? '3'),
    },
    whatsapp: await whatsappStatus(),
  })
})

api.patch('/settings', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  if (me.role !== 'admin') return c.json({ error: 'Only admins can change settings' }, 403)
  const input = await body<Record<string, unknown>>(c)

  const map: [string, string][] = [
    ['instituteName', SETTING_KEYS.instituteName],
    ['whatsappPhoneId', SETTING_KEYS.whatsappPhoneId],
    ['whatsappApiVersion', SETTING_KEYS.whatsappApiVersion],
    ['ollamaUrl', SETTING_KEYS.ollamaUrl],
    ['ollamaModel', SETTING_KEYS.ollamaModel],
  ]
  for (const [field, key] of map) {
    if (input[field] !== undefined) await setSetting(key, str(input[field]) || null)
  }

  // Secrets: only overwrite when a non-empty value is supplied
  if (typeof input.whatsappToken === 'string' && input.whatsappToken.trim()) {
    await setSetting(SETTING_KEYS.whatsappToken, input.whatsappToken.trim())
  }
  if (typeof input.whatsappVerifyToken === 'string' && input.whatsappVerifyToken.trim()) {
    await setSetting(SETTING_KEYS.whatsappVerifyToken, input.whatsappVerifyToken.trim())
  }
  if (input.clearWhatsappToken === true) await setSetting(SETTING_KEYS.whatsappToken, null)
  if (input.whatsappSimulation !== undefined) {
    await setSetting(SETTING_KEYS.whatsappSimulation, input.whatsappSimulation ? '1' : null)
  }
  if (input.feeReminderDaysBefore !== undefined) {
    await setSetting(SETTING_KEYS.feeReminderDaysBefore, String(Math.max(0, Math.round(num(input.feeReminderDaysBefore, 3)))))
  }
  if (input.feeReminderRepeatDays !== undefined) {
    await setSetting(SETTING_KEYS.feeReminderRepeatDays, String(Math.max(1, Math.round(num(input.feeReminderRepeatDays, 3)))))
  }

  await logActivity('settings', 'Settings updated', me.name ?? me.email)
  return c.json({ ok: true, whatsapp: await whatsappStatus() })
})

api.get('/templates', requireAuth, requireAdmin, async (c) => {
  const templates: Record<string, string> = {}
  for (const kind of Object.keys(TEMPLATE_KEYS)) {
    templates[kind] = await getTemplate(kind)
  }
  return c.json({ templates, defaults: DEFAULT_TEMPLATES })
})

api.patch('/templates', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  if (me.role !== 'admin') return c.json({ error: 'Only admins can change templates' }, 403)
  const input = await body<Record<string, string>>(c)
  for (const [kind, key] of Object.entries(TEMPLATE_KEYS)) {
    if (typeof input[kind] === 'string') {
      await setSetting(key, input[kind].trim() || null)
    }
  }
  await logActivity('settings', 'Message templates updated', me.name ?? me.email)
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// WhatsApp status, test send, webhook
// ---------------------------------------------------------------------------

api.get('/whatsapp/status', requireAuth, requireAdmin, async (c) => {
  return c.json({ whatsapp: await whatsappStatus() })
})

api.post('/whatsapp/test', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  const input = await body<{ to?: string }>(c)
  const phone = normalizePhone(str(input.to))
  if (!phone) return c.json({ error: 'Enter a valid phone number with country code' }, 400)
  const institute = await getInstituteName()
  const text = `Test message from ${institute}. If you can read this, WhatsApp automation is connected correctly.`
  const { log, result } = await sendAndLog({
    to: phone,
    body: text,
    template: 'custom',
    sentBy: me.name ?? me.email,
  })
  return c.json({ result, message: log })
})

api.get('/whatsapp/webhook', async (c) => {
  const mode = c.req.query('hub.mode')
  const token = c.req.query('hub.verify_token')
  const challenge = c.req.query('hub.challenge')
  const config = await getWhatsAppConfig()
  if (mode === 'subscribe' && config.verifyToken && token === config.verifyToken) {
    return c.text(challenge ?? '')
  }
  return c.text('Forbidden', 403)
})

api.post('/whatsapp/webhook', async (c) => {
  const payload = await body<{
    entry?: {
      changes?: {
        value?: {
          statuses?: { id?: string; status?: string; errors?: { title?: string }[] }[]
        }
      }[]
    }[]
  }>(c)

  const statuses = payload.entry?.flatMap((e) => e.changes ?? []).flatMap((ch) => ch.value?.statuses ?? []) ?? []

  for (const s of statuses) {
    if (!s.id || !s.status) continue
    const mapped = ['sent', 'delivered', 'read', 'failed'].includes(s.status) ? s.status : null
    if (!mapped) continue
    await prisma.messageLog
      .updateMany({
        where: { providerId: s.id },
        data: {
          status: mapped,
          error: mapped === 'failed' ? (s.errors?.[0]?.title ?? 'Delivery failed') : null,
        },
      })
      .catch(() => {})
  }

  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// AI drafting (Ollama) — optional, configured in Settings
// ---------------------------------------------------------------------------

api.get('/ai/status', requireAuth, async (c) => {
  const url = await getSetting(SETTING_KEYS.ollamaUrl)
  const model = await getSetting(SETTING_KEYS.ollamaModel)
  return c.json({ configured: Boolean(url && model), url: url ?? '', model: model ?? '' })
})

api.post('/ai/draft', requireAuth, async (c) => {
  const url = await getSetting(SETTING_KEYS.ollamaUrl)
  const model = await getSetting(SETTING_KEYS.ollamaModel)
  if (!url || !model) {
    return c.json(
      { error: 'Ollama is not configured. Add the base URL and model in Settings → AI.' },
      412,
    )
  }
  const input = await body<{ prompt?: string; context?: string }>(c)
  const prompt = str(input.prompt)
  if (!prompt) return c.json({ error: 'Prompt is required' }, 400)

  const institute = await getInstituteName()
  const system = `You write short, warm, professional WhatsApp messages for a coaching institute called ${institute}. Keep it under 60 words, no emojis unless asked, no markdown.`

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `${system}\n\nContext: ${str(input.context) || 'none'}\n\nTask: ${prompt}\n\nMessage:`,
        stream: false,
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      return c.json({ error: `Ollama returned HTTP ${res.status}` }, 502)
    }
    const data = (await res.json()) as { response?: string }
    return c.json({ text: (data.response ?? '').trim() })
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Could not reach Ollama' },
      502,
    )
  }
})

// ---------------------------------------------------------------------------
// Staff (admin only)
// ---------------------------------------------------------------------------

api.get('/staff', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  if (me.role !== 'admin') return c.json({ error: 'Admins only' }, 403)
  const staff = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return c.json({ staff })
})

api.post('/staff', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  if (me.role !== 'admin') return c.json({ error: 'Admins only' }, 403)
  const input = await body<{ email?: string; name?: string; password?: string; role?: string }>(c)
  const email = str(input.email).toLowerCase()
  const password = str(input.password)
  if (!email || !password) return c.json({ error: 'Email and password are required' }, 400)
  if (password.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400)
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return c.json({ error: 'A user with that email already exists' }, 400)
  const user = await prisma.user.create({
    data: {
      email,
      name: str(input.name) || null,
      passwordHash: hashPassword(password),
      role: str(input.role) === 'admin' ? 'admin' : 'teacher',
    },
    select: { id: true, email: true, name: true, role: true, active: true },
  })
  await logActivity('auth', `Staff account created for ${email}`, me.name ?? me.email)
  return c.json({ user }, 201)
})

api.patch('/staff/:id', requireAuth, requireAdmin, async (c) => {
  const me = currentUser(c)
  if (me.role !== 'admin') return c.json({ error: 'Admins only' }, 403)
  const id = c.req.param('id')
  const input = await body<{ active?: boolean; role?: string; password?: string }>(c)
  const data: Record<string, unknown> = {}
  if (input.active !== undefined) data.active = Boolean(input.active)
  if (input.role !== undefined) data.role = str(input.role) === 'admin' ? 'admin' : 'teacher'
  if (typeof input.password === 'string' && input.password.length >= 8) {
    data.passwordHash = hashPassword(input.password)
  }
  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, active: true },
  })
  return c.json({ user })
})

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

api.get('/activity', requireAuth, requireAdmin, async (c) => {
  const take = Math.min(100, Math.max(1, Math.round(num(c.req.query('take'), 30))))
  const activities = await prisma.activity.findMany({ orderBy: { createdAt: 'desc' }, take })
  return c.json({ activities })
})

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

api.get('/health', async (c) => {
  const [students, users] = await Promise.all([prisma.student.count(), prisma.user.count()])
  return c.json({ ok: true, students, users, time: new Date().toISOString() })
})


// Everything above is mounted under /api/app so it never collides with the
// auto-generated CRUD routes (which are locked down in server.tsx).
const app = new Hono()
app.route('/app', api)

export default app
