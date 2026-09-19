import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, isAuthorized } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { generateToken } from '@/lib/password'
import { logActivity } from '@/lib/activity-logger'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

const Body = z.object({
  userId: z.string().min(1),
})

/**
 * Admin-only: generates a one-time, expiring password-reset token/link for
 * a target user. There's no email/SMS provider configured for this project,
 * so the admin is expected to copy the returned link and deliver it
 * out-of-band (phone call, in person, etc.) rather than the system sending
 * it automatically.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAuthorized(session, [UserRole.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let input: z.infer<typeof Body>
    try {
      input = Body.parse(await request.json())
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: input.userId } })
    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 })
    }

    // Invalidate any previous unused tokens for this user before issuing a new one.
    await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })

    const token = generateToken(32)
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    })

    const resetUrl = `${request.nextUrl.origin}/?resetToken=${token}`

    await logActivity(
      request,
      'INITIATE_PASSWORD_RESET',
      `Generated a password reset link for "${user.first_name} ${user.last_name}"`
    )

    return NextResponse.json({ resetUrl, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) })
  } catch (error) {
    console.error('Password reset initiate error:', error)
    return NextResponse.json({ error: 'خطا در ساخت لینک بازیابی' }, { status: 500 })
  }
}
