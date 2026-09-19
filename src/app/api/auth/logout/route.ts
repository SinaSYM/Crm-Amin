import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/password'
import { destroySession, getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (session) {
      await logActivity(request, 'LOGOUT', `User logged out (${session.userRole})`)
    }
    await destroySession()
    const jar = await cookies()
    jar.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'خطا در خروج از سیستم' }, { status: 500 })
  }
}
