import type { Context, Next } from 'hono'
import { prisma } from '../../src/lib/db'
import { currentUser, type SessionUser } from '../auth'

export function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

export function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function bool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1 || value === '1') return true
  if (value === 'false' || value === 0 || value === '0') return false
  return fallback
}

export async function body<T = Record<string, unknown>>(c: {
  req: { json: () => Promise<unknown> }
}): Promise<T> {
  try {
    return ((await c.req.json()) ?? {}) as T
  } catch {
    return {} as T
  }
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function isAdmin(c: Context): boolean {
  return currentUser(c).role === 'admin'
}

/** Admin-only guard. Returns a 403 response when the caller is not an admin. */
export async function requireAdmin(c: Context, next: Next) {
  const me = currentUser(c)
  if (me.role !== 'admin') {
    return c.json({ error: 'Only administrators can perform this action' }, 403)
  }
  await next()
}

export function actorName(c: Context): string {
  const me = currentUser(c)
  return me.name ?? me.email
}

/**
 * The Teacher record linked to the signed-in user, if any. Admins are not
 * scoped to a teacher profile; teachers are.
 */
export async function teacherForUser(user: SessionUser) {
  return prisma.teacher.findFirst({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
    include: { assignments: true },
  })
}

/**
 * Batch scopes a teacher is allowed to touch. Admins get `null`, meaning
 * "no restriction".
 */
export async function teacherScopes(
  user: SessionUser,
): Promise<{ className: string; batch: string; subject: string }[] | null> {
  if (user.role === 'admin') return null
  const teacher = await teacherForUser(user)
  if (!teacher) return []
  return teacher.assignments.map((a) => ({
    className: a.className,
    batch: a.batch,
    subject: a.subject,
  }))
}

export function scopeAllows(
  scopes: { className: string; batch: string; subject: string }[] | null,
  className: string,
  batch?: string | null,
): boolean {
  if (scopes === null) return true
  return scopes.some(
    (s) => s.className === className && (!batch || s.batch === batch),
  )
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1
  return h * 60 + m
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = minutesOf(aStart)
  const ae = minutesOf(aEnd)
  const bs = minutesOf(bStart)
  const be = minutesOf(bEnd)
  if (as < 0 || ae < 0 || bs < 0 || be < 0) return false
  return as < be && bs < ae
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
