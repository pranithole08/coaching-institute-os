import { Hono } from 'hono'
import { prisma } from '../../src/lib/db'
import { currentUser, requireAuth } from '../auth'
import { audit } from '../audit'
import { getInstituteName, logActivity } from '../settings'
import { sendPaymentConfirmation } from '../automations'
import { actorName, body, currentPeriod, num, requireAdmin, str, todayIso } from './shared'

const finance = new Hono()

function receiptNumber(period: string): string {
  const stamp = period.replace('-', '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `RCPT-${stamp}-${rand}`
}

export function outstandingOf(invoice: {
  amount: number
  discount: number
  paidAmount: number
}): number {
  return Math.max(0, invoice.amount - invoice.discount - invoice.paidAmount)
}

export type PaymentInput = {
  invoiceId: string
  amount: number
  method?: string
  note?: string | null
  paidAt?: Date | null
  actor?: string | null
  notify?: boolean
}

/**
 * Record a (possibly partial) payment against an invoice. The invoice's
 * paidAmount and status are derived from the payments, never set by hand.
 */
export async function recordPayment(input: PaymentInput) {
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: input.invoiceId },
    include: { student: true },
  })
  if (!invoice) return { error: 'Invoice not found', status: 404 as const }
  if (invoice.status === 'waived') return { error: 'This invoice is waived', status: 400 as const }

  const remaining = outstandingOf(invoice)
  if (remaining <= 0) return { error: 'This invoice is already fully paid', status: 400 as const }

  const amount = Math.round(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Payment amount must be greater than zero', status: 400 as const }
  }
  if (amount > remaining) {
    return {
      error: `Payment exceeds the outstanding balance of ₹${remaining.toLocaleString('en-IN')}`,
      status: 400 as const,
    }
  }

  const payment = await prisma.feePayment.create({
    data: {
      invoiceId: invoice.id,
      studentId: invoice.studentId,
      amount,
      method: str(input.method) || 'cash',
      paidAt: input.paidAt ?? new Date(),
      receiptNo: receiptNumber(invoice.period),
      note: str(input.note) || null,
      recordedBy: input.actor ?? null,
    },
  })

  const paidAmount = invoice.paidAmount + amount
  const fullyPaid = paidAmount >= invoice.amount - invoice.discount

  const updated = await prisma.feeInvoice.update({
    where: { id: invoice.id },
    data: {
      paidAmount,
      status: fullyPaid ? 'paid' : 'partial',
      paidAt: fullyPaid ? payment.paidAt : invoice.paidAt,
      method: payment.method,
      receiptNo: invoice.receiptNo ?? payment.receiptNo,
    },
  })

  let confirmation: unknown = null
  if (input.notify !== false) {
    confirmation = await sendPaymentConfirmation(
      invoice.student,
      { ...updated, amount, receiptNo: payment.receiptNo },
      input.actor ?? null,
    )
  }

  await logActivity(
    'fee',
    `Payment of ₹${amount} recorded for ${invoice.student.name} (${invoice.period})${fullyPaid ? ' — invoice settled' : ` — ₹${outstandingOf(updated)} outstanding`}`,
    input.actor ?? null,
  )
  await audit({
    entity: 'fee_payment',
    entityId: payment.id,
    action: 'recorded',
    detail: `₹${amount} · ${payment.method} · invoice ${invoice.id} · ${fullyPaid ? 'settled' : 'partial'}`,
    actor: input.actor ?? null,
  })

  return { payment, invoice: updated, fullyPaid, confirmation }
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

