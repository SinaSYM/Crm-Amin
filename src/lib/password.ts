import crypto from 'node:crypto'

/**
 * Internal password hashing using scrypt (Node.js built-in, no native deps).
 *
 * Format: `scrypt$N$r$p$saltB64$hashB64`
 *   N=16384, r=8, p=1, hashLen=64 (battle-tested defaults).
 */

const N = 16384
const r = 8
const p = 1
const KEY_LEN = 64
const SALT_LEN = 16
// 200ms target on modest hardware keeps brute forcing slow.
const SCRYPT_MAXMEM = 64 * 1024 * 1024

export function hashPassword(plain: string): string {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new Error('Password must be a non-empty string')
  }
  const salt = crypto.randomBytes(SALT_LEN)
  const derived = crypto.scryptSync(plain, salt, KEY_LEN, { N, r, p, maxmem: SCRYPT_MAXMEM })
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${derived.toString('base64')}`
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (typeof plain !== 'string' || typeof stored !== 'string') return false
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts
  const Nn = Number(nStr)
  const Rr = Number(rStr)
  const Pp = Number(pStr)
  if (!Number.isFinite(Nn) || !Number.isFinite(Rr) || !Number.isFinite(Pp)) return false
  let salt: Buffer
  let expected: Buffer
  try {
    salt = Buffer.from(saltB64, 'base64')
    expected = Buffer.from(hashB64, 'base64')
  } catch {
    return false
  }
  if (expected.length === 0) return false
  let actual: Buffer
  try {
    actual = crypto.scryptSync(plain, salt, expected.length, { N: Nn, r: Rr, p: Pp, maxmem: SCRYPT_MAXMEM })
  } catch {
    return false
  }
  if (actual.length !== expected.length) return false
  return crypto.timingSafeEqual(actual, expected)
}

/**
 * Generate a URL-safe random token (used for session cookie and signup links).
 */
export function generateToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('base64url')
}

export const SESSION_COOKIE_NAME = 'crm_session'
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

/**
 * Fixed-format hash used only to keep login timing constant when no user/
 * passwordHash exists. Verifying against this still runs the full scrypt
 * derivation, closing the timing side-channel that would otherwise let an
 * attacker distinguish "no such account" from "wrong password" by latency.
 */
export const DUMMY_PASSWORD_HASH = hashPassword('dummy-password-for-constant-time-login-checks')
