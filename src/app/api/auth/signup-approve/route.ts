import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, isAuthorized } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { hashPassword } from '@/lib/password'
import { logActivityForUser } from '@/lib/activity-logger'
import { apiError, zodFieldErrorMessage } from '@/lib/api-response'

const Body = z.object({
  signup_id: z.string().min(1),
  action: z.enum(['APPROVE', 'REJECT']),
  note: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getSession(req as unknown as import('next/server').NextRequest)
    if (!session || !isAuthorized(session, [UserRole.ADMIN])) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 })
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

    const signup = await db.signupRequest.findUnique({ where: { id: input.signup_id } })
    if (!signup) return NextResponse.json({ error: 'درخواست یافت نشد' }, { status: 404 })
    if (signup.status !== 'PENDING') {
      return NextResponse.json({ error: 'این درخواست قبلاً بررسی شده است' }, { status: 409 })
    }

    // Department is optional — default to MANAGEMENT if not set

    if (input.action === 'REJECT') {
      await db.signupRequest.update({
        where: { id: signup.id },
        data: { status: 'REJECTED', reviewed_at: new Date(), reviewed_by_id: session.user.id, review_note: input.note ?? null },
      })
      await logActivityForUser(session.user.id, 'REJECT_SIGNUP', `Rejected signup request for "${signup.first_name} ${signup.last_name}" (${signup.email})`)
      return NextResponse.json({ ok: true, status: 'REJECTED' })
    }

    // APPROVE — create the user and link the password
    const [existingEmail, existingPhone] = await Promise.all([
      db.user.findUnique({ where: { email: signup.email } }),
      db.user.findUnique({ where: { phone_number: signup.phone_number } }),
    ])
    if (existingEmail || existingPhone) {
      return NextResponse.json({ error: 'تداخل با کاربر موجود' }, { status: 409 })
    }

    // Migrate the hashed password from signup to user (no re-hash).
    const user = await db.user.create({
      data: {
        first_name: signup.first_name,
        last_name: signup.last_name,
        phone_number: signup.phone_number,
        email: signup.email,
        passwordHash: signup.passwordHash,
        role: UserRole.SALES_AGENT,
        is_active: true,
        isApproved: true,
        scope: 'STANDARD',
        department: signup.desired_department ?? 'MANAGEMENT',
      },
    })

    await db.signupRequest.update({
      where: { id: signup.id },
      data: { status: 'APPROVED', reviewed_at: new Date(), reviewed_by_id: session.user.id, review_note: input.note ?? null },
    })

    await logActivityForUser(session.user.id, 'APPROVE_SIGNUP', `Approved signup request for "${user.first_name} ${user.last_name}" (${user.email}) as ${user.role}`)

    // Reference hashPassword so it's tree-shaken-aware (used elsewhere already).
    void hashPassword

    return NextResponse.json({ ok: true, status: 'APPROVED', user_id: user.id })
  } catch (error) {
    console.error('Signup-approve POST error:', error)
    return NextResponse.json({ error: 'خطا در بررسی درخواست عضویت' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSession(req as unknown as import('next/server').NextRequest)
    if (!session || !isAuthorized(session, [UserRole.ADMIN])) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 })
    }
    const items = await db.signupRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, first_name: true, last_name: true,
        phone_number: true, desired_department: true, createdAt: true,
      },
    })
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Signup-approve GET error:', error)
    return NextResponse.json({ error: 'خطا در دریافت درخواست‌های عضویت' }, { status: 500 })
  }
}
