import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { db } from './db'
import { UserRole, UserScope } from '@prisma/client'
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, generateToken, verifyPassword, DUMMY_PASSWORD_HASH } from './password'

export interface AuthedUser {
  id: string
  email: string | null
  firstName: string
  lastName: string
  phoneNumber: string
  role: UserRole
  department: string | null
  scope: UserScope
  isActive: boolean
  isApproved: boolean
}

export interface AuthedSession {
  token: string
  user: AuthedUser
  expiresAt: Date
}

function toAuthedUser(u: {
  id: string
  email: string | null
  first_name: string
  last_name: string
  phone_number: string
  role: UserRole
  department: string | null
  scope: UserScope
  is_active: boolean
  isApproved: boolean
}): AuthedUser {
  return {
    id: u.id,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    phoneNumber: u.phone_number,
    role: u.role,
    department: u.department,
    scope: u.scope,
    isActive: u.is_active,
    isApproved: u.isApproved,
  }
}

/**
 * Look up the active session from the cookie or request headers. Returns null if absent or expired.
 */
export async function getSession(arg?: string | NextRequest): Promise<(AuthedSession & { userId: string; userRole: UserRole }) | null> {
  let token: string | undefined

  if (typeof arg === 'string') {
    token = arg
  } else {
    token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  }

  let session: AuthedSession | null = null

  if (token) {
    const row = await db.session.findUnique({
      where: { sessionToken: token },
      include: { user: true },
    })
    if (row) {
      if (row.expires.getTime() < Date.now()) {
        await db.session.delete({ where: { id: row.id } }).catch(() => {})
      } else if (row.user.is_active && row.user.isApproved) {
        session = { token: row.sessionToken, user: toAuthedUser(row.user), expiresAt: row.expires }
      }
    }
  }

  if (!session) return null

  return {
    ...session,
    userId: session.user.id,
    userRole: session.user.role,
  }
}

/** Strict variant for routes that must be on real auth even during migration. */
export async function requireSession(): Promise<AuthedSession> {
  const s = await getSession()
  if (!s) {
    const err: Error & { status?: number } = new Error('Unauthorized')
    err.status = 401
    throw err
  }
  return s
}

export function isAuthorized(
  session: AuthedSession | null,
  allowedRoles: ReadonlyArray<UserRole>,
): boolean {
  if (!session) return false
  return allowedRoles.includes(session.user.role)
}

/** Serialize `AuthedUser` back to the `CurrentUser` shape the client store expects. */
export function toClientUser(u: AuthedUser) {
  return {
    id: u.id,
    first_name: u.firstName,
    last_name: u.lastName,
    role: u.role,
    phone_number: u.phoneNumber,
  }
}

export async function loginWithCredentials(email: string, password: string): Promise<AuthedSession | null> {
  const u = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  // Always run the (deliberately slow) scrypt verification, even when the
  // user doesn't exist, so response timing can't be used to enumerate
  // valid emails.
  const passwordOk = verifyPassword(password, u?.passwordHash ?? DUMMY_PASSWORD_HASH)
  if (!u || !u.passwordHash || !u.is_active || !u.isApproved || !passwordOk) return null
  const token = generateToken(32)
  const expires = new Date(Date.now() + SESSION_TTL_MS)
  await db.session.create({ data: { sessionToken: token, userId: u.id, expires } })
  return { token, user: toAuthedUser(u), expiresAt: expires }
}

export async function destroySession(cookieToken?: string): Promise<void> {
  const token = cookieToken ?? (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return
  await db.session.deleteMany({ where: { sessionToken: token } })
}
