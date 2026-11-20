import { Hono } from 'hono'
import QRCode from 'qrcode'
import { prisma } from '../../src/lib/db'
import { currentUser, requireAuth } from '../auth'
import { audit } from '../audit'
import { logActivity, getSetting, SETTING_KEYS } from '../settings'
import { sendAbsenceNotice } from '../automations'
import {
  actorName,
  body,
  bool,
  num,
  scopeAllows,
  str,
  teacherScopes,
  todayIso,
} from './shared'

const sheets = new Hono()

const STATUSES = ['present', 'absent', 'late'] as const
type MarkStatus = (typeof STATUSES)[number]

function isStatus(value: unknown): value is MarkStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}

function sheetCode(date: string): string {
  const stamp = date.replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `ATT-${stamp}-${rand}`
}

async function qrSvg(text: string): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'M',
      width: 128,
    })
  } catch {
    return ''
  }
}

async function sheetPayload(id: string) {
  const sheet = await prisma.attendanceSheet.findUnique({
    where: { id },
    include: {
      rows: {
        include: {
          student: {
            select: { id: true, name: true, rollNo: true, className: true, batch: true, parentPhone: true },
          },
        },
      },
    },
  })
  if (!sheet) return null

  const rows = sheet.rows
    .slice()
    .sort((a, b) => (a.rollNo ?? '').localeCompare(b.rollNo ?? '', undefined, { numeric: true }))

  return {
    sheet: {
      id: sheet.id,
      code: sheet.code,
      className: sheet.className,
      batch: sheet.batch,
      date: sheet.date,
      session: sheet.session,
      status: sheet.status,
      createdBy: sheet.createdBy,
      uploadedBy: sheet.uploadedBy,
      reviewedBy: sheet.reviewedBy,
      confirmedBy: sheet.confirmedBy,
      confirmedAt: sheet.confirmedAt,
      hasImage: Boolean(sheet.imageData),
      notes: sheet.notes,
      createdAt: sheet.createdAt,
    },
    rows: rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.student?.name ?? r.studentName,
      rollNo: r.student?.rollNo ?? r.rollNo,
      parentPhone: r.student?.parentPhone ?? null,
      detectedStatus: r.detectedStatus,
      confidence: r.confidence,
      finalStatus: r.finalStatus,
      verified: r.verified,
      needsReview: r.needsReview,
      note: r.note,
    })),
    summary: {
      total: rows.length,
      present: rows.filter((r) => (r.finalStatus ?? r.detectedStatus) === 'present').length,
      absent: rows.filter((r) => (r.finalStatus ?? r.detectedStatus) === 'absent').length,
      late: rows.filter((r) => (r.finalStatus ?? r.detectedStatus) === 'late').length,
      needsReview: rows.filter((r) => r.needsReview && !r.verified).length,
      unmatched: rows.filter((r) => !r.studentId).length,
      unmarked: rows.filter((r) => !r.finalStatus && !r.detectedStatus).length,
    },
  }
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

