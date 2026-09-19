import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession, isAuthorized } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAuthorized(session, [
      UserRole.ADMIN,
      UserRole.SALES_MANAGER,
      UserRole.DEPT_MANAGER,
      UserRole.EDUCATION_OFFICER,
      UserRole.FINANCIAL_OFFICER,
    ])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Department scoping for managers — previously absent, so a manager could
    // export every department's enrollments via CSV even though the equivalent
    // GET /api/enrollments list is department-scoped.
    const where: Record<string, unknown> = {}
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        where.course = { department: userProfile.department }
      }
    }

    const enrollments = await db.enrollment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { first_name: true, last_name: true, phone_number: true },
        },
        course: {
          select: { title: true, price: true },
        },
      },
    })

    const paymentStatusLabels: Record<string, string> = {
      PAID: 'پرداخت شده',
      INSTALLMENT: 'اقساطی',
    }

    // Build CSV
    const headers = ['نام دانش‌پذیر', 'شماره تماس', 'عنوان دوره', 'قیمت دوره', 'وضعیت پرداخت', 'تاریخ ثبت‌نام']
    const rows = enrollments.map((enrollment) => [
      `${enrollment.student.first_name} ${enrollment.student.last_name}`,
      enrollment.student.phone_number,
      enrollment.course.title,
      enrollment.course.price.toString(),
      paymentStatusLabels[enrollment.payment_status] || enrollment.payment_status,
      new Date(enrollment.enrollment_date).toLocaleDateString('fa-IR'),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    // Add BOM for proper UTF-8 display
    const BOM = '\uFEFF'

    return new NextResponse(BOM + csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=enrollments-export-${new Date().toISOString().split('T')[0]}.csv`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export enrollments' },
      { status: 500 }
    )
  }
}
