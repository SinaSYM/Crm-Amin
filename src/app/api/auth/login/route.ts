import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { UserRole, UserScope } from '@prisma/client'
import { loginWithCredentials } from '@/lib/auth'
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, generateToken } from '@/lib/password'
import { db } from '@/lib/db'
import { checkRateLimit, getClientIp, resetRateLimit } from '@/lib/rate-limit'
import { logActivityForUser } from '@/lib/activity-logger'
import { apiError, zodFieldErrorMessage } from '@/lib/api-response'

const IP_WINDOW_MS = 15 * 60 * 1000
const IP_MAX_ATTEMPTS = 20
const ACCOUNT_WINDOW_MS = 15 * 60 * 1000
const ACCOUNT_MAX_ATTEMPTS = 5

type LoginSessionResult = {
  token: string
  expiresAt: Date
  user: {
    id: string
    firstName: string
    lastName: string
    role: UserRole
    phoneNumber: string
    email: string | null
    department: string | null
    scope: UserScope
  }
}

function isEmail(s: string): boolean {
  if (typeof s !== 'string') return false
  const trimmed = s.trim()
  if (trimmed.length === 0 || trimmed.length > 254) return false
  const at = trimmed.lastIndexOf('@')
  if (at < 1 || at === trimmed.length - 1) return false
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  if (domain.length === 0 || !domain.includes('.')) return false
  if (/\s/.test(trimmed)) return false
  if (!/^[A-Za-z0-9._+\-]+$/.test(local)) return false
  const labels = domain.split('.')
  for (const lbl of labels) {
    if (lbl.length === 0 || lbl.length > 63) return false
    if (!/^[A-Za-z0-9-]+$/.test(lbl)) return false
    if (lbl.startsWith('-') || lbl.endsWith('-')) return false
  }
  const tld = labels[labels.length - 1]
  if (!/^[A-Za-z]{2,}$/.test(tld)) return false
  return true
}

const Body = z.object({
  identifier: z.string().min(1, 'ایمیل یا شماره موبایل الزامی است'),
  password: z.string().min(1, 'رمز عبور الزامی است'),
})

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    if (!checkRateLimit(`login:ip:${ip}`, IP_MAX_ATTEMPTS, IP_WINDOW_MS)) {
      return NextResponse.json({ error: 'تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' }, { status: 429 })
    }

    let input: z.infer<typeof Body>
    try {
      input = Body.parse(await req.json())
    } catch (e) {
      if (e instanceof z.ZodError) {
        return apiError(zodFieldErrorMessage(e.flatten().fieldErrors), 400)
      }
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const accountKey = `login:account:${input.identifier.toLowerCase()}`
    if (!checkRateLimit(accountKey, ACCOUNT_MAX_ATTEMPTS, ACCOUNT_WINDOW_MS)) {
      return NextResponse.json({ error: 'تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' }, { status: 429 })
    }

    // Determine if identifier is email or phone number
    const identifier = input.identifier.trim()
    const isEmailInput = isEmail(identifier)
    let loginEmail: string | null = null

    if (isEmailInput) {
      loginEmail = identifier.toLowerCase()
    } else if (/^[0-9+\-\s()]{7,}$/.test(identifier)) {
      // Phone number — find user by phone and use their email for credential login
      const phoneUser = await db.user.findUnique({ where: { phone_number: identifier } })
      if (phoneUser && phoneUser.email) {
        loginEmail = phoneUser.email
      }
    } else {
      // Username-style ID (e.g. "admin") — used directly as the account email/ID
      loginEmail = identifier.toLowerCase()
    }

    let session: LoginSessionResult | null = null

    if (loginEmail) {
      const credSession = await loginWithCredentials(loginEmail, input.password)
      if (!credSession) {
        return NextResponse.json({ error: 'ایمیل/شماره موبایل یا رمز عبور اشتباه است' }, { status: 401 })
      }
      session = {
        token: credSession.token,
        expiresAt: credSession.expiresAt,
        user: {
          id: credSession.user.id,
          firstName: credSession.user.firstName,
          lastName: credSession.user.lastName,
          role: credSession.user.role,
          phoneNumber: credSession.user.phoneNumber,
          email: credSession.user.email,
          department: credSession.user.department,
          scope: credSession.user.scope,
        }
      }
    } else {
      return NextResponse.json({ error: 'ایمیل/شماره موبایل یا رمز عبور اشتباه است' }, { status: 401 })
    }

    resetRateLimit(`login:ip:${ip}`)
    resetRateLimit(accountKey)

    await logActivityForUser(session.user.id, 'LOGIN', `User logged in (${session.user.role})`)

    const jar = await cookies()
    jar.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: session.expiresAt,
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    })

    return NextResponse.json({
      user: {
        id: session.user.id,
        first_name: session.user.firstName,
        last_name: session.user.lastName,
        role: session.user.role,
        phone_number: session.user.phoneNumber,
        email: session.user.email,
        department: session.user.department,
        scope: session.user.scope,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'خطا در ورود به سیستم' }, { status: 500 })
  }
}