sheets.get('/sheets', requireAuth, async (c) => {
  const me = currentUser(c)
  const scopes = await teacherScopes(me)
  const className = str(c.req.query('className'))
  const batch = str(c.req.query('batch'))
  const status = str(c.req.query('status'))

  const rows = await prisma.attendanceSheet.findMany({
    where: {
      ...(className ? { className } : {}),
      ...(batch ? { batch } : {}),
      ...(status === 'open'
        ? { status: { not: 'confirmed' } }
        : status
          ? { status }
          : {}),
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 100,
    include: { _count: { select: { rows: true } } },
  })

  return c.json({
    sheets: rows
      .filter((s) => scopeAllows(scopes, s.className, s.batch))
      .map((s) => ({
        id: s.id,
        code: s.code,
        className: s.className,
        batch: s.batch,
        date: s.date,
        session: s.session,
        status: s.status,
        rowCount: s._count.rows,
        confirmedBy: s.confirmedBy,
        confirmedAt: s.confirmedAt,
        createdAt: s.createdAt,
      })),
  })
})

// ---------------------------------------------------------------------------
// Look a sheet up by the code printed in its QR
// ---------------------------------------------------------------------------

sheets.get('/sheets/by-code/:code', requireAuth, async (c) => {
  const me = currentUser(c)
  const code = (c.req.param('code') ?? '').trim().toUpperCase()
  if (!code) return c.json({ error: 'Sheet code is required' }, 400)

  const sheet = await prisma.attendanceSheet.findUnique({ where: { code } })
  if (!sheet) {
    return c.json({ error: `No sheet found for code ${code}. It may have been deleted.` }, 404)
  }

  const scopes = await teacherScopes(me)
  if (!scopeAllows(scopes, sheet.className, sheet.batch)) {
    return c.json({ error: 'You are not assigned to that class and batch' }, 403)
  }

  const payload = await sheetPayload(sheet.id)
  if (!payload) return c.json({ error: 'Sheet not found' }, 404)
  return c.json({ ...payload, qrSvg: await qrSvg(payload.sheet.code) })
})

// ---------------------------------------------------------------------------
// Generate a sheet for a class/batch/date
// ---------------------------------------------------------------------------

sheets.post('/sheets', requireAuth, async (c) => {
  const me = currentUser(c)
  const input = await body<Record<string, unknown>>(c)

  const className = str(input.className)
  const batch = str(input.batch)
  const date = str(input.date) || todayIso()
  const session = str(input.session)

  if (!className || !batch) return c.json({ error: 'Class and batch are required' }, 400)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.json({ error: 'Date must be YYYY-MM-DD' }, 400)

  const scopes = await teacherScopes(me)
  if (!scopeAllows(scopes, className, batch)) {
    return c.json({ error: 'You are not assigned to that class and batch' }, 403)
  }

  const students = await prisma.student.findMany({
    where: { status: 'active', className, batch },
    orderBy: [{ rollNo: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, rollNo: true },
  })
  if (students.length === 0) {
    return c.json({ error: `No active students in ${className} · ${batch}` }, 400)
  }

  const existing = await prisma.attendanceSheet.findFirst({
    where: { className, batch, date, session, status: { not: 'confirmed' } },
  })
  if (existing) {
    return c.json(
      {
        error: `An open sheet already exists for ${className} · ${batch} on ${date}. Open it instead of generating a duplicate.`,
        sheetId: existing.id,
      },
      409,
    )
  }

  let code = sheetCode(date)
  for (let i = 0; i < 5; i += 1) {
    const clash = await prisma.attendanceSheet.findUnique({ where: { code } })
    if (!clash) break
    code = sheetCode(date)
  }

  const sheet = await prisma.attendanceSheet.create({
    data: {
      code,
      className,
      batch,
      date,
      session,
      status: 'generated',
      createdBy: actorName(c),
      rows: {
        create: students.map((s) => ({
          studentId: s.id,
          rollNo: s.rollNo,
          studentName: s.name,
        })),
      },
    },
  })

  await logActivity(
    'attendance',
    `Attendance sheet ${code} generated for ${className} · ${batch} (${students.length} students)`,
    actorName(c),
  )
  await audit({
    entity: 'attendance_sheet',
    entityId: sheet.id,
    action: 'generated',
    detail: `${code} · ${className} · ${batch} · ${date}`,
    actor: actorName(c),
  })

  const payload = await sheetPayload(sheet.id)
  return c.json({ ...payload, qrSvg: await qrSvg(sheet.code) }, 201)
})

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

sheets.get('/sheets/:id', requireAuth, async (c) => {
  const id = c.req.param('id') ?? ''
  const payload = await sheetPayload(id)
  if (!payload) return c.json({ error: 'Sheet not found' }, 404)
  return c.json({ ...payload, qrSvg: await qrSvg(payload.sheet.code) })
})

sheets.get('/sheets/:id/image', requireAuth, async (c) => {
  const id = c.req.param('id') ?? ''
  const sheet = await prisma.attendanceSheet.findUnique({
    where: { id },
    select: { imageData: true },
  })
  if (!sheet) return c.json({ error: 'Sheet not found' }, 404)
  return c.json({ imageData: sheet.imageData })
})

// ---------------------------------------------------------------------------
// Upload a scan + detected marks
// ---------------------------------------------------------------------------

sheets.post('/sheets/:id/upload', requireAuth, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id') ?? ''
  const sheet = await prisma.attendanceSheet.findUnique({
    where: { id },
    include: { rows: true },
  })
  if (!sheet) return c.json({ error: 'Sheet not found' }, 404)
  if (sheet.status === 'confirmed') {
    return c.json(
      { error: 'This sheet is already confirmed. Reopen it before uploading another scan.' },
      409,
    )
  }

  const input = await body<{
    imageData?: string
    detections?: { studentId?: string; rollNo?: string; status?: string; confidence?: number }[]
    notes?: string
  }>(c)

  const imageData = str(input.imageData)
  if (imageData && !imageData.startsWith('data:image/')) {
    return c.json({ error: 'imageData must be a data:image/… URL' }, 400)
  }
  if (imageData.length > 3_500_000) {
    return c.json({ error: 'Scan is too large. Use a smaller photo (under ~2.5 MB).' }, 413)
  }

  const detections = Array.isArray(input.detections) ? input.detections : []
  const byStudent = new Map(sheet.rows.filter((r) => r.studentId).map((r) => [r.studentId as string, r]))
  const byRoll = new Map(
    sheet.rows.filter((r) => r.rollNo).map((r) => [String(r.rollNo).trim(), r]),
  )

  let matched = 0
  let unmatched = 0
  let flagged = 0

  for (const det of detections) {
    const studentId = str(det.studentId)
    const rollNo = str(det.rollNo)
    const row = (studentId ? byStudent.get(studentId) : undefined) ?? (rollNo ? byRoll.get(rollNo) : undefined)
    if (!row) {
      unmatched += 1
      continue
    }

    const confidence = Math.max(0, Math.min(1, num(det.confidence, 0)))
    const status = isStatus(det.status) ? det.status : null
    const needsReview = !status || confidence < 0.75

    await prisma.attendanceScanRow.update({
      where: { id: row.id },
      data: {
        detectedStatus: status,
        confidence,
        needsReview,
        verified: false,
        finalStatus: needsReview ? null : status,
      },
    })
    matched += 1
    if (needsReview) flagged += 1
  }

  // Rows the detector never reported are uncertain by definition.
  const reported = new Set(
    detections
      .map((d) => str(d.studentId) || str(d.rollNo))
      .filter(Boolean),
  )
  for (const row of sheet.rows) {
    const key = row.studentId ?? String(row.rollNo ?? '')
    if (!reported.has(key) && !row.finalStatus) {
      await prisma.attendanceScanRow.update({
        where: { id: row.id },
        data: { needsReview: true, verified: false },
      })
      flagged += 1
    }
  }

  await prisma.attendanceSheet.update({
    where: { id },
    data: {
      status: 'uploaded',
      uploadedBy: actorName(c),
      ...(imageData ? { imageData } : {}),
      ...(str(input.notes) ? { notes: str(input.notes) } : {}),
    },
  })

  await audit({
    entity: 'attendance_sheet',
    entityId: id,
    action: 'uploaded',
    detail: `${matched} rows detected, ${flagged} need review, ${unmatched} unmatched`,
    actor: actorName(c),
  })

  const payload = await sheetPayload(id)
  return c.json({ ...payload, matched, flagged, unmatched })
})

// ---------------------------------------------------------------------------
// Row-level verification
// ---------------------------------------------------------------------------

sheets.patch('/sheets/:id/rows/:rowId', requireAuth, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id') ?? ''
  const rowId = c.req.param('rowId') ?? ''
  const sheet = await prisma.attendanceSheet.findUnique({ where: { id } })
  if (!sheet) return c.json({ error: 'Sheet not found' }, 404)
  if (sheet.status === 'confirmed') {
    return c.json({ error: 'This sheet is confirmed. Reopen it to make corrections.' }, 409)
  }

  const input = await body<{ status?: string; note?: string; verified?: boolean }>(c)
  const status = str(input.status)
  if (status && !isStatus(status)) {
    return c.json({ error: 'status must be present, absent or late' }, 400)
  }

  const row = await prisma.attendanceScanRow.findUnique({ where: { id: rowId } })
  if (!row || row.sheetId !== id) return c.json({ error: 'Row not found' }, 404)

  const updated = await prisma.attendanceScanRow.update({
    where: { id: rowId },
    data: {
      ...(status ? { finalStatus: status, verified: true, needsReview: false } : {}),
      ...(input.note !== undefined ? { note: str(input.note) || null } : {}),
      ...(input.verified !== undefined ? { verified: bool(input.verified) } : {}),
    },
  })

  await prisma.attendanceSheet.update({
    where: { id },
    data: { status: 'reviewed', reviewedBy: actorName(c) },
  })

  return c.json({ row: updated })
})

