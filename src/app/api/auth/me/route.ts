import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const s = await getSession()
    if (!s) return NextResponse.json({ user: null }, { status: 200 })
    return NextResponse.json({
      user: {
        id: s.user.id,
        first_name: s.user.firstName,
        last_name: s.user.lastName,
        role: s.user.role,
        phone_number: s.user.phoneNumber,
        email: s.user.email,
        department: s.user.department,
        scope: s.user.scope,
      },
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ error: 'خطا در دریافت اطلاعات کاربر' }, { status: 500 })
  }
}
