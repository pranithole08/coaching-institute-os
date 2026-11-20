import { prisma } from '../src/lib/db'
import { hashPassword } from './auth'
import { ensureAutomations } from './automations'
import { SETTING_KEYS, setSetting } from './settings'

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function periodOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const SAMPLE_STUDENTS = [
  { name: 'Aarav Sharma', className: 'Class 10', batch: 'Morning A', parentName: 'Rakesh Sharma', parentPhone: '+919812340001', feeAmount: 3500, feeDueDay: 5 },
  { name: 'Diya Patel', className: 'Class 10', batch: 'Morning A', parentName: 'Nilesh Patel', parentPhone: '+919812340002', feeAmount: 3500, feeDueDay: 5 },
  { name: 'Kabir Nair', className: 'Class 10', batch: 'Morning A', parentName: 'Suresh Nair', parentPhone: '+919812340003', feeAmount: 3500, feeDueDay: 5 },
  { name: 'Ananya Iyer', className: 'Class 10', batch: 'Evening B', parentName: 'Meera Iyer', parentPhone: '+919812340004', feeAmount: 3200, feeDueDay: 7 },
  { name: 'Rohan Verma', className: 'Class 10', batch: 'Evening B', parentName: 'Anil Verma', parentPhone: '+919812340005', feeAmount: 3200, feeDueDay: 7 },
  { name: 'Ishita Bose', className: 'Class 9', batch: 'Morning A', parentName: 'Subir Bose', parentPhone: '+919812340006', feeAmount: 2800, feeDueDay: 5 },
  { name: 'Vivaan Reddy', className: 'Class 9', batch: 'Morning A', parentName: 'Krishna Reddy', parentPhone: '+919812340007', feeAmount: 2800, feeDueDay: 5 },
  { name: 'Meher Kaur', className: 'Class 9', batch: 'Evening B', parentName: 'Gurpreet Kaur', parentPhone: '+919812340008', feeAmount: 2800, feeDueDay: 10 },
  { name: 'Aditya Joshi', className: 'Class 12', batch: 'Science A', parentName: 'Prakash Joshi', parentPhone: '+919812340009', feeAmount: 4500, feeDueDay: 3 },
  { name: 'Saanvi Menon', className: 'Class 12', batch: 'Science A', parentName: 'Deepa Menon', parentPhone: '+919812340010', feeAmount: 4500, feeDueDay: 3 },
  { name: 'Arjun Deshmukh', className: 'Class 12', batch: 'Science A', parentName: 'Vikram Deshmukh', parentPhone: '+919812340011', feeAmount: 4500, feeDueDay: 3 },
  { name: 'Nisha Gupta', className: 'Class 11', batch: 'Commerce A', parentName: 'Ramesh Gupta', parentPhone: '+919812340012', feeAmount: 3000, feeDueDay: 8 },
  { name: 'Yash Chauhan', className: 'Class 11', batch: 'Commerce A', parentName: 'Dinesh Chauhan', parentPhone: '+919812340013', feeAmount: 3000, feeDueDay: 8 },
  { name: 'Tara Pillai', className: 'Class 11', batch: 'Science A', parentName: 'Latha Pillai', parentPhone: '+919812340014', feeAmount: 3800, feeDueDay: 8 },
]

export async function ensureSeed() {
  await ensureAutomations()

  const userCount = await prisma.user.count()
  if (userCount === 0) {
    await prisma.user.createMany({
      data: [
        {
          email: 'admin@institute.test',
          name: 'Priya Menon',
          passwordHash: hashPassword('admin123'),
          role: 'admin',
        },
        {
          email: 'teacher@institute.test',
          name: 'Rahul Kulkarni',
          passwordHash: hashPassword('teacher123'),
          role: 'teacher',
        },
      ],
    })
  }

  if (!(await prisma.setting.findUnique({ where: { key: SETTING_KEYS.instituteName } }))) {
    await setSetting(SETTING_KEYS.instituteName, 'Bright Path Coaching')
  }

  const studentCount = await prisma.student.count()
  if (studentCount === 0) {
    await seedDemoData()
  }

  await backfillFinance()
  await ensureFeeStructures()
  await ensureFaculty()
}