sheets.post('/sheets/:id/rows/bulk', requireAuth, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id') ?? ''
  const input = await body<{ status?: string; confirm?: boolean }>(c)

  if (input.confirm !== true) {
    return c.json({ error: 'Bulk marking requires explicit confirmation' }, 400)
  }
  const status = str(input.status)
  if (!isStatus(status)) return c.json({ error: 'status must be present, absent or late' }, 400)

  const sheet = await prisma.attendanceSheet.findUnique({ where: { id }, include: { rows: true } })
  if (!sheet) return c.json({ error: 'Sheet not found' }, 404)
  if (sheet.status === 'confirmed') {
    return c.json({ error: 'This sheet is confirmed. Reopen it to make corrections.' }, 409)
  }

  const blank = sheet.rows.filter((r) => !r.finalStatus)
  for (const row of blank) {
    await prisma.attendanceScanRow.update({
      where: { id: row.id },
      data: { finalStatus: status, verified: true, needsReview: false },
    })
  }

  await prisma.attendanceSheet.update({
    where: { id },
    data: { status: 'reviewed', reviewedBy: actorName(c) },
  })
  await audit({
    entity: 'attendance_sheet',
    entityId: id,
    action: 'bulk_marked',
    detail: `${blank.length} blank rows set to ${status}`,
    actor: actorName(c),
  })

  const payload = await sheetPayload(id)
  return c.json({ ...payload, updated: blank.length })
})

