/**
 * In-memory sliding-window rate limiter. Fine for this single-process
 * deployment (see CLAUDE.md: bun standalone server, no horizontal scaling);
 * would need a shared store (e.g. Redis) if the app is ever run as
 * multiple instances behind a load balancer.
 */

type Entry = { count: number; resetAt: number }

const buckets = new Map<string, Entry>()

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = buckets.get(key)
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  entry.count += 1
  return entry.count <= maxAttempts
}

export function resetRateLimit(key: string): void {
  buckets.delete(key)
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
