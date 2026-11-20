import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { Context, Next } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { prisma } from '../src/lib/db'

export const SESSION_COOKIE = 'ci_session'
const SESSION_DAYS = 7

export type SessionUser = {
  id: string
  email: string
  name: string | null
  role: string
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const [, salt, hash] = parts
  const expected = Buffer.from(hash, 'hex')
  const candidate = scryptSync(password, salt, 64)
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await prisma.session.create({ data: { token, userId, expiresAt } })
  return token
}

export function attachSessionCookie(c: Context, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: false,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}

function readToken(c: Context): string | null {
  const header = c.req.header('authorization')
  if (header?.toLowerCase().startsWith('bearer ')) {
    const value = header.slice(7).trim()
    if (value) return value
  }
  const cookie = getCookie(c, SESSION_COOKIE)
  if (cookie) return cookie
  // Fallback for hosting front-ends that strip request headers (the Shogo
  // preview proxy drops Authorization and Cookie entirely). The client mirrors
  // the token into `?t=` so the session still reaches the server.
  const query = c.req.query('t')
  if (query) return query
  return null
}

export async function resolveUser(c: Context): Promise<SessionUser | null> {
  const token = readToken(c)
  if (!token) return null
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  if (!session.user.active) return null
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  }
}

export async function requireAuth(c: Context, next: Next) {
  const user = await resolveUser(c)
  if (!user) return c.json({ error: 'Not signed in' }, 401)
  c.set('user', user)
  await next()
}

export function currentUser(c: Context): SessionUser {
  return c.get('user') as SessionUser
}

export async function destroySession(c: Context) {
  const token = readToken(c)
  if (token) {
    await prisma.session.deleteMany({ where: { token } })
  }
  clearSessionCookie(c)
}