// ---------------------------------------------------------------------------
// Optional second opinion from a local Ollama vision model
//
// The pixel analysis is the source of truth; this only re-reads rows it was
// unsure about and returns suggestions the teacher still has to accept.
// ---------------------------------------------------------------------------

import { analyzeAIImage, getAIConfig } from '../ai'

sheets.post('/sheets/:id/ai-assist', requireAuth, async (c) => {
  const id = c.req.param('id') ?? ''
  const sheet = await prisma.attendanceSheet.findUnique({ where: { id }, include: { rows: true } })
  if (!sheet) return c.json({ error: 'Sheet not found' }, 404)
  if (sheet.status === 'confirmed') {
    return c.json({ error: 'This sheet is confirmed. Reopen it to make corrections.' }, 409)
  }

  const aiConfig = await getAIConfig()
  if (!aiConfig.configured) {
    return c.json(
      {
        error:
          'AI Vision is not configured. Configure an AI provider (OpenAI, Gemini, Ollama, etc.) in Settings → AI.',
      },
      412,
    )
  }

  const input = await body<{ rows?: { rowId?: string; image?: string }[] }>(c)
  const items = (Array.isArray(input.rows) ? input.rows : []).slice(0, 12)
  if (items.length === 0) return c.json({ error: 'Send at least one row image' }, 400)

  const known = new Set(sheet.rows.map((r) => r.id))
  const prompt =
    'This is one row of a printed attendance sheet. The three boxes are P (present), A (absent) and L (late). Exactly one may be hand-marked with a pen or tick. Reply with a single letter: P, A, L, or NONE if no box is marked. No other text.'

  const suggestions: { rowId: string; status: MarkStatus | null; raw: string }[] = []

  for (const item of items) {
    const rowId = str(item.rowId)
    const image = str(item.image)
    if (!known.has(rowId) || !image.startsWith('data:image/')) continue

    try {
      const raw = await analyzeAIImage({
        imageBase64: image,
        prompt,
      })
      const letter = raw.toUpperCase().match(/\b(P|A|L|NONE)\b/)?.[1] ?? null
      const status: MarkStatus | null =
        letter === 'P' ? 'present' : letter === 'A' ? 'absent' : letter === 'L' ? 'late' : null
      suggestions.push({ rowId, status, raw: raw.slice(0, 80) })
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : 'AI Vision analysis failed' },
        502,
      )
    }
  }

  await audit({
    entity: 'attendance_sheet',
    entityId: id,
    action: 'ai_assist',
    detail: `${suggestions.length} row(s) re-read by ${aiConfig.provider}:${aiConfig.model}`,
    actor: actorName(c),
  })

  return c.json({ suggestions })
})

