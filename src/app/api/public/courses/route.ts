import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * Unauthenticated course list for the public "request a consultation" form
 * on the login page — anonymous website visitors have no session, so this
 * intentionally skips getSession/isAuthorized. Only the fields the form
 * dropdown actually needs are exposed (no price, department, or counts).
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (!checkRateLimit(`public-courses:${ip}`, 60, 60 * 1000)) {
      return NextResponse.json({ error: 'تعداد درخواست‌ها بیش از حد مجاز است' }, { status: 429 })
    }

    const courses = await db.course.findMany({
      where: { is_active: true },
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error('Public courses GET error:', error)
    return NextResponse.json({ error: 'خطا در دریافت لیست دوره‌ها' }, { status: 500 })
  }
}
