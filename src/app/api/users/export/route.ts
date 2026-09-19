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
    ])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Department scoping for managers, mirroring GET /api/users — previously
    // absent, so a manager could export every department's users via CSV.
    const where: Record<string, unknown> = {}
    if (session.userRole !== UserRole.ADMIN) {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        where.OR = [
          { role: UserRole.SALES_AGENT, department: userProfile.department },
          {
            role: UserRole.STUDENT,
            enrollments: { some: { course: { department: userProfile.department } } },
          },
        ]
      }
      // Managers without a department export all users
    }

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const roleLabels: Record<string, string> = {
      ADMIN: 'ادمین',
      SALES_MANAGER: 'مدیر فروش',
      SALES_AGENT: 'کارشناس فروش',
      STUDENT: 'دانش‌پذیر',
    }

    // Build CSV
    const headers = ['نام', 'نام خانوادگی', 'شماره تماس', 'نقش', 'وضعیت فعالیت', 'تاریخ ایجاد']
    const rows = users.map((user) => [
      user.first_name,
      user.last_name,
      user.phone_number,
      roleLabels[user.role] || user.role,
      user.is_active ? 'فعال' : 'غیرفعال',
      new Date(user.createdAt).toLocaleDateString('fa-IR'),
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
        'Content-Disposition': `attachment; filename=users-export-${new Date().toISOString().split('T')[0]}.csv`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export users' },
      { status: 500 }
    )
  }
}