// ---------------------------------------------------------------------------
// Confirm — the only path that writes final attendance from a sheet
// ---------------------------------------------------------------------------

sheets.post('/sheets/:id/confirm', requireAuth, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id') ?? ''
  const input = await body<{ confirm?: boolean; overwrite?: boolean; notify?: boolean }>(c)

  if (input.confirm !== true) {
    return c.json({ error: 'Saving attendance requires explicit confirmation' }, 400)
  }

  const sheet = await prisma.attendanceSheet.findUnique({
    where: { id },
    include: { rows: { include: { student: true } } },
  })
  if (!sheet) return c.json({ error: 'Sheet not found' }, 404)

  const scopes = await teacherScopes(me)
  if (!scopeAllows(scopes, sheet.className, sheet.batch)) {
    return c.json({ error: 'You are not assigned to that class and batch' }, 403)
  }

  const decided = sheet.rows.filter((r) => r.studentId && r.finalStatus)
  if (decided.length === 0) {
    return c.json({ error: 'No rows have a confirmed status yet' }, 400)
  }

  const pendingReview = sheet.rows.filter((r) => r.studentId && !r.finalStatus)
  if (pendingReview.length > 0) {
    return c.json(
      {
        error: `${pendingReview.length} row(s) still need a status. Review them or mark the remaining rows before saving.`,
        pending: pendingReview.map((r) => ({ id: r.id, name: r.student?.name ?? r.studentName })),
      },
      400,
    )
  }

  // Detect conflicts with attendance that already exists for this date/session.
  const conflicts: { studentId: string; name: string; existing: string; incoming: string }[] = []
  for (const row of decided) {
    const existing = await prisma.attendance.findUnique({
      where: {
        studentId_date_session: {
          studentId: row.studentId as string,
          date: sheet.date,
          session: sheet.session,
        },
      },
    })
    if (existing && existing.status !== row.finalStatus) {
      conflicts.push({
        studentId: row.studentId as string,
        name: row.student?.name ?? row.studentName ?? 'Student',
        existing: existing.status,
        incoming: row.finalStatus as string,
      })
    }
  }

  if (conflicts.length > 0 && input.overwrite !== true) {
    return c.json(
      {
        error: `${conflicts.length} student(s) already have different attendance for this date. Confirm the overwrite to continue.`,
        conflicts,
      },
      409,
    )
  }

  let created = 0
  let updated = 0
  let unchanged = 0
  let notified = 0
  let skippedNotify = 0

  for (const row of decided) {
    const studentId = row.studentId as string
    const status = row.finalStatus as string
    const existing = await prisma.attendance.findUnique({
      where: { studentId_date_session: { studentId, date: sheet.date, session: sheet.session } },
    })

    if (existing && existing.status === status) {
      unchanged += 1
    } else if (existing) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          markedBy: actorName(c),
          source: 'scan',
          sheetId: sheet.id,
        },
      })
      updated += 1
    } else {
      await prisma.attendance.create({
        data: {
          studentId,
          date: sheet.date,
          session: sheet.session,
          status,
          markedBy: actorName(c),
          source: 'scan',
          sheetId: sheet.id,
        },
      })
      created += 1
    }

    if (status === 'absent' && input.notify !== false && row.student) {
      const outcome = await sendAbsenceNotice(row.student, sheet.date, actorName(c))
      if ('result' in outcome && outcome.result) {
        if (outcome.result.status === 'sent' || outcome.result.status === 'simulated') notified += 1
      } else {
        skippedNotify += 1
      }
    }
  }

  const confirmed = await prisma.attendanceSheet.update({
    where: { id },
    data: {
      status: 'confirmed',
      confirmedBy: actorName(c),
      confirmedAt: new Date(),
      reviewedBy: sheet.reviewedBy ?? actorName(c),
    },
  })

  await logActivity(
    'attendance',
    `Sheet ${sheet.code} confirmed — ${created} new, ${updated} corrected, ${notified} parent(s) notified`,
    actorName(c),
  )
  await audit({
    entity: 'attendance_sheet',
    entityId: id,
    action: 'confirmed',
    detail: `${sheet.className} · ${sheet.batch} · ${sheet.date} · created ${created}, updated ${updated}, unchanged ${unchanged}, notified ${notified}`,
    actor: actorName(c),
  })

  return c.json({
    sheet: confirmed,
    created,
    updated,
    unchanged,
    notified,
    skippedNotify,
  })
})

