import { prisma } from '../src/lib/db'
import {
  SETTING_KEYS,
  getInstituteName,
  getSetting,
  getTemplate,
  logActivity,
  renderTemplate,
} from './settings'
import { sendAndLog } from './whatsapp'

export const AUTOMATION_DEFS = [
  {
    key: 'welcome',
    name: 'Welcome message on admission',
    description: 'Sends a welcome WhatsApp message to the parent when a new student is added.',
  },
  {
    key: 'absence',
    name: 'Absence notification',
    description: 'Notifies the parent on WhatsApp when a student is marked absent.',
  },
  {
    key: 'fee_reminder',
    name: 'Fee due reminder',
    description: 'Reminds parents before a fee is due and while it stays unpaid.',
  },
  {
    key: 'payment',
    name: 'Payment confirmation',
    description: 'Sends a confirmation with the receipt number when a payment is recorded.',
  },
  {
    key: 'test_result',
    name: 'Test result to parent',
    description: 'Sends marks to the parent when a test result is entered.',
  },
] as const

export type AutomationKey = (typeof AUTOMATION_DEFS)[number]['key']

export async function ensureAutomations() {
  for (const def of AUTOMATION_DEFS) {
    await prisma.automation.upsert({
      where: { key: def.key },
      create: { key: def.key, name: def.name, description: def.description, enabled: true },
      update: { name: def.name, description: def.description },
    })
  }
}

export async function isAutomationEnabled(key: AutomationKey): Promise<boolean> {
  const row = await prisma.automation.findUnique({ where: { key } })
  return row?.enabled ?? true
}

export function formatDate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

type StudentLike = {
  id: string
  name: string
  className: string
  batch: string
  parentName: string
  parentPhone: string
}

async function baseVars(student: StudentLike) {
  return {
    student: student.name,
    parent: student.parentName,
    class: student.className,
    batch: student.batch,
    institute: await getInstituteName(),
  }
}

export async function sendWelcome(student: StudentLike, actor?: string | null) {
  if (!(await isAutomationEnabled('welcome'))) return { skipped: 'automation_disabled' as const }
  const template = await getTemplate('welcome')
  const body = renderTemplate(template, await baseVars(student))
  const { log, result } = await sendAndLog({
    to: student.parentPhone,
    body,
    template: 'welcome',
    studentId: student.id,
    sentBy: actor,
  })
  await logActivity('message', `Welcome message for ${student.name} — ${result.status}`, actor)
  return { log, result }
}

export async function sendAbsenceNotice(
  student: StudentLike,
  date: string,
  actor?: string | null,
) {
  if (!(await isAutomationEnabled('absence'))) return { skipped: 'automation_disabled' as const }

  // One absence notice per student per day, no matter how many times the
  // record is edited or a sheet is re-uploaded.
  const refId = `attendance:${student.id}:${date}`
  const already = await prisma.messageLog.findFirst({
    where: {
      refId,
      template: 'absence',
      status: { in: ['sent', 'delivered', 'read', 'simulated'] },
    },
  })
  if (already) return { skipped: 'already_notified' as const }

  const template = await getTemplate('absence')
  const body = renderTemplate(template, {
    ...(await baseVars(student)),
    date: formatDate(date),
  })
  const { log, result } = await sendAndLog({
    to: student.parentPhone,
    body,
    template: 'absence',
    studentId: student.id,
    refId,
    sentBy: actor,
  })
  await logActivity('message', `Absence notice for ${student.name} — ${result.status}`, actor)
  return { log, result }
}

type InvoiceLike = {
  id: string
  period: string
  amount: number
  dueDate: Date
  receiptNo?: string | null
}

export async function sendFeeReminder(
  student: StudentLike,
  invoice: InvoiceLike,
  actor?: string | null,
) {
  if (!(await isAutomationEnabled('fee_reminder'))) return { skipped: 'automation_disabled' as const }
  const template = await getTemplate('fee_reminder')
  const body = renderTemplate(template, {
    ...(await baseVars(student)),
    amount: invoice.amount.toLocaleString('en-IN'),
    period: formatPeriod(invoice.period),
    dueDate: formatDate(invoice.dueDate),
  })
  const { log, result } = await sendAndLog({
    to: student.parentPhone,
    body,
    template: 'fee_reminder',
    studentId: student.id,
    refId: invoice.id,
    sentBy: actor,
  })
  await logActivity('message', `Fee reminder for ${student.name} — ${result.status}`, actor)
  return { log, result }
}