async function seedDemoData() {

  const now = new Date()
  const created = []
  for (let i = 0; i < SAMPLE_STUDENTS.length; i += 1) {
    const s = SAMPLE_STUDENTS[i]
    const admission = new Date(now)
    admission.setDate(admission.getDate() - (40 + i * 6))
    const student = await prisma.student.create({
      data: {
        ...s,
        rollNo: `${s.className.replace(/\D/g, '')}${String(i + 1).padStart(2, '0')}`,
        admissionDate: admission,
        status: 'active',
      },
    })
    created.push(student)
  }

  // Attendance for the last 12 weekdays
  const days: Date[] = []
  const cursor = new Date(now)
  while (days.length < 12) {
    const dow = cursor.getDay()
    if (dow !== 0) days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() - 1)
  }

  for (const day of days) {
    const date = isoDate(day)
    for (let i = 0; i < created.length; i += 1) {
      const student = created[i]
      // Deterministic-ish pattern so the demo has a realistic mix
      const seed = (day.getDate() + i * 7) % 11
      const status = seed === 0 ? 'absent' : seed === 3 ? 'late' : 'present'
      await prisma.attendance.create({
        data: { studentId: student.id, date, status, markedBy: 'Rahul Kulkarni' },
      })
    }
  }

  // Fee invoices: previous month (paid) + current month (mixed)
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const current = new Date(now.getFullYear(), now.getMonth(), 1)

  for (let i = 0; i < created.length; i += 1) {
    const student = created[i]
    const prevDue = new Date(prev.getFullYear(), prev.getMonth(), student.feeDueDay)
    await prisma.feeInvoice.create({
      data: {
        studentId: student.id,
        period: periodOf(prev),
        amount: student.feeAmount,
        dueDate: prevDue,
        status: 'paid',
        paidAt: new Date(prevDue.getTime() + 2 * 86400000),
        method: i % 3 === 0 ? 'upi' : 'cash',
        receiptNo: `RCPT-${periodOf(prev).replace('-', '')}-${String(i + 1).padStart(3, '0')}`,
      },
    })

    const curDue = new Date(current.getFullYear(), current.getMonth(), student.feeDueDay)
    const paid = i % 3 === 0
    await prisma.feeInvoice.create({
      data: {
        studentId: student.id,
        period: periodOf(current),
        amount: student.feeAmount,
        dueDate: curDue,
        status: paid ? 'paid' : 'pending',
        paidAt: paid ? new Date(curDue.getTime() - 86400000) : null,
        method: paid ? 'upi' : null,
        receiptNo: paid
          ? `RCPT-${periodOf(current).replace('-', '')}-${String(i + 1).padStart(3, '0')}`
          : null,
      },
    })
  }

  // Tests + results
  const testDefs = [
    { name: 'Unit Test 3', subject: 'Mathematics', className: 'Class 10', batch: 'Morning A', maxMarks: 50, daysAgo: 6 },
    { name: 'Weekly Quiz', subject: 'Physics', className: 'Class 12', batch: 'Science A', maxMarks: 25, daysAgo: 3 },
    { name: 'Monthly Test', subject: 'English', className: 'Class 9', batch: 'Morning A', maxMarks: 40, daysAgo: 1 },
  ]

  for (const def of testDefs) {
    const date = new Date(now)
    date.setDate(date.getDate() - def.daysAgo)
    const test = await prisma.test.create({
      data: {
        name: def.name,
        subject: def.subject,
        className: def.className,
        batch: def.batch,
        date,
        maxMarks: def.maxMarks,
      },
    })
    const cohort = created.filter(
      (s) => s.className === def.className && s.batch === def.batch,
    )
    for (let i = 0; i < cohort.length; i += 1) {
      const marks = Math.round(def.maxMarks * (0.55 + ((i * 13) % 40) / 100))
      await prisma.testResult.create({
        data: {
          testId: test.id,
          studentId: cohort[i].id,
          marks,
          remarks: marks / def.maxMarks >= 0.8 ? 'Excellent work' : null,
        },
      })
    }
  }

  // Upcoming tests
  for (const [i, def] of [
    { name: 'Half Yearly Exam', subject: 'Mathematics', className: 'Class 10', batch: 'Morning A', maxMarks: 100, inDays: 4 },
    { name: 'Chapter Test', subject: 'Chemistry', className: 'Class 12', batch: 'Science A', maxMarks: 30, inDays: 9 },
  ].entries()) {
    const date = new Date(now)
    date.setDate(date.getDate() + def.inDays)
    await prisma.test.create({
      data: {
        name: def.name,
        subject: def.subject,
        className: def.className,
        batch: def.batch,
        date,
        maxMarks: def.maxMarks,
      },
    })
    void i
  }

  await prisma.activity.createMany({
    data: [
      { type: 'student', message: 'Sample data loaded — 14 students, 12 days of attendance, 2 months of fees', actor: 'System' },
      { type: 'fee', message: 'Fee invoices generated for the current month', actor: 'System' },
      { type: 'test', message: 'Unit Test 3 results entered for Class 10 (Morning A)', actor: 'Rahul Kulkarni' },
    ],
  })
}