// ---------------------------------------------------------------------------
// Reopen a confirmed sheet for an authorized correction
// ---------------------------------------------------------------------------

sheets.post('/sheets/:id/reopen', requireAuth, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id') ?? ''
  const sheet = await prisma.attendanceSheet.findUnique({ where: { id } })
  if (!sheet) return c.json({ error: 'Sheet not found' }, 404)
  if (sheet.status !== 'confirmed') return c.json({ error: 'This sheet is not confirmed' }, 400)

  const scopes = await teacherScopes(me)
  if (!scopeAllows(scopes, sheet.className, sheet.batch)) {
    return c.json({ error: 'You are not assigned to that class and batch' }, 403)
  }

  const updated = await prisma.attendanceSheet.update({
    where: { id },
    data: { status: 'reviewed', confirmedBy: null, confirmedAt: null },
  })
  await audit({
    entity: 'attendance_sheet',
    entityId: id,
    action: 'reopened',
    detail: `Reopened for correction by ${actorName(c)}`,
    actor: actorName(c),
  })
  return c.json({ sheet: updated })
})

sheets.delete('/sheets/:id', requireAuth, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id') ?? ''
  const sheet = await prisma.attendanceSheet.findUnique({ where: { id } })
  if (!sheet) return c.json({ error: 'Sheet not found' }, 404)
  if (sheet.status === 'confirmed' && me.role !== 'admin') {
    return c.json({ error: 'Only an administrator can delete a confirmed sheet' }, 403)
  }
  await prisma.attendanceSheet.delete({ where: { id } })
  await audit({
    entity: 'attendance_sheet',
    entityId: id,
    action: 'deleted',
    detail: sheet.code,
    actor: actorName(c),
  })
  return c.json({ ok: true })
})

export default sheets
