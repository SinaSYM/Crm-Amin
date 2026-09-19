import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { apiError, zodFieldErrorMessage } from '@/lib/api-response'

const Body = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد'),
})

/** Public endpoint: consumes a one-time password-reset token issued by an admin. */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (!checkRateLimit(`password-reset-confirm:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'تعداد تلاش‌ها بیش از حد مجاز است' }, { status: 429 })
    }

    let input: z.infer<typeof Body>
    try {
      input = Body.parse(await request.json())
    } catch (e) {
      if (e instanceof z.ZodError) {
        return apiError(zodFieldErrorMessage(e.flatten().fieldErrors), 400)
      }
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const resetToken = await db.passwordResetToken.findUnique({ where: { token: input.token } })
    const genericError = { error: 'لینک بازیابی نامعتبر یا منقضی شده است' }

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(genericError, { status: 400 })
    }

    const passwordHash = hashPassword(input.newPassword)

    await db.$transaction([
      db.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      db.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      // Force re-login everywhere else — a stolen session shouldn't survive a password reset.
      db.session.deleteMany({ where: { userId: resetToken.userId } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Password reset confirm error:', error)
    return NextResponse.json({ error: 'خطا در تغییر رمز عبور' }, { status: 500 })
  }
}