// ---------------------------------------------------------------------------
// Idempotent top-ups for the extended modules
// ---------------------------------------------------------------------------

/**
 * Older invoices were marked paid without a payment row. Derive paidAmount and
 * a matching FeePayment so outstanding balances are computed from real records.
 */
async function backfillFinance() {
  const paid = await prisma.feeInvoice.findMany({
    where: { status: 'paid', paidAmount: 0 },
  })
  for (const invoice of paid) {
    const amount = Math.max(0, invoice.amount - invoice.discount)
    if (amount <= 0) continue
    await prisma.feeInvoice.update({
      where: { id: invoice.id },
      data: { paidAmount: amount },
    })
    const existing = await prisma.feePayment.findFirst({ where: { invoiceId: invoice.id } })
    if (!existing) {
      await prisma.feePayment.create({
        data: {
          invoiceId: invoice.id,
          studentId: invoice.studentId,
          amount,
          method: invoice.method ?? 'cash',
          paidAt: invoice.paidAt ?? new Date(),
          receiptNo: invoice.receiptNo ? `${invoice.receiptNo}-P` : null,
          note: 'Backfilled from the original invoice record',
          recordedBy: 'System',
        },
      })
    }
  }
}

async function ensureFeeStructures() {
  if ((await prisma.feeStructure.count()) > 0) return
  const students = await prisma.student.findMany({
    select: { className: true, batch: true, feeAmount: true, feeDueDay: true },
  })
  const seen = new Set<string>()
  for (const s of students) {
    const key = `${s.className}||${s.batch}`
    if (seen.has(key)) continue
    seen.add(key)
    await prisma.feeStructure.create({
      data: {
        className: s.className,
        batch: s.batch,
        amount: s.feeAmount,
        dueDay: s.feeDueDay,
      },
    })
  }
}

async function ensureFaculty() {
  if ((await prisma.teacher.count()) > 0) return

  const students = await prisma.student.findMany({ select: { className: true, batch: true } })
  const pairs = [...new Set(students.map((s) => `${s.className}||${s.batch}`))]
  if (pairs.length === 0) return

  const teacherUser = await prisma.user.findUnique({ where: { email: 'teacher@institute.test' } })
  const teacher = await prisma.teacher.create({
    data: {
      name: teacherUser?.name ?? 'Faculty',
      email: teacherUser?.email ?? null,
      userId: teacherUser?.id ?? null,
      subjects: 'Mathematics, Physics',
    },
  })

  for (const pair of pairs) {
    const [className, batch] = pair.split('||')
    await prisma.batchAssignment.create({
      data: { teacherId: teacher.id, className, batch, subject: 'Mathematics' },
    })
  }

  const slots = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '10:30', className: 'Class 10', batch: 'Morning A', subject: 'Mathematics', room: 'Room 1' },
    { dayOfWeek: 1, startTime: '11:00', endTime: '12:30', className: 'Class 12', batch: 'Science A', subject: 'Physics', room: 'Room 2' },
    { dayOfWeek: 2, startTime: '09:00', endTime: '10:30', className: 'Class 9', batch: 'Morning A', subject: 'Mathematics', room: 'Room 1' },
    { dayOfWeek: 3, startTime: '10:00', endTime: '11:30', className: 'Class 10', batch: 'Evening B', subject: 'Mathematics', room: 'Room 3' },
    { dayOfWeek: 4, startTime: '09:00', endTime: '10:30', className: 'Class 11', batch: 'Science A', subject: 'Physics', room: 'Room 2' },
    { dayOfWeek: 5, startTime: '11:00', endTime: '12:30', className: 'Class 11', batch: 'Commerce A', subject: 'Mathematics', room: 'Room 1' },
  ]

  for (const slot of slots) {
    if (!pairs.includes(`${slot.className}||${slot.batch}`)) continue
    await prisma.timetableSlot.create({ data: { ...slot, teacherId: teacher.id } })
  }
}
