import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    // Users can only access their own affiliate data unless they're an admin/manager
    const effectiveStudentId =
      session.userRole === 'STUDENT'
        ? session.userId
        : session.userRole === 'ADMIN' || session.userRole === 'SALES_MANAGER' || session.userRole === 'FINANCIAL_OFFICER'
          ? studentId || session.userId
          : session.userId

    if (!effectiveStudentId) {
      return NextResponse.json(
        { error: 'student_id is required' },
        { status: 400 }
      )
    }

    // Find student
    const student = await db.user.findUnique({
      where: { id: effectiveStudentId },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'دانش‌پذیر یافت نشد' },
        { status: 404 }
      )
    }

    // Auto-generate referral code if missing
    let referralCode = student.referral_code
    if (!referralCode) {
      referralCode = `AMIN-${student.first_name.slice(0, 10).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
      await db.user.update({
        where: { id: effectiveStudentId },
        data: { referral_code: referralCode },
      })
    }

    // Fetch referred leads
    const referredLeads = await db.lead.findMany({
      where: { referred_by_id: effectiveStudentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        status: true,
        createdAt: true,
      },
    })

    // Fetch commissions
    const commissions = await db.commission.findMany({
      where: { referrer_id: effectiveStudentId },
      orderBy: { createdAt: 'desc' },
      include: {
        referee_lead: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
    })

    // Calculate dynamic stats
    const totalReferred = referredLeads.length
    const convertedReferred = referredLeads.filter(l => l.status === 'CONVERTED').length
    const conversionRate = totalReferred > 0 ? Math.round((convertedReferred / totalReferred) * 100) : 0

    return NextResponse.json({
      referral_code: referralCode,
      wallet_balance: student.wallet_balance,
      referredLeads,
      commissions,
      stats: {
        clicks: totalReferred * 3 + 5, // Mock clicks for UX purposes
        totalReferred,
        convertedReferred,
        conversionRate,
      },
    })
  } catch (error) {
    console.error('Affiliate API GET error:', error)
    return NextResponse.json(
      { error: 'خطا در بارگذاری اطلاعات همکاری در فروش' },
      { status: 500 }
    )
  }
}
