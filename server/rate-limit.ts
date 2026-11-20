/**
 * Progressive in-memory rate limiter for credential endpoints.
 *
 * Policy: 10 requests are allowed per rolling minute. Once that budget is
 * exhausted the caller is blocked for a window that doubles each time they
 * exceed it again (60s, 120s, 240s … capped at 30 minutes). A successful
 * sign-in clears the bucket.
 *
 * In-memory on purpose: the app runs as a single process, and a shared store
 * would add a dependency for no benefit at this scale. The bucket map is swept
 * lazily so it cannot grow without bound.
 */

type Bucket = {
  hits: number
  windowStart: number
  penaltyLevel: number
  blockedUntil: number
  lastSeen: number
}

const WINDOW_MS = 60_000
const MAX_HITS = 10
const BASE_PENALTY_MS = 60_000
const MAX_PENALTY_MS = 30 * 60_000
const SWEEP_AFTER_MS = 60 * 60_000

const buckets = new Map<string, Bucket>()

function sweep(now: number) {
  if (buckets.size < 500) return
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastSeen > SWEEP_AFTER_MS) buckets.delete(key)
  }
}

export type RateLimitResult = {
  allowed: boolean
  /** Seconds the caller must wait before retrying (only set when blocked). */
  retryAfter: number
  remaining: number
}

export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  sweep(now)
  const existing = buckets.get(key)

  if (existing && existing.blockedUntil > now) {
    existing.lastSeen = now
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((existing.blockedUntil - now) / 1000)),
      remaining: 0,
    }
  }

  let bucket = existing
  if (!bucket) {
    bucket = { hits: 0, windowStart: now, penaltyLevel: 0, blockedUntil: 0, lastSeen: now }
    buckets.set(key, bucket)
  }

  if (now - bucket.windowStart >= WINDOW_MS) {
    bucket.hits = 0
    bucket.windowStart = now
  }

  bucket.hits += 1
  bucket.lastSeen = now

  if (bucket.hits > MAX_HITS) {
    const penalty = Math.min(BASE_PENALTY_MS * 2 ** bucket.penaltyLevel, MAX_PENALTY_MS)
    bucket.penaltyLevel += 1
    bucket.blockedUntil = now + penalty
    bucket.windowStart = now
    bucket.hits = 0
    return { allowed: false, retryAfter: Math.ceil(penalty / 1000), remaining: 0 }
  }

  return { allowed: true, retryAfter: 0, remaining: MAX_HITS - bucket.hits }
}

/** Clear the bucket after a successful authentication. */
export function resetRateLimit(key: string) {
  buckets.delete(key)
}

/** Best-effort client identity for throttling behind a proxy or direct. */
export function clientKey(c: { req: { header: (name: string) => string | undefined } }): string {
  const forwarded = c.req.header('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local'
  return ip
}