finance.get('/finance/overview', requireAuth, requireAdmin, async (c) => {
  const from = str(c.req.query('from'))
  const to = str(c.req.query('to'))

  const invoices = await prisma.feeInvoice.findMany({
    select: {
      id: true,
      amount: true,
      discount: true,
      paidAmount: true,
      status: true,
      dueDate: true,
      period: true,
    },
  })

  const payments = await prisma.feePayment.findMany({
    where: {
      ...(from || to
        ? {
            paidAt: {
              ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    select: { amount: true, method: true, paidAt: true },
  })

  const expenses = await prisma.expense.findMany({
    where: {
      ...(from ? { date: { gte: from } } : {}),
      ...(to ? { date: { lte: to } } : {}),
    },
    select: { amount: true, category: true, date: true },
  })

  const billed = invoices.reduce((s, i) => s + i.amount - i.discount, 0)
  const collected = invoices.reduce((s, i) => s + i.paidAmount, 0)
  const outstanding = invoices.reduce((s, i) => s + outstandingOf(i), 0)
  const overdue = invoices
    .filter((i) => outstandingOf(i) > 0 && i.dueDate.getTime() < Date.now())
    .reduce((s, i) => s + outstandingOf(i), 0)

  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const periodCollected = payments.reduce((s, p) => s + p.amount, 0)

  const byMethod = new Map<string, number>()
  for (const p of payments) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount)

  const byCategory = new Map<string, number>()
  for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount)

  return c.json({
    totals: {
      billed,
      collected,
      outstanding,
      overdue,
      expenses: expenseTotal,
      net: periodCollected - expenseTotal,
      periodCollected,
      invoiceCount: invoices.length,
      unpaidCount: invoices.filter((i) => outstandingOf(i) > 0).length,
    },
    byMethod: [...byMethod.entries()].map(([method, amount]) => ({ method, amount })),
    byCategory: [...byCategory.entries()].map(([category, amount]) => ({ category, amount })),
  })
})

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

finance.get('/finance/invoices', requireAuth, requireAdmin, async (c) => {
  const status = str(c.req.query('status'))
  const period = str(c.req.query('period'))
  const q = str(c.req.query('q'))

  const invoices = await prisma.feeInvoice.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(period ? { period } : {}),
      ...(q ? { student: { name: { contains: q } } } : {}),
    },
    orderBy: [{ dueDate: 'asc' }],
    take: 400,
    include: {
      student: { select: { id: true, name: true, className: true, batch: true, parentPhone: true } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
  })

  return c.json({
    invoices: invoices.map((i) => ({
      id: i.id,
      period: i.period,
      amount: i.amount,
      discount: i.discount,
      paidAmount: i.paidAmount,
      outstanding: outstandingOf(i),
      dueDate: i.dueDate,
      status: i.status,
      overdue: outstandingOf(i) > 0 && i.dueDate.getTime() < Date.now(),
      student: i.student,
      payments: i.payments,
    })),
  })
})

finance.post('/finance/invoices/:id/discount', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id') ?? ''
  const invoice = await prisma.feeInvoice.findUnique({ where: { id } })
  if (!invoice) return c.json({ error: 'Invoice not found' }, 404)

  const input = await body<{ discount?: number; note?: string }>(c)
  const discount = Math.max(0, Math.round(num(input.discount, 0)))
  if (discount > invoice.amount) {
    return c.json({ error: 'Discount cannot exceed the invoice amount' }, 400)
  }
  if (invoice.paidAmount > invoice.amount - discount) {
    return c.json({ error: 'Discount would make the invoice less than what was already paid' }, 400)
  }

  const updated = await prisma.feeInvoice.update({
    where: { id },
    data: {
      discount,
      notes: str(input.note) || invoice.notes,
      status:
        invoice.paidAmount >= invoice.amount - discount
          ? 'paid'
          : invoice.paidAmount > 0
            ? 'partial'
            : 'pending',
    },
  })
  await audit({
    entity: 'fee_invoice',
    entityId: id,
    action: 'discount',
    detail: `Discount set to ₹${discount}`,
    actor: actorName(c),
  })
  return c.json({ invoice: updated })
})

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

finance.post('/finance/payments', requireAuth, async (c) => {
  const input = await body<Record<string, unknown>>(c)
  const invoiceId = str(input.invoiceId)
  if (!invoiceId) return c.json({ error: 'invoiceId is required' }, 400)

  const paidAtRaw = str(input.paidAt)
  const paidAt = paidAtRaw ? new Date(`${paidAtRaw}T12:00:00`) : null

  const result = await recordPayment({
    invoiceId,
    amount: num(input.amount, 0),
    method: str(input.method) || 'cash',
    note: str(input.note) || null,
    paidAt: paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt : null,
    actor: actorName(c),
    notify: input.notify !== false,
  })

  if ('error' in result) return c.json({ error: result.error }, result.status)
  return c.json(result, 201)
})