export async function sendPaymentConfirmation(
  student: StudentLike,
  invoice: InvoiceLike,
  actor?: string | null,
) {
  if (!(await isAutomationEnabled('payment'))) return { skipped: 'automation_disabled' as const }
  const template = await getTemplate('payment')
  const body = renderTemplate(template, {
    ...(await baseVars(student)),
    amount: invoice.amount.toLocaleString('en-IN'),
    period: formatPeriod(invoice.period),
    receipt: invoice.receiptNo ?? '—',
  })
  const { log, result } = await sendAndLog({
    to: student.parentPhone,
    body,
    template: 'payment',
    studentId: student.id,
    refId: `payment:${invoice.id}`,
    sentBy: actor,
  })
  await logActivity('message', `Payment confirmation for ${student.name} — ${result.status}`, actor)
  return { log, result }
}

export async function sendTestResult(
  student: StudentLike,
  test: { name: string; subject: string; maxMarks: number },
  marks: number,
  remarks: string | null,
  actor?: string | null,
  refId?: string | null,
) {
  if (!(await isAutomationEnabled('test_result'))) return { skipped: 'automation_disabled' as const }
  const template = await getTemplate('test_result')
  const body = renderTemplate(template, {
    ...(await baseVars(student)),
    test: test.name,
    subject: test.subject,
    marks: Number.isInteger(marks) ? String(marks) : marks.toFixed(1),
    max: test.maxMarks,
    remarks: remarks ? `${remarks}.` : '',
  })
  const { log, result } = await sendAndLog({
    to: student.parentPhone,
    body,
    template: 'test_result',
    studentId: student.id,
    refId: refId ?? null,
    sentBy: actor,
  })
  await logActivity('message', `Test result for ${student.name} — ${result.status}`, actor)
  return { log, result }
}

/**
 * Sweep unpaid invoices that are due soon or overdue and remind the parent.
 * Skips invoices already reminded within the repeat window so parents are not spammed.
 */
export async function runFeeReminderSweep(actor?: string | null) {
  if (!(await isAutomationEnabled('fee_reminder'))) {
    return { sent: 0, failed: 0, skipped: 0, disabled: true }
  }

  const daysBefore = Number((await getSetting(SETTING_KEYS.feeReminderDaysBefore)) ?? '3')
  const repeatDays = Number((await getSetting(SETTING_KEYS.feeReminderRepeatDays)) ?? '3')
  const horizon = new Date()
  horizon.setDate(horizon.getDate() + (Number.isFinite(daysBefore) ? daysBefore : 3))
  const repeatCutoff = new Date()
  repeatCutoff.setDate(repeatCutoff.getDate() - (Number.isFinite(repeatDays) ? repeatDays : 3))

  const invoices = await prisma.feeInvoice.findMany({
    where: {
      status: 'pending',
      dueDate: { lte: horizon },
      student: { status: 'active' },
    },
    include: { student: true },
    orderBy: { dueDate: 'asc' },
    take: 200,
  })

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const invoice of invoices) {
    const recent = await prisma.messageLog.findFirst({
      where: {
        refId: invoice.id,
        template: 'fee_reminder',
        createdAt: { gte: repeatCutoff },
        status: { in: ['sent', 'delivered', 'read', 'simulated'] },
      },
    })
    if (recent) {
      skipped += 1
      continue
    }
    const outcome = await sendFeeReminder(invoice.student, invoice, actor)
    if ('result' in outcome && outcome.result) {
      if (outcome.result.status === 'sent' || outcome.result.status === 'simulated') sent += 1
      else failed += 1
    } else {
      skipped += 1
    }
  }

  return { sent, failed, skipped, disabled: false }
}
