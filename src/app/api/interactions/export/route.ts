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

    const where: Record<string, unknown> = {}

    // Dept managers see only their department's interactions
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        where.lead = { department: userProfile.department }
      }
    }

    const interactions = await db.interaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: { first_name: true, last_name: true, phone_number: true },
        },
        agent: {
          select: { first_name: true, last_name: true },
        },
      },
    })

    const interactionTypeLabels: Record<string, string> = {
      CALL: 'تماس',
      NOTE: 'یادداشت',
      SYSTEM: 'سیستم',
    }

    // Build CSV
    const headers = ['نام لید', 'شماره تماس لید', 'نام کارشناس', 'نوع تعامل', 'محتوا', 'تاریخ پیگیری بعدی', 'تاریخ ایجاد']
    const rows = interactions.map((interaction) => [
      `${interaction.lead.first_name} ${interaction.lead.last_name}`,
      interaction.lead.phone_number,
      `${interaction.agent.first_name} ${interaction.agent.last_name}`,
      interactionTypeLabels[interaction.interaction_type] || interaction.interaction_type,
      `"${interaction.content.replace(/"/g, '""')}"`,
      interaction.next_followup_date
        ? new Date(interaction.next_followup_date).toLocaleDateString('fa-IR')
        : '—',
      new Date(interaction.createdAt).toLocaleDateString('fa-IR'),
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
        'Content-Disposition': `attachment; filename=interactions-export-${new Date().toISOString().split('T')[0]}.csv`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export interactions' },
      { status: 500 }
    )
  }
}