finance.get('/finance/payments', requireAuth, async (c) => {
  const me = currentUser(c)
  const studentId = str(c.req.query('studentId'))
  const from = str(c.req.query('from'))
  const to = str(c.req.query('to'))

  const payments = await prisma.feePayment.findMany({
    where: {
      ...(studentId ? { studentId } : {}),
      ...(from || to
        ? {
            paidAt: {
              ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    orderBy: { paidAt: 'desc' },
    take: 300,
    include: {
      student: { select: { id: true, name: true, className: true, batch: true } },
      invoice: { select: { id: true, period: true, amount: true } },
    },
  })

  return c.json({ payments })
})

finance.get('/finance/payments/:id/receipt', requireAuth, async (c) => {
  const id = c.req.param('id') ?? ''
  const payment = await prisma.feePayment.findUnique({
    where: { id },
    include: { student: true, invoice: true },
  })
  if (!payment) return c.json({ error: 'Payment not found' }, 404)

  return c.json({
    receipt: {
      receiptNo: payment.receiptNo,
      institute: await getInstituteName(),
      studentName: payment.student.name,
      className: payment.student.className,
      batch: payment.student.batch,
      parentName: payment.student.parentName,
      period: payment.invoice.period,
      amount: payment.amount,
      method: payment.method,
      paidAt: payment.paidAt,
      invoiceAmount: payment.invoice.amount,
      discount: payment.invoice.discount,
      paidToDate: payment.invoice.paidAmount,
      outstanding: outstandingOf(payment.invoice),
      recordedBy: payment.recordedBy,
    },
  })
})

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

finance.get('/finance/expenses', requireAuth, requireAdmin, async (c) => {
  const from = str(c.req.query('from'))
  const to = str(c.req.query('to'))
  const category = str(c.req.query('category'))

  const expenses = await prisma.expense.findMany({
    where: {
      ...(from ? { date: { gte: from } } : {}),
      ...(to ? { date: { lte: to } } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { date: 'desc' },
    take: 300,
  })

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  return c.json({ expenses, total })
})

finance.post('/finance/expenses', requireAuth, requireAdmin, async (c) => {
  const input = await body<Record<string, unknown>>(c)
  const description = str(input.description)
  const amount = Math.round(num(input.amount, 0))
  const date = str(input.date) || todayIso()

  if (!description) return c.json({ error: 'Description is required' }, 400)
  if (amount <= 0) return c.json({ error: 'Amount must be greater than zero' }, 400)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.json({ error: 'Date must be YYYY-MM-DD' }, 400)

  const expense = await prisma.expense.create({
    data: {
      category: str(input.category) || 'General',
      description,
      amount,
      date,
      paidTo: str(input.paidTo) || null,
      method: str(input.method) || 'cash',
      recordedBy: actorName(c),
    },
  })

  await logActivity('expense', `Expense of ₹${amount} recorded — ${description}`, actorName(c))
  await audit({
    entity: 'expense',
    entityId: expense.id,
    action: 'created',
    detail: `₹${amount} · ${expense.category} · ${description}`,
    actor: actorName(c),
  })
  return c.json({ expense }, 201)
})

finance.delete('/finance/expenses/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id') ?? ''
  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense) return c.json({ error: 'Expense not found' }, 404)
  await prisma.expense.delete({ where: { id } })
  await audit({
    entity: 'expense',
    entityId: id,
    action: 'deleted',
    detail: `₹${expense.amount} · ${expense.description}`,
    actor: actorName(c),
  })
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Fee structures
// ---------------------------------------------------------------------------

finance.get('/finance/structures', requireAuth, requireAdmin, async (c) => {
  const structures = await prisma.feeStructure.findMany({
    orderBy: [{ className: 'asc' }, { batch: 'asc' }],
  })
  return c.json({ structures })
})

finance.post('/finance/structures', requireAuth, requireAdmin, async (c) => {
  const input = await body<Record<string, unknown>>(c)
  const className = str(input.className)
  const batch = str(input.batch)
  const amount = Math.round(num(input.amount, 0))
  if (!className) return c.json({ error: 'Class is required' }, 400)
  if (amount <= 0) return c.json({ error: 'Amount must be greater than zero' }, 400)

  const structure = await prisma.feeStructure.upsert({
    where: { className_batch: { className, batch } },
    create: {
      className,
      batch,
      amount,
      dueDay: Math.min(28, Math.max(1, Math.round(num(input.dueDay, 5)))),
      discount: Math.max(0, Math.round(num(input.discount, 0))),
      note: str(input.note) || null,
    },
    update: {
      amount,
      dueDay: Math.min(28, Math.max(1, Math.round(num(input.dueDay, 5)))),
      discount: Math.max(0, Math.round(num(input.discount, 0))),
      note: str(input.note) || null,
      active: true,
    },
  })

  await audit({
    entity: 'fee_structure',
    entityId: structure.id,
    action: 'saved',
    detail: `${className} · ${batch || 'all'} · ₹${amount}`,
    actor: actorName(c),
  })
  return c.json({ structure }, 201)
})

finance.delete('/finance/structures/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id') ?? ''
  const existing = await prisma.feeStructure.findUnique({ where: { id } })
  if (!existing) return c.json({ error: 'Fee structure not found' }, 404)
  await prisma.feeStructure.delete({ where: { id } })
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Collection report
// ---------------------------------------------------------------------------

finance.get('/finance/report', requireAuth, requireAdmin, async (c) => {
  const from = str(c.req.query('from')) || `${new Date().getFullYear()}-01-01`
  const to = str(c.req.query('to')) || todayIso()

  const payments = await prisma.feePayment.findMany({
    where: {
      paidAt: { gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59`) },
    },
    include: { student: { select: { name: true, className: true, batch: true } } },
    orderBy: { paidAt: 'asc' },
  })

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: 'asc' },
  })

  const months = new Map<string, { collected: number; expenses: number }>()
  for (const p of payments) {
    const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`
    const row = months.get(key) ?? { collected: 0, expenses: 0 }
    row.collected += p.amount
    months.set(key, row)
  }
  for (const e of expenses) {
    const key = e.date.slice(0, 7)
    const row = months.get(key) ?? { collected: 0, expenses: 0 }
    row.expenses += e.amount
    months.set(key, row)
  }

  return c.json({
    from,
    to,
    months: [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v, net: v.collected - v.expenses })),
    totals: {
      collected: payments.reduce((s, p) => s + p.amount, 0),
      expenses: expenses.reduce((s, e) => s + e.amount, 0),
      paymentCount: payments.length,
    },
    payments: payments.slice(-200),
    expenses,
  })
})

// ---------------------------------------------------------------------------
// Generate invoices from fee structures (per class/batch)
// ---------------------------------------------------------------------------

finance.post('/finance/generate', requireAuth, requireAdmin, async (c) => {
  const input = await body<{ period?: string }>(c)
  const period = str(input.period) || currentPeriod()
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return c.json({ error: 'period must be YYYY-MM' }, 400)

  const structures = await prisma.feeStructure.findMany({ where: { active: true } })
  const students = await prisma.student.findMany({ where: { status: 'active' } })

  let created = 0
  let skipped = 0

  for (const student of students) {
    const structure = structures.find(
      (s) =>
        s.className === student.className &&
        (s.batch === '' || s.batch === student.batch),
    )
    const amount = structure?.amount ?? student.feeAmount
    const discount = structure?.discount ?? 0
    const dueDay = structure?.dueDay ?? student.feeDueDay

    if (amount <= 0) {
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
        amount,
        discount,
        dueDate: new Date(year, month - 1, dueDay),
        status: 'pending',
      },
    })
    created += 1
  }

  await logActivity('fee', `Generated ${created} invoices for ${period}`, actorName(c))
  return c.json({ created, skipped, period })
})

export default finance
