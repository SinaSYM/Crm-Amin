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

    // Only managers and admins can export all leads
    if (!isAuthorized(session, [
      UserRole.ADMIN,
      UserRole.SALES_MANAGER,
      UserRole.DEPT_MANAGER,
    ])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const where: Record<string, unknown> = {}

    // Dept managers see only their department's leads (or leads assigned to agents in their department)
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        where.OR = [
          { department: userProfile.department },
          { assigned_to: { department: userProfile.department } }
        ]
      }
      // Managers without a department export all leads
    }

    const leads = await db.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assigned_to: {
          select: { first_name: true, last_name: true, role: true },
        },
        target_course: {
          select: { title: true },
        },
        _count: {
          select: { interactions: true },
        },
      },
    })

    const statusLabels: Record<string, string> = {
      NEW: 'جدید',
      CONTACTED: 'تماس گرفته شده',
      IN_PROGRESS: 'در حال پیگیری',
      CONVERTED: 'تبدیل شده',
    }

    const sourceLabels: Record<string, string> = {
      website: 'وبسایت',
      manual: 'دستی',
      campaign: 'کمپین',
      referral: 'معرفی',
    }

    // Build CSV
    const headers = ['نام', 'نام خانوادگی', 'شماره تماس', 'منبع', 'وضعیت', 'کارشناس فروش', 'دوره هدف', 'تعداد تعاملات', 'تاریخ ثبت', 'یادداشت']
    const rows = leads.map((lead) => [
      lead.first_name,
      lead.last_name,
      lead.phone_number,
      sourceLabels[lead.source] || lead.source,
      statusLabels[lead.status] || lead.status,
      lead.assigned_to ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}` : '—',
      lead.target_course?.title || '—',
      lead._count.interactions.toString(),
      new Date(lead.createdAt).toLocaleDateString('fa-IR'),
      `"${lead.notes.replace(/"/g, '""')}"`,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    // Add BOM for proper UTF-8 display
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=leads-export-${new Date().toISOString().split('T')[0]}.csv`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export leads' },
      { status: 500 }
    )
  }
}
