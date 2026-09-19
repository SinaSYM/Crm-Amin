import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { LeadStatus } from '@prisma/client'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * Unauthenticated lead-capture endpoint for the public "request a
 * consultation" form on the login page (login-page.tsx: handleRegisterLead).
 * This is intentionally separate from POST /api/leads, which always
 * requires a staff session and a next_followup_date (a commitment made by
 * the staff member creating the lead — meaningless for an anonymous
 * website submission). Created leads are unassigned (assigned_to_id: null)
 * for a manager to triage, same as any other unassigned lead in the pool.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (!checkRateLimit(`public-leads:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' }, { status: 429 })
    }

    const body = await request.json()
    const { first_name, last_name, phone_number, target_course_id, referral_code } = body

    const firstName = typeof first_name === 'string' ? first_name.trim() : ''
    const lastName = typeof last_name === 'string' ? last_name.trim() : ''
    const phone = typeof phone_number === 'string' ? phone_number.trim() : ''

    if (!firstName || !lastName || !phone || phone.length < 8) {
      return NextResponse.json({ error: 'لطفاً همه فیلدهای اجباری را به‌درستی وارد کنید' }, { status: 400 })
    }

    let courseId: string | null = null
    if (target_course_id) {
      const course = await db.course.findFirst({ where: { id: target_course_id, is_active: true } })
      if (course) courseId = course.id
    }

    let referred_by_id: string | null = null
    if (referral_code && typeof referral_code === 'string') {
      const referrer = await db.user.findUnique({ where: { referral_code: referral_code.trim() } })
      if (referrer) referred_by_id = referrer.id
    }

    // Avoid piling up duplicate entries from accidental double-submits/refreshes.
    const recentDuplicate = await db.lead.findFirst({
      where: {
        phone_number: phone,
        source: 'website',
        status: LeadStatus.NEW,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    if (!recentDuplicate) {
      await db.lead.create({
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phone,
          source: 'website',
          status: LeadStatus.NEW,
          target_course_id: courseId,
          referred_by_id,
        },
      })
    }

    return NextResponse.json({ message: 'درخواست شما با موفقیت ثبت شد' }, { status: 201 })
  } catch (error) {
    console.error('Public lead capture error:', error)
    return NextResponse.json({ error: 'خطا در ثبت اطلاعات' }, { status: 500 })
  }
}
